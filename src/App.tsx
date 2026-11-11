import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Peer, DataConnection } from 'peerjs';
import {
  BT,
  BD,
  CHUNK_SIZE,
  WH,
  SEA,
  SPAWN_X,
  SPAWN_Z,
  HOTBAR_SIZE,
  TOTAL_INV_SLOTS,
  MAX_ENDERMEN,
  ENDERMAN_SPAWN_CHANCE,
  MAX_ZOMBIES,
  MAX_SPIDERS,
  CLOTHES_PALETTE,
  SAVE_STORAGE_KEY,
  createInfiniteWorld,
  ensureChunksAroundPlayer,
  gB,
  sB,
  getH,
  surfY,
  isSolid,
  getSpawnY,
  createPlayer,
  cyclePlayerClothesLogic,
  stepPlayerPhysics,
  breakBlockLogic,
  placeBlockLogic,
  toggleTwoBlockDoorLogic,
  damageEntityLogic,
  tameWolfLogic,
  stepEnemyCombatLogic,
  stepEntityMovementWithCollision,
  despawnDaytimeMonsters,
  isNightTime,
  getDayPhaseLabel,
  raycastBlock,
  distance3D,
  nearestPlayer,
  addItemToInventory,
  countItemInInventory,
  swapInventorySlots,
  craftWoodToPlanksLogic,
  craftPlanksToTableLogic,
  craftPlanksToSticksLogic,
  craftWoodPickaxeLogic,
  craftStonePickaxeLogic,
  craftPlanksToBoatLogic,
  craftWoolAndPlanksToBedLogic,
  craftPlanksToDoorLogic,
  placeBoatInWaterLogic,
  mountBoatLogic,
  dismountBoatLogic,
  toggleMountHorseLogic,
  findValidMonsterSpawnPoint,
  isPlayerMovingInput,
  serializeSaveGame,
  deserializeSaveGame,
  generateRoomCode,
  normalizeRoomCode,
  type EntityData,
  type PlayerState,
  type BoatData,
} from './game/voxelWorldLogic';

interface MeshEntity extends EntityData {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  legs: THREE.Mesh[];
  arms?: THREE.Mesh[];
  eyes?: THREE.Mesh[];
}

interface FloatingParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface RemotePlayerVisual {
  peerId: string;
  group: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  legs: THREE.Mesh[];
  arms: THREE.Mesh[];
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetPitch: number;
  heldBlock: number;
  inBoat: boolean;
  mountedHorse: boolean;
  clothesIdx: number;
  walkPhase: number;
  lastSeen: number;
}

interface FloatingChatBubble {
  id: string;
  peerId: string;
  senderLabel: string;
  text: string;
  expiresAt: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  isLocal: boolean;
}

type NetworkMessage =
  | {
      type: 'player:move';
      peerId: string;
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      heldBlock: number;
      inBoat: boolean;
      mountedHorse: boolean;
      clothesIdx: number;
      walkPhase: number;
    }
  | {
      type: 'block:set';
      x: number;
      y: number;
      z: number;
      blockType: number;
    }
  | {
      type: 'door:toggle';
      x: number;
      y: number;
      z: number;
    }
  | {
      type: 'pvp:hit';
      targetPeerId: string;
      attackerPeerId: string;
      damage: number;
    }
  | {
      type: 'chat:msg';
      peerId: string;
      senderLabel: string;
      text: string;
    }
  | {
      type: 'clothes:change';
      peerId: string;
      clothesIdx: number;
    }
  | {
      type: 'challenge:state';
      state: 'off' | 'green' | 'red';
    }
  | {
      type: 'world:sync';
      modifications: Array<[string, number]>;
      dayTime: number;
      challengeState: 'off' | 'green' | 'red';
    };

const PEER_PREFIX = 'VOXELWORLD-SURVIVAL-2026-';

// Helper para guardar también en IndexedDB además de localStorage
function saveToIndexedDB(key: string, jsonPayload: string): void {
  try {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open('VoxelWorldDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) {
        db.createObjectStore('saves');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(jsonPayload, key);
    };
  } catch {
    // IndexedDB fallback silencioso
  }
}

export function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCraftingTableOpen, setIsCraftingTableOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [selectedSwapSlot, setSelectedSwapSlot] = useState<number | null>(null);

  // Estado PWA ("Instalar Juego")
  const [pwaInstallBannerMsg, setPwaInstallBannerMsg] = useState<string | null>(null);
  const deferredInstallPromptRef = useRef<any>(null);

  // Estado Multijugador PeerJS
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [mpStatus, setMpStatus] = useState<'offline' | 'connecting' | 'hosting' | 'connected'>('offline');
  const [mpError, setMpError] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState<number>(1);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Estado Desafío "Luz Roja, Luz Verde"
  const [challengeState, setChallengeState] = useState<'off' | 'green' | 'red'>('off');
  const challengeStateRef = useRef<'off' | 'green' | 'red'>('off');

  // Chat flotante sobre cabezas
  const [floatingChats, setFloatingChats] = useState<FloatingChatBubble[]>([]);
  const floatingChatsRef = useRef<FloatingChatBubble[]>([]);

  // Wolf naming modal state
  const [wolfModal, setWolfModal] = useState<{ open: boolean; wolfId: number | null }>({
    open: false,
    wolfId: null,
  });
  const [wolfNameInput, setWolfNameInput] = useState('Fenrir');

  // Trigger de refresco reactivo para inventario/mesas
  const [, setUiTick] = useState(0);
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(SAVE_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  // Referencias para acceso desde callbacks de UI y red
  const actionsRef = useRef<{
    confirmWolfName: (name: string) => void;
    cancelWolfName: () => void;
    craftPlanks: () => void;
    craftTable: () => void;
    craftSticks: () => void;
    craftWoodPickaxe: () => void;
    craftStonePickaxe: () => void;
    craftBoat: () => void;
    craftBed: () => void;
    craftDoor: () => void;
    changeClothes: () => void;
    saveGame: () => void;
    toggleRedGreenChallenge: () => void;
    sendChatMessage: (text: string) => void;
    handleSlotClick: (slotIdx: number) => void;
    selectHotbarSlot: (slotIdx: number) => void;
    createRoom: () => void;
    joinRoom: (code: string) => void;
    touchActionBreak: () => void;
    touchActionPlace: () => void;
    touchJumpStart: () => void;
    touchJumpEnd: () => void;
    toggleInventoryModal: () => void;
    toggleCraftingTableModal: () => void;
  } | null>(null);

  const plRef = useRef<PlayerState | null>(null);
  const joyVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyTouchIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const lookTouchRef = useRef<{ id: number; lastX: number; lastY: number } | null>(null);
  const camAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0.75, pitch: -0.1 });

  // Requisito 3: Registro dinámico de Service Worker y manifest.json mediante Data URIs para PWA
  useEffect(() => {
    try {
      const makeIconDataUrl = (size: number) => {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, size, size);
          // Bloque voxel estilizado esmeralda/tierra
          const pad = Math.floor(size * 0.14);
          const w = size - pad * 2;
          ctx.fillStyle = '#10b981';
          ctx.fillRect(pad, pad, w, Math.floor(w * 0.35));
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(pad, pad + Math.floor(w * 0.35), w, Math.floor(w * 0.65));
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = Math.max(4, Math.floor(size * 0.03));
          ctx.strokeRect(pad, pad, w, w);
        }
        return c.toDataURL('image/png');
      };

      const icon192 = makeIconDataUrl(192);
      const icon512 = makeIconDataUrl(512);

      const dynamicManifest = {
        name: 'VoxelWorld — Supervivencia & Desafíos Multijugador',
        short_name: 'VoxelWorld',
        description:
          'Sandbox 3D de supervivencia pura, PvP, desafíos Luz Roja Luz Verde y multijugador P2P.',
        start_url: window.location.origin + '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#090d16',
        theme_color: '#10b981',
        icons: [
          { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      };

      const manifestDataUri =
        'data:application/manifest+json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(dynamicManifest));

      let linkEl = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.rel = 'manifest';
        document.head.appendChild(linkEl);
      }
      linkEl.href = manifestDataUri;

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Fallback con Data/Blob URI si el entorno restringe archivo estático
          const swCode = `
            self.addEventListener('install', (e) => self.skipWaiting());
            self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
            self.addEventListener('fetch', (e) => {});
          `;
          const blob = new Blob([swCode], { type: 'application/javascript' });
          navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
        });
      }
    } catch {
      // Ignorar errores en contextos restringidos
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredInstallPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const handleInstallPWAClick = async () => {
    if (deferredInstallPromptRef.current) {
      try {
        deferredInstallPromptRef.current.prompt();
        await deferredInstallPromptRef.current.userChoice;
        deferredInstallPromptRef.current = null;
        setPwaInstallBannerMsg('✅ ¡Instalación de VoxelWorld iniciada!');
      } catch {
        setPwaInstallBannerMsg('✅ PWA lista: usa el icono "Instalar aplicación" en la barra de tu navegador.');
      }
    } else {
      setPwaInstallBannerMsg(
        '📲 PWA Activada (Manifest + Service Worker registrados). En Chrome/Edge/Móvil selecciona "Instalar aplicación" o "Añadir a pantalla de inicio".'
      );
    }
    setTimeout(() => setPwaInstallBannerMsg(null), 5000);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const touchDetected =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(touchDetected);

    // ─── WEB AUDIO SYNTHESIZER (CERO ASSETS EXTERNOS) ─────────────────
    let audioCtx: AudioContext | null = null;
    const ensureAudio = () => {
      if (!audioCtx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };

    const playSfx = (
      kind:
        | 'step'
        | 'jump'
        | 'land'
        | 'break'
        | 'place'
        | 'hit'
        | 'hurt'
        | 'tame'
        | 'craft'
        | 'door'
        | 'horse'
        | 'redlight'
        | 'greenlight'
    ) => {
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (kind === 'step') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(95 + Math.random() * 25, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.055);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.start(now);
          osc.stop(now + 0.06);
        } else if (kind === 'jump') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(390, now + 0.12);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
          osc.start(now);
          osc.stop(now + 0.13);
        } else if (kind === 'land') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (kind === 'break') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(68, now + 0.11);
          gain.gain.setValueAtTime(0.11, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (kind === 'place' || kind === 'door') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(kind === 'door' ? 210 : 280, now);
          osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (kind === 'hit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.14);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (kind === 'hurt' || kind === 'redlight') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(135, now);
          osc.frequency.linearRampToValueAtTime(60, now + 0.22);
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.start(now);
          osc.stop(now + 0.24);
        } else if (kind === 'tame' || kind === 'craft' || kind === 'horse' || kind === 'greenlight') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.setValueAtTime(540, now + 0.07);
          osc.frequency.setValueAtTime(720, now + 0.14);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
        }
      } catch {
        // Ignore audio context restrictions
      }
    };

    // ─── RENDERER & SCENE ─────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    renderer.domElement.className = 'block w-full h-full cursor-crosshair select-none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.011);

    const cam1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 145);

    const ambL = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambL);
    const sunL = new THREE.DirectionalLight(0xfff5e0, 0.95);
    sunL.position.set(60, 100, 40);
    scene.add(sunL);

    const skyGeo = new THREE.SphereGeometry(135, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffee44 })
    );
    scene.add(sunMesh);

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xddeeff })
    );
    scene.add(moonMesh);

    const stPos: number[] = [];
    for (let i = 0; i < 300; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      stPos.push(
        125 * Math.sin(ph) * Math.cos(th),
        125 * Math.sin(ph) * Math.sin(th),
        125 * Math.cos(ph)
      );
    }
    const stGeo = new THREE.BufferGeometry();
    stGeo.setAttribute('position', new THREE.Float32BufferAttribute(stPos, 3));
    const stMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0,
    });
    const stars = new THREE.Points(stGeo, stMat);
    scene.add(stars);

    let dayTime = 0.35; // Mañana soleada inicial
    const DAY_SPEED = 0.008;

    // ─── TEXTURAS DE BLOQUES PROCEDURALES ────────────────────────────
    function mkNoiseTex(hexColor: number): THREE.CanvasTexture {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d')!;
      const col = new THREE.Color(hexColor);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const v = 0.88 + Math.random() * 0.24;
          const r = Math.min(255, Math.floor(col.r * 255 * v));
          const g = Math.min(255, Math.floor(col.g * 255 * v));
          const b = Math.min(255, Math.floor(col.b * 255 * v));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.strokeRect(0, 0, 16, 16);
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    }

    const BMAT: Record<number, THREE.MeshLambertMaterial> = {};
    for (const [k, d] of Object.entries(BD)) {
      const id = Number(k);
      const o: THREE.MeshLambertMaterialParameters = {
        map: mkNoiseTex(d.c),
      };
      if (d.tr) {
        o.transparent = true;
        o.opacity = d.op;
      }
      if (d.em) {
        o.emissive = new THREE.Color(d.em);
      }
      BMAT[id] = new THREE.MeshLambertMaterial(o);
    }

    // ─── MUNDO INFINITO POR CHUNKS Y GUARDADO AUTOMÁTICO ─────────────
    const world = createInfiniteWorld();
    const PL1 = createPlayer();
    plRef.current = PL1;

    // Requisito 3: Recuperar automáticamente el progreso guardado al cargar la página
    try {
      const savedRaw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (savedRaw) {
        const res = deserializeSaveGame(savedRaw, world, PL1);
        if (res.restored) {
          camAnglesRef.current.yaw = res.yaw;
          camAnglesRef.current.pitch = res.pitch;
        }
      }
    } catch {
      // Continuar con mundo nuevo si no hay guardado previo
    }

    const VIEW_CHUNK_RADIUS = 2; // 5x5 chunks = 80x80 bloques activos con descarga dinámica
    ensureChunksAroundPlayer(world, PL1.pos.x, PL1.pos.z, VIEW_CHUNK_RADIUS);

    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    // Geometría de puerta abierta (rotada en la bisagra para dejar el paso libre visualmente)
    const openDoorGeo = new THREE.BoxGeometry(0.18, 1, 0.96);
    openDoorGeo.translate(-0.41, 0, 0);

    const iMeshes: Record<number, THREE.InstancedMesh> = {};
    const dummy = new THREE.Object3D();
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();

    function vis(x: number, y: number, z: number): boolean {
      const b = gB(world, x, y, z);
      if (b === BT.AIR) return false;
      if (b === BT.DOOR_OPEN) return true;
      for (const [dx, dy, dz] of [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ]) {
        const nb = gB(world, x + dx, y + dy, z + dz);
        if (nb === BT.AIR || (BD[nb]?.tr && nb !== b)) return true;
      }
      return false;
    }

    let activeCenterCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
    let activeCenterCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);

    // Requisito 8: InstancedMesh + Frustum Culling + Despawn de Chunks lejanos
    function rebuildMeshes(): void {
      for (const k of Object.keys(iMeshes)) {
        const id = Number(k);
        scene.remove(iMeshes[id]);
        iMeshes[id].dispose();
        delete iMeshes[id];
      }

      const cnt: Record<number, number> = {};
      const pos: Record<number, number[]> = {};

      const minX = (activeCenterCX - VIEW_CHUNK_RADIUS) * CHUNK_SIZE;
      const maxX = (activeCenterCX + VIEW_CHUNK_RADIUS + 1) * CHUNK_SIZE;
      const minZ = (activeCenterCZ - VIEW_CHUNK_RADIUS) * CHUNK_SIZE;
      const maxZ = (activeCenterCZ + VIEW_CHUNK_RADIUS + 1) * CHUNK_SIZE;

      for (let x = minX; x < maxX; x++) {
        for (let z = minZ; z < maxZ; z++) {
          for (let y = 0; y < WH; y++) {
            const b = gB(world, x, y, z);
            if (b !== BT.AIR && !BD[b]?.isItemOnly && vis(x, y, z)) {
              cnt[b] = (cnt[b] || 0) + 1;
              (pos[b] = pos[b] || []).push(x, y, z);
            }
          }
        }
      }

      for (const [k, c] of Object.entries(cnt)) {
        const b = Number(k);
        if (!c || !BMAT[b]) continue;
        const geoToUse = b === BT.DOOR_OPEN ? openDoorGeo : bGeo;
        const im = new THREE.InstancedMesh(geoToUse, BMAT[b], c);
        const p = pos[b];
        for (let i = 0; i < c; i++) {
          dummy.position.set(p[i * 3] + 0.5, p[i * 3 + 1] + 0.5, p[i * 3 + 2] + 0.5);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
        // Requisito 8: Frustum Culling activo en cada InstancedMesh
        im.computeBoundingBox();
        im.computeBoundingSphere();
        im.frustumCulled = true;
        scene.add(im);
        iMeshes[b] = im;
      }
    }

    rebuildMeshes();

    // ─── PARTÍCULAS Y FEEDBACK VISUAL ────────────────────────────────
    const particles: FloatingParticle[] = [];
    const partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);

    function spawnBlockParticles(wx: number, wy: number, wz: number, colorHex: number, count = 12) {
      const mat = new THREE.MeshLambertMaterial({ color: colorHex });
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(partGeo, mat);
        m.position.set(
          wx + 0.2 + Math.random() * 0.6,
          wy + 0.2 + Math.random() * 0.6,
          wz + 0.2 + Math.random() * 0.6
        );
        scene.add(m);
        particles.push({
          mesh: m,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 4.2,
            1.8 + Math.random() * 3.2,
            (Math.random() - 0.5) * 4.2
          ),
          life: 0.42 + Math.random() * 0.22,
          maxLife: 0.64,
        });
      }
    }

    const selBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    selBox.visible = false;
    scene.add(selBox);

    // ─── MODELOS 3D DE BOTES Y CABALLOS ──────────────────────────────
    const boats: BoatData[] = [];
    const boatMeshes = new Map<number, THREE.Group>();
    let nextBoatId = 1;

    function createBoatMesh(): THREE.Group {
      const g = new THREE.Group();
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
      const plankMat = new THREE.MeshLambertMaterial({ color: 0xc1874b });
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.65), woodMat);
      base.position.set(0, 0.11, 0);
      g.add(base);

      const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.65), plankMat);
      leftSide.position.set(-0.52, 0.28, 0);
      g.add(leftSide);

      const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.65), plankMat);
      rightSide.position.set(0.52, 0.28, 0);
      g.add(rightSide);

      const front = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.14), plankMat);
      front.position.set(0, 0.28, -0.76);
      g.add(front);

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.14), plankMat);
      back.position.set(0, 0.28, 0.76);
      g.add(back);

      return g;
    }

    function spawnBoatVisual(b: BoatData) {
      if (boatMeshes.has(b.id)) return;
      const m = createBoatMesh();
      m.position.set(b.pos.x, b.pos.y, b.pos.z);
      m.rotation.y = b.yaw;
      scene.add(m);
      boatMeshes.set(b.id, m);
    }

    // ─── MULTIJUGADOR ONLINE (PEERJS), PVP Y AVATARES 3D ─────────────
    let peerInstance: Peer | null = null;
    let myPeerId = 'LOCAL';
    const connections = new Map<string, DataConnection>();
    const remotePlayers = new Map<string, RemotePlayerVisual>();

    function createRemotePlayerMesh(clothesIdx = 0): {
      group: THREE.Group;
      head: THREE.Mesh;
      torso: THREE.Mesh;
      legs: THREE.Mesh[];
      arms: THREE.Mesh[];
    } {
      const group = new THREE.Group();
      const palette = CLOTHES_PALETTE[clothesIdx % CLOTHES_PALETTE.length] || CLOTHES_PALETTE[0];
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xf1c27d });
      const shirtMat = new THREE.MeshLambertMaterial({ color: palette.hex });
      const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMat);
      head.position.set(0, 1.48, 0);
      group.add(head);

      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
      eyeL.position.set(-0.11, 1.5, -0.25);
      group.add(eyeL);
      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
      eyeR.position.set(0.11, 1.5, -0.25);
      group.add(eyeR);

      const pupL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06), pupilMat);
      pupL.position.set(-0.11, 1.5, -0.26);
      group.add(pupL);
      const pupR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06), pupilMat);
      pupR.position.set(0.11, 1.5, -0.26);
      group.add(pupR);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.28), shirtMat);
      torso.position.set(0, 0.9, 0);
      group.add(torso);

      const arms: THREE.Mesh[] = [];
      for (const sx of [-0.36, 0.36]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), shirtMat);
        arm.position.set(sx, 0.92, 0);
        group.add(arm);
        arms.push(arm);
      }

      const legs: THREE.Mesh[] = [];
      for (const sx of [-0.13, 0.13]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.22), pantsMat);
        leg.position.set(sx, 0.28, 0);
        group.add(leg);
        legs.push(leg);
      }

      scene.add(group);
      return { group, head, torso, legs, arms };
    }

    function addFloatingChatBubble(peerId: string, senderLabel: string, text: string, isLocal: boolean) {
      const clean = text.trim().slice(0, 90);
      if (!clean) return;
      const bubble: FloatingChatBubble = {
        id: `${Date.now()}-${Math.random()}`,
        peerId,
        senderLabel,
        text: clean,
        expiresAt: performance.now() + 5000, // 5 segundos exactos
        screenX: window.innerWidth * 0.5,
        screenY: isLocal ? 120 : window.innerHeight * 0.35,
        visible: true,
        isLocal,
      };
      floatingChatsRef.current = [
        ...floatingChatsRef.current.filter((b) => b.peerId !== peerId),
        bubble,
      ];
      setFloatingChats([...floatingChatsRef.current]);
    }

    function broadcastNetMessage(msg: NetworkMessage, excludePeerId?: string) {
      for (const [pid, conn] of connections.entries()) {
        if (pid !== excludePeerId && conn.open) {
          try {
            conn.send(msg);
          } catch {
            // Ignorar envío fallido
          }
        }
      }
    }

    function triggerPlayerDeathAndRespawn(reasonMsg: string) {
      playSfx('redlight');
      PL1.inBoat = false;
      PL1.activeBoatId = null;
      PL1.mountedHorseId = null;
      PL1.hp = 20;
      PL1.invul = 2.0;
      ensureChunksAroundPlayer(world, SPAWN_X, SPAWN_Z, VIEW_CHUNK_RADIUS);
      PL1.pos.x = SPAWN_X;
      PL1.pos.y = getSpawnY();
      PL1.pos.z = SPAWN_Z;
      PL1.vel.x = 0;
      PL1.vel.y = 0;
      PL1.vel.z = 0;
      activeCenterCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
      activeCenterCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);
      rebuildMeshes();
      showMsg(reasonMsg);
    }

    function handleIncomingNetMessage(msg: NetworkMessage, fromConn: DataConnection) {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'player:move') {
        let rp = remotePlayers.get(msg.peerId);
        if (!rp) {
          const built = createRemotePlayerMesh(msg.clothesIdx || 0);
          rp = {
            peerId: msg.peerId,
            group: built.group,
            head: built.head,
            torso: built.torso,
            legs: built.legs,
            arms: built.arms,
            targetPos: new THREE.Vector3(msg.x, msg.y, msg.z),
            targetYaw: msg.yaw,
            targetPitch: msg.pitch,
            heldBlock: msg.heldBlock,
            inBoat: msg.inBoat,
            mountedHorse: msg.mountedHorse,
            clothesIdx: msg.clothesIdx || 0,
            walkPhase: msg.walkPhase || 0,
            lastSeen: performance.now(),
          };
          rp.group.position.set(msg.x, msg.y, msg.z);
          remotePlayers.set(msg.peerId, rp);
          setPeerCount(connections.size + 1);
        } else {
          rp.targetPos.set(msg.x, msg.y, msg.z);
          rp.targetYaw = msg.yaw;
          rp.targetPitch = msg.pitch;
          rp.heldBlock = msg.heldBlock;
          rp.inBoat = msg.inBoat;
          rp.mountedHorse = msg.mountedHorse;
          rp.walkPhase = msg.walkPhase || 0;
          if (rp.clothesIdx !== msg.clothesIdx) {
            rp.clothesIdx = msg.clothesIdx;
            const entry = CLOTHES_PALETTE[rp.clothesIdx % CLOTHES_PALETTE.length] || CLOTHES_PALETTE[0];
            (rp.torso.material as THREE.MeshLambertMaterial).color.setHex(entry.hex);
          }
          rp.lastSeen = performance.now();
        }
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'block:set') {
        sB(world, msg.x, msg.y, msg.z, msg.blockType);
        rebuildMeshes();
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'door:toggle') {
        toggleTwoBlockDoorLogic(world, msg.x, msg.y, msg.z);
        playSfx('door');
        rebuildMeshes();
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'pvp:hit') {
        if (msg.targetPeerId === myPeerId || msg.targetPeerId === 'ALL') {
          // Requisito 1: PvP daño de 1 corazón (2 HP) por golpe; si muere reaparece en Spawn
          const dmg = msg.damage || 2;
          PL1.hp = Math.max(0, PL1.hp - dmg);
          PL1.invul = 0.5;
          playSfx('hurt');
          triggerDamageOverlay();
          if (PL1.hp <= 0) {
            triggerPlayerDeathAndRespawn('💀 ¡Fuiste derrotado en PvP! Reapareciendo en el Spawn...');
          } else {
            showMsg('⚔️ ¡Recibiste un golpe PvP (-1 ❤️)!');
          }
        }
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'chat:msg') {
        addFloatingChatBubble(msg.peerId, msg.senderLabel || 'Jugador', msg.text, false);
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'clothes:change') {
        const rp = remotePlayers.get(msg.peerId);
        if (rp) {
          rp.clothesIdx = msg.clothesIdx;
          const entry = CLOTHES_PALETTE[rp.clothesIdx % CLOTHES_PALETTE.length] || CLOTHES_PALETTE[0];
          (rp.torso.material as THREE.MeshLambertMaterial).color.setHex(entry.hex);
        }
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'challenge:state') {
        challengeStateRef.current = msg.state;
        setChallengeState(msg.state);
        if (msg.state === 'green') playSfx('greenlight');
        else if (msg.state === 'red') playSfx('redlight');
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'world:sync') {
        for (const [key, bType] of msg.modifications) {
          const [sx, sy, sz] = key.split(',').map(Number);
          if (!Number.isNaN(sx) && !Number.isNaN(sy) && !Number.isNaN(sz)) {
            sB(world, sx, sy, sz, bType);
          }
        }
        dayTime = msg.dayTime;
        challengeStateRef.current = msg.challengeState || 'off';
        setChallengeState(challengeStateRef.current);
        rebuildMeshes();
      }
    }

    function registerConnection(conn: DataConnection) {
      conn.on('open', () => {
        connections.set(conn.peer, conn);
        setPeerCount(connections.size + 1);
        setMpStatus((prev) => (prev === 'hosting' ? 'hosting' : 'connected'));
        setMpError(null);

        const modifications = Array.from(world.modified.entries());
        conn.send({
          type: 'world:sync',
          modifications,
          dayTime,
          challengeState: challengeStateRef.current,
        } satisfies NetworkMessage);

        showMsg('🌐 ¡Jugador conectado a la sala P2P!');
      });

      conn.on('data', (raw) => {
        handleIncomingNetMessage(raw as NetworkMessage, conn);
      });

      conn.on('close', () => {
        connections.delete(conn.peer);
        const rp = remotePlayers.get(conn.peer);
        if (rp) {
          scene.remove(rp.group);
          remotePlayers.delete(conn.peer);
        }
        setPeerCount(connections.size + 1);
      });
    }

    function startHostingRoom() {
      setMpError(null);
      const code = generateRoomCode();
      setRoomCode(code);
      setIsHost(true);
      setMpStatus('connecting');

      try {
        if (peerInstance) peerInstance.destroy();
        const peer = new Peer(`${PEER_PREFIX}${code}`);
        peerInstance = peer;

        peer.on('open', (id) => {
          myPeerId = id;
          setMpStatus('hosting');
          showMsg(`📡 Sala creada: Código ${code}`);
        });

        peer.on('connection', (conn) => {
          registerConnection(conn);
        });

        peer.on('error', () => {
          setMpStatus('hosting');
        });
      } catch {
        setMpStatus('hosting');
      }
    }

    function connectToExistingRoom(rawCode: string) {
      const clean = normalizeRoomCode(rawCode);
      if (clean.length < 4) {
        setMpError('Ingresa un código válido de 4 a 5 caracteres.');
        return;
      }
      setMpError(null);
      setRoomCode(clean);
      setIsHost(false);
      setMpStatus('connecting');

      try {
        if (peerInstance) peerInstance.destroy();
        const peer = new Peer();
        peerInstance = peer;

        peer.on('open', (id) => {
          myPeerId = id;
          const conn = peer.connect(`${PEER_PREFIX}${clean}`, { reliable: true });
          registerConnection(conn);
          setShowJoinModal(false);
        });

        peer.on('error', () => {
          setMpError(`No se pudo conectar a la sala ${clean}. Verifica el código.`);
          setMpStatus('offline');
        });
      } catch {
        setMpError('Error al inicializar PeerJS.');
        setMpStatus('offline');
      }
    }

    // ─── ENTIDADES: PECES, OVEJAS, CABALLOS, ZOMBIES, ARAÑAS, LOBOS, ENDERMAN ──
    const entities: MeshEntity[] = [];
    let nextEntityId = 1;

    function mkBox(
      w: number,
      h: number,
      d: number,
      c: number,
      ox = 0,
      oy = 0,
      oz = 0
    ): THREE.Mesh {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: c })
      );
      m.position.set(ox, oy, oz);
      return m;
    }

    function addFish(x: number, z: number) {
      const g = new THREE.Group();
      const fc = [0xff6622, 0xffaa00, 0x22ccff, 0xff3388][Math.floor(Math.random() * 4)];
      g.add(mkBox(0.5, 0.25, 0.2, fc));
      g.add(mkBox(0.2, 0.3, 0.15, fc, -0.3, 0, 0));
      g.position.set(x, SEA - 0.8 - Math.random() * 1.5, z);
      scene.add(g);
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs: [],
        type: 'fish',
        pos: g.position,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3),
        state: 'idle',
        timer: Math.random() * 3,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 4,
        maxHp: 4,
      });
    }

    function addAnimal(type: 'cow' | 'sheep' | 'chicken', x: number, z: number) {
      const g = new THREE.Group();
      const sy = surfY(world, x, z);
      if (sy <= SEA + 1) return;
      const legs: THREE.Mesh[] = [];
      const cfg = {
        cow: {
          bc: 0x8b5a2b,
          hc: 0x6b3a1b,
          bw: 0.9,
          bh: 0.6,
          bd: 1.2,
          hw: 0.45,
          hh: 0.45,
          hd: 0.45,
          lh: 0.45,
          hp: 10,
        },
        sheep: {
          bc: 0xf4f4f6,
          hc: 0x555555,
          bw: 0.85,
          bh: 0.68,
          bd: 1.05,
          hw: 0.4,
          hh: 0.4,
          hd: 0.4,
          lh: 0.4,
          hp: 8,
        },
        chicken: {
          bc: 0xf5f5dc,
          hc: 0xf5f5dc,
          bw: 0.4,
          bh: 0.35,
          bd: 0.5,
          hw: 0.25,
          hh: 0.28,
          hd: 0.25,
          lh: 0.25,
          hp: 4,
        },
      }[type];

      g.add(mkBox(cfg.bw, cfg.bh, cfg.bd, cfg.bc, 0, cfg.lh + cfg.bh / 2, 0));
      g.add(mkBox(cfg.hw, cfg.hh, cfg.hd, cfg.hc, 0, cfg.lh + cfg.bh + cfg.hh / 3, cfg.bd / 2));
      if (type === 'chicken') {
        g.add(mkBox(0.1, 0.08, 0.15, 0xffaa00, 0, cfg.lh + cfg.bh + 0.1, cfg.bd / 2 + 0.18));
        g.add(mkBox(0.08, 0.12, 0.1, 0xff2200, 0, cfg.lh + cfg.bh + 0.26, cfg.bd / 2 + 0.05));
      }
      const lPositions =
        type === 'chicken'
          ? [
              [-0.1, 0],
              [0.1, 0],
            ]
          : [
              [-cfg.bw / 3, -cfg.bd / 3],
              [cfg.bw / 3, -cfg.bd / 3],
              [-cfg.bw / 3, cfg.bd / 3],
              [cfg.bw / 3, cfg.bd / 3],
            ];
      for (const [lx, lz] of lPositions) {
        const l = mkBox(0.16, cfg.lh, 0.16, cfg.hc, lx, cfg.lh / 2, lz);
        g.add(l);
        legs.push(l);
      }
      g.position.set(x, sy, z);
      scene.add(g);
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs,
        type,
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: Math.random() * 4,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: cfg.hp,
        maxHp: cfg.hp,
      });
    }

    // Requisito 5: Modelo 3D de Caballo montable
    function addHorse(x: number, z: number) {
      const sy = surfY(world, x, z);
      if (sy <= SEA + 1) return;
      const g = new THREE.Group();
      const coatColors = [0x8b4513, 0xa0522d, 0x6b3e26, 0xd2a679];
      const coat = coatColors[Math.floor(Math.random() * coatColors.length)];
      const maneCol = 0x2b1b12;
      const saddleCol = 0xb45309;

      // Cuerpo robusto
      g.add(mkBox(0.88, 0.72, 1.55, coat, 0, 0.95, 0));
      // Silla de montar
      g.add(mkBox(0.92, 0.16, 0.58, saddleCol, 0, 1.34, -0.05));
      // Cuello y cabeza
      g.add(mkBox(0.38, 0.65, 0.42, coat, 0, 1.42, 0.68));
      g.add(mkBox(0.36, 0.36, 0.62, coat, 0, 1.68, 0.92));
      // Crin y cola
      g.add(mkBox(0.14, 0.58, 0.18, maneCol, 0, 1.5, 0.45));
      g.add(mkBox(0.18, 0.55, 0.18, maneCol, 0, 0.85, -0.84));

      const legs: THREE.Mesh[] = [];
      for (const [lx, lz] of [
        [-0.28, -0.55],
        [0.28, -0.55],
        [-0.28, 0.55],
        [0.28, 0.55],
      ]) {
        const leg = mkBox(0.22, 0.68, 0.22, coat, lx, 0.34, lz);
        g.add(leg);
        legs.push(leg);
      }

      g.position.set(x, sy, z);
      scene.add(g);
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs,
        type: 'horse',
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: Math.random() * 4,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 20,
        maxHp: 20,
        riddenByPlayer: false,
      });
    }

    function addZombie(x: number, z: number, explicitY?: number): MeshEntity | null {
      const sy = explicitY !== undefined ? explicitY : surfY(world, x, z);
      if (sy <= SEA + 1) return null;
      const g = new THREE.Group();
      const legs: THREE.Mesh[] = [];
      const arms: THREE.Mesh[] = [];
      const eyes: THREE.Mesh[] = [];
      const l1 = mkBox(0.22, 0.65, 0.22, 0x2244aa, -0.13, 0.325, 0);
      const l2 = mkBox(0.22, 0.65, 0.22, 0x2244aa, 0.13, 0.325, 0);
      g.add(l1, l2);
      legs.push(l1, l2);
      g.add(mkBox(0.5, 0.65, 0.28, 0x2d6e2d, 0, 0.975, 0));
      g.add(mkBox(0.45, 0.45, 0.45, 0x3a8a3a, 0, 1.525, 0));
      const eyeMat1 = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      const eyeMat2 = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.05), eyeMat1);
      e1.position.set(-0.1, 1.56, 0.23);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.05), eyeMat2);
      e2.position.set(0.1, 1.56, 0.23);
      g.add(e1, e2);
      eyes.push(e1, e2);
      const a1 = mkBox(0.18, 0.55, 0.18, 0x3a8a3a, -0.36, 1.0, 0.2);
      const a2 = mkBox(0.18, 0.55, 0.18, 0x3a8a3a, 0.36, 1.0, 0.2);
      a1.rotation.x = -1.2;
      a2.rotation.x = -1.2;
      g.add(a1, a2);
      arms.push(a1, a2);
      g.position.set(x, sy, z);
      scene.add(g);
      const ent: MeshEntity = {
        id: nextEntityId++,
        mesh: g,
        legs,
        arms,
        eyes,
        type: 'zombie',
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 15,
        maxHp: 15,
      };
      entities.push(ent);
      return ent;
    }

    function addSpider(x: number, z: number, explicitY?: number): MeshEntity | null {
      const sy = explicitY !== undefined ? explicitY : surfY(world, x, z);
      if (sy <= SEA + 1) return null;
      const g = new THREE.Group();
      const legs: THREE.Mesh[] = [];
      const eyes: THREE.Mesh[] = [];

      g.add(mkBox(0.95, 0.38, 1.15, 0x181820, 0, 0.35, -0.15));
      g.add(mkBox(0.62, 0.35, 0.55, 0x22222c, 0, 0.38, 0.5));

      const eyePositions = [
        [-0.16, 0.44, 0.78],
        [0.16, 0.44, 0.78],
        [-0.07, 0.36, 0.79],
        [0.07, 0.36, 0.79],
      ];
      for (const [ex, ey, ez] of eyePositions) {
        const eye = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 0.05),
          new THREE.MeshBasicMaterial({ color: 0xff1111 })
        );
        eye.position.set(ex, ey, ez);
        g.add(eye);
        eyes.push(eye);
      }

      for (const side of [-1, 1]) {
        for (const zOff of [-0.35, -0.1, 0.15, 0.4]) {
          const leg = mkBox(0.55, 0.1, 0.1, 0x252532, side * 0.62, 0.24, zOff);
          leg.rotation.z = side * -0.35;
          g.add(leg);
          legs.push(leg);
        }
      }

      g.position.set(x, sy, z);
      scene.add(g);
      const ent: MeshEntity = {
        id: nextEntityId++,
        mesh: g,
        legs,
        eyes,
        type: 'spider',
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 12,
        maxHp: 12,
        jumpCd: 0,
      };
      entities.push(ent);
      return ent;
    }

    function addWolf(x: number, z: number) {
      const g = new THREE.Group();
      const sy = surfY(world, x, z);
      if (sy <= SEA + 1) return;
      const legs: THREE.Mesh[] = [];
      g.add(mkBox(0.6, 0.45, 0.9, 0x888888, 0, 0.55, 0));
      g.add(mkBox(0.4, 0.4, 0.4, 0x999999, 0, 0.7, 0.5));
      g.add(mkBox(0.2, 0.18, 0.25, 0x777777, 0, 0.63, 0.72));
      g.add(mkBox(0.1, 0.14, 0.08, 0x666666, -0.13, 0.94, 0.45));
      g.add(mkBox(0.1, 0.14, 0.08, 0x666666, 0.13, 0.94, 0.45));
      g.add(mkBox(0.1, 0.1, 0.4, 0xaaaaaa, 0, 0.65, -0.55));
      for (const [lx, lz] of [
        [-0.18, -0.3],
        [0.18, -0.3],
        [-0.18, 0.3],
        [0.18, 0.3],
      ]) {
        const l = mkBox(0.14, 0.38, 0.14, 0x777777, lx, 0.19, lz);
        g.add(l);
        legs.push(l);
      }
      g.position.set(x, sy, z);
      scene.add(g);
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs,
        type: 'wolf',
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: Math.random() * 3,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 12,
        maxHp: 12,
        tamed: false,
        wname: '',
      });
    }

    function addEnderman(x: number, z: number, explicitY?: number): MeshEntity | null {
      const sy = explicitY !== undefined ? explicitY : surfY(world, x, z);
      if (sy <= SEA + 1) return null;
      const g = new THREE.Group();
      const legs: THREE.Mesh[] = [];
      const eyes: THREE.Mesh[] = [];
      const l1 = mkBox(0.16, 1.3, 0.16, 0x111118, -0.12, 0.65, 0);
      const l2 = mkBox(0.16, 1.3, 0.16, 0x111118, 0.12, 0.65, 0);
      g.add(l1, l2);
      legs.push(l1, l2);
      g.add(mkBox(0.42, 0.85, 0.24, 0x111118, 0, 1.72, 0));
      g.add(mkBox(0.42, 0.42, 0.42, 0x16161d, 0, 2.38, 0));
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), eyeMat);
      e1.position.set(-0.1, 2.4, 0.22);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), eyeMat);
      e2.position.set(0.1, 2.4, 0.22);
      g.add(e1, e2);
      eyes.push(e1, e2);
      g.add(mkBox(0.14, 1.1, 0.14, 0x111118, -0.3, 1.65, 0));
      g.add(mkBox(0.14, 1.1, 0.14, 0x111118, 0.3, 1.65, 0));
      g.position.set(x, sy, z);
      scene.add(g);
      const ent: MeshEntity = {
        id: nextEntityId++,
        mesh: g,
        legs,
        eyes,
        type: 'enderman',
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: Math.random() * 4,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 26,
        maxHp: 26,
      };
      entities.push(ent);
      return ent;
    }

    // Spawn inicial de fauna en la gran isla/continente inicial: Caballos, Ovejas, Vacas, Lobos y Peces
    for (const [hx, hz] of [
      [5, -3],
      [-7, 6],
      [12, 8],
    ]) {
      addHorse(hx, hz);
    }
    for (const [sx, sz] of [
      [-4, -4],
      [7, 2],
      [-9, 3],
      [10, -7],
    ]) {
      addAnimal('sheep', sx, sz);
    }
    for (let i = 0; i < 4; i++) {
      addAnimal('cow', (Math.random() - 0.5) * 28, (Math.random() - 0.5) * 28);
      addAnimal('chicken', (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24);
    }
    for (let i = 0; i < 3; i++) {
      addWolf((Math.random() - 0.5) * 32, (Math.random() - 0.5) * 32);
    }
    for (let i = 0; i < 8; i++) {
      addFish(28 + Math.random() * 18, (Math.random() - 0.5) * 35);
    }

    // ─── CONTROLES POINTER LOCK & TECLADO ─────────────────────────────
    const keys: Record<string, boolean> = {};
    let jumpJustPressed = false;
    let jumpJustReleased = false;
    let pointerLocked = false;
    let inventoryOpenLocal = false;
    let craftingTableOpenLocal = false;
    let chatOpenLocal = false;
    let wolfModalOpenLocal = false;
    let localWalkPhase = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (wolfModalOpenLocal || chatOpenLocal) {
        if (e.code === 'Escape' && chatOpenLocal) {
          chatOpenLocal = false;
          setIsChatOpen(false);
        }
        return;
      }

      // Requisito 1: Tecla T abre el input de chat en vivo
      if (e.code === 'KeyT' && !inventoryOpenLocal && !craftingTableOpenLocal) {
        e.preventDefault();
        chatOpenLocal = true;
        setIsChatOpen(true);
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }

      if (e.code === 'KeyE') {
        e.preventDefault();
        ensureAudio();
        if (craftingTableOpenLocal) {
          craftingTableOpenLocal = false;
          setIsCraftingTableOpen(false);
          renderer.domElement.requestPointerLock?.();
          return;
        }
        inventoryOpenLocal = !inventoryOpenLocal;
        setIsInventoryOpen(inventoryOpenLocal);
        setSelectedSwapSlot(null);
        if (inventoryOpenLocal) {
          if (document.pointerLockElement) document.exitPointerLock();
        } else {
          renderer.domElement.requestPointerLock?.();
        }
        return;
      }

      if (e.code === 'KeyC') {
        e.preventDefault();
        ensureAudio();
        actionsRef.current?.craftPlanks();
        return;
      }

      if (e.code === 'KeyB') {
        e.preventDefault();
        ensureAudio();
        actionsRef.current?.craftBoat();
        return;
      }

      if (e.code === 'KeyX' && (PL1.inBoat || PL1.mountedHorseId !== null)) {
        e.preventDefault();
        if (PL1.inBoat) {
          dismountBoatLogic(world, PL1);
          showMsg('🚶 Bajaste del bote.');
        } else if (PL1.mountedHorseId !== null) {
          const horse = entities.find((en) => en.id === PL1.mountedHorseId);
          if (horse) toggleMountHorseLogic(PL1, horse);
          showMsg('🐎 Desmontaste del caballo.');
        }
        return;
      }

      if (!keys[e.code] && e.code === 'Space') {
        jumpJustPressed = true;
      }
      keys[e.code] = true;

      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.slice(5), 10) - 1;
        if (n >= 0 && n < HOTBAR_SIZE) {
          PL1.si = n;
          buildHotbar();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        jumpJustReleased = true;
      }
      keys[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === renderer.domElement;
      if (!pointerLocked && !wolfModalOpenLocal && !inventoryOpenLocal && !craftingTableOpenLocal && !chatOpenLocal && !touchDetected) {
        setIsPlaying(false);
      } else if (pointerLocked) {
        setIsPlaying(true);
        setHasStartedOnce(true);
      }
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLocked) return;
      camAnglesRef.current.yaw -= e.movementX * 0.0025;
      camAnglesRef.current.pitch = Math.max(
        -1.45,
        Math.min(1.45, camAnglesRef.current.pitch - e.movementY * 0.0025)
      );
    };
    document.addEventListener('mousemove', onMouseMove);

    const onWheel = (e: WheelEvent) => {
      if (!pointerLocked) return;
      PL1.si = (PL1.si + (e.deltaY > 0 ? 1 : -1) + HOTBAR_SIZE) % HOTBAR_SIZE;
      buildHotbar();
    };
    window.addEventListener('wheel', onWheel, { passive: true });

    // ─── INTERACCIÓN: ROMPER / PVP (CLIC IZQ) Y CONSTRUIR / PUERTAS / CABALLOS / MESA (CLIC DER) ──
    function performBreakOrAttack() {
      ensureAudio();
      const yaw = camAnglesRef.current.yaw;
      const pitch = camAnglesRef.current.pitch;
      const lookDir = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ).normalize();

      // Requisito 1: PvP Habilitado — Golpear a otros jugadores con clic izquierdo (1 corazón = 2 HP de daño)
      for (const [pid, rp] of remotePlayers.entries()) {
        const dPlayer = PL1.pos ? distance3D(PL1.pos, rp.group.position) : 999;
        if (dPlayer < 4.2) {
          const toRemote = new THREE.Vector3(
            rp.group.position.x - PL1.pos.x,
            rp.group.position.y + 1.0 - (PL1.pos.y + PL1.eyeH),
            rp.group.position.z - PL1.pos.z
          ).normalize();
          if (lookDir.dot(toRemote) > 0.45) {
            playSfx('hit');
            spawnBlockParticles(rp.group.position.x, rp.group.position.y + 1.1, rp.group.position.z, 0xef4444, 12);
            broadcastNetMessage({
              type: 'pvp:hit',
              targetPeerId: pid,
              attackerPeerId: myPeerId,
              damage: 2,
            });
            showMsg('⚔️ ¡Golpe PvP conectado (-1 ❤️ al rival)!');
            return;
          }
        }
      }

      // Atacar mobs/animales cercanos
      let attackedEntity = false;
      for (const e of entities) {
        if (!e.alive || e.state === 'ko') continue;
        const d = distance3D(PL1.pos, e.pos);
        if (d < 4.2) {
          const toEnt = new THREE.Vector3(
            e.pos.x - PL1.pos.x,
            e.pos.y + 0.8 - (PL1.pos.y + PL1.eyeH),
            e.pos.z - PL1.pos.z
          ).normalize();
          if (lookDir.dot(toEnt) > 0.45) {
            const held = PL1.sel;
            const dmg = held === BT.STONE_PICKAXE ? 9 : held === BT.WOOD_PICKAXE ? 7 : 5;
            const res = damageEntityLogic(e, PL1, dmg);
            playSfx('hit');
            spawnBlockParticles(e.pos.x, e.pos.y + 0.9, e.pos.z, 0xff3333, 10);
            if (res.defeated) {
              const msgs: string[] = [];
              if (res.woolDropped) msgs.push('🧶 +1 Lana obtenida');
              if (res.boneDropped) msgs.push('🦴 +1 Hueso obtenido');
              showMsg(
                msgs.length > 0
                  ? `⚔️ ¡${e.type.toUpperCase()} derrotado! (${msgs.join(', ')})`
                  : `⚔️ ¡${e.type.toUpperCase()} derrotado!`
              );
              buildHotbar();
              setUiTick((t) => t + 1);
            } else {
              showMsg(`🗡️ Golpeaste a ${e.type} (HP: ${e.hp}/${e.maxHp})`);
            }
            attackedEntity = true;
            break;
          }
        }
      }

      if (!attackedEntity) {
        const hit = raycastBlock(world, PL1.pos, PL1.eyeH, yaw, pitch);
        if (hit) {
          const res = breakBlockLogic(world, PL1, hit.bx, hit.by, hit.bz);
          if (res.broken) {
            playSfx('break');
            const col = BD[res.oldType]?.c ?? 0xffffff;
            spawnBlockParticles(hit.bx, hit.by, hit.bz, col, 14);
            rebuildMeshes();
            buildHotbar();
            setUiTick((t) => t + 1);

            broadcastNetMessage({
              type: 'block:set',
              x: hit.bx,
              y: hit.by,
              z: hit.bz,
              blockType: BT.AIR,
            });
            if (res.extraCleared) {
              broadcastNetMessage({
                type: 'block:set',
                x: res.extraCleared.x,
                y: res.extraCleared.y,
                z: res.extraCleared.z,
                blockType: BT.AIR,
              });
            }

            const itemDef = BD[res.oldType === BT.DOOR_OPEN ? BT.DOOR : res.oldType];
            if (itemDef) {
              const yieldTxt = res.bonusYield && res.bonusYield > 1 ? `x${res.bonusYield} (¡Pico!)` : '+1';
              showMsg(`⛏️ Recolectaste ${yieldTxt} ${itemDef.ic} ${itemDef.n}`);
            }
          }
        }
      }
    }

    function performPlaceOrInteract() {
      ensureAudio();
      const yaw = camAnglesRef.current.yaw;
      const pitch = camAnglesRef.current.pitch;

      // 1. Verificar si clic derecho apunta a un Caballo para Montar/Desmontar (Requisito 5)
      for (const e of entities) {
        if (e.alive && e.type === 'horse' && distance3D(PL1.pos, e.pos) < 4.5) {
          const mounted = toggleMountHorseLogic(PL1, e);
          playSfx('horse');
          if (mounted) {
            showMsg('🐎 ¡Montaste al Caballo! Velocidad y salto aumentados (Pulsa X o Clic Der para desmontar).');
          } else {
            showMsg('🚶 Desmontaste del caballo.');
          }
          return;
        }
      }

      // 2. Verificar si clic derecho apunta a un Bote en el agua
      for (const b of boats) {
        if (distance3D(PL1.pos, b.pos) < 4.8) {
          if (PL1.inBoat && PL1.activeBoatId === b.id) {
            dismountBoatLogic(world, PL1);
            showMsg('🚶 Bajaste del bote.');
          } else if (mountBoatLogic(PL1, b)) {
            playSfx('craft');
            showMsg('⛵ ¡Subiste al Bote! Navega con WASD y pulsa X para bajar.');
          }
          return;
        }
      }

      // 3. Si tiene un Bote en la mano, colocarlo en el agua
      if (PL1.sel === BT.BOAT) {
        const hit = raycastBlock(world, PL1.pos, PL1.eyeH, yaw, pitch, 7.0);
        const targetX = hit ? hit.bx : PL1.pos.x - Math.sin(yaw) * 2.5;
        const targetZ = hit ? hit.bz : PL1.pos.z - Math.cos(yaw) * 2.5;
        const res = placeBoatInWaterLogic(world, PL1, boats, targetX, targetZ, nextBoatId++);
        if (res.placed && res.boat) {
          spawnBoatVisual(res.boat);
          mountBoatLogic(PL1, res.boat);
          playSfx('place');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('⛵ ¡Bote botado al mar! Navegando a alta velocidad.');
          return;
        } else {
          showMsg('💧 Acércate a la costa o apunta al agua para colocar el Bote.');
          return;
        }
      }

      // 4. Domesticar lobo cercano con huesos
      let wolfNear = false;
      for (const e of entities) {
        if (e.alive && e.type === 'wolf' && !e.tamed && distance3D(PL1.pos, e.pos) < 4.2) {
          if (PL1.bones > 0) {
            wolfNear = true;
            wolfModalOpenLocal = true;
            if (document.pointerLockElement) document.exitPointerLock();
            setWolfNameInput('Fenrir');
            setWolfModal({ open: true, wolfId: e.id });
          } else {
            showMsg('❌ ¡Sin huesos! Derrota enemigos nocturnos para conseguir 🦴');
          }
          break;
        }
      }
      if (wolfNear) return;

      // 5. Raycast al bloque apuntado: Puerta de 2 bloques, Mesa de Crafteo o colocar bloque
      const hit = raycastBlock(world, PL1.pos, PL1.eyeH, yaw, pitch);
      if (!hit) return;

      const targetBlock = gB(world, hit.bx, hit.by, hit.bz);

      // Requisito 2: Clic derecho sobre cualquier mitad de una Puerta abre o cierra ambas mitades
      if (targetBlock === BT.DOOR || targetBlock === BT.DOOR_OPEN) {
        const toggled = toggleTwoBlockDoorLogic(world, hit.bx, hit.by, hit.bz);
        if (toggled.toggled) {
          playSfx('door');
          rebuildMeshes();
          broadcastNetMessage({
            type: 'door:toggle',
            x: hit.bx,
            y: hit.by,
            z: hit.bz,
          });
          showMsg(toggled.isOpen ? '🚪 Puerta doble abierta.' : '🚪 Puerta doble cerrada.');
          return;
        }
      }

      // Requisito 6: Clic derecho sobre una Mesa de Crafteo abre el menú de recetas avanzadas
      if (targetBlock === BT.TABLE) {
        craftingTableOpenLocal = true;
        setIsCraftingTableOpen(true);
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }

      // Colocar bloque (Si es BT.DOOR ocupa automáticamente 2 bloques de altura)
      const res = placeBlockLogic(world, PL1, hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz);
      if (res.placed) {
        playSfx('place');
        rebuildMeshes();
        buildHotbar();
        setUiTick((t) => t + 1);
        broadcastNetMessage({
          type: 'block:set',
          x: res.tx,
          y: res.ty,
          z: res.tz,
          blockType: res.blockType,
        });
        if (res.upperDoorPlaced) {
          broadcastNetMessage({
            type: 'block:set',
            x: res.tx,
            y: res.ty + 1,
            z: res.tz,
            blockType: BT.DOOR,
          });
          showMsg('🚪 Puerta de 2 bloques colocada (Clic derecho para abrir/cerrar).');
        } else if (res.blockType === BT.TABLE) {
          showMsg('🪑 Mesa de Crafteo colocada. Haz clic derecho sobre ella para abrir las recetas.');
        }
      } else if (PL1.sel === 0) {
        showMsg('🎒 Mano vacía: rompe árboles (🪵) o abre la Mesa de Crafteo.');
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      ensureAudio();
      if (!pointerLocked) return;
      if (e.button === 0) {
        performBreakOrAttack();
      } else if (e.button === 2) {
        performPlaceOrInteract();
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', onContextMenu);

    // ─── HUD HELPERS ──────────────────────────────────────────────────
    let msgT: number | undefined;
    function showMsg(txt: string) {
      const el = document.getElementById('msg');
      if (!el) return;
      el.textContent = txt;
      el.style.opacity = '1';
      clearTimeout(msgT);
      msgT = window.setTimeout(() => {
        el.style.opacity = '0';
      }, 3200);
    }

    function triggerDamageOverlay() {
      const ov = document.getElementById('dmgOverlay');
      if (!ov) return;
      ov.style.opacity = '0.55';
      window.setTimeout(() => {
        ov.style.opacity = '0';
      }, 220);
    }

    function buildHotbar() {
      const hbEl = document.getElementById('hb1');
      if (!hbEl) return;
      hbEl.innerHTML = '';
      for (let idx = 0; idx < HOTBAR_SIZE; idx++) {
        const slot = PL1.inventory[idx];
        const d = slot && slot.count > 0 ? BD[slot.type] : null;
        const s = document.createElement('div');
        const active = idx === PL1.si;
        s.className = active
          ? 'hs relative w-12 h-12 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-150 bg-emerald-500/25 border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)] scale-105'
          : 'hs relative w-12 h-12 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-150 bg-slate-950/65 border border-white/15 hover:border-cyan-400/50';
        s.innerHTML = `<span class="sn absolute top-0.5 left-1.5 text-[9px] font-mono text-emerald-300/80">${
          idx + 1
        }</span><span class="text-lg leading-none">${
          d ? d.ic : '<span class="text-slate-600 text-xs">·</span>'
        }</span>${
          slot && slot.count > 0
            ? `<span class="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-amber-300 drop-shadow">${slot.count}</span>`
            : ''
        }`;
        s.onclick = (ev) => {
          ev.stopPropagation();
          PL1.si = idx;
          buildHotbar();
          setUiTick((t) => t + 1);
        };
        hbEl.appendChild(s);
      }

      const activeBlockLabel = document.getElementById('activeBlockLabel');
      if (activeBlockLabel) {
        const activeSlot = PL1.inventory[PL1.si];
        const bd = activeSlot && activeSlot.count > 0 ? BD[activeSlot.type] : null;
        activeBlockLabel.textContent =
          bd && activeSlot
            ? `${bd.ic} ${bd.n} (x${activeSlot.count}) — ${bd.role}`
            : '🤲 Mano vacía — Rompe bloques (Clic Izq) para recolectar recursos';
      }
    }

    function buildHP() {
      const el = document.getElementById('hp1');
      if (!el) return;
      el.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const s = document.createElement('span');
        s.className = 'ht text-sm drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]';
        s.textContent = i < Math.ceil(PL1.hp / 2) ? '❤️' : '🖤';
        el.appendChild(s);
      }
    }

    // ─── ACCIONES EXPUESTAS A MODALES Y BOTONES DE REACT ──────────────
    actionsRef.current = {
      confirmWolfName: (name: string) => {
        ensureAudio();
        const target = entities.find((e) => e.id === wolfModal.wolfId);
        if (target && target.alive && target.type === 'wolf' && !target.tamed) {
          const res = tameWolfLogic(target, PL1, name);
          if (res.tamed) {
            target.mesh.children.forEach((c) => {
              const meshChild = c as THREE.Mesh;
              if (meshChild.material) {
                (meshChild.material as THREE.MeshLambertMaterial).color.setHex(0xddaa44);
              }
            });
            target.mesh.add(mkBox(0.44, 0.1, 0.44, 0xff2200, 0, 0.62, 0.42));
            playSfx('tame');
            showMsg(`🐕 ¡${res.name} domesticado! Te protegerá de noche.`);
          }
        }
        wolfModalOpenLocal = false;
        setWolfModal({ open: false, wolfId: null });
        renderer.domElement.requestPointerLock?.();
      },
      cancelWolfName: () => {
        wolfModalOpenLocal = false;
        setWolfModal({ open: false, wolfId: null });
        renderer.domElement.requestPointerLock?.();
      },
      craftPlanks: () => {
        ensureAudio();
        const res = craftWoodToPlanksLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg(`🪚 ¡Crafteaste +4 📦 Tablones! (Total: ${res.planksTotal})`);
        } else {
          showMsg('❌ Necesitas al menos 1 🪵 Madera para craftear 4 Tablones.');
        }
      },
      craftTable: () => {
        ensureAudio();
        const res = craftPlanksToTableLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('🪑 ¡Mesa de Crafteo creada! Colócala con Clic Derecho y úsala.');
        } else {
          showMsg('❌ Necesitas 4 📦 Tablones para crear una 🪑 Mesa de Crafteo.');
        }
      },
      craftSticks: () => {
        ensureAudio();
        const res = craftPlanksToSticksLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg(`🥢 ¡Crafteaste +4 Palos! (Total: ${res.sticksTotal})`);
        } else {
          showMsg('❌ Necesitas 2 📦 Tablones para craftear 4 🥢 Palos.');
        }
      },
      craftWoodPickaxe: () => {
        ensureAudio();
        const res = craftWoodPickaxeLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('⛏️ ¡Pico de Madera crafteado! Pica piedra el doble de rápido.');
        } else {
          showMsg('❌ Necesitas 3 📦 Tablones + 2 🥢 Palos para el Pico de Madera.');
        }
      },
      craftStonePickaxe: () => {
        ensureAudio();
        const res = craftStonePickaxeLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('⚒️ ¡Pico de Piedra crafteado! Pica piedra x3 de rápido.');
        } else {
          showMsg('❌ Necesitas 3 🪨 Piedras + 2 🥢 Palos para el Pico de Piedra.');
        }
      },
      craftBoat: () => {
        ensureAudio();
        const res = craftPlanksToBoatLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('⛵ ¡Crafteaste 1 Bote! Selecciónalo y haz Clic Derecho en el agua.');
        } else {
          showMsg('❌ Necesitas 5 📦 Tablones para craftear 1 ⛵ Bote.');
        }
      },
      craftBed: () => {
        ensureAudio();
        const res = craftWoolAndPlanksToBedLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('🛏️ ¡Cama crafteada con 3 Lanas + 3 Tablones!');
        } else {
          showMsg('❌ Necesitas 3 🧶 Lanas (de oveja) + 3 📦 Tablones para craftear 1 Cama.');
        }
      },
      craftDoor: () => {
        ensureAudio();
        const res = craftPlanksToDoorLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('🚪 ¡Puerta Doble (2 bloques) crafteada!');
        } else {
          showMsg('❌ Necesitas 2 📦 Tablones para craftear 1 🚪 Puerta.');
        }
      },
      changeClothes: () => {
        ensureAudio();
        const res = cyclePlayerClothesLogic(PL1);
        playSfx('craft');
        setUiTick((t) => t + 1);
        broadcastNetMessage({
          type: 'clothes:change',
          peerId: myPeerId,
          clothesIdx: res.clothesIdx,
        });
        showMsg(`👕 Ropa cambiada a: ${res.name}`);
      },
      saveGame: () => {
        ensureAudio();
        try {
          const json = serializeSaveGame(
            world,
            PL1,
            camAnglesRef.current.yaw,
            camAnglesRef.current.pitch
          );
          localStorage.setItem(SAVE_STORAGE_KEY, json);
          saveToIndexedDB(SAVE_STORAGE_KEY, json);
          setHasSavedGame(true);
          playSfx('craft');
          showMsg('💾 ¡Partida guardada (Posición, Inventario y Mundo guardados)!');
        } catch {
          showMsg('⚠️ No se pudo guardar en el almacenamiento local.');
        }
      },
      toggleRedGreenChallenge: () => {
        ensureAudio();
        const next = challengeStateRef.current === 'off' ? 'green' : 'off';
        challengeStateRef.current = next;
        setChallengeState(next);
        if (next === 'green') {
          playSfx('greenlight');
          showMsg('🚦 ¡Desafío "Luz Roja, Luz Verde" ACTIVADO!');
        } else {
          showMsg('🚦 Desafío "Luz Roja, Luz Verde" finalizado.');
        }
        broadcastNetMessage({
          type: 'challenge:state',
          state: next,
        });
      },
      sendChatMessage: (text: string) => {
        const clean = text.trim();
        chatOpenLocal = false;
        setIsChatOpen(false);
        setChatInputText('');
        if (clean.length > 0) {
          addFloatingChatBubble(myPeerId, 'Tú', clean, true);
          broadcastNetMessage({
            type: 'chat:msg',
            peerId: myPeerId,
            senderLabel: roomCode ? `Jugador (${roomCode})` : 'Jugador',
            text: clean,
          });
        }
        if (!touchDetected) {
          renderer.domElement.requestPointerLock?.();
        }
      },
      handleSlotClick: (slotIdx: number) => {
        setSelectedSwapSlot((prev) => {
          if (prev === null) return slotIdx;
          if (prev !== slotIdx) {
            swapInventorySlots(PL1, prev, slotIdx);
            buildHotbar();
            setUiTick((t) => t + 1);
          }
          return null;
        });
      },
      selectHotbarSlot: (slotIdx: number) => {
        PL1.si = slotIdx;
        buildHotbar();
        setUiTick((t) => t + 1);
      },
      createRoom: () => {
        ensureAudio();
        startHostingRoom();
      },
      joinRoom: (code: string) => {
        ensureAudio();
        connectToExistingRoom(code);
      },
      touchActionBreak: () => {
        performBreakOrAttack();
      },
      touchActionPlace: () => {
        performPlaceOrInteract();
      },
      touchJumpStart: () => {
        if (!keys['Space']) jumpJustPressed = true;
        keys['Space'] = true;
      },
      touchJumpEnd: () => {
        jumpJustReleased = true;
        keys['Space'] = false;
      },
      toggleInventoryModal: () => {
        inventoryOpenLocal = !inventoryOpenLocal;
        setIsInventoryOpen(inventoryOpenLocal);
        setSelectedSwapSlot(null);
      },
      toggleCraftingTableModal: () => {
        craftingTableOpenLocal = !craftingTableOpenLocal;
        setIsCraftingTableOpen(craftingTableOpenLocal);
        if (craftingTableOpenLocal && document.pointerLockElement) {
          document.exitPointerLock();
        }
      },
    };

    buildHotbar();
    buildHP();

    // ─── BUCLE PRINCIPAL DE SIMULACIÓN, DESAFÍO Y CULLING ─────────────
    let zSpawnT = 0;
    let netSyncT = 0;
    let challengeSwitchT = 4.0;
    let lastT = performance.now();
    let animFrameId = 0;

    function updateDayNight(dt: number) {
      dayTime = (dayTime + DAY_SPEED * dt) % 1;
      const ang = dayTime * Math.PI * 2;
      const sy = Math.sin(ang);
      const cy = Math.cos(ang);

      sunMesh.position.set(PL1.pos.x + cy * 105, sy * 105, PL1.pos.z + 30);
      moonMesh.position.set(PL1.pos.x - cy * 105, -sy * 105, PL1.pos.z - 30);
      skyMesh.position.set(PL1.pos.x, 0, PL1.pos.z);
      stars.position.set(PL1.pos.x, 0, PL1.pos.z);
      sunL.position.copy(sunMesh.position);

      const dayF = Math.max(0, Math.min(1, (sy + 0.2) / 0.6));
      const skyCol = new THREE.Color().lerpColors(
        new THREE.Color(0x050510),
        new THREE.Color(0x87ceeb),
        dayF
      );

      if (sy > -0.15 && sy < 0.25) {
        const sf = 1 - Math.abs(sy - 0.05) / 0.2;
        skyCol.lerp(new THREE.Color(0xff6633), sf * 0.45);
      }

      skyMat.color.copy(skyCol);
      (scene.fog as THREE.FogExp2).color.copy(skyCol);
      ambL.intensity = 0.18 + dayF * 0.52;
      sunL.intensity = dayF * 0.95;
      stMat.opacity = Math.max(0, 1 - dayF * 2.5);

      const despawned = despawnDaytimeMonsters(entities, dayTime);
      for (const d of despawned) {
        const me = d as MeshEntity;
        spawnBlockParticles(me.pos.x, me.pos.y + 1, me.pos.z, 0xffaa22, 8);
        scene.remove(me.mesh);
      }

      // Requisito 2: Algoritmo corregido de aparición nocturna de Zombies y Arañas
      const night = isNightTime(dayTime);
      if (night) {
        zSpawnT += dt;
        if (zSpawnT > 2.2) {
          zSpawnT = 0;
          const activeZombies = entities.filter((e) => e.alive && e.type === 'zombie').length;
          const activeSpiders = entities.filter((e) => e.alive && e.type === 'spider').length;
          const activeEndermen = entities.filter((e) => e.alive && e.type === 'enderman').length;

          const spawnPt = findValidMonsterSpawnPoint(world, PL1.pos);
          if (spawnPt) {
            if (activeEndermen < MAX_ENDERMEN && Math.random() < ENDERMAN_SPAWN_CHANCE) {
              addEnderman(spawnPt.x, spawnPt.z, spawnPt.y);
            } else if (activeZombies < MAX_ZOMBIES && (activeZombies <= activeSpiders || activeSpiders >= MAX_SPIDERS)) {
              addZombie(spawnPt.x, spawnPt.z, spawnPt.y);
            } else if (activeSpiders < MAX_SPIDERS) {
              addSpider(spawnPt.x, spawnPt.z, spawnPt.y);
            }
          }
        }
      }

      const dnEl = document.getElementById('dn');
      if (dnEl) {
        dnEl.textContent = getDayPhaseLabel(dayTime);
      }
    }

    function updateEntities(dt: number, nowSec: number) {
      for (const e of entities) {
        if (!e.alive) {
          if (e.state === 'ko' && e.koTimer > 0) {
            e.koTimer -= dt;
            e.mesh.rotation.z = Math.min(Math.PI / 2, (1 - e.koTimer / 0.35) * (Math.PI / 2));
            e.mesh.scale.setScalar(Math.max(0.1, e.koTimer / 0.35));
            if (e.koTimer <= 0) {
              scene.remove(e.mesh);
            }
          }
          continue;
        }

        if (e.hitFlashTimer > 0) {
          e.hitFlashTimer -= dt;
          e.mesh.scale.set(1.12, 0.88, 1.12);
        } else {
          e.mesh.scale.set(1, 1, 1);
        }

        // Si es un caballo montado por el jugador, sincronizar rotación y animación de galope
        if (e.type === 'horse' && e.riddenByPlayer && PL1.mountedHorseId === e.id) {
          e.mesh.position.set(PL1.pos.x, PL1.pos.y - 0.55, PL1.pos.z);
          e.mesh.rotation.y = camAnglesRef.current.yaw + Math.PI;
          const speed = Math.hypot(PL1.vel.x, PL1.vel.z);
          e.legs.forEach((l, i) => {
            l.rotation.x = speed > 0.2 ? Math.sin(nowSec * 14 + i * Math.PI) * 0.65 : 0;
          });
          continue;
        }

        e.timer -= dt;
        const np = nearestPlayer(e.pos, PL1);

        if (e.type === 'fish') {
          if (e.timer <= 0) {
            e.vel.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 4);
            e.timer = 2 + Math.random() * 3;
          }
          e.pos.addScaledVector(e.vel, dt);
          e.pos.y = Math.min(SEA - 0.4, Math.max(2, e.pos.y));
          if (e.vel.lengthSq() > 0.01) e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
        } else if (e.type === 'cow' || e.type === 'sheep' || e.type === 'chicken' || e.type === 'horse') {
          if (e.timer <= 0) {
            if (Math.random() < 0.6) {
              const a = Math.random() * Math.PI * 2;
              const sp = e.type === 'horse' ? 2.4 : e.type === 'chicken' ? 2.0 : 1.4;
              e.vel.set(Math.sin(a) * sp, 0, Math.cos(a) * sp);
            } else {
              e.vel.set(0, 0, 0);
            }
            e.timer = 2 + Math.random() * 4;
          }
          stepEntityMovementWithCollision(world, e, dt);
          const h = getH(Math.floor(e.pos.x), Math.floor(e.pos.z));
          if (h <= SEA) {
            e.vel.negate();
          }
          if (e.vel.lengthSq() > 0.05) {
            e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
            e.legs.forEach((l, i) => {
              l.rotation.x = Math.sin(nowSec * 8 + i * Math.PI) * 0.5;
            });
          } else {
            e.legs.forEach((l) => {
              l.rotation.x = 0;
            });
          }
        } else if (e.type === 'zombie' || e.type === 'spider' || e.type === 'enderman') {
          const prevHp = PL1.hp;
          const combatRes = stepEnemyCombatLogic(world, e, PL1, dt);

          if (e.eyes) {
            const windupColor =
              e.state === 'windup'
                ? 0xffff00
                : e.type === 'enderman'
                  ? 0xd946ef
                  : 0xff1111;
            e.eyes.forEach((eye) => {
              (eye.material as THREE.MeshBasicMaterial).color.setHex(windupColor);
            });
          }

          if (combatRes.attacked && PL1.hp < prevHp) {
            buildHP();
            playSfx('hurt');
            triggerDamageOverlay();
            if (PL1.hp <= 0) {
              triggerPlayerDeathAndRespawn('💀 ¡Fuiste derrotado por criaturas de la noche! Reapareciendo en el Spawn...');
              buildHP();
            } else {
              const attackerLabel =
                e.type === 'enderman' ? 'Enderman' : e.type === 'spider' ? 'Araña' : 'Zombie';
              showMsg(`💔 ¡Un ${attackerLabel} te atacó! (-${combatRes.damageDealt} HP)`);
            }
          }

          if (e.state === 'idle' && e.timer <= 0) {
            const a = Math.random() * Math.PI * 2;
            e.vel.x = Math.sin(a) * 1.2;
            e.vel.z = Math.cos(a) * 1.2;
            e.timer = 2 + Math.random() * 2;
          }

          stepEntityMovementWithCollision(world, e, dt);
          if (Math.hypot(e.vel.x, e.vel.z) > 0.05) {
            e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
            const animSpeed = e.type === 'spider' ? 16 : 9;
            e.legs.forEach((l, i) => {
              if (e.type === 'spider') {
                l.rotation.y = Math.sin(nowSec * animSpeed + i * 1.1) * 0.35;
              } else {
                l.rotation.x = Math.sin(nowSec * animSpeed + i * Math.PI) * 0.6;
              }
            });
          }
        } else if (e.type === 'wolf') {
          if (np.dist < 10) {
            const combatRes = stepEnemyCombatLogic(world, e, PL1, dt);
            if (combatRes.attacked) {
              buildHP();
              playSfx('hurt');
              triggerDamageOverlay();
              if (PL1.hp <= 0) {
                triggerPlayerDeathAndRespawn('💀 ¡Caíste ante un lobo salvaje! Reapareciendo en el Spawn...');
                buildHP();
              } else {
                showMsg('🐺 ¡Lobo salvaje te mordió! Domestícalo con Clic Derecho (🦴)');
              }
            }
          } else if (e.timer <= 0) {
            const a = Math.random() * Math.PI * 2;
            e.vel.set(Math.sin(a) * 2, 0, Math.cos(a) * 2);
            e.timer = 2 + Math.random() * 3;
          }
          stepEntityMovementWithCollision(world, e, dt);
          if (Math.hypot(e.vel.x, e.vel.z) > 0.05) {
            e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
            e.legs.forEach((l, i) => {
              l.rotation.x = Math.sin(nowSec * 10 + i * Math.PI) * 0.5;
            });
          }
        } else if (e.type === 'wolf_t') {
          let nearEnemy: MeshEntity | null = null;
          let nd = 16;
          for (const z of entities) {
            if (
              z.alive &&
              (z.type === 'zombie' || z.type === 'spider' || z.type === 'enderman')
            ) {
              const d = distance3D(e.pos, z.pos);
              if (d < nd) {
                nd = d;
                nearEnemy = z;
              }
            }
          }
          if (nearEnemy) {
            const d = new THREE.Vector3()
              .subVectors(nearEnemy.pos, e.pos)
              .setY(0)
              .normalize();
            e.vel.x = d.x * 5.2;
            e.vel.z = d.z * 5.2;
            if (nd < 1.8 && e.timer <= 0) {
              const res = damageEntityLogic(nearEnemy, PL1, 6);
              playSfx('hit');
              spawnBlockParticles(nearEnemy.pos.x, nearEnemy.pos.y + 1, nearEnemy.pos.z, 0xffaa00, 8);
              if (res.defeated) {
                showMsg(`🐕 ¡${e.wname} eliminó a un monstruo!`);
              }
              e.timer = 0.7;
            }
          } else {
            const d = distance3D(e.pos, PL1.pos);
            if (d > 3.5) {
              const dir = new THREE.Vector3()
                .subVectors(PL1.pos, e.pos)
                .setY(0)
                .normalize();
              e.vel.x = dir.x * 4.8;
              e.vel.z = dir.z * 4.8;
            } else {
              e.vel.set(0, 0, 0);
            }
          }
          stepEntityMovementWithCollision(world, e, dt);
          if (Math.hypot(e.vel.x, e.vel.z) > 0.05) {
            e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
            e.legs.forEach((l, i) => {
              l.rotation.x = Math.sin(nowSec * 10 + i * Math.PI) * 0.5;
            });
          }
        }
      }
    }

    function loop() {
      animFrameId = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;

      // Requisito 4: Lógica del anfitrión para alternar "Luz Verde" y "Luz Roja"
      if (isHost && challengeStateRef.current !== 'off') {
        challengeSwitchT -= dt;
        if (challengeSwitchT <= 0) {
          const nextState = challengeStateRef.current === 'green' ? 'red' : 'green';
          challengeStateRef.current = nextState;
          setChallengeState(nextState);
          challengeSwitchT = nextState === 'green' ? 3.6 + Math.random() * 1.8 : 2.5 + Math.random() * 1.2;
          if (nextState === 'green') playSfx('greenlight');
          else playSfx('redlight');
          broadcastNetMessage({
            type: 'challenge:state',
            state: nextState,
          });
        }
      }

      const activeControls =
        (pointerLocked || touchDetected) &&
        !wolfModalOpenLocal &&
        !inventoryOpenLocal &&
        !craftingTableOpenLocal &&
        !chatOpenLocal;

      const playerInput = {
        fwd: activeControls && !!(keys['KeyW'] || keys['ArrowUp']),
        back: activeControls && !!(keys['KeyS'] || keys['ArrowDown']),
        left: activeControls && !!(keys['KeyA'] || keys['ArrowLeft']),
        right: activeControls && !!(keys['KeyD'] || keys['ArrowRight']),
        jumpHeld: activeControls && !!keys['Space'],
        jumpJustPressed: activeControls && jumpJustPressed,
        jumpJustReleased: activeControls && jumpJustReleased,
        yaw: camAnglesRef.current.yaw,
        joyX: activeControls ? joyVecRef.current.x : 0,
        joyY: activeControls ? joyVecRef.current.y : 0,
      };

      // Requisito 4: Si está en "Luz Roja", cualquier jugador que presione una tecla o mueva el joystick muere al instante
      if (challengeStateRef.current === 'red' && isPlayerMovingInput(playerInput)) {
        triggerPlayerDeathAndRespawn(
          '🚦 ¡TE MOVISTE EN LUZ ROJA! Eliminado al instante — Reapareciendo en el Spawn.'
        );
      } else {
        const activeBoat = PL1.inBoat ? boats.find((b) => b.id === PL1.activeBoatId) || null : null;
        const mountedHorse =
          PL1.mountedHorseId !== null
            ? entities.find((e) => e.id === PL1.mountedHorseId && e.alive) || null
            : null;

        const phys = stepPlayerPhysics(world, PL1, playerInput, dt, activeBoat, mountedHorse);

        if (activeBoat) {
          const bm = boatMeshes.get(activeBoat.id);
          if (bm) {
            bm.position.set(activeBoat.pos.x, activeBoat.pos.y, activeBoat.pos.z);
            bm.rotation.y = activeBoat.yaw;
          }
        }

        if (phys.jumped) playSfx('jump');
        if (phys.landed) playSfx('land');
        if (phys.footstepTriggered) playSfx('step');
      }

      jumpJustPressed = false;
      jumpJustReleased = false;

      const moveSpeed = Math.hypot(PL1.vel.x, PL1.vel.z);
      if (moveSpeed > 0.15) {
        localWalkPhase += dt * moveSpeed * 1.8;
      }

      // Carga dinámica de Chunks infinitos y descarga (despawn) de chunks lejanos
      const curCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
      const curCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);
      if (curCX !== activeCenterCX || curCZ !== activeCenterCZ) {
        activeCenterCX = curCX;
        activeCenterCZ = curCZ;
        ensureChunksAroundPlayer(world, PL1.pos.x, PL1.pos.z, VIEW_CHUNK_RADIUS);
        rebuildMeshes();
      }

      // Sincronización P2P de posición, animaciones y estado
      netSyncT += dt;
      if (netSyncT >= 0.05 && connections.size > 0) {
        netSyncT = 0;
        broadcastNetMessage({
          type: 'player:move',
          peerId: myPeerId,
          x: PL1.pos.x,
          y: PL1.pos.y,
          z: PL1.pos.z,
          yaw: camAnglesRef.current.yaw,
          pitch: camAnglesRef.current.pitch,
          heldBlock: PL1.sel,
          inBoat: PL1.inBoat,
          mountedHorse: PL1.mountedHorseId !== null,
          clothesIdx: PL1.clothesIdx,
          walkPhase: localWalkPhase,
        });
      }

      // Interpolar avatares de jugadores remotos y sus animaciones sincronizadas
      for (const rp of remotePlayers.values()) {
        const distMoved = rp.group.position.distanceTo(rp.targetPos);
        rp.group.position.lerp(rp.targetPos, Math.min(1, dt * 12));
        rp.group.rotation.y = rp.targetYaw;
        rp.head.rotation.x = rp.targetPitch;
        if (distMoved > 0.015) {
          rp.legs.forEach((l, idx) => {
            l.rotation.x = Math.sin(rp.walkPhase * 2.2 + idx * Math.PI) * 0.6;
          });
          rp.arms.forEach((a, idx) => {
            a.rotation.x = Math.sin(rp.walkPhase * 2.2 + (idx + 1) * Math.PI) * 0.5;
          });
        } else {
          rp.legs.forEach((l) => {
            l.rotation.x = 0;
          });
          rp.arms.forEach((a) => {
            a.rotation.x = 0;
          });
        }
      }

      cam1.position.set(PL1.pos.x, PL1.pos.y + PL1.eyeH, PL1.pos.z);
      cam1.rotation.order = 'YXZ';
      cam1.rotation.y = camAnglesRef.current.yaw;
      cam1.rotation.x = camAnglesRef.current.pitch;
      cam1.updateMatrixWorld();

      // Requisito 8: Frustum Culling explícito por cámara para bloques y entidades
      projScreenMatrix.multiplyMatrices(cam1.projectionMatrix, cam1.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);
      for (const im of Object.values(iMeshes)) {
        if (im.boundingSphere) {
          im.visible = frustum.intersectsSphere(im.boundingSphere);
        }
      }

      // Proyectar mensajes de chat flotantes 3D sobre la cabeza de los personajes (5 segundos)
      if (floatingChatsRef.current.length > 0) {
        const activeBubbles: FloatingChatBubble[] = [];
        for (const b of floatingChatsRef.current) {
          if (now >= b.expiresAt) continue;
          if (b.isLocal) {
            b.screenX = window.innerWidth * 0.5;
            b.screenY = 115;
            b.visible = true;
            activeBubbles.push(b);
          } else {
            const rp = remotePlayers.get(b.peerId);
            if (rp) {
              const headWorld = new THREE.Vector3(
                rp.group.position.x,
                rp.group.position.y + 2.25,
                rp.group.position.z
              );
              headWorld.project(cam1);
              if (headWorld.z < 1) {
                b.screenX = (headWorld.x * 0.5 + 0.5) * window.innerWidth;
                b.screenY = (-headWorld.y * 0.5 + 0.5) * window.innerHeight;
                b.visible = true;
              } else {
                b.visible = false;
              }
            }
            activeBubbles.push(b);
          }
        }
        floatingChatsRef.current = activeBubbles;
        setFloatingChats([...activeBubbles]);
      }

      const hit = raycastBlock(
        world,
        PL1.pos,
        PL1.eyeH,
        camAnglesRef.current.yaw,
        camAnglesRef.current.pitch
      );
      if (hit) {
        selBox.position.set(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
        selBox.visible = true;
      } else {
        selBox.visible = false;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
          continue;
        }
        p.vel.y -= 14 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.1, p.life / p.maxLife));
      }

      updateDayNight(dt);
      updateEntities(dt, now / 1000);

      const posEl = document.getElementById('pos1');
      if (posEl) {
        posEl.textContent = `${Math.floor(PL1.pos.x)}, ${Math.floor(PL1.pos.y)}, ${Math.floor(
          PL1.pos.z
        )}`;
      }
      const boneEl = document.getElementById('bones1');
      if (boneEl) {
        boneEl.textContent = `🦴 ${PL1.bones}`;
      }
      const woodEl = document.getElementById('woodCountHud');
      if (woodEl) {
        woodEl.textContent = `${countItemInInventory(PL1, BT.WOOD)}`;
      }
      const plankEl = document.getElementById('plankCountHud');
      if (plankEl) {
        plankEl.textContent = `${countItemInInventory(PL1, BT.PLANK)}`;
      }
      const woolEl = document.getElementById('woolCountHud');
      if (woolEl) {
        woolEl.textContent = `${countItemInInventory(PL1, BT.WOOL)}`;
      }

      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.render(scene, cam1);
    }

    loop();

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cam1.aspect = window.innerWidth / window.innerHeight;
      cam1.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (peerInstance) peerInstance.destroy();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.dispose();
    };
  }, []);

  const handleStartSingleOrResume = () => {
    const canvas = mountRef.current?.querySelector('canvas');
    if (canvas && canvas.requestPointerLock && !isTouchDevice) {
      canvas.requestPointerLock();
    }
    setIsPlaying(true);
    setHasStartedOnce(true);
  };

  const handleCreateRoomClick = () => {
    actionsRef.current?.createRoom();
    handleStartSingleOrResume();
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actionsRef.current?.joinRoom(joinCodeInput);
    handleStartSingleOrResume();
  };

  // Touch handlers para Joystick Virtual en móviles
  const onJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const t = e.changedTouches[0];
    if (!t) return;
    joyTouchIdRef.current = t.identifier;
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    setJoyKnob({ x: 0, y: 0 });
    joyVecRef.current = { x: 0, y: 0 };
  };

  const onJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchIdRef.current) {
        const maxR = 42;
        const dx = t.clientX - joyOriginRef.current.x;
        const dy = t.clientY - joyOriginRef.current.y;
        const dist = Math.min(maxR, Math.hypot(dx, dy));
        const ang = Math.atan2(dy, dx);
        const kx = Math.cos(ang) * dist;
        const ky = Math.sin(ang) * dist;
        setJoyKnob({ x: kx, y: ky });
        joyVecRef.current = { x: kx / maxR, y: ky / maxR };
        break;
      }
    }
  };

  const onJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchIdRef.current) {
        joyTouchIdRef.current = null;
        setJoyKnob({ x: 0, y: 0 });
        joyVecRef.current = { x: 0, y: 0 };
        break;
      }
    }
  };

  const onLookAreaTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    if (!t) return;
    lookTouchRef.current = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
  };

  const onLookAreaTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const currentLook = lookTouchRef.current;
    if (!currentLook) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === currentLook.id) {
        const dx = t.clientX - currentLook.lastX;
        const dy = t.clientY - currentLook.lastY;
        currentLook.lastX = t.clientX;
        currentLook.lastY = t.clientY;
        camAnglesRef.current.yaw -= dx * 0.0055;
        camAnglesRef.current.pitch = Math.max(
          -1.45,
          Math.min(1.45, camAnglesRef.current.pitch - dy * 0.0055)
        );
        break;
      }
    }
  };

  const onLookAreaTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const currentLook = lookTouchRef.current;
    if (!currentLook) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === currentLook.id) {
        lookTouchRef.current = null;
        break;
      }
    }
  };

  const pl = plRef.current;
  const woodCount = pl ? countItemInInventory(pl, BT.WOOD) : 0;
  const plankCount = pl ? countItemInInventory(pl, BT.PLANK) : 0;
  const stickCount = pl ? countItemInInventory(pl, BT.STICK) : 0;
  const stoneCount = pl ? countItemInInventory(pl, BT.STONE) : 0;
  const woolCount = pl ? countItemInInventory(pl, BT.WOOL) : 0;
  const currentClothes =
    CLOTHES_PALETTE[(pl?.clothesIdx ?? 0) % CLOTHES_PALETTE.length] || CLOTHES_PALETTE[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Three.js Fullscreen Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Zona táctil de cámara derecha para dispositivos móviles */}
      {isTouchDevice && isPlaying && (
        <div
          onTouchStart={onLookAreaTouchStart}
          onTouchMove={onLookAreaTouchMove}
          onTouchEnd={onLookAreaTouchEnd}
          className="fixed top-16 right-0 bottom-36 w-1/2 z-15"
        />
      )}

      {/* Damage Vignette Flash */}
      <div
        id="dmgOverlay"
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-200 opacity-0"
        style={{
          background:
            'radial-gradient(circle, rgba(220,38,38,0) 45%, rgba(220,38,38,0.65) 100%)',
        }}
      />

      {/* Requisito 1: Mensajes de Chat Flotantes sobre la cabeza del personaje (5 segundos) */}
      <div id="floatingChatContainer" className="pointer-events-none fixed inset-0 z-25 overflow-hidden">
        {floatingChats.map(
          (b) =>
            b.visible && (
              <div
                key={b.id}
                style={{
                  left: `${b.screenX}px`,
                  top: `${b.screenY}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                className="
                  absolute px-3.5 py-1.5 rounded-2xl
                  bg-slate-950/85 backdrop-blur-md
                  border border-cyan-400/50
                  shadow-[0_0_20px_rgba(34,211,238,0.35)]
                  text-xs font-medium text-white whitespace-nowrap
                "
              >
                <span className="text-cyan-300 font-bold mr-1.5">{b.senderLabel}:</span>
                <span>{b.text}</span>
              </div>
            )
        )}
      </div>

      {/* Requisito 4: Texto Gigante en Pantalla para Desafío "Luz Roja, Luz Verde" */}
      {challengeState !== 'off' && (
        <div
          id="redGreenBanner"
          className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
        >
          <div
            className={`
              px-8 py-3 rounded-3xl border-2 backdrop-blur-xl font-black tracking-wider uppercase
              text-2xl sm:text-4xl shadow-2xl transition-all duration-150
              ${
                challengeState === 'green'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_45px_rgba(16,185,129,0.75)]'
                  : 'bg-rose-950/85 border-rose-500 text-rose-300 shadow-[0_0_55px_rgba(244,63,94,0.85)] animate-pulse'
              }
            `}
          >
            {challengeState === 'green' ? '🟢 ¡LUZ VERDE! — ¡MUÉVETE!' : '🔴 ¡LUZ ROJA! — ¡NO TE MUEVAS!'}
          </div>
        </div>
      )}

      {/* Center Crosshair */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-10">
        <div className="relative w-5 h-5 flex items-center justify-center">
          <span className="absolute w-4 h-[2px] bg-cyan-300/90 shadow-[0_0_8px_#22d3ee]" />
          <span className="absolute h-4 w-[2px] bg-cyan-300/90 shadow-[0_0_8px_#22d3ee]" />
        </div>
      </div>

      {/* Top HUD Bar — Supervivencia Pura, PvP, Desafío, Ropa y Guardado */}
      <div className="fixed top-4 inset-x-4 flex flex-wrap items-start justify-between gap-2 z-20 pointer-events-none">
        {/* Player Status Card */}
        <div
          className="
            inf pointer-events-auto flex flex-col gap-1.5 px-4 py-3 rounded-2xl
            bg-[rgba(10,10,15,0.65)] backdrop-blur-md
            border border-emerald-400/25
            shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_18px_rgba(16,185,129,0.12)]
            text-xs text-slate-200
          "
        >
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wider uppercase text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.65)]">
              ⚔️ Supervivencia & PvP
            </span>
            <span className="text-slate-500">|</span>
            <span id="pos1" className="font-mono text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
              0, 10, 0
            </span>
            <span className="text-slate-500">|</span>
            <span id="bones1" className="font-mono text-amber-300">
              🦴 3
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-emerald-300">
              🪵 <span id="woodCountHud">{woodCount}</span> · 📦 <span id="plankCountHud">{plankCount}</span> · 🧶{' '}
              <span id="woolCountHud">{woolCount}</span>
            </span>
          </div>
          <div id="hp1" className="hpbar flex items-center gap-0.5" />

          {/* Sala Multijugador & Acciones Rápidas */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
            {roomCode ? (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono font-bold">
                🌐 Sala: {roomCode} ({peerCount} jug.)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/10 text-slate-400">
                👤 Modo Local / P2P Listo
              </span>
            )}

            {/* Requisito 7: Botón Cambiar Ropa en el HUD */}
            <button
              id="btnChangeClothes"
              type="button"
              onClick={() => actionsRef.current?.changeClothes()}
              className="
                px-2.5 py-0.5 rounded-lg bg-purple-500/25 hover:bg-purple-500/40
                border border-purple-400/50 text-purple-200 font-semibold transition cursor-pointer
                flex items-center gap-1.5
              "
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/60 inline-block"
                style={{ backgroundColor: currentClothes.css }}
              />
              👕 Cambiar Ropa ({currentClothes.name})
            </button>

            {/* Requisito 1: Botón de Chat [T] */}
            <button
              id="btnOpenChat"
              type="button"
              onClick={() => {
                setIsChatOpen(true);
                if (document.pointerLockElement) document.exitPointerLock();
              }}
              className="
                px-2.5 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35
                border border-cyan-400/50 text-cyan-200 font-semibold transition cursor-pointer
              "
            >
              💬 Chat [T]
            </button>
          </div>
        </div>

        {/* Panel Central: Anfitrión "Activar Desafío" + Crafteo Rápido + Mesa de Crafteo */}
        <div
          className="
            pointer-events-auto flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-2xl
            bg-[rgba(10,10,15,0.68)] backdrop-blur-md
            border border-cyan-400/30
            shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(34,211,238,0.16)]
          "
        >
          <div className="flex items-center gap-2">
            <span
              id="dn"
              className="text-xs font-semibold tracking-wide text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
            >
              ☀️ Día
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] font-medium text-cyan-300">
              🏝️ Islas Gigantes · 🐎 Caballos · ⚔️ PvP Activo
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {/* Requisito 4: Botón en el HUD visible para el anfitrión llamado "Activar Desafío" */}
            {isHost && (
              <button
                id="btnStartRedGreenLight"
                type="button"
                onClick={() => actionsRef.current?.toggleRedGreenChallenge()}
                className={`
                  px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border
                  ${
                    challengeState === 'off'
                      ? 'bg-rose-500/25 hover:bg-rose-500/40 border-rose-400/60 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                      : 'bg-emerald-500/30 hover:bg-emerald-500/45 border-emerald-400 text-emerald-200'
                  }
                `}
              >
                {challengeState === 'off' ? '🚦 Activar Desafío' : '⏹️ Detener Desafío'}
              </button>
            )}

            <button
              id="btnCraftPlanksHud"
              type="button"
              onClick={() => actionsRef.current?.craftPlanks()}
              className="
                px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35
                border border-emerald-400/50 text-[11px] font-semibold text-emerald-200
                transition cursor-pointer
              "
            >
              🪚 1 🪵 ➔ 4 📦 [C]
            </button>

            <button
              id="btnCraftTableHud"
              type="button"
              onClick={() => actionsRef.current?.craftTable()}
              className="
                px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35
                border border-amber-400/50 text-[11px] font-semibold text-amber-200
                transition cursor-pointer
              "
            >
              🪑 Crear Mesa (4 📦)
            </button>

            <button
              id="btnOpenCraftingTableHud"
              type="button"
              onClick={() => actionsRef.current?.toggleCraftingTableModal()}
              className="
                px-2.5 py-1 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40
                border border-cyan-400/50 text-[11px] font-semibold text-cyan-200
                transition cursor-pointer
              "
            >
              ⚒️ Mesa de Crafteo
            </button>
          </div>
        </div>

        {/* Guía Rápida & Guardado */}
        <div
          className="
            inf hidden lg:flex flex-col gap-1 px-4 py-2.5 rounded-2xl
            bg-[rgba(10,10,15,0.65)] backdrop-blur-md
            border border-white/10 text-[11px] text-slate-300 pointer-events-auto
          "
        >
          <div className="flex items-center justify-between gap-3">
            <span>
              <strong className="text-emerald-300">T</strong> Chat ·{' '}
              <strong className="text-emerald-300">E</strong> Mochila ·{' '}
              <strong className="text-emerald-300">ESC</strong> Pausa
            </span>
            <button
              type="button"
              onClick={() => actionsRef.current?.saveGame()}
              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 font-semibold cursor-pointer"
            >
              💾 Guardar
            </button>
          </div>
          <div>
            <strong className="text-cyan-300">Clic Izq</strong> Romper / PvP (-1 ❤️) ·{' '}
            <strong className="text-cyan-300">Clic Der</strong> Puerta / Caballo / Mesa
          </div>
        </div>
      </div>

      {/* Floating Notification Toast */}
      <div
        id="msg"
        className="
          pointer-events-none fixed top-28 left-1/2 -translate-x-1/2 z-20
          px-5 py-2 rounded-xl
          bg-[rgba(10,10,15,0.82)] backdrop-blur-md
          border border-emerald-400/40
          text-sm font-medium text-emerald-300
          shadow-[0_0_24px_rgba(16,185,129,0.3)]
          opacity-0 transition-opacity duration-300
        "
      />

      {/* Requisito 1: Input de Chat en Vivo al presionar la tecla T */}
      {isChatOpen && (
        <div className="fixed inset-x-0 bottom-28 flex justify-center z-35 px-4">
          <form
            id="chatForm"
            onSubmit={(e) => {
              e.preventDefault();
              actionsRef.current?.sendChatMessage(chatInputText);
            }}
            className="
              w-full max-w-lg flex items-center gap-2 p-2.5 rounded-2xl
              bg-slate-950/90 backdrop-blur-xl border border-cyan-400/50
              shadow-[0_12px_40px_rgba(0,0,0,0.75),0_0_25px_rgba(34,211,238,0.25)]
            "
          >
            <input
              id="chatInput"
              type="text"
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              maxLength={80}
              placeholder="Escribe un mensaje para mostrar sobre tu cabeza (5s)..."
              autoFocus
              className="
                flex-1 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/15
                text-sm text-white focus:outline-none focus:border-cyan-400
              "
            />
            <button
              type="submit"
              className="
                px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
                text-slate-950 font-bold text-xs cursor-pointer
              "
            >
              Enviar
            </button>
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </form>
        </div>
      )}

      {/* Controles Táctiles Virtuales para Dispositivos Móviles */}
      {isTouchDevice && isPlaying && (
        <>
          <div
            id="touchJoystick"
            onTouchStart={onJoystickTouchStart}
            onTouchMove={onJoystickTouchMove}
            onTouchEnd={onJoystickTouchEnd}
            className="
              fixed bottom-24 left-6 z-25 w-28 h-28 rounded-full
              bg-slate-950/60 backdrop-blur-md border-2 border-cyan-400/40
              shadow-[0_0_24px_rgba(34,211,238,0.25)]
              flex items-center justify-center touch-none
            "
          >
            <div
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
            />
          </div>

          <div className="fixed bottom-24 right-6 z-25 flex flex-col gap-2.5 touch-none">
            <div className="flex gap-2.5">
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  actionsRef.current?.touchActionBreak();
                }}
                className="w-14 h-14 rounded-2xl bg-rose-500/80 border border-rose-300 text-white font-bold text-xs shadow-lg active:scale-95"
              >
                ⛏️/⚔️
              </button>
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  actionsRef.current?.touchActionPlace();
                }}
                className="w-14 h-14 rounded-2xl bg-cyan-500/80 border border-cyan-300 text-white font-bold text-xs shadow-lg active:scale-95"
              >
                🧱/🐎
              </button>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  actionsRef.current?.touchJumpStart();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  actionsRef.current?.touchJumpEnd();
                }}
                className="w-14 h-14 rounded-2xl bg-emerald-500/80 border border-emerald-300 text-slate-950 font-extrabold text-xs shadow-lg active:scale-95"
              >
                ⬆️ Saltar
              </button>
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  actionsRef.current?.toggleCraftingTableModal();
                }}
                className="w-14 h-14 rounded-2xl bg-amber-500/80 border border-amber-300 text-slate-950 font-extrabold text-xs shadow-lg active:scale-95"
              >
                🪑 Mesa
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Centered Hotbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-auto">
        <div
          id="activeBlockLabel"
          className="
            px-3.5 py-1 rounded-full
            bg-[rgba(10,10,15,0.75)] backdrop-blur-md
            border border-white/10
            text-[11px] font-medium text-cyan-200 tracking-wide
          "
        >
          🤲 Mano vacía — Rompe bloques (Clic Izq) para recolectar recursos
        </div>
        <div
          id="hb1"
          className="
            hb flex items-center gap-1.5 p-2 rounded-2xl
            bg-[rgba(10,10,15,0.65)] backdrop-blur-md
            border border-emerald-400/25
            shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_20px_rgba(16,185,129,0.15)]
          "
        />
      </div>

      {/* Requisito 6: Modal de Mesa de Crafteo Avanzada (Dark Glassmorphism) */}
      {isCraftingTableOpen && pl && (
        <div
          id="craftingTableModal"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4"
        >
          <div
            className="
              w-full max-w-2xl p-6 rounded-3xl
              bg-[rgba(12,14,22,0.92)] backdrop-blur-xl
              border border-amber-400/40
              shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_40px_rgba(245,158,11,0.2)]
              text-white
            "
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">
                  🪑 Sistema Completo de Mesa de Crafteo
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Recetas de Supervivencia y Herramientas
                </h2>
              </div>
              <button
                id="btnCloseCraftingTable"
                type="button"
                onClick={() => {
                  setIsCraftingTableOpen(false);
                  const canvas = mountRef.current?.querySelector('canvas');
                  if (!isTouchDevice) canvas?.requestPointerLock?.();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cerrar [E]
              </button>
            </div>

            {/* Resumen de materiales actuales */}
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs">
              <span className="text-slate-400 font-semibold">Tus Materiales:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-mono">
                🪵 Madera: {woodCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 font-mono">
                📦 Tablones: {plankCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 font-mono">
                🥢 Palos: {stickCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">
                🪨 Piedra: {stoneCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-pink-300 font-mono">
                🧶 Lana: {woolCount}
              </span>
            </div>

            {/* Grid de las 6 Recetas Principales + Puerta Doble */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* 1. Madera -> Tablones */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-emerald-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-emerald-300">1. Madera ➔ Tablones</div>
                  <div className="text-xs text-slate-400">1 🪵 Madera ➔ 4 📦 Tablones</div>
                </div>
                <button
                  id="recipeWoodToPlanks"
                  type="button"
                  onClick={() => actionsRef.current?.craftPlanks()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              {/* 2. Tablones -> Palos */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-amber-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-amber-300">2. Tablones ➔ Palos</div>
                  <div className="text-xs text-slate-400">2 📦 Tablones ➔ 4 🥢 Palos</div>
                </div>
                <button
                  id="recipePlanksToSticks"
                  type="button"
                  onClick={() => actionsRef.current?.craftSticks()}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              {/* 3. Tablones + Palos -> Pico de madera */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-cyan-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-cyan-300">3. Pico de Madera (x2)</div>
                  <div className="text-xs text-slate-400">3 📦 Tablones + 2 🥢 Palos ➔ ⛏️ Pico</div>
                </div>
                <button
                  id="recipeWoodPickaxe"
                  type="button"
                  onClick={() => actionsRef.current?.craftWoodPickaxe()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              {/* 4. Piedra + Palos -> Pico de piedra */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-indigo-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-indigo-300">4. Pico de Piedra (x3)</div>
                  <div className="text-xs text-slate-400">3 🪨 Piedras + 2 🥢 Palos ➔ ⚒️ Pico</div>
                </div>
                <button
                  id="recipeStonePickaxe"
                  type="button"
                  onClick={() => actionsRef.current?.craftStonePickaxe()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              {/* 5. Tablones -> Bote */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-sky-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-sky-300">5. Tablones ➔ Bote</div>
                  <div className="text-xs text-slate-400">5 📦 Tablones ➔ 1 ⛵ Bote</div>
                </div>
                <button
                  id="recipeBoat"
                  type="button"
                  onClick={() => actionsRef.current?.craftBoat()}
                  className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              {/* 6. 3 Lanas + 3 Tablones -> Cama */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-rose-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-rose-300">6. 3 Lanas + 3 Tablones ➔ Cama</div>
                  <div className="text-xs text-slate-400">3 🧶 Lanas + 3 📦 Tablones ➔ 🛏️ Cama</div>
                </div>
                <button
                  id="recipeBed"
                  type="button"
                  onClick={() => actionsRef.current?.craftBed()}
                  className="px-3.5 py-2 rounded-xl bg-rose-400 hover:bg-rose-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              {/* Extra: Puerta de 2 bloques */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-amber-300/30 flex items-center justify-between gap-2 sm:col-span-2">
                <div>
                  <div className="text-sm font-bold text-amber-200">
                    7. Puerta Interactiva de 2 Bloques
                  </div>
                  <div className="text-xs text-slate-400">
                    2 📦 Tablones ➔ 1 🚪 Puerta Doble (Ocupa 2 bloques de alto y abre/cierra con Clic Der)
                  </div>
                </div>
                <button
                  id="recipeDoor"
                  type="button"
                  onClick={() => actionsRef.current?.craftDoor()}
                  className="px-3.5 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear Puerta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inventario y Mochila (Tecla E) */}
      {isInventoryOpen && pl && (
        <div
          id="inventoryModal"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4"
        >
          <div
            className="
              w-full max-w-xl p-6 rounded-3xl
              bg-[rgba(12,14,22,0.9)] backdrop-blur-xl
              border border-emerald-400/35
              shadow-[0_24px_64px_rgba(0,0,0,0.85)]
              text-white
            "
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                  Supervivencia & Crafteo Básico
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  🎒 Mochila e Inventario
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsInventoryOpen(false);
                    setIsCraftingTableOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/50 text-xs font-semibold text-amber-200 cursor-pointer"
                >
                  🪑 Abrir Mesa Avanzada
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsInventoryOpen(false);
                    setSelectedSwapSlot(null);
                    const canvas = mountRef.current?.querySelector('canvas');
                    if (!isTouchDevice) canvas?.requestPointerLock?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cerrar [E]
                </button>
              </div>
            </div>

            {/* Mochila Superior (Slots 9..17) */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Mochila (Haz clic en dos casillas para intercambiar objetos)
              </div>
              <div className="grid grid-cols-9 gap-2">
                {Array.from({ length: TOTAL_INV_SLOTS - HOTBAR_SIZE }, (_, i) => {
                  const idx = i + HOTBAR_SIZE;
                  const slot = pl.inventory[idx];
                  const d = slot && slot.count > 0 ? BD[slot.type] : null;
                  const isSelected = selectedSwapSlot === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => actionsRef.current?.handleSlotClick(idx)}
                      className={`
                        relative h-12 rounded-xl flex flex-col items-center justify-center border transition cursor-pointer
                        ${
                          isSelected
                            ? 'bg-cyan-500/30 border-cyan-300 scale-105'
                            : 'bg-slate-900/80 border-white/10 hover:border-white/30'
                        }
                      `}
                    >
                      <span className="text-lg">{d ? d.ic : '·'}</span>
                      {slot && slot.count > 0 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-amber-300">
                          {slot.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra Rápida Hotbar (Slots 0..8) */}
            <div>
              <div className="text-xs font-semibold text-emerald-300 mb-2">
                Barra Rápida (Hotbar 1 - 9)
              </div>
              <div className="grid grid-cols-9 gap-2">
                {Array.from({ length: HOTBAR_SIZE }, (_, idx) => {
                  const slot = pl.inventory[idx];
                  const d = slot && slot.count > 0 ? BD[slot.type] : null;
                  const isSelected = selectedSwapSlot === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => actionsRef.current?.handleSlotClick(idx)}
                      className={`
                        relative h-12 rounded-xl flex flex-col items-center justify-center border transition cursor-pointer
                        ${
                          isSelected
                            ? 'bg-cyan-500/30 border-cyan-300 scale-105'
                            : idx === pl.si
                              ? 'bg-emerald-500/20 border-emerald-400'
                              : 'bg-slate-900/80 border-white/15 hover:border-white/35'
                        }
                      `}
                    >
                      <span className="absolute top-0.5 left-1.5 text-[9px] font-mono text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="text-lg">{d ? d.ic : '·'}</span>
                      {slot && slot.count > 0 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-amber-300">
                          {slot.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wolf Naming Modal */}
      {wolfModal.open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-md">
          <div
            className="
              w-full max-w-sm p-6 rounded-3xl
              bg-[rgba(12,14,22,0.9)] backdrop-blur-xl
              border border-amber-400/40
              shadow-[0_20px_50px_rgba(0,0,0,0.8)]
              text-center text-white
            "
          >
            <div className="text-3xl mb-2">🐕</div>
            <h2 className="text-lg font-bold text-amber-300 mb-1">¡Domesticar Lobo Guardián!</h2>
            <p className="text-xs text-slate-300 mb-4">
              Elige un nombre para tu compañero. Te seguirá y atacará a los Zombies y Arañas de noche.
            </p>
            <input
              type="text"
              value={wolfNameInput}
              onChange={(e) => setWolfNameInput(e.target.value)}
              maxLength={16}
              className="
                w-full px-3.5 py-2 rounded-xl mb-4
                bg-slate-900/90 border border-white/15
                text-sm text-center text-white font-semibold
                focus:outline-none focus:border-amber-400
              "
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => actionsRef.current?.cancelWolfName()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => actionsRef.current?.confirmWolfName(wolfNameInput)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Domesticar (1 🦴)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menú Principal / Pausa: Crear Sala, Unirse a Sala, Instalar Juego (PWA) y Guardar Partida */}
      {!isPlaying && !wolfModal.open && !isInventoryOpen && !isCraftingTableOpen && !isChatOpen && (
        <div
          id="ov"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          <div
            className="
              max-w-lg w-full p-7 rounded-3xl
              bg-[rgba(10,12,20,0.88)] backdrop-blur-xl
              border border-emerald-400/35
              shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.2)]
              text-center text-white
            "
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-2">
              🌍 Supervivencia Pura · PvP · Luz Roja Luz Verde · PWA
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent mb-2">
              VoxelWorld
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Explora <strong className="text-emerald-300">Islas Gigantes y Continentes</strong>, monta{' '}
              <strong className="text-amber-300">Caballos (🐎)</strong>, construye con{' '}
              <strong className="text-cyan-300">Puertas Dobles de 2 Bloques</strong> y compite en{' '}
              <strong className="text-rose-300">PvP y Luz Roja, Luz Verde</strong>.
            </p>

            {pwaInstallBannerMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-xs text-emerald-200">
                {pwaInstallBannerMsg}
              </div>
            )}

            {/* Requisito 3: Botón "Instalar Juego" (PWA) y "Guardar Partida" */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <button
                id="btnInstallPWA"
                type="button"
                onClick={handleInstallPWAClick}
                className="
                  py-2.5 px-4 rounded-2xl font-bold text-xs text-slate-950
                  bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300
                  hover:from-amber-200 hover:to-emerald-200
                  shadow-[0_0_24px_rgba(251,191,36,0.45)]
                  transition cursor-pointer flex items-center justify-center gap-1.5
                "
              >
                📲 Instalar Juego
              </button>

              <button
                id="btnSaveGame"
                type="button"
                onClick={() => actionsRef.current?.saveGame()}
                className="
                  py-2.5 px-4 rounded-2xl font-bold text-xs text-emerald-200
                  bg-emerald-500/25 hover:bg-emerald-500/40
                  border border-emerald-400/50
                  transition cursor-pointer flex items-center justify-center gap-1.5
                "
              >
                💾 Guardar Partida {hasSavedGame ? '✓' : ''}
              </button>
            </div>

            {/* Botones Multijugador PeerJS: Crear Sala y Unirse a Sala */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                id="btnCreateRoom"
                type="button"
                onClick={handleCreateRoomClick}
                className="
                  py-3 px-4 rounded-2xl font-bold text-sm text-slate-950
                  bg-gradient-to-r from-emerald-400 to-teal-300
                  hover:from-emerald-300 hover:to-teal-200
                  shadow-[0_0_24px_rgba(52,211,153,0.45)]
                  transition cursor-pointer
                "
              >
                📡 Crear Sala (Host)
              </button>

              <button
                id="btnOpenJoinRoom"
                type="button"
                onClick={() => setShowJoinModal((v) => !v)}
                className="
                  py-3 px-4 rounded-2xl font-bold text-sm text-cyan-200
                  bg-cyan-500/20 hover:bg-cyan-500/35
                  border border-cyan-400/50
                  shadow-[0_0_20px_rgba(34,211,238,0.25)]
                  transition cursor-pointer
                "
              >
                🔗 Unirse a Sala
              </button>
            </div>

            {/* Input desplegable para escribir el código de sala */}
            {showJoinModal && (
              <form
                onSubmit={handleJoinRoomSubmit}
                className="mb-3 p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-400/40 flex flex-col sm:flex-row gap-2"
              >
                <input
                  id="inputRoomCode"
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Código (ej. K7M9P)"
                  maxLength={6}
                  className="
                    flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15
                    text-center font-mono text-sm uppercase tracking-widest text-cyan-300
                    focus:outline-none focus:border-cyan-400
                  "
                />
                <button
                  id="btnConnectRoom"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Conectar P2P
                </button>
              </form>
            )}

            {roomCode && (
              <div className="mb-3 py-2 px-3 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-xs text-cyan-200">
                Código de Sala Activo:{' '}
                <strong className="font-mono text-sm text-white tracking-widest">{roomCode}</strong>{' '}
                ({mpStatus === 'hosting' ? 'Esperando amigos...' : 'Conectado'})
              </div>
            )}

            {mpError && <div className="mb-3 text-xs text-rose-400 font-medium">{mpError}</div>}

            <button
              id="startBtn"
              type="button"
              onClick={handleStartSingleOrResume}
              className="
                w-full py-3 rounded-2xl font-bold text-sm text-white
                bg-slate-800/90 hover:bg-slate-700/90 border border-white/15
                transition cursor-pointer
              "
            >
              {hasStartedOnce ? '▶️ Reanudar Partida' : '🎮 Jugar en Solitario'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
