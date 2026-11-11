import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BT,
  SEA,
  VX,
  VZ,
  MAX_ENDERMEN,
  ENDERMAN_SPAWN_CHANCE,
  MAX_SPIDERS,
  LOST_VILLAGER_ISLANDS,
  createInfiniteWorld,
  ensureChunksAroundPlayer,
  createPlayer,
  nearestPlayer,
  gB,
  sB,
  getH,
  breakBlockLogic,
  placeBlockLogic,
  addItemToInventory,
  craftWoodToPlanksLogic,
  craftPlanksToBoatLogic,
  placeBoatInWaterLogic,
  mountBoatLogic,
  interactVillagerRescueLogic,
  countItemInInventory,
  hasLineOfSight,
  despawnDaytimeMonsters,
  getDistanceToVillage,
  tameWolfLogic,
  damageEntityLogic,
  stepPlayerPhysics,
  generateRoomCode,
  normalizeRoomCode,
  type EntityData,
  type BoatData,
} from './voxelWorldLogic';

test('Survival player starts with completely empty Hotbar/Inventory and far from the Village', () => {
  const pl1 = createPlayer();
  assert.equal(pl1.hp, 20);
  assert.equal(pl1.sel, 0);
  assert.equal(pl1.inBoat, false);
  assert.equal(pl1.villagersRescued, 0);
  assert.ok(
    pl1.inventory.every((slot) => slot === null),
    'All hotbar and inventory slots start empty'
  );
  const distToVil = getDistanceToVillage(pl1.pos);
  assert.ok(distToVil > 180, `Village should be far from spawn (got ${distToVil}m)`);
});

test('Infinite chunks generate at negative and far positive coordinates with large oceans, rescue islands, and village', () => {
  const world = createInfiniteWorld();
  ensureChunksAroundPlayer(world, 0, 0, 2);
  const negBlock = gB(world, -25, 0, -25);
  assert.equal(negBlock, BT.BEDROCK);

  let foundOceanWater = false;
  for (let d = 18; d <= 36; d += 3) {
    if (gB(world, d, SEA, 0) === BT.WATER) {
      foundOceanWater = true;
      break;
    }
  }
  assert.equal(foundOceanWater, true, 'Large ocean water exists around starter island');

  // Check lost villager islands are above sea level
  for (const isl of LOST_VILLAGER_ISLANDS) {
    assert.ok(getH(isl.x, isl.z) > SEA, `Island ${isl.name} should be above sea level`);
  }

  // Check far village at (VX, VZ)
  assert.equal(gB(world, VX + 9, SEA + 2, VZ + 9), BT.COBBLE);
});

test('Breaking blocks adds them to inventory and placing consumes them; crafting turns 1 Wood into 4 Planks', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();

  const emptyPlace = placeBlockLogic(world, pl1, 2, SEA + 1, 2, 0, 1, 0);
  assert.equal(emptyPlace.placed, false);

  const treeY = getH(4, 4) + 1;
  sB(world, 4, treeY, 4, BT.WOOD);
  const breakRes = breakBlockLogic(world, pl1, 4, treeY, 4);
  assert.equal(breakRes.broken, true);
  assert.equal(breakRes.collected, true);
  assert.equal(countItemInInventory(pl1, BT.WOOD), 1);
  assert.equal(pl1.sel, BT.WOOD);

  const craftRes = craftWoodToPlanksLogic(pl1);
  assert.equal(craftRes.crafted, true);
  assert.equal(craftRes.woodRemaining, 0);
  assert.equal(craftRes.planksTotal, 4);
  assert.equal(pl1.sel, BT.PLANK);

  const groundY = getH(3, 3);
  const placeRes = placeBlockLogic(world, pl1, 3, groundY, 3, 0, 1, 0);
  assert.equal(placeRes.placed, true);
  assert.equal(gB(world, 3, groundY + 1, 3), BT.PLANK);
  assert.equal(countItemInInventory(pl1, BT.PLANK), 3);
});

test('Boat crafting (5 Planks -> 1 Boat), water placement, sailing, and Villager Rescue mechanics', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  const boats: BoatData[] = [];

  // Need 5 planks to craft a boat
  addItemToInventory(pl1, BT.PLANK, 4);
  assert.equal(craftPlanksToBoatLogic(pl1).crafted, false);

  addItemToInventory(pl1, BT.PLANK, 1); // Now 5 planks
  const boatCraft = craftPlanksToBoatLogic(pl1);
  assert.equal(boatCraft.crafted, true);
  assert.equal(boatCraft.planksRemaining, 0);
  assert.equal(boatCraft.boatsTotal, 1);

  // Place boat in ocean water at (20, SEA, 0)
  const placed = placeBoatInWaterLogic(world, pl1, boats, 20, 0, 1);
  assert.equal(placed.placed, true);
  assert.equal(boats.length, 1);

  // Move player near boat and mount it
  pl1.pos = { x: boats[0].pos.x + 1, y: SEA + 1, z: boats[0].pos.z };
  assert.equal(mountBoatLogic(pl1, boats[0]), true);
  assert.equal(pl1.inBoat, true);

  // Sail near a lost villager on Island 0
  const isl = LOST_VILLAGER_ISLANDS[0];
  const lostVillagers: EntityData[] = [
    {
      id: 101,
      type: 'villager',
      pos: { x: isl.x, y: getH(isl.x, isl.z) + 1, z: isl.z },
      vel: { x: 0, y: 0, z: 0 },
      state: 'idle',
      timer: 0,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      alive: true,
      hp: 15,
      maxHp: 15,
      rescued: false,
      inBoat: false,
    },
  ];

  pl1.pos = { x: isl.x - 2, y: SEA + 0.55, z: isl.z - 2 };
  boats[0].pos = { ...pl1.pos };

  // Click to rescue villager into boat as passenger
  const boardRes = interactVillagerRescueLogic(pl1, boats[0], lostVillagers);
  assert.equal(boardRes.action, 'boarded');
  assert.equal(lostVillagers[0].inBoat, true);
  assert.equal(boats[0].passengerVillagerId, 101);

  // Sail to Village (VX, VZ) and click to disembark & complete rescue
  pl1.pos = { x: VX + 2, y: SEA + 0.55, z: VZ + 2 };
  boats[0].pos = { ...pl1.pos };
  const rescueRes = interactVillagerRescueLogic(pl1, boats[0], lostVillagers);
  assert.equal(rescueRes.action, 'rescued');
  assert.equal(lostVillagers[0].inBoat, false);
  assert.equal(lostVillagers[0].rescued, true);
  assert.equal(pl1.villagersRescued, 1);
});

test('hasLineOfSight blocks enemy attacks through solid walls or shelter cubes', () => {
  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  const baseY = getH(0, 0) + 1;
  pl1.pos = { x: 0.5, y: baseY, z: 0.5 };
  const enemyPos = { x: 3.5, y: baseY, z: 0.5 };

  for (let x = 0; x <= 4; x++) {
    sB(world, x, baseY, 0, BT.AIR);
    sB(world, x, baseY + 1, 0, BT.AIR);
    sB(world, x, baseY + 2, 0, BT.AIR);
  }
  assert.equal(hasLineOfSight(world, enemyPos, pl1.pos), true);

  sB(world, 2, baseY, 0, BT.PLANK);
  sB(world, 2, baseY + 1, 0, BT.PLANK);
  sB(world, 2, baseY + 2, 0, BT.PLANK);
  assert.equal(
    hasLineOfSight(world, enemyPos, pl1.pos),
    false,
    'Enemy cannot see or attack player through solid wall'
  );
});

test('Day/Night rule immediately despawns zombies, spiders, and endermen during daytime and keeps Endermen ultra-rare', () => {
  assert.equal(MAX_ENDERMEN, 1);
  assert.ok(ENDERMAN_SPAWN_CHANCE <= 0.05, 'Enderman spawn chance is minimal');
  assert.ok(MAX_SPIDERS >= 6, 'Spiders have constant nighttime cap');

  const entities: EntityData[] = [
    {
      id: 1,
      type: 'zombie',
      pos: { x: 5, y: 8, z: 5 },
      vel: { x: 0, y: 0, z: 0 },
      state: 'chase',
      timer: 0,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      alive: true,
      hp: 3,
      maxHp: 3,
    },
    {
      id: 2,
      type: 'spider',
      pos: { x: 7, y: 8, z: 7 },
      vel: { x: 0, y: 0, z: 0 },
      state: 'chase',
      timer: 0,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      alive: true,
      hp: 10,
      maxHp: 10,
    },
    {
      id: 3,
      type: 'enderman',
      pos: { x: 8, y: 8, z: 8 },
      vel: { x: 0, y: 0, z: 0 },
      state: 'chase',
      timer: 0,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      alive: true,
      hp: 8,
      maxHp: 8,
    },
    {
      id: 4,
      type: 'wolf',
      pos: { x: 6, y: 8, z: 6 },
      vel: { x: 0, y: 0, z: 0 },
      state: 'idle',
      timer: 0,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      alive: true,
      hp: 5,
      maxHp: 5,
    },
  ];

  const nightDespawned = despawnDaytimeMonsters(entities, 0.85);
  assert.equal(nightDespawned.length, 0);

  const dayDespawned = despawnDaytimeMonsters(entities, 0.3);
  assert.equal(dayDespawned.length, 3);
  assert.equal(entities[0].alive, false);
  assert.equal(entities[1].alive, false);
  assert.equal(entities[2].alive, false);
  assert.equal(entities[3].alive, true, 'Wolves remain alive during daytime');
});

test('Room code generation, nearestPlayer, wolf taming, and infinite movement work', () => {
  const roomCode = generateRoomCode();
  assert.equal(roomCode.length, 5);
  assert.equal(normalizeRoomCode(' ab-9k2 '), 'AB9K2');

  const world = createInfiniteWorld();
  const pl1 = createPlayer();
  pl1.pos = { x: -120.5, y: getH(-121, -121) + 1, z: -120.5 };

  const res = nearestPlayer({ x: -117.5, y: pl1.pos.y, z: -116.5 }, pl1);
  assert.strictEqual(res.pl, pl1);
  assert.equal(res.dist, 5);

  stepPlayerPhysics(
    world,
    pl1,
    {
      fwd: true,
      back: false,
      left: false,
      right: false,
      jumpHeld: false,
      jumpJustPressed: false,
      jumpJustReleased: false,
      yaw: 0,
    },
    0.04
  );
  assert.ok(pl1.pos.z < -120.5, 'Player moves freely in negative coordinates');

  const wolf: EntityData = {
    id: 10,
    type: 'wolf',
    pos: { x: 0, y: 8, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    state: 'idle',
    timer: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    alive: true,
    hp: 5,
    maxHp: 5,
  };
  assert.equal(tameWolfLogic(wolf, pl1, 'Fantasma').tamed, true);
  assert.equal(damageEntityLogic(wolf, pl1, 0.9).defeated, false);
});
