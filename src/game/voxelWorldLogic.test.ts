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
