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
}

export const BD: Record<number, BlockDef> = {
  1: { n: 'Pasto', c: 0x5dbb40, ic: '🟩', role: 'Terreno natural' },
  2: { n: 'Tierra', c: 0x9b6b3a, ic: '🟫', role: 'Base de suelo' },
  3: { n: 'Piedra', c: 0x7a7a7a, ic: '🪨', role: 'Muro sólido' },
  4: { n: 'Arena', c: 0xe8d68a, ic: '🟨', role: 'Costa y océano' },
  5: { n: 'Madera', c: 0x7a5230, ic: '🪵', role: 'Tronco para craftear' },
  6: { n: 'Hojas', c: 0x2e7020, ic: '🌿', tr: 1, op: 0.85, role: 'Follaje de árbol' },
  7: { n: 'Nieve', c: 0xf0f0f8, ic: '❄️', role: 'Cumbre helada' },
  8: { n: 'Agua', c: 0x1a55cc, ic: '💧', tr: 1, op: 0.58, role: 'Océano profundo' },
  9: { n: 'Vidrio', c: 0xaaddff, ic: '🔷', tr: 1, op: 0.42, role: 'Ventana cristalina' },
  10: { n: 'Lava', c: 0xff4400, ic: '🔥', em: 0x661800, role: 'Magma luminoso' },
  11: { n: 'Roca Madre', c: 0x333333, ic: '⬛', role: 'Fondo abisal' },
  12: { n: 'Tablones', c: 0xcc9955, ic: '📦', role: 'Refugio y botes' },
  13: { n: 'Adoquín', c: 0x888888, ic: '🧱', role: 'Camino de aldea' },
  14: { n: 'Ladrillo', c: 0xcc5533, ic: '🧱', role: 'Pared reforzada' },
  15: { n: 'Cama', c: 0xdd3333, ic: '🛏️', role: 'Descanso' },
  16: { n: 'Mesa', c: 0xbb8833, ic: '🪑', role: 'Mobiliario' },
  17: { n: 'Hielo', c: 0xaaddff, ic: '🧊', tr: 1, op: 0.78, role: 'Superficie glaciar' },
  18: { n: 'Puerta', c: 0x996633, ic: '🚪', role: 'Acceso de refugio' },
  19: { n: 'Bote', c: 0x9c6630, ic: '⛵', role: 'Navegación y rescate' },
};

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
]);

export const CHUNK_SIZE = 16;
export const WH = 24;
export const SEA = 6;

// Punto de aparición del jugador en Isla Inicial (0.5, y, 0.5)
export const SPAWN_X = 0.5;
export const SPAWN_Z = 0.5;

// La Aldea está muy lejos del Spawn (~210 bloques al sureste, cruzando grandes mares)
export const VX = 148;
export const VZ = 148;
export const VILLAGE_SIZE = 26;

// Coordenadas deterministas de Islas/Continentes lejanos donde esperan los Aldeanos Perdidos
export const LOST_VILLAGER_ISLANDS: Array<{ x: number; z: number; name: string }> = [
  { x: 34, z: 30, name: 'Arrecife del Este' },
  { x: -38, z: 32, name: 'Isla Bruma' },
  { x: 42, z: -36, name: 'Costa del Norte' },
  { x: 86, z: 74, name: 'Archipiélago Central' },
  { x: 118, z: 112, name: 'Península del Faro' },
];
export const TOTAL_VILLAGERS_TO_RESCUE = LOST_VILLAGER_ISLANDS.length;

// Balance de Enemigos Nocturnos:
// Endermans extremadamente raros (probabilidad mínima = 3%, máx 1)
export const MAX_ENDERMEN = 1;
export const ENDERMAN_SPAWN_CHANCE = 0.03;
export const MAX_ZOMBIES = 10;
export const MAX_SPIDERS = 8;

// Velocidad de navegación en bote vs pie/nado
export const BOAT_SPEED = 11.8;

export const HOTBAR_SIZE = 9;
export const BACKPACK_SIZE = 9;
export const TOTAL_INV_SLOTS = HOTBAR_SIZE + BACKPACK_SIZE;
export const MAX_STACK = 64;

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
  passengerVillagerId: number | null;
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
  villageDiscovered: boolean;
  inBoat: boolean;
  activeBoatId: number | null;
  boatPassengerId: number | null;
  villagersRescued: number;
}

export interface EntityData {
  id: number;
  type:
    | 'fish'
    | 'shark'
    | 'zombie'
    | 'spider'
    | 'villager'
    | 'wolf'
    | 'wolf_t'
    | 'cow'
    | 'sheep'
    | 'chicken'
    | 'rabbit'
    | 'horse'
    | 'capybara'
    | 'parrot'
    | 'turtle'
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
  parrotColor?: number;
  // Estado de rescate para aldeanos perdidos
  rescued?: boolean;
  inBoat?: boolean;
  // Salto para arañas nocturnas
  jumpCd?: number;
}

/**
 * Genera un código corto de sala (5 caracteres alfanuméricos en mayúsculas sin caracteres ambiguos)
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

export function inVil(x: number, z: number): boolean {
  return x >= VX - 2 && x <= VX + VILLAGE_SIZE && z >= VZ - 2 && z <= VZ + VILLAGE_SIZE;
}

/**
 * Ruido continental con Grandes Mares, Islas de Rescate y Aldea Lejana
 */
export function getH(x: number, z: number): number {
  if (inVil(x, z)) return SEA + 2;

  // Isla inicial fértil alrededor de (0, 0) con árboles para talar madera y fabricar bote/refugio
  const distSpawn = Math.hypot(x - SPAWN_X, z - SPAWN_Z);
  if (distSpawn < 11) {
    const islandDetail = ni(x, z, 0.14, 101) * 2.2;
    const falloff = Math.max(0, 1 - distSpawn / 11);
    return Math.floor(SEA + 1 + falloff * 2.5 + islandDetail * 0.6);
  }

  // Islas deterministas donde esperan los aldeanos perdidos (garantiza tierra firme rodeada de mar)
  for (const isl of LOST_VILLAGER_ISLANDS) {
    const dIsl = Math.hypot(x - isl.x, z - isl.z);
    if (dIsl < 7.5) {
      const falloff = Math.max(0, 1 - dIsl / 7.5);
      return Math.floor(SEA + 1 + falloff * 2.2);
    }
  }

  // Anillo de gran mar alrededor de la isla inicial (entre 13m y 46m)
  const oceanRing =
    distSpawn >= 13 && distSpawn <= 46
      ? Math.sin(((distSpawn - 13) / 33) * Math.PI) * 3.8
      : 0;

  const continent = ni(x, z, 0.014, 777);
  const ridge = ni(x, z, 0.045, 313);
  const detail = ni(x, z, 0.12, 919);

  const rawElevation = (continent - 0.52) * 16 + (ridge - 0.45) * 6 + detail * 2.2 - oceanRing;
  const h = Math.round(SEA + rawElevation);
  return Math.max(1, Math.min(WH - 5, h));
}

function setChunkBlockRaw(chunk: Uint8Array, lx: number, y: number, lz: number, t: number): void {
  if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= WH) return;
  chunk[localIdx(lx, y, lz)] = t;
}

function getVillageBlockAt(wx: number, y: number, wz: number): number | null {
  if (!inVil(wx, wz)) return null;
  const by = SEA + 2;
  if (y === 0) return BT.BEDROCK;
  if (y < by) return BT.DIRT;
  if (y === by) return BT.COBBLE;

  const rx = wx - VX;
  const rz = wz - VZ;
  if (rx >= 7 && rx <= 10 && rz >= 7 && rz <= 10 && y === by + 1) {
    return BT.WATER;
  }

  if (rx === 5 && rz === 5) {
    if (y >= by + 1 && y <= by + 6) return BT.WOOD;
    if (y === by + 7) return BT.LAVA;
  }

  const houses = [
    [0, 0],
    [11, 0],
    [0, 10],
    [11, 10],
  ];
  const W = 8;
  const H = 5;
  const D = 7;
  const hBaseY = SEA + 3;

  for (const [hx, hz] of houses) {
    const lx = rx - hx;
    const lz = rz - hz;
    const ly = y - hBaseY;
    if (lx >= 0 && lx < W && lz >= 0 && lz < D && ly >= 0 && ly <= H) {
      if (ly === 0) return BT.COBBLE;
      if (ly === H) return BT.PLANK;
      if (lz === 0 && lx === 3 && (ly === 1 || ly === 2)) return BT.AIR;
      if (lz === 0 && lx === 4 && ly === 1) return BT.DOOR;
      if (lz === 0 && (lx === 1 || lx === 6) && ly === 2) return BT.GLASS;
      if (lx === 0 || lx === W - 1 || lz === 0 || lz === D - 1) {
        return ly === H - 1 ? BT.PLANK : BT.BRICK;
      }
      if (ly === 1 && lx === 1 && lz === 2) return BT.BED;
      if (ly === 1 && (lx === 5 || lx === 6) && lz === 5) return BT.TABLE;
      return BT.AIR;
    }
  }

  return BT.AIR;
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

      if (inVil(wx, wz)) {
        for (let y = 0; y < WH; y++) {
          const vt = getVillageBlockAt(wx, y, wz);
          if (vt !== null) setChunkBlockRaw(chunk, lx, y, lz, vt);
        }
        continue;
      }

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

  // Árboles deterministas por chunk (incluyendo árboles garantizados en la isla inicial)
  for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
    for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;
      if (inVil(wx, wz)) continue;

      // No poner un árbol justo encima de un aldeano perdido
      if (LOST_VILLAGER_ISLANDS.some((isl) => Math.abs(wx - isl.x) <= 1 && Math.abs(wz - isl.z) <= 1)) {
        continue;
      }

      const isStarterTree = (wx === 4 && wz === 4) || (wx === -4 && wz === 3);
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
    villageDiscovered: false,
    inBoat: false,
    activeBoatId: null,
    boatPassengerId: null,
    villagersRescued: 0,
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

/**
 * Requisito 3: Crafteo de Bote (Costo: 5 Tablones -> 1 Bote BT.BOAT)
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
 * Requisito 3: Colocar un bote en el agua si el jugador tiene un bote en su inventario
 */
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
  // Verificar que en el punto o su vecindad inmediata haya agua (o costa junto al mar)
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
    // Devolver el bote al inventario si no hay agua cerca
    addItemToInventory(pl, BT.BOAT, 1);
    return { placed: false };
  }

  const boat: BoatData = {
    id: nextBoatId,
    pos: { x: waterX, y: SEA + 0.35, z: waterZ },
    yaw: 0,
    passengerVillagerId: null,
  };
  boats.push(boat);
  return { placed: true, boat };
}

/**
 * Subirse o bajarse de un bote cercano
 */
export function mountBoatLogic(pl: PlayerState, boat: BoatData): boolean {
  const dist = Math.hypot(pl.pos.x - boat.pos.x, pl.pos.z - boat.pos.z);
  if (dist > 5.5) return false;
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
  // Intentar colocar al jugador en tierra firme adyacente si existe
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
 * Requisito 3: Mecánica de Rescate de Aldeanos
 * - Si el jugador está en un bote cerca de un aldeano perdido y hace clic en él, el aldeano sube al bote como pasajero.
 * - Si el jugador navega hasta la aldea con un pasajero y hace clic para bajarlo, el aldeano queda rescatado en la aldea.
 */
export function interactVillagerRescueLogic(
  pl: PlayerState,
  boat: BoatData | null,
  villagers: EntityData[]
): {
  action: 'boarded' | 'rescued' | 'none';
  villager?: EntityData;
  reason?: string;
} {
  // Caso A: Ya llevamos un aldeano pasajero en el bote y estamos en/junto a la Aldea -> Completar Rescate
  if (pl.inBoat && boat && boat.passengerVillagerId !== null) {
    const distToVil = getDistanceToVillage(pl.pos);
    if (inVil(pl.pos.x, pl.pos.z) || distToVil <= VILLAGE_SIZE + 8) {
      const passenger = villagers.find((v) => v.id === boat.passengerVillagerId);
      boat.passengerVillagerId = null;
      pl.boatPassengerId = null;
      if (passenger) {
        passenger.inBoat = false;
        passenger.rescued = true;
        passenger.pos.x = VX + 8 + (pl.villagersRescued % 4) * 2;
        passenger.pos.y = SEA + 3;
        passenger.pos.z = VZ + 8;
      }
      pl.villagersRescued++;
      pl.score += 150;
      return { action: 'rescued', villager: passenger };
    }
  }

  // Caso B: Estamos en bote sin pasajero y hacemos clic cerca de un aldeano perdido -> Subir al bote
  if (pl.inBoat && boat && boat.passengerVillagerId === null) {
    let closest: EntityData | undefined;
    let bestD = 7.5;
    for (const v of villagers) {
      if (v.type === 'villager' && v.alive && !v.rescued && !v.inBoat) {
        const d = Math.hypot(v.pos.x - pl.pos.x, v.pos.z - pl.pos.z);
        if (d < bestD) {
          bestD = d;
          closest = v;
        }
      }
    }
    if (closest) {
      closest.inBoat = true;
      boat.passengerVillagerId = closest.id;
      pl.boatPassengerId = closest.id;
      return { action: 'boarded', villager: closest };
    }
    return { action: 'none', reason: 'Acércate más a un aldeano perdido con tu bote' };
  }

  return { action: 'none', reason: 'Debes ir en un Bote (⛵) para rescatar al aldeano' };
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

/**
 * Requisito 1 y 2: Verificación de Línea de Visión (Raycasting / Voxel Traversal)
 */
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

export function stepEntityMovementWithCollision(
  world: InfiniteWorld,
  e: EntityData,
  dt: number
): void {
  if (e.inBoat) return;

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
  // Permitir pequeños saltos (ej. Arañas saltando) con gravedad suave
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
  joyX?: number; // -1..1 para joystick táctil móvil
  joyY?: number; // -1..1 para joystick táctil móvil
}

export interface PhysicsStepResult {
  jumped: boolean;
  landed: boolean;
  inWater: boolean;
  footstepTriggered: boolean;
}

export function stepPlayerPhysics(
  world: InfiniteWorld,
  pl: PlayerState,
  input: PlayerInputStep,
  dt: number,
  activeBoat?: BoatData | null
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

  // Modo Navegación en Bote: rápido sobre el mar
  if (pl.inBoat && activeBoat) {
    pl.vel.x = mvX * BOAT_SPEED;
    pl.vel.z = mvZ * BOAT_SPEED;

    const nx = pl.pos.x + pl.vel.x * clampedDt;
    const nz = pl.pos.z + pl.vel.z * clampedDt;

    // El bote navega libremente por el agua o costa baja (h <= SEA + 1)
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

    if (!pl.villageDiscovered && getDistanceToVillage(pl.pos) <= 22) {
      pl.villageDiscovered = true;
      pl.score += 250;
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
  const spd = 5.6;
  pl.vel.x = mvX * spd * (inW ? 0.52 : 1);
  pl.vel.z = mvZ * spd * (inW ? 0.52 : 1);

  let jumped = false;
  if (pl.jumpBufferTimer > 0 && (pl.onGround || pl.coyoteTimer > 0)) {
    pl.vel.y = 9.2;
    pl.onGround = false;
    pl.coyoteTimer = 0;
    pl.jumpBufferTimer = 0;
    jumped = true;
  } else if (input.jumpHeld && inW) {
    pl.vel.y = Math.min(pl.vel.y + 9.5 * clampedDt, 3.8);
  } else if (input.jumpHeld && pl.onGround) {
    pl.vel.y = 9.2;
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

  let footstepTriggered = false;
  if (pl.onGround || inW) {
    const moved = Math.hypot(pl.pos.x - prevX, pl.pos.z - prevZ);
    pl.stepDistAccum += moved;
    if (pl.stepDistAccum >= 1.85) {
      pl.stepDistAccum = 0;
      footstepTriggered = true;
    }
  }

  if (!pl.villageDiscovered && getDistanceToVillage(pl.pos) <= 22) {
    pl.villageDiscovered = true;
    pl.score += 250;
  }

  const landed = !wasOnGround && pl.onGround;
  return { jumped, landed, inWater: inW, footstepTriggered };
}

export function getDistanceToVillage(pos: Vec3Like): number {
  const vCenterX = VX + VILLAGE_SIZE * 0.5;
  const vCenterZ = VZ + VILLAGE_SIZE * 0.5;
  return Math.round(Math.hypot(vCenterX - pos.x, vCenterZ - pos.z));
}

export function getCompassDirectionToVillage(pos: Vec3Like): string {
  const vCenterX = VX + VILLAGE_SIZE * 0.5;
  const vCenterZ = VZ + VILLAGE_SIZE * 0.5;
  const dx = vCenterX - pos.x;
  const dz = vCenterZ - pos.z;
  const ns = dz < -15 ? 'N' : dz > 15 ? 'S' : '';
  const ew = dx > 15 ? 'E' : dx < -15 ? 'O' : '';
  return ns + ew || 'Aquí';
}

export function breakBlockLogic(
  world: InfiniteWorld,
  pl: PlayerState,
  x: number,
  y: number,
  z: number
): { broken: boolean; oldType: number; collected: boolean } {
  const t = gB(world, x, y, z);
  if (t === BT.AIR || t === BT.BEDROCK || t === BT.WATER) {
    return { broken: false, oldType: t, collected: false };
  }
  sB(world, x, y, z, BT.AIR);
  pl.blocksBroken++;
  pl.score += 5;

  const { added } = addItemToInventory(pl, t, 1);
  return { broken: true, oldType: t, collected: added > 0 };
}

export function placeBlockLogic(
  world: InfiniteWorld,
  pl: PlayerState,
  x: number,
  y: number,
  z: number,
  nxNorm: number,
  nyNorm: number,
  nzNorm: number
): { placed: boolean; tx: number; ty: number; tz: number; blockType: number } {
  const activeSlot = pl.inventory[pl.si];
  if (!activeSlot || activeSlot.count <= 0 || activeSlot.type <= 0 || activeSlot.type === BT.BOAT) {
    return { placed: false, tx: x, ty: y, tz: z, blockType: 0 };
  }

  const blockType = activeSlot.type;
  const tx = Math.floor(x) + Math.round(nxNorm);
  const ty = Math.floor(y) + Math.round(nyNorm);
  const tz = Math.floor(z) + Math.round(nzNorm);

  if (ty < 1 || ty >= WH - 1) {
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
  if (existing === BT.AIR || existing === BT.WATER) {
    sB(world, tx, ty, tz, blockType);
    activeSlot.count -= 1;
    if (activeSlot.count <= 0) {
      pl.inventory[pl.si] = null;
    }
    pl.blocksPlaced++;
    pl.score += 5;
    return { placed: true, tx, ty, tz, blockType };
  }
  return { placed: false, tx, ty, tz, blockType };
}

export function toggleDoorLogic(
  world: InfiniteWorld,
  x: number,
  y: number,
  z: number
): { removedCoords: Array<{ x: number; y: number; z: number }> } {
  const removedCoords: Array<{ x: number; y: number; z: number }> = [];
  for (const dy of [0, 1, -1]) {
    if (gB(world, x, y + dy, z) === BT.DOOR) {
      sB(world, x, y + dy, z, BT.AIR);
      removedCoords.push({ x, y: y + dy, z });
    }
  }
  return { removedCoords };
}

export function damageEntityLogic(
  ent: EntityData,
  pl: PlayerState,
  rngValue: number = Math.random()
): { defeated: boolean; boneDropped: boolean } {
  if (!ent.alive || ent.state === 'ko') {
    return { defeated: false, boneDropped: false };
  }
  ent.hp -= 1;
  ent.hitFlashTimer = 0.14;
  if (ent.hp <= 0) {
    ent.state = 'ko';
    ent.koTimer = 0.35;
    pl.enemiesDefeated++;
    pl.score += ent.type === 'enderman' ? 75 : ent.type === 'zombie' || ent.type === 'spider' ? 25 : 10;
    let boneDropped = false;
    if ((ent.type === 'zombie' || ent.type === 'spider' || ent.type === 'enderman') && rngValue > 0.35) {
      pl.bones++;
      boneDropped = true;
    }
    return { defeated: true, boneDropped };
  }
  return { defeated: false, boneDropped: false };
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

export function isNightTime(dayTime: number): boolean {
  return dayTime < 0.22 || dayTime > 0.78;
}

/**
 * Regla del Día y la Noche —
 * Si es de día, todos los Zombies, Arañas y Endermans desaparecen inmediatamente (despawn).
 */
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
