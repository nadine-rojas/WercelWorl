export const BT = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  LEAVES: 6,
  SNOW: 7,
  WATER: 8,
  GLASS: 9,
  LAVA: 10,
  BEDROCK: 11,
  PLANK: 12,
  COBBLE: 13,
  BRICK: 14,
  BED: 15,
  TABLE: 16,
  ICE: 17,
  DOOR: 18,
  BOAT: 19,
  WOOL: 20,
  STICK: 21,
  WOOD_PICKAXE: 22,
  STONE_PICKAXE: 23,
  DOOR_OPEN: 24,
} as const;

export type BlockType = (typeof BT)[keyof typeof BT];

export interface BlockDef {
  n: string;
  c: number;
  ic: string;
  tr?: number;
  op?: number;
  em?: number;
  role: string;
  isItemOnly?: boolean;
}

export const BD: Record<number, BlockDef> = {
  1: { n: 'Pasto', c: 0x5dbb40, ic: '🟩', role: 'Terreno natural' },
  2: { n: 'Tierra', c: 0x9b6b3a, ic: '🟫', role: 'Base de suelo' },
  3: { n: 'Piedra', c: 0x7a7a7a, ic: '🪨', role: 'Muro y herramientas' },
  4: { n: 'Arena', c: 0xe8d68a, ic: '🟨', role: 'Costa y océano' },
  5: { n: 'Madera', c: 0x7a5230, ic: '🪵', role: 'Tronco para craftear' },
  6: { n: 'Hojas', c: 0x2e7020, ic: '🌿', tr: 1, op: 0.85, role: 'Follaje de árbol' },
  7: { n: 'Nieve', c: 0xf0f0f8, ic: '❄️', role: 'Cumbre helada' },
  8: { n: 'Agua', c: 0x1a55cc, ic: '💧', tr: 1, op: 0.58, role: 'Océano profundo' },
  9: { n: 'Vidrio', c: 0xaaddff, ic: '🔷', tr: 1, op: 0.42, role: 'Ventana cristalina' },
  10: { n: 'Lava', c: 0xff4400, ic: '🔥', em: 0x661800, role: 'Magma luminoso' },
  11: { n: 'Roca Madre', c: 0x333333, ic: '⬛', role: 'Fondo abisal' },
  12: { n: 'Tablones', c: 0xcc9955, ic: '📦', role: 'Construcción y crafteo' },
  13: { n: 'Adoquín', c: 0x888888, ic: '🧱', role: 'Piedra labrada' },
  14: { n: 'Ladrillo', c: 0xcc5533, ic: '🧱', role: 'Pared reforzada' },
  15: { n: 'Cama', c: 0xdd3333, ic: '🛏️', role: 'Descanso nocturno' },
  16: { n: 'Mesa de Crafteo', c: 0xbb8833, ic: '🪑', role: 'Menú de crafteo avanzado' },
  17: { n: 'Hielo', c: 0xaaddff, ic: '🧊', tr: 1, op: 0.78, role: 'Superficie glaciar' },
  18: { n: 'Puerta', c: 0x996633, ic: '🚪', role: 'Puerta doble de 2 bloques' },
  19: { n: 'Bote', c: 0x9c6630, ic: '⛵', role: 'Navegación rápida', isItemOnly: true },
  20: { n: 'Lana', c: 0xf5f5f5, ic: '🧶', role: 'Drop de oveja para Cama' },
  21: { n: 'Palos', c: 0x8b5a2b, ic: '🥢', role: 'Mango de herramientas', isItemOnly: true },
  22: { n: 'Pico de Madera', c: 0xc68b59, ic: '⛏️', role: 'Pica piedra rápido (x2)', isItemOnly: true },
  23: { n: 'Pico de Piedra', c: 0x94a3b8, ic: '⚒️', role: 'Pica piedra muy rápido (x3)', isItemOnly: true },
  24: { n: 'Puerta Abierta', c: 0x996633, ic: '🚪', tr: 1, op: 0.9, role: 'Puerta abierta (paso libre)' },
};

// Nota: BT.DOOR_OPEN (24) NO está en SOLID_SET para que el jugador pueda atravesarla al abrirla
export const SOLID_SET = new Set<number>([
  BT.GRASS,
  BT.DIRT,
  BT.STONE,
  BT.SAND,
  BT.WOOD,
  BT.SNOW,
  BT.BEDROCK,
  BT.PLANK,
  BT.COBBLE,
  BT.BRICK,
  BT.BED,
  BT.TABLE,
  BT.ICE,
  BT.DOOR,
  BT.WOOL,
]);

export const CHUNK_SIZE = 16;
export const WH = 24;
export const SEA = 6;

// Punto de aparición del jugador en el Continente Inicial (0.5, y, 0.5)
export const SPAWN_X = 0.5;
export const SPAWN_Z = 0.5;

// Balance de Enemigos Nocturnos:
export const MAX_ENDERMEN = 1;
export const ENDERMAN_SPAWN_CHANCE = 0.03;
export const MAX_ZOMBIES = 12;
export const MAX_SPIDERS = 8;

// Velocidades de locomoción y monturas
export const BOAT_SPEED = 11.8;
export const HORSE_SPEED = 10.6;
export const HORSE_JUMP_VEL = 13.0;

export const HOTBAR_SIZE = 9;
export const BACKPACK_SIZE = 9;
export const TOTAL_INV_SLOTS = HOTBAR_SIZE + BACKPACK_SIZE;
export const MAX_STACK = 64;

export const CLOTHES_PALETTE: Array<{ name: string; hex: number; css: string }> = [
  { name: 'Cian Neón', hex: 0x0ea5e9, css: '#0ea5e9' },
  { name: 'Esmeralda', hex: 0x10b981, css: '#10b981' },
  { name: 'Carmesí', hex: 0xef4444, css: '#ef4444' },
  { name: 'Violeta', hex: 0xa855f7, css: '#a855f7' },
  { name: 'Ámbar Oro', hex: 0xf59e0b, css: '#f59e0b' },
  { name: 'Rosa Neón', hex: 0xec4899, css: '#ec4899' },
];

export const SAVE_STORAGE_KEY = 'voxelworld_save_v1';

export interface InventorySlot {
  type: number;
  count: number;
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface BoatData {
  id: number;
  pos: Vec3Like;
  yaw: number;
}

export interface PlayerState {
  pos: Vec3Like;
  vel: Vec3Like;
  onGround: boolean;
  eyeH: number;
  si: number; // Selected hotbar index (0..8)
  inventory: Array<InventorySlot | null>; // 0..8 = Hotbar, 9..17 = Mochila
  readonly sel: number; // BlockType in active hand (or 0 if empty)
  hp: number;
  maxHp: number;
  bones: number;
  invul: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  stepDistAccum: number;
  score: number;
  blocksBroken: number;
  blocksPlaced: number;
  enemiesDefeated: number;
  inBoat: boolean;
  activeBoatId: number | null;
  mountedHorseId: number | null;
  clothesIdx: number;
  clothesColor: number;
}

export interface EntityData {
  id: number;
  type:
    | 'fish'
    | 'shark'
    | 'zombie'
    | 'spider'
    | 'wolf'
    | 'wolf_t'
    | 'cow'
    | 'sheep'
    | 'chicken'
    | 'horse'
    | 'enderman';
  pos: Vec3Like;
  vel: Vec3Like;
  state: 'idle' | 'chase' | 'windup' | 'ko';
  timer: number;
  windupTimer: number;
  hitFlashTimer: number;
  koTimer: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  tamed?: boolean;
  wname?: string;
  jumpCd?: number;
  riddenByPlayer?: boolean;
}

/**
 * Genera un código corto de sala (5 caracteres alfanuméricos en mayúsculas)
 */
export function generateRoomCode(rng: () => number = Math.random): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(rng() * chars.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/**
 * Mundo Infinito basado en Chunks de 16x16xWH con persistencia de bloques modificados
 */
export interface InfiniteWorld {
  chunks: Map<string, Uint8Array>;
  modified: Map<string, number>;
}

export function createInfiniteWorld(): InfiniteWorld {
  return {
    chunks: new Map<string, Uint8Array>(),
    modified: new Map<string, number>(),
  };
}

export function chunkCoord(w: number): number {
  return Math.floor(w / CHUNK_SIZE);
}

export function localCoord(w: number): number {
  return ((Math.floor(w) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function blockKey(x: number, y: number, z: number): string {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

export function localIdx(lx: number, y: number, lz: number): number {
  return y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
}

export function rh(n: number): number {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

export function ni(x: number, z: number, f: number, s = 0): number {
  x *= f;
  z *= f;
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = rh(ix + iz * 1319 + s);
  const b = rh(ix + 1 + iz * 1319 + s);
  const c = rh(ix + (iz + 1) * 1319 + s);
  const d = rh(ix + 1 + (iz + 1) * 1319 + s);
  return a + (b - a) * ux + (c - a) * uz + (d - c) * ux * uz;
}

/**
 * Requisito 6/8: Escala del ruido modificada para generar Islas Gigantes y Continentes Masivos
 * - Baja frecuencia continental (0.005) crea masas de tierra extensas de decenas de bloques
 * - Garantiza una gran isla/continente inicial alrededor de (0, 0) con llanuras para caballos, ovejas y árboles
 */
export function getH(x: number, z: number): number {
  const distSpawn = Math.hypot(x - SPAWN_X, z - SPAWN_Z);
  // Gran meseta continental inicial (~32 bloques de radio) para explorar, montar caballos y construir
  if (distSpawn < 28) {
    const gentleHills = ni(x, z, 0.06, 101) * 3.0;
    const falloff = Math.max(0, 1 - distSpawn / 28);
    return Math.floor(SEA + 2 + falloff * 2.2 + gentleHills * 0.65);
  }

  // Escala continental muy amplia (frecuencia 0.0048) para formar islas gigantes y continentes masivos
  const macroContinent = ni(x, z, 0.0048, 777);
  const subContinent = ni(x, z, 0.016, 313);
  const hills = ni(x, z, 0.055, 919);

  const rawElevation = (macroContinent - 0.42) * 18 + (subContinent - 0.45) * 7 + hills * 2.4;
  const h = Math.round(SEA + rawElevation);
  return Math.max(1, Math.min(WH - 5, h));
}

function setChunkBlockRaw(chunk: Uint8Array, lx: number, y: number, lz: number, t: number): void {
  if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= WH) return;
  chunk[localIdx(lx, y, lz)] = t;
}

export function generateChunkData(world: InfiniteWorld, cx: number, cz: number): Uint8Array {
  const key = chunkKey(cx, cz);
  const existing = world.chunks.get(key);
  if (existing) return existing;

  const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WH);
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;

      const h = getH(wx, wz);
      const isSea = h <= SEA;
      const isSnow = h > SEA + 9;

      setChunkBlockRaw(chunk, lx, 0, lz, BT.BEDROCK);
      for (let y = 1; y <= h; y++) {
        if (y === h) {
          setChunkBlockRaw(chunk, lx, y, lz, isSea ? BT.SAND : isSnow ? BT.SNOW : BT.GRASS);
        } else if (y >= h - 2) {
          setChunkBlockRaw(chunk, lx, y, lz, isSea ? BT.SAND : BT.DIRT);
        } else {
          setChunkBlockRaw(chunk, lx, y, lz, BT.STONE);
        }
      }

      if (isSea) {
        for (let y = h + 1; y <= SEA; y++) {
          setChunkBlockRaw(chunk, lx, y, lz, BT.WATER);
        }
      }

      if (isSnow && ni(wx, wz, 0.2, 333) > 0.62) {
        setChunkBlockRaw(chunk, lx, h, lz, BT.ICE);
      }
    }
  }

  // Árboles deterministas por chunk (incluyendo árboles cercanos al spawn)
  for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
    for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;

      const isStarterTree = (wx === 4 && wz === 4) || (wx === -5 && wz === 4) || (wx === 6 && wz === -5);
      const treeRoll = rh(wx * 127.1 + wz * 311.7);
      if (!isStarterTree && treeRoll < 0.968) continue;

      if (Math.abs(wx) <= 1 && Math.abs(wz) <= 1) continue;

      const th = getH(wx, wz);
      if (th <= SEA || th >= WH - 8) continue;
      if (chunk[localIdx(lx, th, lz)] !== BT.GRASS) continue;

      const trunkH = 4 + Math.floor(rh(wx * 19.3 + wz * 47.1) * 2);
      for (let y = th + 1; y <= th + trunkH; y++) {
        setChunkBlockRaw(chunk, lx, y, lz, BT.WOOD);
      }
      const top = th + trunkH;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = -1; dy <= 2; dy++) {
            if (Math.hypot(dx, dz) < 2.4) {
              const tx = lx + dx;
              const tz = lz + dz;
              const ty = top + dy;
              if (
                tx >= 0 &&
                tx < CHUNK_SIZE &&
                tz >= 0 &&
                tz < CHUNK_SIZE &&
                ty > 0 &&
                ty < WH &&
                chunk[localIdx(tx, ty, tz)] === BT.AIR
              ) {
                setChunkBlockRaw(chunk, tx, ty, tz, BT.LEAVES);
              }
            }
          }
        }
      }
    }
  }

  // Reaplicar bloques modificados en este chunk
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;
      for (let y = 0; y < WH; y++) {
        const mod = world.modified.get(blockKey(wx, y, wz));
        if (mod !== undefined) {
          setChunkBlockRaw(chunk, lx, y, lz, mod);
        }
      }
    }
  }

  world.chunks.set(key, chunk);
  return chunk;
}

/**
 * Genera chunks cercanos y descarga (despawn) los chunks lejanos para mantener FPS estables
 */
export function ensureChunksAroundPlayer(
  world: InfiniteWorld,
  px: number,
  pz: number,
  radius = 3
): { addedKeys: string[]; removedKeys: string[] } {
  const pcx = chunkCoord(px);
  const pcz = chunkCoord(pz);
  const needed = new Set<string>();
  const addedKeys: string[] = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const cx = pcx + dx;
      const cz = pcz + dz;
      const k = chunkKey(cx, cz);
      needed.add(k);
      if (!world.chunks.has(k)) {
        generateChunkData(world, cx, cz);
        addedKeys.push(k);
      }
    }
  }

  const removedKeys: string[] = [];
  for (const k of world.chunks.keys()) {
    if (!needed.has(k)) {
      world.chunks.delete(k);
      removedKeys.push(k);
    }
  }

  return { addedKeys, removedKeys };
}

export function gB(world: InfiniteWorld, x: number, y: number, z: number): number {
  const iy = Math.floor(y);
  if (iy < 0) return BT.BEDROCK;
  if (iy >= WH) return BT.AIR;
  const ix = Math.floor(x);
  const iz = Math.floor(z);

  const mod = world.modified.get(blockKey(ix, iy, iz));
  if (mod !== undefined) return mod;

  const cx = chunkCoord(ix);
  const cz = chunkCoord(iz);
  let chunk = world.chunks.get(chunkKey(cx, cz));
  if (!chunk) {
    chunk = generateChunkData(world, cx, cz);
  }
  return chunk[localIdx(localCoord(ix), iy, localCoord(iz))];
}

export function sB(world: InfiniteWorld, x: number, y: number, z: number, t: number): void {
  const iy = Math.floor(y);
  if (iy < 0 || iy >= WH) return;
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  world.modified.set(blockKey(ix, iy, iz), t);

  const cx = chunkCoord(ix);
  const cz = chunkCoord(iz);
  const chunk = world.chunks.get(chunkKey(cx, cz));
  if (chunk) {
    chunk[localIdx(localCoord(ix), iy, localCoord(iz))] = t;
  }
}

export function isSolid(world: InfiniteWorld, x: number, y: number, z: number): boolean {
  return SOLID_SET.has(gB(world, x, y, z));
}

export function getSpawnY(): number {
  return getH(Math.floor(SPAWN_X), Math.floor(SPAWN_Z)) + 1.05;
}

export function createPlayer(): PlayerState {
  const emptyInv: Array<InventorySlot | null> = Array.from(
    { length: TOTAL_INV_SLOTS },
    () => null
  );
  return {
    pos: { x: SPAWN_X, y: getSpawnY(), z: SPAWN_Z },
    vel: { x: 0, y: 0, z: 0 },
    onGround: false,
    eyeH: 1.65,
    si: 0,
    inventory: emptyInv,
    get sel() {
      const slot = this.inventory[this.si];
      return slot && slot.count > 0 ? slot.type : 0;
    },
    hp: 20,
    maxHp: 20,
    bones: 3,
    invul: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    stepDistAccum: 0,
    score: 0,
    blocksBroken: 0,
    blocksPlaced: 0,
    enemiesDefeated: 0,
    inBoat: false,
    activeBoatId: null,
    mountedHorseId: null,
    clothesIdx: 0,
    clothesColor: CLOTHES_PALETTE[0].hex,
  };
}

/**
 * Requisito 7: Cambiar color de ropa del personaje
 */
export function cyclePlayerClothesLogic(pl: PlayerState): {
  clothesIdx: number;
  clothesColor: number;
  name: string;
  css: string;
} {
  pl.clothesIdx = (pl.clothesIdx + 1) % CLOTHES_PALETTE.length;
  const entry = CLOTHES_PALETTE[pl.clothesIdx];
  pl.clothesColor = entry.hex;
  return {
    clothesIdx: pl.clothesIdx,
    clothesColor: pl.clothesColor,
    name: entry.name,
    css: entry.css,
  };
}

export function addItemToInventory(
  pl: PlayerState,
  blockType: number,
  amount = 1
): { added: number; overflow: number } {
  if (blockType <= 0 || amount <= 0) return { added: 0, overflow: 0 };
  let remaining = amount;

  for (let i = 0; i < pl.inventory.length && remaining > 0; i++) {
    const slot = pl.inventory[i];
    if (slot && slot.type === blockType && slot.count < MAX_STACK) {
      const canAdd = Math.min(remaining, MAX_STACK - slot.count);
      slot.count += canAdd;
      remaining -= canAdd;
    }
  }

  for (let i = 0; i < pl.inventory.length && remaining > 0; i++) {
    if (!pl.inventory[i] || pl.inventory[i]!.count <= 0) {
      const canAdd = Math.min(remaining, MAX_STACK);
      pl.inventory[i] = { type: blockType, count: canAdd };
      remaining -= canAdd;
    }
  }

  return { added: amount - remaining, overflow: remaining };
}

export function countItemInInventory(pl: PlayerState, blockType: number): number {
  let total = 0;
  for (let i = 0; i < pl.inventory.length; i++) {
    const slot = pl.inventory[i];
    if (slot && slot.type === blockType) {
      total += slot.count;
    }
  }
  return total;
}

export function consumeItemFromInventory(
  pl: PlayerState,
  blockType: number,
  amount = 1
): boolean {
  if (countItemInInventory(pl, blockType) < amount) return false;
  let remaining = amount;
  for (let i = 0; i < pl.inventory.length && remaining > 0; i++) {
    const slot = pl.inventory[i];
    if (slot && slot.type === blockType) {
      const take = Math.min(remaining, slot.count);
      slot.count -= take;
      remaining -= take;
      if (slot.count <= 0) {
        pl.inventory[i] = null;
      }
    }
  }
  return true;
}

export function swapInventorySlots(pl: PlayerState, idxA: number, idxB: number): void {
  if (
    idxA < 0 ||
    idxA >= pl.inventory.length ||
    idxB < 0 ||
    idxB >= pl.inventory.length ||
    idxA === idxB
  ) {
    return;
  }
  const tmp = pl.inventory[idxA];
  pl.inventory[idxA] = pl.inventory[idxB];
  pl.inventory[idxB] = tmp;
}

function iInHotbar(s: InventorySlot | null): boolean {
  return !!s && s.count > 0;
}

/**
 * Receta 1: 1 Madera ➔ 4 Tablones
 */
export function craftWoodToPlanksLogic(pl: PlayerState): {
  crafted: boolean;
  woodRemaining: number;
  planksTotal: number;
} {
  if (!consumeItemFromInventory(pl, BT.WOOD, 1)) {
    return {
      crafted: false,
      woodRemaining: countItemInInventory(pl, BT.WOOD),
      planksTotal: countItemInInventory(pl, BT.PLANK),
    };
  }
  addItemToInventory(pl, BT.PLANK, 4);
  pl.score += 10;

  const currentSlot = pl.inventory[pl.si];
  if (!currentSlot) {
    const plankIdx = pl.inventory.findIndex((s) => s && s.type === BT.PLANK && iInHotbar(s));
    if (plankIdx >= 0 && plankIdx < HOTBAR_SIZE) {
      pl.si = plankIdx;
    }
  }

  return {
    crafted: true,
    woodRemaining: countItemInInventory(pl, BT.WOOD),
    planksTotal: countItemInInventory(pl, BT.PLANK),
  };
}

/**
 * Crear Mesa de Crafteo: 4 Tablones ➔ 1 Mesa de Crafteo (BT.TABLE)
 */
export function craftPlanksToTableLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (!consumeItemFromInventory(pl, BT.PLANK, 4)) {
    return { crafted: false };
  }
  addItemToInventory(pl, BT.TABLE, 1);
  pl.score += 15;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.TABLE && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta 2: 2 Tablones ➔ 4 Palos (BT.STICK)
 */
export function craftPlanksToSticksLogic(pl: PlayerState): {
  crafted: boolean;
  sticksTotal: number;
} {
  if (!consumeItemFromInventory(pl, BT.PLANK, 2)) {
    return { crafted: false, sticksTotal: countItemInInventory(pl, BT.STICK) };
  }
  addItemToInventory(pl, BT.STICK, 4);
  pl.score += 10;
  return { crafted: true, sticksTotal: countItemInInventory(pl, BT.STICK) };
}

/**
 * Receta 3: 3 Tablones + 2 Palos ➔ 1 Pico de Madera (BT.WOOD_PICKAXE)
 */
export function craftWoodPickaxeLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (
    countItemInInventory(pl, BT.PLANK) < 3 ||
    countItemInInventory(pl, BT.STICK) < 2
  ) {
    return { crafted: false };
  }
  consumeItemFromInventory(pl, BT.PLANK, 3);
  consumeItemFromInventory(pl, BT.STICK, 2);
  addItemToInventory(pl, BT.WOOD_PICKAXE, 1);
  pl.score += 25;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.WOOD_PICKAXE && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta 4: 3 Piedras + 2 Palos ➔ 1 Pico de Piedra (BT.STONE_PICKAXE)
 */
export function craftStonePickaxeLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (
    countItemInInventory(pl, BT.STONE) < 3 ||
    countItemInInventory(pl, BT.STICK) < 2
  ) {
    return { crafted: false };
  }
  consumeItemFromInventory(pl, BT.STONE, 3);
  consumeItemFromInventory(pl, BT.STICK, 2);
  addItemToInventory(pl, BT.STONE_PICKAXE, 1);
  pl.score += 40;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.STONE_PICKAXE && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta 5: 5 Tablones ➔ 1 Bote (BT.BOAT)
 */
export function craftPlanksToBoatLogic(pl: PlayerState): {
  crafted: boolean;
  planksRemaining: number;
  boatsTotal: number;
} {
  if (!consumeItemFromInventory(pl, BT.PLANK, 5)) {
    return {
      crafted: false,
      planksRemaining: countItemInInventory(pl, BT.PLANK),
      boatsTotal: countItemInInventory(pl, BT.BOAT),
    };
  }
  addItemToInventory(pl, BT.BOAT, 1);
  pl.score += 25;

  const boatIdx = pl.inventory.findIndex((s) => s && s.type === BT.BOAT && iInHotbar(s));
  if (boatIdx >= 0 && boatIdx < HOTBAR_SIZE) {
    pl.si = boatIdx;
  }

  return {
    crafted: true,
    planksRemaining: countItemInInventory(pl, BT.PLANK),
    boatsTotal: countItemInInventory(pl, BT.BOAT),
  };
}

/**
 * Receta 6: 3 Lanas + 3 Tablones ➔ 1 Cama (BT.BED)
 */
export function craftWoolAndPlanksToBedLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (
    countItemInInventory(pl, BT.WOOL) < 3 ||
    countItemInInventory(pl, BT.PLANK) < 3
  ) {
    return { crafted: false };
  }
  consumeItemFromInventory(pl, BT.WOOL, 3);
  consumeItemFromInventory(pl, BT.PLANK, 3);
  addItemToInventory(pl, BT.BED, 1);
  pl.score += 35;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.BED && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

export function craftPlanksToDoorLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (!consumeItemFromInventory(pl, BT.PLANK, 2)) {
    return { crafted: false };
  }
  addItemToInventory(pl, BT.DOOR, 1);
  pl.score += 15;
  return { crafted: true };
}

export function placeBoatInWaterLogic(
  world: InfiniteWorld,
  pl: PlayerState,
  boats: BoatData[],
  targetX: number,
  targetZ: number,
  nextBoatId: number
): { placed: boolean; boat?: BoatData } {
  if (!consumeItemFromInventory(pl, BT.BOAT, 1)) {
    return { placed: false };
  }
  let waterX = Math.floor(targetX) + 0.5;
  let waterZ = Math.floor(targetZ) + 0.5;
  let foundWater = false;

  for (let r = 0; r <= 3 && !foundWater; r++) {
    for (let dx = -r; dx <= r && !foundWater; dx++) {
      for (let dz = -r; dz <= r && !foundWater; dz++) {
        const cx = Math.floor(targetX) + dx;
        const cz = Math.floor(targetZ) + dz;
        if (gB(world, cx, SEA, cz) === BT.WATER) {
          waterX = cx + 0.5;
          waterZ = cz + 0.5;
          foundWater = true;
        }
      }
    }
  }

  if (!foundWater) {
    addItemToInventory(pl, BT.BOAT, 1);
    return { placed: false };
  }

  const boat: BoatData = {
    id: nextBoatId,
    pos: { x: waterX, y: SEA + 0.35, z: waterZ },
    yaw: 0,
  };
  boats.push(boat);
  return { placed: true, boat };
}

export function mountBoatLogic(pl: PlayerState, boat: BoatData): boolean {
  const dist = Math.hypot(pl.pos.x - boat.pos.x, pl.pos.z - boat.pos.z);
  if (dist > 5.5) return false;
  pl.mountedHorseId = null;
  pl.inBoat = true;
  pl.activeBoatId = boat.id;
  pl.pos.x = boat.pos.x;
  pl.pos.y = boat.pos.y + 0.25;
  pl.pos.z = boat.pos.z;
  pl.vel.x = 0;
  pl.vel.y = 0;
  pl.vel.z = 0;
  return true;
}

export function dismountBoatLogic(world: InfiniteWorld, pl: PlayerState): void {
  if (!pl.inBoat) return;
  pl.inBoat = false;
  pl.activeBoatId = null;
  for (let r = 1; r <= 3; r++) {
    for (const [dx, dz] of [
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
      [r, r],
      [-r, -r],
    ]) {
      const tx = Math.floor(pl.pos.x) + dx;
      const tz = Math.floor(pl.pos.z) + dz;
      const h = getH(tx, tz);
      if (h > SEA) {
        pl.pos.x = tx + 0.5;
        pl.pos.y = h + 1.05;
        pl.pos.z = tz + 0.5;
        return;
      }
    }
  }
  pl.pos.y = SEA + 1.05;
}

/**
 * Requisito 5: Monturas (Caballos) — Clic derecho sobre un caballo permite montarlo o desmontarlo
 */
export function toggleMountHorseLogic(pl: PlayerState, horse: EntityData): boolean {
  if (pl.mountedHorseId === horse.id) {
    pl.mountedHorseId = null;
    horse.riddenByPlayer = false;
    return false;
  }
  if (horse.type !== 'horse' || !horse.alive) return false;
  const dist = Math.hypot(pl.pos.x - horse.pos.x, pl.pos.z - horse.pos.z);
  if (dist > 5.0) return false;

  pl.inBoat = false;
  pl.activeBoatId = null;
  pl.mountedHorseId = horse.id;
  horse.riddenByPlayer = true;
  pl.pos.x = horse.pos.x;
  pl.pos.y = horse.pos.y + 0.55;
  pl.pos.z = horse.pos.z;
  return true;
}

export function distance3D(a: Vec3Like, b: Vec3Like): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function nearestPlayer<T extends { pos: Vec3Like }>(
  pos: Vec3Like,
  pl1: T
): { pl: T; dist: number } {
  return {
    pl: pl1,
    dist: distance3D(pos, pl1.pos),
  };
}

export function hasLineOfSight(
  world: InfiniteWorld,
  enemyPos: Vec3Like,
  playerPos: Vec3Like,
  enemyEyeOffset = 1.0,
  playerEyeOffset = 1.2
): boolean {
  const x0 = enemyPos.x;
  const y0 = enemyPos.y + enemyEyeOffset;
  const z0 = enemyPos.z;

  const x1 = playerPos.x;
  const y1 = playerPos.y + playerEyeOffset;
  const z1 = playerPos.z;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.05) return true;

  const steps = Math.max(2, Math.ceil(dist / 0.18));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = Math.floor(x0 + dx * t);
    const sy = Math.floor(y0 + dy * t);
    const sz = Math.floor(z0 + dz * t);
    if (isSolid(world, sx, sy, sz)) {
      return false;
    }
  }

  const midX = Math.floor((x0 + x1) * 0.5);
  const midY = Math.floor((enemyPos.y + 0.5 + playerPos.y + 0.5) * 0.5);
  const midZ = Math.floor((z0 + z1) * 0.5);
  if (isSolid(world, midX, midY, midZ)) {
    return false;
  }

  return true;
}

export function checkWallX(world: InfiniteWorld, nx: number, py: number, pz: number): boolean {
  for (const offset of [-0.3, 0.3]) {
    const bx = Math.floor(nx + offset);
    for (let y = Math.floor(py); y <= Math.floor(py + 1.72); y++) {
      for (let z = Math.floor(pz - 0.26); z <= Math.floor(pz + 0.26); z++) {
        if (isSolid(world, bx, y, z)) return true;
      }
    }
  }
  return false;
}

export function checkWallZ(world: InfiniteWorld, px: number, py: number, nz: number): boolean {
  for (const offset of [-0.3, 0.3]) {
    const bz = Math.floor(nz + offset);
    for (let y = Math.floor(py); y <= Math.floor(py + 1.72); y++) {
      for (let x = Math.floor(px - 0.26); x <= Math.floor(px + 0.26); x++) {
        if (isSolid(world, x, y, bz)) return true;
      }
    }
  }
  return false;
}

/**
 * Requisito 2: Algoritmo corregido de aparición nocturna de Zombies y monstruos
 * Busca un punto en la oscuridad alrededor del jugador donde la superficie sea tierra firme (y > SEA)
 * y los 2 bloques verticales sobre la superficie estén libres de colisiones (!isSolid).
 */
export function findValidMonsterSpawnPoint(
  world: InfiniteWorld,
  playerPos: Vec3Like,
  rng: () => number = Math.random
): { x: number; y: number; z: number } | null {
  for (let attempt = 0; attempt < 18; attempt++) {
    const ang = rng() * Math.PI * 2;
    const dist = 12 + rng() * 14;
    const wx = Math.floor(playerPos.x + Math.cos(ang) * dist);
    const wz = Math.floor(playerPos.z + Math.sin(ang) * dist);
    ensureChunksAroundPlayer(world, wx, wz, 0);

    const sy = surfY(world, wx, wz);
    if (sy <= SEA + 1 || sy >= WH - 3) continue;

    // Verificar que la columna (wx, sy, wz) y (wx, sy+1, wz) esté libre de bloques sólidos
    if (!isSolid(world, wx, sy, wz) && !isSolid(world, wx, sy + 1, wz)) {
      return { x: wx + 0.5, y: sy, z: wz + 0.5 };
    }
  }
  return null;
}

export function stepEntityMovementWithCollision(
  world: InfiniteWorld,
  e: EntityData,
  dt: number
): void {
  if (e.riddenByPlayer) return;

  const nx = e.pos.x + e.vel.x * dt;
  const nz = e.pos.z + e.vel.z * dt;

  if (!checkWallX(world, nx, e.pos.y, e.pos.z)) {
    e.pos.x = nx;
  } else {
    e.vel.x = 0;
  }

  if (!checkWallZ(world, e.pos.x, e.pos.y, nz)) {
    e.pos.z = nz;
  } else {
    e.vel.z = 0;
  }

  const bx = Math.floor(e.pos.x);
  const bz = Math.floor(e.pos.z);
  let surfaceY = getH(bx, bz);
  for (let y = Math.min(WH - 2, Math.floor(e.pos.y + 2)); y >= 1; y--) {
    if (isSolid(world, bx, y, bz)) {
      surfaceY = y;
      break;
    }
  }

  const groundY = surfaceY + 1.0;
  if (e.vel.y !== 0 || e.pos.y > groundY + 0.05) {
    e.vel.y -= 18 * dt;
    e.pos.y += e.vel.y * dt;
    if (e.pos.y <= groundY) {
      e.pos.y = groundY;
      e.vel.y = 0;
    }
  } else {
    e.pos.y = groundY;
  }
}

export interface PlayerInputStep {
  fwd: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  yaw: number;
  joyX?: number;
  joyY?: number;
}

export interface PhysicsStepResult {
  jumped: boolean;
  landed: boolean;
  inWater: boolean;
  footstepTriggered: boolean;
}

/**
 * Requisito 4: Detecta si el jugador presionó una tecla o movió el joystick durante "Luz Roja"
 */
export function isPlayerMovingInput(input: PlayerInputStep): boolean {
  if (input.fwd || input.back || input.left || input.right || input.jumpHeld || input.jumpJustPressed) {
    return true;
  }
  if (Math.hypot(input.joyX || 0, input.joyY || 0) > 0.08) {
    return true;
  }
  return false;
}

export function stepPlayerPhysics(
  world: InfiniteWorld,
  pl: PlayerState,
  input: PlayerInputStep,
  dt: number,
  activeBoat?: BoatData | null,
  mountedHorse?: EntityData | null
): PhysicsStepResult {
  const clampedDt = Math.min(dt, 0.05);
  pl.invul = Math.max(0, pl.invul - clampedDt);

  const fwX = -Math.sin(input.yaw);
  const fwZ = -Math.cos(input.yaw);
  const rtX = Math.cos(input.yaw);
  const rtZ = -Math.sin(input.yaw);

  let mvX = 0;
  let mvZ = 0;
  if (input.fwd) {
    mvX += fwX;
    mvZ += fwZ;
  }
  if (input.back) {
    mvX -= fwX;
    mvZ -= fwZ;
  }
  if (input.left) {
    mvX -= rtX;
    mvZ -= rtZ;
  }
  if (input.right) {
    mvX += rtX;
    mvZ += rtZ;
  }
  if (input.joyX || input.joyY) {
    const jx = input.joyX || 0;
    const jy = input.joyY || 0;
    mvX += fwX * -jy + rtX * jx;
    mvZ += fwZ * -jy + rtZ * jx;
  }

  const lenSq = mvX * mvX + mvZ * mvZ;
  if (lenSq > 1) {
    const invLen = 1 / Math.sqrt(lenSq);
    mvX *= invLen;
    mvZ *= invLen;
  }

  // Modo Navegación en Bote
  if (pl.inBoat && activeBoat) {
    pl.vel.x = mvX * BOAT_SPEED;
    pl.vel.z = mvZ * BOAT_SPEED;

    const nx = pl.pos.x + pl.vel.x * clampedDt;
    const nz = pl.pos.z + pl.vel.z * clampedDt;

    const hX = getH(Math.floor(nx), Math.floor(pl.pos.z));
    if (hX <= SEA + 1 && !checkWallX(world, nx, SEA + 0.5, pl.pos.z)) {
      pl.pos.x = nx;
    }
    const hZ = getH(Math.floor(pl.pos.x), Math.floor(nz));
    if (hZ <= SEA + 1 && !checkWallZ(world, pl.pos.x, SEA + 0.5, nz)) {
      pl.pos.z = nz;
    }

    pl.pos.y = SEA + 0.55;
    activeBoat.pos.x = pl.pos.x;
    activeBoat.pos.y = SEA + 0.35;
    activeBoat.pos.z = pl.pos.z;
    if (lenSq > 0.01) {
      activeBoat.yaw = Math.atan2(mvX, mvZ);
    }

    return { jumped: false, landed: false, inWater: true, footstepTriggered: false };
  }

  const wasOnGround = pl.onGround;
  if (pl.onGround) {
    pl.coyoteTimer = 0.1;
  } else {
    pl.coyoteTimer = Math.max(0, pl.coyoteTimer - clampedDt);
  }

  if (input.jumpJustPressed) {
    pl.jumpBufferTimer = 0.12;
  } else {
    pl.jumpBufferTimer = Math.max(0, pl.jumpBufferTimer - clampedDt);
  }

  const inW =
    gB(world, Math.floor(pl.pos.x), Math.floor(pl.pos.y), Math.floor(pl.pos.z)) === BT.WATER;

  // Si está montando un caballo, gana velocidad y salto extra
  const isRidingHorse = !!(pl.mountedHorseId && mountedHorse);
  const spd = isRidingHorse ? HORSE_SPEED : 5.6;
  const jumpVel = isRidingHorse ? HORSE_JUMP_VEL : 9.2;

  pl.vel.x = mvX * spd * (inW ? 0.52 : 1);
  pl.vel.z = mvZ * spd * (inW ? 0.52 : 1);

  let jumped = false;
  if (pl.jumpBufferTimer > 0 && (pl.onGround || pl.coyoteTimer > 0)) {
    pl.vel.y = jumpVel;
    pl.onGround = false;
    pl.coyoteTimer = 0;
    pl.jumpBufferTimer = 0;
    jumped = true;
  } else if (input.jumpHeld && inW) {
    pl.vel.y = Math.min(pl.vel.y + 9.5 * clampedDt, 3.8);
  } else if (input.jumpHeld && pl.onGround) {
    pl.vel.y = jumpVel;
    pl.onGround = false;
    pl.coyoteTimer = 0;
    jumped = true;
  }

  if (input.jumpJustReleased && pl.vel.y > 2.5 && !inW) {
    pl.vel.y *= 0.55;
  }

  pl.vel.y += -22 * clampedDt * (inW ? 0.14 : 1);
  if (inW) pl.vel.y = Math.max(pl.vel.y, -2.6);

  const prevX = pl.pos.x;
  const prevZ = pl.pos.z;

  const nx = pl.pos.x + pl.vel.x * clampedDt;
  if (!checkWallX(world, nx, pl.pos.y, pl.pos.z)) pl.pos.x = nx;
  else pl.vel.x = 0;

  const nz = pl.pos.z + pl.vel.z * clampedDt;
  if (!checkWallZ(world, pl.pos.x, pl.pos.y, nz)) pl.pos.z = nz;
  else pl.vel.z = 0;

  pl.pos.y += pl.vel.y * clampedDt;

  pl.onGround = false;
  const fy = Math.floor(pl.pos.y);
  for (let xx = Math.floor(pl.pos.x - 0.26); xx <= Math.floor(pl.pos.x + 0.26); xx++) {
    for (let zz = Math.floor(pl.pos.z - 0.26); zz <= Math.floor(pl.pos.z + 0.26); zz++) {
      if (pl.vel.y <= 0 && isSolid(world, xx, fy, zz)) {
        pl.pos.y = fy + 1;
        pl.vel.y = 0;
        pl.onGround = true;
      }
    }
  }

  if (pl.vel.y > 0) {
    const hy = Math.floor(pl.pos.y + 1.8);
    for (let xx = Math.floor(pl.pos.x - 0.26); xx <= Math.floor(pl.pos.x + 0.26); xx++) {
      for (let zz = Math.floor(pl.pos.z - 0.26); zz <= Math.floor(pl.pos.z + 0.26); zz++) {
        if (isSolid(world, xx, hy, zz)) pl.vel.y = 0;
      }
    }
  }

  if (pl.pos.y < 1) {
    pl.pos.y = 1;
    pl.vel.y = 0;
    pl.onGround = true;
  }

  if (isRidingHorse && mountedHorse) {
    mountedHorse.pos.x = pl.pos.x;
    mountedHorse.pos.y = pl.pos.y;
    mountedHorse.pos.z = pl.pos.z;
  }

  let footstepTriggered = false;
  if (pl.onGround || inW) {
    const moved = Math.hypot(pl.pos.x - prevX, pl.pos.z - prevZ);
    pl.stepDistAccum += moved;
    if (pl.stepDistAccum >= 1.85) {
      pl.stepDistAccum = 0;
      footstepTriggered = true;
    }
  }

  const landed = !wasOnGround && pl.onGround;
  return { jumped, landed, inWater: inW, footstepTriggered };
}

/**
 * Romper bloques: si se rompe cualquier mitad de una Puerta de 2 bloques, se limpian ambas mitades y se recoge 1 Puerta.
 * Si el jugador usa un Pico de Madera o Pico de Piedra al picar Piedra, obtiene bonus de velocidad/recolección.
 */
export function breakBlockLogic(
  world: InfiniteWorld,
  pl: PlayerState,
  x: number,
  y: number,
  z: number
): {
  broken: boolean;
  oldType: number;
  collected: boolean;
  extraCleared?: { x: number; y: number; z: number };
  bonusYield?: number;
} {
  const t = gB(world, x, y, z);
  if (t === BT.AIR || t === BT.BEDROCK || t === BT.WATER) {
    return { broken: false, oldType: t, collected: false };
  }

  let extraCleared: { x: number; y: number; z: number } | undefined;
  let itemTypeToCollect = t;

  if (t === BT.DOOR || t === BT.DOOR_OPEN) {
    itemTypeToCollect = BT.DOOR;
    if (gB(world, x, y + 1, z) === t) {
      sB(world, x, y + 1, z, BT.AIR);
      extraCleared = { x, y: y + 1, z };
    } else if (gB(world, x, y - 1, z) === t) {
      sB(world, x, y - 1, z, BT.AIR);
      extraCleared = { x, y: y - 1, z };
    }
  }

  sB(world, x, y, z, BT.AIR);
  pl.blocksBroken++;
  pl.score += 5;

  // Si pica piedra con Pico de Madera o Pico de Piedra en mano, extrae más rápido (rinde bloques extra)
  const heldTool = pl.sel;
  let yieldAmount = 1;
  if (t === BT.STONE || t === BT.COBBLE) {
    if (heldTool === BT.STONE_PICKAXE) yieldAmount = 3;
    else if (heldTool === BT.WOOD_PICKAXE) yieldAmount = 2;
  }

  const { added } = addItemToInventory(pl, itemTypeToCollect, yieldAmount);
  return {
    broken: true,
    oldType: t,
    collected: added > 0,
    extraCleared,
    bonusYield: yieldAmount,
  };
}

/**
 * Requisito 2: Colocar bloque — Si es una Puerta (BT.DOOR), ocupa automáticamente 2 bloques de altura: (tx, ty, tz) y (tx, ty + 1, tz).
 */
export function placeBlockLogic(
  world: InfiniteWorld,
  pl: PlayerState,
  x: number,
  y: number,
  z: number,
  nxNorm: number,
  nyNorm: number,
  nzNorm: number
): {
  placed: boolean;
  tx: number;
  ty: number;
  tz: number;
  blockType: number;
  upperDoorPlaced?: boolean;
} {
  const activeSlot = pl.inventory[pl.si];
  if (!activeSlot || activeSlot.count <= 0 || activeSlot.type <= 0) {
    return { placed: false, tx: x, ty: y, tz: z, blockType: 0 };
  }

  const blockType = activeSlot.type;
  const def = BD[blockType];
  if (def?.isItemOnly) {
    return { placed: false, tx: x, ty: y, tz: z, blockType: 0 };
  }

  const tx = Math.floor(x) + Math.round(nxNorm);
  const ty = Math.floor(y) + Math.round(nyNorm);
  const tz = Math.floor(z) + Math.round(nzNorm);

  if (ty < 1 || ty >= WH - 2) {
    return { placed: false, tx, ty, tz, blockType };
  }

  const playerMinX = Math.floor(pl.pos.x - 0.25);
  const playerMaxX = Math.floor(pl.pos.x + 0.25);
  const playerMinZ = Math.floor(pl.pos.z - 0.25);
  const playerMaxZ = Math.floor(pl.pos.z + 0.25);
  const fy = Math.floor(pl.pos.y);

  if (
    tx >= playerMinX &&
    tx <= playerMaxX &&
    tz >= playerMinZ &&
    tz <= playerMaxZ &&
    (ty === fy || ty === fy + 1)
  ) {
    return { placed: false, tx, ty, tz, blockType };
  }

  const existing = gB(world, tx, ty, tz);
  if (existing !== BT.AIR && existing !== BT.WATER) {
    return { placed: false, tx, ty, tz, blockType };
  }

  // Puerta de 2 bloques de altura
  if (blockType === BT.DOOR) {
    const existingTop = gB(world, tx, ty + 1, tz);
    if (existingTop !== BT.AIR && existingTop !== BT.WATER) {
      return { placed: false, tx, ty, tz, blockType };
    }
    sB(world, tx, ty, tz, BT.DOOR);
    sB(world, tx, ty + 1, tz, BT.DOOR);
    activeSlot.count -= 1;
    if (activeSlot.count <= 0) {
      pl.inventory[pl.si] = null;
    }
    pl.blocksPlaced += 2;
    pl.score += 10;
    return { placed: true, tx, ty, tz, blockType, upperDoorPlaced: true };
  }

  sB(world, tx, ty, tz, blockType);
  activeSlot.count -= 1;
  if (activeSlot.count <= 0) {
    pl.inventory[pl.si] = null;
  }
  pl.blocksPlaced++;
  pl.score += 5;
  return { placed: true, tx, ty, tz, blockType };
}

/**
 * Requisito 2: Al hacer clic derecho sobre cualquier parte de la puerta (mitad inferior o superior),
 * ambas mitades se abren o cierran juntas como un solo objeto interactivo.
 */
export function toggleTwoBlockDoorLogic(
  world: InfiniteWorld,
  x: number,
  y: number,
  z: number
): {
  toggled: boolean;
  isOpen: boolean;
  newType: number;
  coords: Array<{ x: number; y: number; z: number }>;
} {
  const cur = gB(world, x, y, z);
  if (cur !== BT.DOOR && cur !== BT.DOOR_OPEN) {
    return { toggled: false, isOpen: false, newType: cur, coords: [] };
  }

  const nextType = cur === BT.DOOR ? BT.DOOR_OPEN : BT.DOOR;
  const coords: Array<{ x: number; y: number; z: number }> = [{ x, y, z }];
  sB(world, x, y, z, nextType);

  // Buscar la otra mitad de la puerta arriba o abajo
  if (gB(world, x, y + 1, z) === cur) {
    sB(world, x, y + 1, z, nextType);
    coords.push({ x, y: y + 1, z });
  } else if (gB(world, x, y - 1, z) === cur) {
    sB(world, x, y - 1, z, nextType);
    coords.push({ x, y: y - 1, z });
  }

  return {
    toggled: true,
    isOpen: nextType === BT.DOOR_OPEN,
    newType: nextType,
    coords,
  };
}

/**
 * Requisito 5/6: Al matar a una oveja ('sheep'), suelta "Lana" (BT.WOOL) al inventario del jugador.
 */
export function damageEntityLogic(
  ent: EntityData,
  pl: PlayerState,
  dmg = 5,
  rngValue: number = Math.random()
): { defeated: boolean; boneDropped: boolean; woolDropped: boolean } {
  if (!ent.alive || ent.state === 'ko') {
    return { defeated: false, boneDropped: false, woolDropped: false };
  }
  ent.hp -= dmg;
  ent.hitFlashTimer = 0.14;
  if (ent.hp <= 0) {
    ent.alive = false;
    ent.state = 'ko';
    ent.koTimer = 0.35;
    pl.enemiesDefeated++;
    pl.score += ent.type === 'enderman' ? 75 : ent.type === 'zombie' || ent.type === 'spider' ? 25 : 15;

    let boneDropped = false;
    if ((ent.type === 'zombie' || ent.type === 'spider' || ent.type === 'enderman') && rngValue > 0.35) {
      pl.bones++;
      boneDropped = true;
    }

    let woolDropped = false;
    if (ent.type === 'sheep') {
      addItemToInventory(pl, BT.WOOL, 1);
      woolDropped = true;
    }

    return { defeated: true, boneDropped, woolDropped };
  }
  return { defeated: false, boneDropped: false, woolDropped: false };
}

export const WOLF_NAMES = ['Max', 'Luna', 'Fenrir', 'Rocco', 'Sombra', 'Thor', 'Nala', 'Ghost'];

export function tameWolfLogic(
  wolf: EntityData,
  pl: PlayerState,
  customName?: string
): { tamed: boolean; name: string } {
  if (wolf.type !== 'wolf' || wolf.tamed || pl.bones <= 0) {
    return { tamed: false, name: wolf.wname || '' };
  }
  pl.bones--;
  wolf.tamed = true;
  wolf.type = 'wolf_t';
  const assignedName =
    customName && customName.trim().length > 0
      ? customName.trim()
      : WOLF_NAMES[wolf.id % WOLF_NAMES.length];
  wolf.wname = assignedName;
  pl.score += 40;
  return { tamed: true, name: assignedName };
}

export function stepEnemyCombatLogic(
  world: InfiniteWorld,
  enemy: EntityData,
  pl: PlayerState,
  dt: number
): { attacked: boolean; windupStarted: boolean; damageDealt: number; spiderJumped?: boolean } {
  if (!enemy.alive || enemy.state === 'ko') {
    return { attacked: false, windupStarted: false, damageDealt: 0 };
  }

  const dist = distance3D(enemy.pos, pl.pos);
  const canSee = hasLineOfSight(world, enemy.pos, pl.pos);

  const chaseRange = enemy.type === 'enderman' ? 24 : enemy.type === 'spider' ? 18 : 15;
  const moveSpd =
    enemy.type === 'spider'
      ? 4.6
      : enemy.type === 'enderman'
        ? 4.8
        : enemy.type === 'wolf'
          ? 4.0
          : 2.95;
  const hitRange = enemy.type === 'enderman' ? 2.45 : enemy.type === 'spider' ? 2.15 : 1.95;

  let spiderJumped = false;
  if (enemy.type === 'spider') {
    enemy.jumpCd = Math.max(0, (enemy.jumpCd || 0) - dt);
  }

  if (enemy.state === 'windup') {
    enemy.windupTimer -= dt;
    enemy.vel.x *= 0.5;
    enemy.vel.z *= 0.5;
    if (enemy.windupTimer <= 0) {
      enemy.state = 'chase';
      enemy.timer = 1.05;
      if (dist <= hitRange + 0.35 && pl.invul <= 0 && hasLineOfSight(world, enemy.pos, pl.pos)) {
        const dmg = enemy.type === 'enderman' ? 4 : enemy.type === 'spider' ? 2 : 3;
        pl.hp = Math.max(0, pl.hp - dmg);
        pl.invul = 0.85;
        return { attacked: true, windupStarted: false, damageDealt: dmg };
      }
    }
    return { attacked: false, windupStarted: false, damageDealt: 0 };
  }

  enemy.timer = Math.max(0, enemy.timer - dt);

  if (dist < chaseRange && canSee) {
    enemy.state = 'chase';
    const dx = pl.pos.x - enemy.pos.x;
    const dz = pl.pos.z - enemy.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    enemy.vel.x = (dx / len) * moveSpd;
    enemy.vel.z = (dz / len) * moveSpd;

    if (
      enemy.type === 'spider' &&
      (enemy.jumpCd || 0) <= 0 &&
      dist > 2.2 &&
      dist < 8.5 &&
      Math.abs(enemy.vel.y) < 0.05
    ) {
      enemy.vel.y = 6.5;
      enemy.vel.x *= 1.35;
      enemy.vel.z *= 1.35;
      enemy.jumpCd = 2.1;
      spiderJumped = true;
    }

    if (dist <= hitRange && enemy.timer <= 0 && pl.invul <= 0) {
      enemy.state = 'windup';
      enemy.windupTimer = enemy.type === 'spider' ? 0.22 : 0.35;
      return { attacked: false, windupStarted: true, damageDealt: 0, spiderJumped };
    }
  } else {
    enemy.state = 'idle';
  }

  return { attacked: false, windupStarted: false, damageDealt: 0, spiderJumped };
}

export function isNightTime(dayTime: number): boolean {
  return dayTime < 0.22 || dayTime > 0.78;
}

export function despawnDaytimeMonsters(
  entities: EntityData[],
  dayTime: number
): EntityData[] {
  if (isNightTime(dayTime)) return [];
  const despawned: EntityData[] = [];
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.alive && (e.type === 'zombie' || e.type === 'spider' || e.type === 'enderman')) {
      e.alive = false;
      despawned.push(e);
    }
  }
  return despawned;
}

export function surfY(world: InfiniteWorld, x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  for (let y = WH - 2; y >= 1; y--) {
    const b = gB(world, ix, y, iz);
    if (b !== BT.AIR && b !== BT.WATER && b !== BT.LEAVES) {
      return y + 1;
    }
  }
  return getH(ix, iz) + 1;
}

export function getDayPhaseLabel(dayTime: number): string {
  if (dayTime >= 0.22 && dayTime < 0.3) return '🌅 Amanecer';
  if (dayTime >= 0.3 && dayTime <= 0.7) return '☀️ Día';
  if (dayTime > 0.7 && dayTime <= 0.78) return '🌇 Atardecer';
  return '🌙 Noche';
}

export interface RaycastHit {
  bx: number;
  by: number;
  bz: number;
  nx: number;
  ny: number;
  nz: number;
}

export function raycastBlock(
  world: InfiniteWorld,
  pos: Vec3Like,
  eyeH: number,
  yaw: number,
  pitch: number,
  reach = 5.5
): RaycastHit | null {
  const ox = pos.x;
  const oy = pos.y + eyeH;
  const oz = pos.z;
  const dx = -Math.sin(yaw) * Math.cos(pitch);
  const dy = Math.sin(pitch);
  const dz = -Math.cos(yaw) * Math.cos(pitch);

  let px = Math.floor(ox);
  let py = Math.floor(oy);
  let pz = Math.floor(oz);

  for (let d = 0.1; d < reach; d += 0.06) {
    const cx = Math.floor(ox + dx * d);
    const cy = Math.floor(oy + dy * d);
    const cz = Math.floor(oz + dz * d);
    if (cy < 0 || cy >= WH) continue;
    const b = gB(world, cx, cy, cz);
    if (b !== BT.AIR && b !== BT.WATER) {
      return {
        bx: cx,
        by: cy,
        bz: cz,
        nx: px - cx,
        ny: py - cy,
        nz: pz - cz,
      };
    }
    px = cx;
    py = cy;
    pz = cz;
  }
  return null;
}

/**
 * Requisito 3: Guardar y Cargar Partida (Posición, Inventario, Ropa y Bloques modificados)
 */
export interface SavedGamePayload {
  version: 1;
  pos: Vec3Like;
  yaw: number;
  pitch: number;
  hp: number;
  si: number;
  clothesIdx: number;
  inventory: Array<InventorySlot | null>;
  modifiedBlocks: Array<[string, number]>;
  savedAt: number;
}

export function serializeSaveGame(
  world: InfiniteWorld,
  pl: PlayerState,
  yaw: number,
  pitch: number
): string {
  const payload: SavedGamePayload = {
    version: 1,
    pos: { x: pl.pos.x, y: pl.pos.y, z: pl.pos.z },
    yaw,
    pitch,
    hp: pl.hp,
    si: pl.si,
    clothesIdx: pl.clothesIdx,
    inventory: pl.inventory.map((s) => (s ? { type: s.type, count: s.count } : null)),
    modifiedBlocks: Array.from(world.modified.entries()),
    savedAt: Date.now(),
  };
  return JSON.stringify(payload);
}

export function deserializeSaveGame(
  rawJson: string,
  world: InfiniteWorld,
  pl: PlayerState
): { restored: boolean; yaw: number; pitch: number } {
  try {
    const data = JSON.parse(rawJson) as SavedGamePayload;
    if (!data || data.version !== 1 || !data.pos || !Array.isArray(data.inventory)) {
      return { restored: false, yaw: 0.75, pitch: -0.1 };
    }

    pl.pos = { x: Number(data.pos.x) || SPAWN_X, y: Number(data.pos.y) || getSpawnY(), z: Number(data.pos.z) || SPAWN_Z };
    pl.hp = Math.max(1, Math.min(20, Number(data.hp) || 20));
    pl.si = Math.max(0, Math.min(HOTBAR_SIZE - 1, Number(data.si) || 0));
    pl.clothesIdx = Math.max(0, Math.min(CLOTHES_PALETTE.length - 1, Number(data.clothesIdx) || 0));
    pl.clothesColor = CLOTHES_PALETTE[pl.clothesIdx].hex;

    for (let i = 0; i < TOTAL_INV_SLOTS; i++) {
      const slot = data.inventory[i];
      if (slot && typeof slot.type === 'number' && typeof slot.count === 'number' && slot.count > 0) {
        pl.inventory[i] = { type: slot.type, count: slot.count };
      } else {
        pl.inventory[i] = null;
      }
    }

    world.modified.clear();
    world.chunks.clear();
    if (Array.isArray(data.modifiedBlocks)) {
      for (const [k, v] of data.modifiedBlocks) {
        if (typeof k === 'string' && typeof v === 'number') {
          world.modified.set(k, v);
        }
      }
    }

    return {
      restored: true,
      yaw: typeof data.yaw === 'number' ? data.yaw : 0.75,
      pitch: typeof data.pitch === 'number' ? data.pitch : -0.1,
    };
  } catch {
    return { restored: false, yaw: 0.75, pitch: -0.1 };
  }
}
