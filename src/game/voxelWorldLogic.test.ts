import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BT,
  SEA,
  HORSE_SPEED,
  HORSE_JUMP_VEL,
  createInfiniteWorld,
  ensureChunksAroundPlayer,
  createPlayer,
  gB,
  sB,
  getH,
  isSolid,
  breakBlockLogic,
  placeBlockLogic,
  toggleTwoBlockDoorLogic,
  addItemToInventory,
  craftWoodToPlanksLogic,
  craftPlanksToTableLogic,
  craftPlanksToSticksLogic,
  craftWoodPickaxeLogic,
  craftStonePickaxeLogic,
  craftPlanksToBoatLogic,
  craftWoolAndPlanksToBedLogic,
  countItemInInventory,
  hasLineOfSight,
  despawnDaytimeMonsters,
  findValidMonsterSpawnPoint,
  toggleMountHorseLogic,
  cyclePlayerClothesLogic,
  isPlayerMovingInput,
  serializeSaveGame,
  deserializeSaveGame,
  damageEntityLogic,
  stepPlayerPhysics,
  stepEntityMovementWithCollision,
  stepTamedWolfAILogic,
  craftWoodSwordLogic,
  craftStoneSwordLogic,
  craftChestLogic,
  craftTorchesLogic,
  getPlayerAttackDamage,
  spawnRainPuddleLogic,
  checkRedLightViolationLogic,
  LOST_VILLAGER_SPAWNS,
  getNearestLostVillagerCompass,
  rescueVillagerLogic,
  surfY,
  BUILD_BATTLE_DURATION_SEC,
  formatBuildBattleTimer,
  equipBuildBattleCreativeInventory,
  setupBuildBattleArena,
  openBuildBattleDividingWall,
  getAiHouseBlueprint,
  stepAiBuilderBot,
  setupRedLightArena,
  stepEnemyCombatLogic,
  findNearestTorchWithinRadius,
  TORCH_REPELLENT_RADIUS,
  type EntityData,
} from './voxelWorldLogic';

test('Pure Survival player starts with empty inventory on a giant island/continent and unloads distant chunks', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  assert.equal(pl1.hp, 20);
  assert.equal(pl1.sel, 0);
  assert.ok(pl1.inventory.every((slot) => slot === null));

  // Giant starter landmass around (0,0) up to 24 blocks out is above sea level
  assert.ok(getH(0, 0) > SEA);
  assert.ok(getH(18, 12) > SEA);

  // Chunk unloading (despawn) keeps memory bounded
  ensureChunksAroundPlayer(world, 0, 0, 2);
  assert.equal(world.chunks.size, 25);
  const res = ensureChunksAroundPlayer(world, 160, 160, 2);
  assert.ok(res.removedKeys.length > 0, 'Distant chunks are unloaded automatically');
  assert.equal(world.chunks.size, 25);
});

test('2-Block Door occupies 2 vertical blocks and clicking either half opens/closes both halves', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  addItemToInventory(pl1, BT.DOOR, 1);

  const groundY = getH(3, 3);
  sB(world, 3, groundY + 1, 3, BT.AIR);
  sB(world, 3, groundY + 2, 3, BT.AIR);

  const placed = placeBlockLogic(world, pl1, 3, groundY, 3, 0, 1, 0);
  assert.equal(placed.placed, true);
  assert.equal(placed.upperDoorPlaced, true);
  assert.equal(gB(world, 3, groundY + 1, 3), BT.DOOR);
  assert.equal(gB(world, 3, groundY + 2, 3), BT.DOOR);
  assert.equal(isSolid(world, 3, groundY + 1, 3), true);

  // Right-click upper half of the door -> both halves open (BT.DOOR_OPEN, non-solid)
  const openRes = toggleTwoBlockDoorLogic(world, 3, groundY + 2, 3);
  assert.equal(openRes.toggled, true);
  assert.equal(openRes.isOpen, true);
  assert.equal(gB(world, 3, groundY + 1, 3), BT.DOOR_OPEN);
  assert.equal(gB(world, 3, groundY + 2, 3), BT.DOOR_OPEN);
  assert.equal(isSolid(world, 3, groundY + 1, 3), false, 'Open door allows player to walk through');

  // Right-click lower half of the door -> both halves close again (BT.DOOR, solid)
  const closeRes = toggleTwoBlockDoorLogic(world, 3, groundY + 1, 3);
  assert.equal(closeRes.toggled, true);
  assert.equal(closeRes.isOpen, false);
  assert.equal(gB(world, 3, groundY + 1, 3), BT.DOOR);
  assert.equal(gB(world, 3, groundY + 2, 3), BT.DOOR);
  assert.equal(isSolid(world, 3, groundY + 1, 3), true);
});

test('Sheep drops Wool on death and all Crafting Table recipes (Planks, Sticks, Pickaxes, Boat, Bed) work', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();

  // Kill a sheep -> drops Wool (BT.WOOL)
  const sheep: EntityData = {
    id: 50,
    type: 'sheep',
    pos: { x: 2, y: 9, z: 2 },
    vel: { x: 0, y: 0, z: 0 },
    state: 'idle',
    timer: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 5,
    maxHp: 8,
  };
  const dmgRes = damageEntityLogic(sheep, pl1, 5);
  assert.equal(dmgRes.defeated, true);
  assert.equal(dmgRes.woolDropped, true);
  assert.equal(countItemInInventory(pl1, BT.WOOL), 1);

  // Give player Wood and Stone to test all Crafting Table recipes
  addItemToInventory(pl1, BT.WOOD, 6);
  addItemToInventory(pl1, BT.STONE, 3);
  addItemToInventory(pl1, BT.WOOL, 2); // Total 3 Wool

  // 1) Madera -> Tablones (6x -> 24 Planks)
  for (let i = 0; i < 6; i++) {
    assert.equal(craftWoodToPlanksLogic(pl1).crafted, true);
  }
  assert.equal(countItemInInventory(pl1, BT.PLANK), 24);

  // Craft Mesa de Crafteo (4 Planks -> 1 Table)
  assert.equal(craftPlanksToTableLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.TABLE), 1);

  // 2) Tablones -> Palos (2 Planks -> 4 Sticks)
  assert.equal(craftPlanksToSticksLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.STICK), 4);

  // 3) Tablones + Palos -> Pico de Madera (3 Planks + 2 Sticks -> 1 Wood Pickaxe)
  assert.equal(craftWoodPickaxeLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.WOOD_PICKAXE), 1);

  // 4) Piedra + Palos -> Pico de Piedra (3 Stone + 2 Sticks -> 1 Stone Pickaxe)
  assert.equal(craftStonePickaxeLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.STONE_PICKAXE), 1);

  // Mining Stone with Stone Pickaxe equipped yields 3x stone
  const stoneIdx = pl1.inventory.findIndex((s) => s && s.type === BT.STONE_PICKAXE);
  pl1.si = stoneIdx;
  sB(world, 2, 10, 2, BT.STONE);
  const mineRes = breakBlockLogic(world, pl1, 2, 10, 2);
  assert.equal(mineRes.broken, true);
  assert.equal(mineRes.bonusYield, 3);
  assert.equal(countItemInInventory(pl1, BT.STONE), 3);

  // 5) Tablones -> Bote (5 Planks -> 1 Boat)
  assert.equal(craftPlanksToBoatLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.BOAT), 1);

  // 6) 3 Lanas + 3 Tablones -> Cama (BT.BED)
  assert.equal(craftWoolAndPlanksToBedLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.BED), 1);
});

test('Night Zombie spawn validation finds valid collision-free ground and Daytime despawns monsters', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  ensureChunksAroundPlayer(world, pl1.pos.x, pl1.pos.z, 2);

  const spawnPt = findValidMonsterSpawnPoint(world, pl1.pos, () => 0.25);
  assert.ok(spawnPt !== null, 'Valid monster spawn point found around player');
  assert.ok(spawnPt!.y > SEA, 'Monster spawns above sea level');
  assert.equal(isSolid(world, spawnPt!.x, spawnPt!.y, spawnPt!.z), false);
  assert.equal(isSolid(world, spawnPt!.x, spawnPt!.y + 1, spawnPt!.z), false);

  const monsters: EntityData[] = [
    {
      id: 1,
      type: 'zombie',
      pos: { ...spawnPt! },
      vel: { x: 0, y: 0, z: 0 },
      state: 'chase',
      timer: 0,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      alive: true,
      hp: 14,
      maxHp: 14,
    },
  ];
  assert.equal(despawnDaytimeMonsters(monsters, 0.3).length, 1);
  assert.equal(monsters[0].alive, false);
});

test('Horse mount grants extra speed and jump velocity, and second click dismounts', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  pl1.onGround = true;

  const horse: EntityData = {
    id: 77,
    type: 'horse',
    pos: { x: pl1.pos.x + 1, y: pl1.pos.y, z: pl1.pos.z },
    vel: { x: 0, y: 0, z: 0 },
    state: 'idle',
    timer: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 20,
    maxHp: 20,
  };

  // First click mounts the horse
  assert.equal(toggleMountHorseLogic(pl1, horse), true);
  assert.equal(pl1.mountedHorseId, 77);
  assert.equal(horse.riddenByPlayer, true);

  stepPlayerPhysics(
    world,
    pl1,
    {
      fwd: true,
      back: false,
      left: false,
      right: false,
      jumpHeld: false,
      jumpJustPressed: true,
      jumpJustReleased: false,
      yaw: 0,
    },
    0.02,
    null,
    horse
  );
  assert.ok(Math.abs(pl1.vel.z) > 9.5, `Expected horse speed ${HORSE_SPEED}`);
  assert.ok(pl1.vel.y > 11.5, `Expected horse jump velocity ${HORSE_JUMP_VEL}`);

  // Second click dismounts
  assert.equal(toggleMountHorseLogic(pl1, horse), false);
  assert.equal(pl1.mountedHorseId, null);
  assert.equal(horse.riddenByPlayer, false);
});

test('Save and Load game restores player position, inventory, clothes, and modified blocks; Red Light detects movement', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  pl1.pos = { x: 14.5, y: 11, z: -22.5 };
  pl1.hp = 16;
  cyclePlayerClothesLogic(pl1);
  addItemToInventory(pl1, BT.PLANK, 12);
  sB(world, 10, 10, 10, BT.BRICK);

  const savedJson = serializeSaveGame(world, pl1, 1.25, -0.3);

  const world2 = createInfiniteWorld();
  const pl2 = createPlayer();
  const loadRes = deserializeSaveGame(savedJson, world2, pl2);
  assert.equal(loadRes.restored, true);
  assert.equal(pl2.pos.x, 14.5);
  assert.equal(pl2.pos.z, -22.5);
  assert.equal(pl2.hp, 16);
  assert.equal(pl2.clothesIdx, 1);
  assert.equal(countItemInInventory(pl2, BT.PLANK), 12);
  assert.equal(gB(world2, 10, 10, 10), BT.BRICK);

  // Red Light movement detection
  assert.equal(
    isPlayerMovingInput({
      fwd: false,
      back: false,
      left: false,
      right: false,
      jumpHeld: false,
      jumpJustPressed: false,
      jumpJustReleased: false,
      yaw: 0,
      joyX: 0,
      joyY: 0,
    }),
    false
  );
  assert.equal(
    isPlayerMovingInput({
      fwd: true,
      back: false,
      left: false,
      right: false,
      jumpHeld: false,
      jumpJustPressed: false,
      jumpJustReleased: false,
      yaw: 0,
    }),
    true
  );
  assert.equal(hasLineOfSight(world2, { x: 10, y: 10, z: 8 }, { x: 10, y: 10, z: 12 }), false);
});

test('Animals walk freely over grass steps without sinking, Tamed Wolf follows and teleports >15 blocks, and Swords/Chest/Torches/Puddles work', () => {
  const world = createInfiniteWorld();
  ensureChunksAroundPlayer(world, 0, 0, 2);
  const pl1 = createPlayer();

  // 1. Animal Y-axis collision fix & 1-block step-up
  const baseH = getH(2, 2);
  sB(world, 3, baseH + 1, 2, BT.GRASS); // 1-block grass step ahead
  sB(world, 3, baseH + 2, 2, BT.AIR);
  sB(world, 3, baseH + 3, 2, BT.AIR);

  const cow: EntityData = {
    id: 201,
    type: 'cow',
    pos: { x: 2.5, y: baseH + 0.5, z: 2.5 }, // Even if slightly sunk initially, it lifts to surface
    vel: { x: 4.0, y: 0, z: 0 },
    state: 'idle',
    timer: 2,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 10,
    maxHp: 10,
  };

  for (let i = 0; i < 6; i++) {
    stepEntityMovementWithCollision(world, cow, 0.04);
  }
  assert.ok(cow.pos.x > 3.0, 'Cow walked onto the 1-block grass step without getting stuck');
  assert.ok(cow.pos.y >= baseH + 2, 'Cow climbed onto the 1-block grass step without sinking');

  // 2. Tamed Wolf (wolf_t) active follow and >15 block teleport
  const wolf: EntityData = {
    id: 202,
    type: 'wolf_t',
    tamed: true,
    wname: 'Fenrir',
    pos: { x: 0.5, y: surfY(world, 0, 0) + 0.15, z: 6.5 },
    vel: { x: 0, y: 0, z: 0 },
    state: 'idle',
    timer: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 12,
    maxHp: 12,
  };

  const followRes = stepTamedWolfAILogic(world, wolf, pl1, [wolf], 0.05, 0);
  assert.equal(followRes.following, true, 'Tamed wolf actively follows owner when >2.1 blocks away');
  assert.ok(wolf.vel.z < 0, 'Tamed wolf moves towards player at z=0.5');

  // Move player 25 blocks away -> wolf teleports behind player
  pl1.pos = { x: 25.5, y: surfY(world, 25, 0) + 0.1, z: 0.5 };
  const tpRes = stepTamedWolfAILogic(world, wolf, pl1, [wolf], 0.05, 0);
  assert.equal(tpRes.teleported, true, 'Tamed wolf teleports when owner is >15 blocks away');
  assert.ok(Math.hypot(wolf.pos.x - pl1.pos.x, wolf.pos.z - pl1.pos.z) < 3.5);

  // 3. Swords, Chest, Torches recipes & PvP damage scaling
  addItemToInventory(pl1, BT.PLANK, 10);
  addItemToInventory(pl1, BT.STICK, 6);
  addItemToInventory(pl1, BT.STONE, 4);
  addItemToInventory(pl1, BT.WOOD, 2);

  assert.equal(craftWoodSwordLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.WOOD_SWORD), 1);

  assert.equal(craftStoneSwordLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.STONE_SWORD), 1);
  assert.equal(getPlayerAttackDamage(pl1, true), 6, 'Stone sword deals 6 HP (3 hearts) in PvP');

  assert.equal(craftChestLogic(pl1).crafted, true);
  assert.equal(countItemInInventory(pl1, BT.CHEST), 1);

  const torchRes = craftTorchesLogic(pl1);
  assert.equal(torchRes.crafted, true);
  assert.equal(torchRes.torchesTotal, 4);

  // 4. Rain puddle generation
  const puddleRes = spawnRainPuddleLogic(world, { x: 0.5, y: 10, z: 0.5 }, () => 0.25);
  if (puddleRes.spawned) {
    assert.equal(gB(world, puddleRes.x, puddleRes.y, puddleRes.z), BT.PUDDLE);
  }
});

test('Strict Red Light drops HP to 0 on WASD/Space or Mouse movement with "¡TE MOVISTE!", and HUD Compass points to Lost Villagers', () => {
  const pl = createPlayer();
  assert.equal(pl.hp, 20);

  // During Green Light, moving mouse or pressing W does not kill player
  const greenCheck = checkRedLightViolationLogic('green', pl, { keyCode: 'KeyW', movementX: 15 });
  assert.equal(greenCheck.violated, false);
  assert.equal(pl.hp, 20);

  // During Red Light, pressing W drops HP to 0 immediately with "¡TE MOVISTE!"
  const redKeyCheck = checkRedLightViolationLogic('red', pl, { keyCode: 'KeyW' });
  assert.equal(redKeyCheck.violated, true);
  assert.equal(redKeyCheck.message, '¡TE MOVISTE!');
  assert.equal(pl.hp, 0);

  // During Red Light, moving the mouse camera in PointerLock (movementX / movementY) also drops HP to 0 immediately
  pl.hp = 20;
  const redMouseCheck = checkRedLightViolationLogic('red', pl, { movementX: 4, movementY: -2 });
  assert.equal(redMouseCheck.violated, true);
  assert.equal(redMouseCheck.message, '¡TE MOVISTE!');
  assert.equal(pl.hp, 0);

  // Minimalist HUD Compass points to nearest unrescued lost villager
  const villagers: EntityData[] = LOST_VILLAGER_SPAWNS.map((lv) => ({
    id: lv.id,
    type: 'villager',
    vname: lv.name,
    rescued: false,
    pos: { x: lv.x, y: 10, z: lv.z },
    vel: { x: 0, y: 0, z: 0 },
    state: 'idle',
    timer: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 20,
    maxHp: 20,
  }));

  const compass1 = getNearestLostVillagerCompass({ x: 0.5, y: 10, z: 0.5 }, 0, villagers);
  assert.equal(compass1.allRescued, false);
  assert.equal(compass1.rescuedCount, 0);
  assert.equal(compass1.totalCount, 3);
  assert.ok(compass1.distance > 90);

  // Rescue first villager when player approaches within 5 blocks
  pl.pos = { x: villagers[0].pos.x + 1, y: 10, z: villagers[0].pos.z + 1 };
  const rescueRes = rescueVillagerLogic(villagers[0], pl);
  assert.equal(rescueRes.rescued, true);

  const compass2 = getNearestLostVillagerCompass(pl.pos, 0, villagers);
  assert.equal(compass2.rescuedCount, 1);
});

test('Build Battle mode builds flat arena with dividing wall, infinite creative inventory, AI house builder bot, 00:00 free flight, and Red Light closed arena', () => {
  const world = createInfiniteWorld();
  const pl = createPlayer();

  // 1. 6-minute timer formatting
  assert.equal(formatBuildBattleTimer(BUILD_BATTLE_DURATION_SEC), '06:00');
  assert.equal(formatBuildBattleTimer(0), '00:00');

  // 2. Build Battle flat arena with central dividing wall at x = 0
  const arena = setupBuildBattleArena(world);
  assert.equal(gB(world, -5, arena.floorY, 0), BT.GRASS);
  assert.equal(gB(world, 5, arena.floorY, 0), BT.GRASS);
  assert.equal(gB(world, 0, arena.floorY + 1, 0), BT.COBBLE, 'Central dividing wall exists at x=0');

  // 3. Infinite creative inventory (Gold, Diamond, Brick, Chair, Table)
  equipBuildBattleCreativeInventory(pl);
  assert.equal(pl.inventory[0]?.type, BT.GOLD);
  assert.equal(pl.inventory[1]?.type, BT.DIAMOND);
  assert.equal(pl.inventory[2]?.type, BT.BRICK);
  assert.equal(pl.inventory[3]?.type, BT.CHAIR);
  assert.equal(pl.inventory[4]?.type, BT.TABLE);

  // Placing block in creative mode keeps stack at 999
  pl.pos = { ...arena.playerSpawn };
  const placeRes = placeBlockLogic(world, pl, -5, arena.floorY, 0, 0, 1, 0, true);
  assert.equal(placeRes.placed, true);
  assert.equal(gB(world, -5, arena.floorY + 1, 0), BT.GOLD);
  assert.equal(pl.inventory[0]?.count, 999, 'Creative inventory does not deplete');

  // 4. AI Bot constructs a house on the right half (x > 0)
  const blueprint = getAiHouseBlueprint(arena.floorY);
  assert.ok(blueprint.length > 40);
  let idx = 0;
  while (idx < blueprint.length) {
    const step = stepAiBuilderBot(world, null, blueprint, idx);
    idx = step.nextIdx;
  }
  assert.equal(gB(world, 8, arena.floorY + 1, 0), BT.TABLE, 'AI Bot placed interior table');
  assert.equal(gB(world, 8, arena.floorY + 6, 0), BT.DIAMOND, 'AI Bot placed diamond roof finial');

  // 5. At 00:00, central dividing wall opens and players can fly freely
  openBuildBattleDividingWall(world);
  assert.equal(gB(world, 0, arena.floorY + 1, 0), BT.AIR, 'Central dividing wall opens at 00:00');
  const startY = pl.pos.y;
  stepPlayerPhysics(
    world,
    pl,
    {
      fwd: true,
      back: false,
      left: false,
      right: false,
      jumpHeld: true,
      jumpJustPressed: false,
      jumpJustReleased: false,
      yaw: 0,
      flying: true,
    },
    0.05
  );
  assert.ok(pl.pos.y > startY, 'Player flies upward freely when flying is enabled at 00:00');

  // 6. Closed Red Light Arena
  const rlArena = setupRedLightArena(world);
  assert.equal(gB(world, -8, 11, 0), BT.BRICK, 'Closed Red Light arena wall exists');
  assert.equal(gB(world, 0, 10, rlArena.finishZ), BT.GOLD, 'Red Light finish line is Gold');
});

test('Indestructible challenge maps (Red Light & Build Battle), 1 Stick + 1 Plank -> Torch recipe, and Spider 5-block Torch Repellent panic AI', () => {
  const world = createInfiniteWorld();
  const pl = createPlayer();

  // 1. Recipe: 1 Palo (BT.STICK) + 1 Tablón (BT.PLANK) -> Antorcha (BT.TORCH) without needing raw Wood
  addItemToInventory(pl, BT.STICK, 1);
  addItemToInventory(pl, BT.PLANK, 1);
  const torchCraft = craftTorchesLogic(pl);
  assert.equal(torchCraft.crafted, true, '1 Stick + 1 Plank crafts Torches');
  assert.equal(torchCraft.torchesTotal, 4);
  assert.equal(countItemInInventory(pl, BT.STICK), 0);
  assert.equal(countItemInInventory(pl, BT.PLANK), 0);

  // 2. Red Light mode: breaking and placing blocks are completely disabled
  setupRedLightArena(world);
  addItemToInventory(pl, BT.GOLD, 5);
  pl.si = pl.inventory.findIndex((s) => s && s.type === BT.GOLD);
  const rlBreak = breakBlockLogic(world, pl, 0, 10, 0, 'red_light');
  assert.equal(rlBreak.broken, false, 'Cannot break floor in Red Light');
  assert.ok(rlBreak.blockedReason);

  const rlPlace = placeBlockLogic(world, pl, 0, 10, 0, 0, 1, 0, false, 'red_light');
  assert.equal(rlPlace.placed, false, 'Cannot place blocks in Red Light');
  assert.ok(rlPlace.blockedReason);

  // 3. Build Battle mode: cannot break arena floor or central dividing wall, CAN break own placed blocks
  const arena = setupBuildBattleArena(world);
  equipBuildBattleCreativeInventory(pl);
  pl.pos = { ...arena.playerSpawn };
  const playerPlaced = new Set<string>();

  const breakFloor = breakBlockLogic(world, pl, -4, arena.floorY, 0, 'build_battle', playerPlaced);
  assert.equal(breakFloor.broken, false, 'Strictly forbidden to break Build Battle arena floor');

  const breakWall = breakBlockLogic(world, pl, 0, arena.floorY + 2, 0, 'build_battle', playerPlaced);
  assert.equal(breakWall.broken, false, 'Strictly forbidden to break Build Battle dividing wall');

  const placeOwn = placeBlockLogic(
    world,
    pl,
    -4,
    arena.floorY,
    0,
    0,
    1,
    0,
    true,
    'build_battle',
    playerPlaced
  );
  assert.equal(placeOwn.placed, true);
  assert.equal(gB(world, -4, arena.floorY + 1, 0), BT.GOLD);

  const breakOwn = breakBlockLogic(world, pl, -4, arena.floorY + 1, 0, 'build_battle', playerPlaced);
  assert.equal(breakOwn.broken, true, 'Player can break blocks they placed in Build Battle');
  assert.equal(gB(world, -4, arena.floorY + 1, 0), BT.AIR);

  // 4. Spider Torch Repellent: Spider within 5 blocks of any placed torch enters panic state, inverts direction, and flees
  sB(world, -12, arena.floorY + 1, 0, BT.TORCH);
  const torchFound = findNearestTorchWithinRadius(
    world,
    { x: -9.0, y: arena.floorY + 1, z: 0.5 },
    TORCH_REPELLENT_RADIUS
  );
  assert.ok(torchFound !== null, 'Detects torch within 5-block radius');

  const spider: EntityData = {
    id: 501,
    type: 'spider',
    pos: { x: -9.0, y: arena.floorY + 1, z: 0.5 }, // 2.5 blocks away from torch at (-11.5, y, 0.5)
    vel: { x: -4.0, y: 0, z: 0 }, // Moving toward torch
    state: 'chase',
    timer: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 12,
    maxHp: 12,
  };

  const startDistToTorch = Math.hypot(spider.pos.x - -11.5, spider.pos.z - 0.5);
  assert.ok(startDistToTorch <= 5.0);

  const combatRes = stepEnemyCombatLogic(world, spider, pl, 0.05);
  assert.equal(combatRes.spiderPanicked, true, 'Spider panics when within 5 blocks of a torch');
  assert.equal(spider.state, 'panic');
  assert.ok(spider.vel.x > 0, 'Spider inverted movement direction to flee away from the torch at x=-11.5');

  for (let i = 0; i < 15; i++) {
    stepEnemyCombatLogic(world, spider, pl, 0.05);
    stepEntityMovementWithCollision(world, spider, 0.05);
  }
  const endDistToTorch = Math.hypot(spider.pos.x - -11.5, spider.pos.z - 0.5);
  assert.ok(endDistToTorch > 5.0, 'Spider fled outside the 5-block illuminated torch radius');
});




