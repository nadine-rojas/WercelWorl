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
  WOOD_SWORD: 25,
  STONE_SWORD: 26,
  CHEST: 27,
  TORCH: 28,
  PUDDLE: 29,
  GOLD: 30,
  DIAMOND: 31,
  CHAIR: 32,
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
  3: { n: 'Piedra', c: 0x7a7a7a, ic: '🪨', role: 'Muro y herramientas 16x16' },
  4: { n: 'Arena', c: 0xe8d68a, ic: '🟨', role: 'Costa y océano' },
  5: { n: 'Madera', c: 0x7a5230, ic: '🪵', role: 'Tronco con vetas 16x16' },
  6: { n: 'Hojas', c: 0x2e7020, ic: '🌿', tr: 1, op: 0.88, role: 'Follaje de árbol' },
  7: { n: 'Nieve', c: 0xf0f0f8, ic: '❄️', role: 'Cumbre helada' },
  8: { n: 'Agua', c: 0x1a66dd, ic: '💧', tr: 1, op: 0.68, role: 'Agua con reflejo' },
  9: { n: 'Vidrio', c: 0xaaddff, ic: '🔷', tr: 1, op: 0.42, role: 'Ventana cristalina' },
  10: { n: 'Lava', c: 0xff4400, ic: '🔥', em: 0x661800, role: 'Magma luminoso' },
  11: { n: 'Roca Madre', c: 0x333333, ic: '⬛', role: 'Fondo abisal' },
  12: { n: 'Tablones', c: 0xcc9955, ic: '📦', role: 'Tablas con clavos 16x16' },
  13: { n: 'Adoquín', c: 0x888888, ic: '🧱', role: 'Piedra agrietada 16x16' },
  14: { n: 'Ladrillo', c: 0xcc5533, ic: '🧱', role: 'Pared de ladrillos clásica' },
  15: { n: 'Cama', c: 0xdd3333, ic: '🛏️', role: 'Descanso nocturno' },
  16: { n: 'Mesa', c: 0xbb8833, ic: '🪑', role: 'Mesa de Crafteo / Decoración' },
  17: { n: 'Hielo', c: 0xaaddff, ic: '🧊', tr: 1, op: 0.78, role: 'Superficie glaciar' },
  18: { n: 'Puerta Doble', c: 0x996633, ic: '🚪', role: 'Puerta interactiva de 2 bloques' },
  19: { n: 'Bote', c: 0x9c6630, ic: '⛵', role: 'Navegación rápida', isItemOnly: true },
  20: { n: 'Lana', c: 0xf5f5f5, ic: '🧶', role: 'Drop de oveja para Cama' },
  21: { n: 'Palos', c: 0x8b5a2b, ic: '🥢', role: 'Mango de herramientas y armas', isItemOnly: true },
  22: { n: 'Pico de Madera', c: 0xc68b59, ic: '⛏️', role: 'Pica piedra rápido (x2)', isItemOnly: true },
  23: { n: 'Pico de Piedra', c: 0x94a3b8, ic: '⚒️', role: 'Pica piedra muy rápido (x3)', isItemOnly: true },
  24: { n: 'Puerta Abierta', c: 0x996633, ic: '🚪', tr: 1, op: 0.9, role: 'Puerta abierta (paso libre)' },
  25: { n: 'Espada de Madera', c: 0xd97706, ic: '🗡️', role: 'Arma PvP y combate (4 ❤️ daño)', isItemOnly: true },
  26: { n: 'Espada de Piedra', c: 0x64748b, ic: '⚔️', role: 'Arma letal PvP y combate (6 ❤️ daño)', isItemOnly: true },
  27: { n: 'Cofre', c: 0xb45309, ic: '🧰', role: 'Almacenamiento reforzado de madera' },
  28: { n: 'Antorcha', c: 0xfbbf24, ic: '🕯️', em: 0xff9900, role: 'Emite luz dinámica en la noche' },
  29: { n: 'Charco de Agua', c: 0x38bdf8, ic: '💦', tr: 1, op: 0.55, role: 'Charco formado por la lluvia' },
  30: { n: 'Bloque de Oro', c: 0xfacc15, ic: '🟨', role: 'Oro brillante (Batalla de Construcción)' },
  31: { n: 'Bloque de Diamante', c: 0x22d3ee, ic: '💎', role: 'Diamante puro (Batalla de Construcción)' },
  32: { n: 'Silla', c: 0xd97706, ic: '🪑', role: 'Silla decorativa de madera' },
};

// Nota: BT.DOOR_OPEN (24), BT.TORCH (28) y BT.PUDDLE (29) NO están en SOLID_SET para permitir paso libre
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
  BT.CHEST,
  BT.GOLD,
  BT.DIAMOND,
  BT.CHAIR,
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
    | 'enderman'
    | 'villager';
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
  rescued?: boolean;
  vname?: string;
}

export interface LostVillagerSpawn {
  id: number;
  name: string;
  x: number;
  z: number;
}

export const LOST_VILLAGER_SPAWNS: LostVillagerSpawn[] = [
  { id: 901, name: 'Aldeano Kael', x: 78, z: -64 },
  { id: 902, name: 'Aldeana Lyra', x: -86, z: 74 },
  { id: 903, name: 'Aldeano Atlas', x: 96, z: 88 },
];

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

  // Islas lejanas donde se encuentran los aldeanos perdidos para rescatar
  for (const lv of LOST_VILLAGER_SPAWNS) {
    const dLv = Math.hypot(x - lv.x, z - lv.z);
    if (dLv < 9) {
      return SEA + 3;
    }
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
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.DOOR && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta Mesa Avanzada: 2 Tablones + 1 Palo ➔ 1 Espada de Madera (BT.WOOD_SWORD) para PvP y combate
 */
export function craftWoodSwordLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (
    countItemInInventory(pl, BT.PLANK) < 2 ||
    countItemInInventory(pl, BT.STICK) < 1
  ) {
    return { crafted: false };
  }
  consumeItemFromInventory(pl, BT.PLANK, 2);
  consumeItemFromInventory(pl, BT.STICK, 1);
  addItemToInventory(pl, BT.WOOD_SWORD, 1);
  pl.score += 30;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.WOOD_SWORD && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta Mesa Avanzada: 2 Piedras + 1 Palo ➔ 1 Espada de Piedra (BT.STONE_SWORD) para PvP y combate
 */
export function craftStoneSwordLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (
    countItemInInventory(pl, BT.STONE) < 2 ||
    countItemInInventory(pl, BT.STICK) < 1
  ) {
    return { crafted: false };
  }
  consumeItemFromInventory(pl, BT.STONE, 2);
  consumeItemFromInventory(pl, BT.STICK, 1);
  addItemToInventory(pl, BT.STONE_SWORD, 1);
  pl.score += 45;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.STONE_SWORD && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta Mesa Avanzada: 4 Tablones ➔ 1 Cofre (BT.CHEST)
 */
export function craftChestLogic(pl: PlayerState): {
  crafted: boolean;
} {
  if (!consumeItemFromInventory(pl, BT.PLANK, 4)) {
    return { crafted: false };
  }
  addItemToInventory(pl, BT.CHEST, 1);
  pl.score += 20;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.CHEST && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true };
}

/**
 * Receta Mesa Avanzada: 1 Madera (o 1 Tablón) + 1 Palo ➔ 4 Antorchas (BT.TORCH) que emiten luz dinámica en la noche
 */
export function craftTorchesLogic(pl: PlayerState): {
  crafted: boolean;
  torchesTotal: number;
} {
  if (countItemInInventory(pl, BT.STICK) < 1) {
    return { crafted: false, torchesTotal: countItemInInventory(pl, BT.TORCH) };
  }
  if (countItemInInventory(pl, BT.WOOD) >= 1) {
    consumeItemFromInventory(pl, BT.WOOD, 1);
  } else if (countItemInInventory(pl, BT.PLANK) >= 1) {
    consumeItemFromInventory(pl, BT.PLANK, 1);
  } else {
    return { crafted: false, torchesTotal: countItemInInventory(pl, BT.TORCH) };
  }
  consumeItemFromInventory(pl, BT.STICK, 1);
  addItemToInventory(pl, BT.TORCH, 4);
  pl.score += 20;
  const idx = pl.inventory.findIndex((s) => s && s.type === BT.TORCH && iInHotbar(s));
  if (idx >= 0 && idx < HOTBAR_SIZE) pl.si = idx;
  return { crafted: true, torchesTotal: countItemInInventory(pl, BT.TORCH) };
}

/**
 * Calcula el daño de ataque del jugador según el arma o herramienta equipada (PvP y Mobs)
 */
export function getPlayerAttackDamage(pl: PlayerState, isPvP = false): number {
  const held = pl.sel;
  if (isPvP) {
    if (held === BT.STONE_SWORD) return 6; // 3 corazones
    if (held === BT.WOOD_SWORD) return 4; // 2 corazones
    if (held === BT.STONE_PICKAXE || held === BT.WOOD_PICKAXE) return 3;
    return 2; // 1 corazón base
  }
  if (held === BT.STONE_SWORD) return 14;
  if (held === BT.WOOD_SWORD) return 10;
  if (held === BT.STONE_PICKAXE) return 9;
  if (held === BT.WOOD_PICKAXE) return 7;
  return 5;
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

function getEntitySupportGroundY(
  world: InfiniteWorld,
  px: number,
  py: number,
  pz: number
): number {
  let maxSurfaceY = 1;
  const maxScanY = Math.min(WH - 2, Math.floor(py + 1.15));
  for (const ox of [-0.26, 0.26]) {
    for (const oz of [-0.26, 0.26]) {
      const bx = Math.floor(px + ox);
      const bz = Math.floor(pz + oz);
      let sY = getH(bx, bz);
      for (let y = maxScanY; y >= 1; y--) {
        if (isSolid(world, bx, y, bz)) {
          sY = y;
          break;
        }
      }
      if (sY > maxSurfaceY) {
        maxSurfaceY = sY;
      }
    }
  }
  return maxSurfaceY + 1.0;
}

/**
 * Requisito 1: Corrección de Físicas en el eje Y para entidades (Animales y Lobos)
 * - Evita que el suelo bajo las patas sea detectado como muro lateral (offset Y +0.15)
 * - Permite subir escalones naturales de 1 bloque de pasto/tierra (auto-step) usando soporte en las 4 esquinas
 * - Garantiza que nunca se hundan por debajo de groundY (surfaceY + 1.0)
 */
export function stepEntityMovementWithCollision(
  world: InfiniteWorld,
  e: EntityData,
  dt: number
): void {
  if (e.riddenByPlayer) return;

  const clampedDt = Math.min(dt, 0.05);

  const curGroundY = getEntitySupportGroundY(world, e.pos.x, e.pos.y, e.pos.z);
  if (e.pos.y < curGroundY) {
    e.pos.y = curGroundY;
    if (e.vel.y < 0) e.vel.y = 0;
  }

  const nx = e.pos.x + e.vel.x * clampedDt;
  const nz = e.pos.z + e.vel.z * clampedDt;

  // Movimiento en X con soporte para subir escalón de 1 bloque (auto-step)
  if (!checkWallX(world, nx, e.pos.y + 0.15, e.pos.z)) {
    e.pos.x = nx;
  } else if (!checkWallX(world, nx, e.pos.y + 1.15, e.pos.z)) {
    e.pos.x = nx;
    e.pos.y = Math.floor(e.pos.y) + 1.05;
    if (e.vel.y < 0) e.vel.y = 0;
  } else {
    e.vel.x = -e.vel.x * 0.5;
  }

  // Movimiento en Z con soporte para subir escalón de 1 bloque (auto-step)
  if (!checkWallZ(world, e.pos.x, e.pos.y + 0.15, nz)) {
    e.pos.z = nz;
  } else if (!checkWallZ(world, e.pos.x, e.pos.y + 1.15, nz)) {
    e.pos.z = nz;
    e.pos.y = Math.floor(e.pos.y) + 1.05;
    if (e.vel.y < 0) e.vel.y = 0;
  } else {
    e.vel.z = -e.vel.z * 0.5;
  }

  const groundY = getEntitySupportGroundY(world, e.pos.x, e.pos.y, e.pos.z);
  if (e.vel.y !== 0 || e.pos.y > groundY + 0.04) {
    e.vel.y -= 18 * clampedDt;
    e.pos.y += e.vel.y * clampedDt;
    if (e.pos.y <= groundY) {
      e.pos.y = groundY;
      e.vel.y = 0;
    }
  } else {
    e.pos.y = groundY;
    e.vel.y = 0;
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
  flying?: boolean;
  descendHeld?: boolean;
}

export interface PhysicsStepResult {
  jumped: boolean;
  landed: boolean;
  inWater: boolean;
  footstepTriggered: boolean;
}

/**
 * Requisito 2: Lógica de Muerte Estricta en "Luz Roja, Luz Verde"
 * Detecta si el jugador presiona una tecla de movimiento (WASD, Space, Flechas),
 * mueve el joystick o mueve la cámara del mouse (movementX, movementY en PointerLock)
 * durante la "Luz Roja". En caso afirmativo, baja su HP a 0 al instante y devuelve "¡TE MOVISTE!".
 */
export const RED_LIGHT_MOVEMENT_KEYS = new Set<string>([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export function isPlayerMovingInput(input: PlayerInputStep): boolean {
  if (input.fwd || input.back || input.left || input.right || input.jumpHeld || input.jumpJustPressed) {
    return true;
  }
  if (Math.hypot(input.joyX || 0, input.joyY || 0) > 0.08) {
    return true;
  }
  return false;
}

export function checkRedLightViolationLogic(
  challengeState: 'off' | 'green' | 'red',
  pl: PlayerState,
  event: {
    keyCode?: string;
    movementX?: number;
    movementY?: number;
    inputStep?: PlayerInputStep;
  }
): { violated: boolean; message: string } {
  if (challengeState !== 'red') {
    return { violated: false, message: '' };
  }

  let moved = false;
  if (event.keyCode && RED_LIGHT_MOVEMENT_KEYS.has(event.keyCode)) {
    moved = true;
  }
  if (
    (typeof event.movementX === 'number' && Math.abs(event.movementX) > 0) ||
    (typeof event.movementY === 'number' && Math.abs(event.movementY) > 0)
  ) {
    moved = true;
  }
  if (event.inputStep && isPlayerMovingInput(event.inputStep)) {
    moved = true;
  }

  if (moved) {
    pl.hp = 0;
    return { violated: true, message: '¡TE MOVISTE!' };
  }

  return { violated: false, message: '' };
}

/**
 * Brújula HUD minimalista que señala la dirección y distancia al aldeano perdido más cercano
 */
export interface VillagerCompassReading {
  targetName: string;
  distance: number;
  relativeAngleDeg: number;
  cardinal: string;
  rescuedCount: number;
  totalCount: number;
  allRescued: boolean;
}

export function getNearestLostVillagerCompass(
  playerPos: Vec3Like,
  playerYaw: number,
  villagers: EntityData[]
): VillagerCompassReading {
  const allVillagers = villagers.filter((v) => v.type === 'villager');
  const totalCount = allVillagers.length || LOST_VILLAGER_SPAWNS.length;
  const unrescued = allVillagers.filter((v) => !v.rescued);
  const rescuedCount = totalCount - unrescued.length;

  if (unrescued.length === 0) {
    return {
      targetName: '¡Todos rescatados!',
      distance: 0,
      relativeAngleDeg: 0,
      cardinal: '✓',
      rescuedCount: totalCount,
      totalCount,
      allRescued: true,
    };
  }

  let nearest = unrescued[0];
  let bestDist = Math.hypot(nearest.pos.x - playerPos.x, nearest.pos.z - playerPos.z);
  for (let i = 1; i < unrescued.length; i++) {
    const d = Math.hypot(unrescued[i].pos.x - playerPos.x, unrescued[i].pos.z - playerPos.z);
    if (d < bestDist) {
      bestDist = d;
      nearest = unrescued[i];
    }
  }

  const dx = nearest.pos.x - playerPos.x;
  const dz = nearest.pos.z - playerPos.z;
  // En nuestro sistema de cámara: forward = (-sin(yaw), -cos(yaw))
  const worldAngle = Math.atan2(dx, -dz);
  const relRad = worldAngle + playerYaw;
  const relDeg = ((((relRad * 180) / Math.PI) % 360) + 360) % 360;

  const worldCompassDeg = ((((Math.atan2(dx, -dz) * 180) / Math.PI) % 360) + 360) % 360;
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const cardinal = cardinals[Math.round(worldCompassDeg / 45) % 8];

  return {
    targetName: nearest.vname || 'Aldeano Perdido',
    distance: Math.round(bestDist),
    relativeAngleDeg: Math.round(relDeg),
    cardinal,
    rescuedCount,
    totalCount,
    allRescued: false,
  };
}

export function rescueVillagerLogic(
  villager: EntityData,
  pl: PlayerState
): { rescued: boolean; name: string } {
  if (villager.type !== 'villager' || villager.rescued) {
    return { rescued: false, name: villager.vname || '' };
  }
  if (Math.hypot(villager.pos.x - pl.pos.x, villager.pos.z - pl.pos.z) > 5.0) {
    return { rescued: false, name: villager.vname || '' };
  }
  villager.rescued = true;
  pl.score += 100;
  return { rescued: true, name: villager.vname || 'Aldeano' };
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

  // Modo Vuelo Libre (al llegar a 00:00 en Batalla de Construcción para ver y votar)
  if (input.flying) {
    const flySpd = 9.5;
    pl.vel.x = mvX * flySpd;
    pl.vel.z = mvZ * flySpd;
    pl.vel.y = input.jumpHeld ? 7.2 : input.descendHeld ? -7.2 : 0;
    pl.pos.x += pl.vel.x * clampedDt;
    pl.pos.z += pl.vel.z * clampedDt;
    pl.pos.y = Math.max(2, Math.min(WH - 1.5, pl.pos.y + pl.vel.y * clampedDt));
    pl.onGround = false;
    return { jumped: false, landed: false, inWater: false, footstepTriggered: false };
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
  nzNorm: number,
  infiniteCreative = false
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
    if (!infiniteCreative) {
      activeSlot.count -= 1;
      if (activeSlot.count <= 0) {
        pl.inventory[pl.si] = null;
      }
    } else {
      activeSlot.count = 999;
    }
    pl.blocksPlaced += 2;
    pl.score += 10;
    return { placed: true, tx, ty, tz, blockType, upperDoorPlaced: true };
  }

  sB(world, tx, ty, tz, blockType);
  if (!infiniteCreative) {
    activeSlot.count -= 1;
    if (activeSlot.count <= 0) {
      pl.inventory[pl.si] = null;
    }
  } else {
    activeSlot.count = 999;
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

/**
 * Requisito 1: IA reparada del Lobo Domado (wolf_t)
 * - Sigue activamente la posición exacta de su dueño (Jugador 1)
 * - Si el jugador se aleja a más de 15 bloques, el lobo se teletransporta inmediatamente detrás de él
 * - Si hay monstruos nocturnos cerca del dueño, los ataca y luego vuelve junto al jugador
 */
export function stepTamedWolfAILogic(
  world: InfiniteWorld,
  wolf: EntityData,
  pl: PlayerState,
  entities: EntityData[],
  dt: number,
  playerYaw = 0
): {
  teleported: boolean;
  following: boolean;
  attackedEnemy: EntityData | null;
  enemyDefeated: boolean;
} {
  if (!wolf.alive || (wolf.type !== 'wolf_t' && !wolf.tamed)) {
    return { teleported: false, following: false, attackedEnemy: null, enemyDefeated: false };
  }

  wolf.timer = Math.max(0, wolf.timer - dt);
  const distToOwner = distance3D(wolf.pos, pl.pos);

  // Si el jugador se aleja a más de 15 bloques, teletransportar al lobo detrás de él
  if (distToOwner > 15) {
    const behindX = pl.pos.x + Math.sin(playerYaw) * 1.8;
    const behindZ = pl.pos.z + Math.cos(playerYaw) * 1.8;
    const sy = surfY(world, behindX, behindZ);
    wolf.pos.x = behindX;
    wolf.pos.y = Math.max(sy, pl.pos.y) + 0.15;
    wolf.pos.z = behindZ;
    wolf.vel.x = 0;
    wolf.vel.y = 0;
    wolf.vel.z = 0;
    wolf.state = 'chase';
    return { teleported: true, following: true, attackedEnemy: null, enemyDefeated: false };
  }

  // Buscar enemigo hostil cercano al jugador/lobo
  let nearEnemy: EntityData | null = null;
  let nearestDist = 12;
  for (let i = 0; i < entities.length; i++) {
    const cand = entities[i];
    if (
      cand.alive &&
      (cand.type === 'zombie' || cand.type === 'spider' || cand.type === 'enderman')
    ) {
      const d = distance3D(wolf.pos, cand.pos);
      if (d < nearestDist && distance3D(pl.pos, cand.pos) < 14) {
        nearestDist = d;
        nearEnemy = cand;
      }
    }
  }

  if (nearEnemy) {
    const dx = nearEnemy.pos.x - wolf.pos.x;
    const dz = nearEnemy.pos.z - wolf.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    wolf.vel.x = (dx / len) * 5.4;
    wolf.vel.z = (dz / len) * 5.4;
    wolf.state = 'chase';

    let attackedEnemy: EntityData | null = null;
    let enemyDefeated = false;
    if (nearestDist < 1.9 && wolf.timer <= 0) {
      const res = damageEntityLogic(nearEnemy, pl, 6);
      attackedEnemy = nearEnemy;
      enemyDefeated = res.defeated;
      wolf.timer = 0.65;
    }
    stepEntityMovementWithCollision(world, wolf, dt);
    return { teleported: false, following: true, attackedEnemy, enemyDefeated };
  }

  // Seguir activamente la posición exacta del dueño (Jugador 1)
  const horizDist = Math.hypot(pl.pos.x - wolf.pos.x, pl.pos.z - wolf.pos.z);
  if (horizDist > 2.1) {
    const dx = pl.pos.x - wolf.pos.x;
    const dz = pl.pos.z - wolf.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    const followSpeed = horizDist > 6 ? 6.2 : 4.9;
    wolf.vel.x = (dx / len) * followSpeed;
    wolf.vel.z = (dz / len) * followSpeed;
    wolf.state = 'chase';
    stepEntityMovementWithCollision(world, wolf, dt);
    return { teleported: false, following: true, attackedEnemy: null, enemyDefeated: false };
  } else {
    wolf.vel.x = 0;
    wolf.vel.z = 0;
    wolf.state = 'idle';
    stepEntityMovementWithCollision(world, wolf, dt);
    return { teleported: false, following: false, attackedEnemy: null, enemyDefeated: false };
  }
}

export type WeatherType = 'clear' | 'rain' | 'snow';

/**
 * Requisito 4: Sistema de Clima Dinámico — durante la lluvia se generan pequeños charcos de agua (BT.PUDDLE) en el suelo
 */
export function spawnRainPuddleLogic(
  world: InfiniteWorld,
  playerPos: Vec3Like,
  rng: () => number = Math.random
): { spawned: boolean; x: number; y: number; z: number } {
  const ang = rng() * Math.PI * 2;
  const dist = 3 + rng() * 12;
  const wx = Math.floor(playerPos.x + Math.cos(ang) * dist);
  const wz = Math.floor(playerPos.z + Math.sin(ang) * dist);
  ensureChunksAroundPlayer(world, wx, wz, 0);

  const sy = surfY(world, wx, wz);
  if (sy <= SEA + 1 || sy >= WH - 2) {
    return { spawned: false, x: wx, y: sy, z: wz };
  }
  const groundBlock = gB(world, wx, sy - 1, wz);
  const aboveBlock = gB(world, wx, sy, wz);
  if ((groundBlock === BT.GRASS || groundBlock === BT.DIRT || groundBlock === BT.STONE) && aboveBlock === BT.AIR) {
    sB(world, wx, sy, wz, BT.PUDDLE);
    return { spawned: true, x: wx, y: sy, z: wz };
  }
  return { spawned: false, x: wx, y: sy, z: wz };
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
    if (isSolid(world, ix, y, iz)) {
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

/**
 * ─── MODO "BATALLA DE CONSTRUCCIÓN" (BUILD BATTLE) Y ARENA "LUZ ROJA" ───
 */
export type GameModeType = 'survival' | 'red_light' | 'build_battle';
export type BuildBattleOpponent = 'friends' | 'ai';

export const BUILD_BATTLE_DURATION_SEC = 360; // 6 Minutos (06:00)
export const BUILD_BATTLE_FLOOR_Y = 10;

export function formatBuildBattleTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Equipa el Inventario Creativo Infinito para Batalla de Construcción:
 * Incluye bloques de Oro, Diamante, Sillas, Mesas, Ladrillos, Tablones, Vidrio, Piedra y Antorchas.
 */
export function equipBuildBattleCreativeInventory(pl: PlayerState): void {
  const creativeItems = [
    BT.GOLD,
    BT.DIAMOND,
    BT.BRICK,
    BT.CHAIR,
    BT.TABLE,
    BT.PLANK,
    BT.GLASS,
    BT.STONE,
    BT.TORCH,
    BT.WOOD,
    BT.COBBLE,
    BT.DOOR,
    BT.BED,
    BT.CHEST,
    BT.LEAVES,
    BT.WOOL,
    BT.SAND,
    BT.SNOW,
  ];
  for (let i = 0; i < TOTAL_INV_SLOTS; i++) {
    if (i < creativeItems.length) {
      pl.inventory[i] = { type: creativeItems[i], count: 999 };
    } else {
      pl.inventory[i] = null;
    }
  }
  pl.si = 0;
}

/**
 * Construye el mapa plano de Batalla de Construcción dividido por un muro central (x = 0).
 * Mitad izquierda (x < 0): Jugador 1.
 * Mitad derecha (x > 0): Amigos o Bot IA Constructor.
 */
export function setupBuildBattleArena(world: InfiniteWorld): {
  floorY: number;
  playerSpawn: Vec3Like;
  opponentSpawn: Vec3Like;
  wallCoords: Array<{ x: number; y: number; z: number }>;
} {
  ensureChunksAroundPlayer(world, 0, 0, 2);
  const floorY = BUILD_BATTLE_FLOOR_Y;
  const wallCoords: Array<{ x: number; y: number; z: number }> = [];

  for (let x = -16; x <= 16; x++) {
    for (let z = -12; z <= 12; z++) {
      // Base plana sólida
      sB(world, x, floorY - 1, z, BT.DIRT);
      const isBorder = Math.abs(x) === 16 || Math.abs(z) === 12;
      sB(world, x, floorY, z, isBorder ? BT.STONE : BT.GRASS);

      // Limpiar cielo encima de la plataforma
      for (let y = floorY + 1; y < WH - 1; y++) {
        sB(world, x, y, z, BT.AIR);
      }

      // Borde perimetral bajo
      if (isBorder) {
        sB(world, x, floorY + 1, z, BT.COBBLE);
      }

      // Muro central divisorio en x = 0
      if (x === 0 && z >= -11 && z <= 11) {
        for (let y = floorY + 1; y <= floorY + 6; y++) {
          const wallBlock = y === floorY + 6 ? BT.GOLD : BT.COBBLE;
          sB(world, x, y, z, wallBlock);
          wallCoords.push({ x, y, z });
        }
      }
    }
  }

  return {
    floorY,
    playerSpawn: { x: -7.5, y: floorY + 1.05, z: 0.5 },
    opponentSpawn: { x: 7.5, y: floorY + 1.05, z: 0.5 },
    wallCoords,
  };
}

/**
 * Abre el muro divisorio central cuando el temporizador llega a 00:00 para que todos puedan volar, ver y votar.
 */
export function openBuildBattleDividingWall(world: InfiniteWorld): void {
  const floorY = BUILD_BATTLE_FLOOR_Y;
  for (let z = -11; z <= 11; z++) {
    for (let y = floorY + 1; y <= floorY + 6; y++) {
      sB(world, 0, y, z, BT.AIR);
    }
  }
}

/**
 * Genera el plano (blueprint) de la casa que el Bot IA construye paso a paso en la otra mitad (x > 0).
 */
export function getAiHouseBlueprint(
  floorY = BUILD_BATTLE_FLOOR_Y
): Array<{ x: number; y: number; z: number; blockType: number }> {
  const steps: Array<{ x: number; y: number; z: number; blockType: number }> = [];
  const minX = 5;
  const maxX = 11;
  const minZ = -3;
  const maxZ = 3;
  const baseY = floorY + 1;

  // 1. Piso de tablones y esquinas de Oro
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const isCorner = (x === minX || x === maxX) && (z === minZ || z === maxZ);
      steps.push({ x, y: floorY, z, blockType: isCorner ? BT.GOLD : BT.PLANK });
    }
  }

  // 2. Paredes de Ladrillo, pilares de Oro y ventanas de Vidrio (3 niveles)
  for (let dy = 0; dy < 3; dy++) {
    const y = baseY + dy;
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const onEdge = x === minX || x === maxX || z === minZ || z === maxZ;
        if (!onEdge) continue;
        // Entrada frontal en x === minX, z === 0 (niveles 0 y 1)
        if (x === minX && z === 0 && dy < 2) continue;
        const isCorner = (x === minX || x === maxX) && (z === minZ || z === maxZ);
        const isWindow = dy === 1 && ((x === maxX && z === 0) || (z === minZ && x === 8) || (z === maxZ && x === 8));
        steps.push({
          x,
          y,
          z,
          blockType: isCorner ? BT.GOLD : isWindow ? BT.GLASS : BT.BRICK,
        });
      }
    }
  }

  // 3. Mobiliario interior: Mesa, Sillas, Antorchas y Diamante central
  steps.push({ x: 8, y: baseY, z: 0, blockType: BT.TABLE });
  steps.push({ x: 8, y: baseY, z: -1, blockType: BT.CHAIR });
  steps.push({ x: 8, y: baseY, z: 1, blockType: BT.CHAIR });
  steps.push({ x: 10, y: baseY, z: 2, blockType: BT.TORCH });
  steps.push({ x: 10, y: baseY, z: -2, blockType: BT.TORCH });

  // 4. Techo piramidal de Tablones y remate de Diamante
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      steps.push({ x, y: baseY + 3, z, blockType: BT.PLANK });
    }
  }
  for (let x = minX + 1; x <= maxX - 1; x++) {
    for (let z = minZ + 1; z <= maxZ - 1; z++) {
      steps.push({ x, y: baseY + 4, z, blockType: BT.GOLD });
    }
  }
  steps.push({ x: 8, y: baseY + 5, z: 0, blockType: BT.DIAMOND });

  return steps;
}

/**
 * Avanza un paso de construcción del Bot IA en su mitad del mapa.
 */
export function stepAiBuilderBot(
  world: InfiniteWorld,
  botEntity: EntityData | null,
  blueprint: Array<{ x: number; y: number; z: number; blockType: number }>,
  progressIdx: number
): {
  nextIdx: number;
  placedBlock?: { x: number; y: number; z: number; blockType: number };
} {
  if (progressIdx >= blueprint.length) {
    return { nextIdx: progressIdx };
  }
  const step = blueprint[progressIdx];
  sB(world, step.x, step.y, step.z, step.blockType);
  if (botEntity) {
    botEntity.pos.x = step.x - 1.2;
    botEntity.pos.y = BUILD_BATTLE_FLOOR_Y + 1.1;
    botEntity.pos.z = step.z;
  }
  return {
    nextIdx: progressIdx + 1,
    placedBlock: step,
  };
}

/**
 * Construye una Arena Cerrada para el Minijuego "Luz Roja, Luz Verde"
 */
export function setupRedLightArena(world: InfiniteWorld): {
  startX: number;
  startY: number;
  startZ: number;
  finishZ: number;
} {
  ensureChunksAroundPlayer(world, 0, 0, 2);
  const floorY = 10;
  for (let x = -8; x <= 8; x++) {
    for (let z = -22; z <= 8; z++) {
      sB(world, x, floorY - 1, z, BT.STONE);
      const isFinishLine = z === -18;
      const isStartLine = z === 4;
      sB(
        world,
        x,
        floorY,
        z,
        isFinishLine ? BT.GOLD : isStartLine ? BT.PLANK : BT.SAND
      );
      for (let y = floorY + 1; y < WH - 1; y++) {
        sB(world, x, y, z, BT.AIR);
      }
      // Muros cerrados del corredor
      if (x === -8 || x === 8 || z === -22 || z === 8) {
        for (let y = floorY + 1; y <= floorY + 4; y++) {
          sB(world, x, y, z, y === floorY + 4 ? BT.GOLD : BT.BRICK);
        }
      }
    }
  }
  return {
    startX: 0.5,
    startY: floorY + 1.05,
    startZ: 5.5,
    finishZ: -18,
  };
}

