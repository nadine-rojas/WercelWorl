import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Peer, DataConnection } from 'peerjs';
import { renderTrue3DScene } from './game/software3DRenderer';
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
  LOST_VILLAGER_SPAWNS,
  createInfiniteWorld,
  ensureChunksAroundPlayer,
  gB,
  sB,
  getH,
  surfY,
  getSpawnY,
  createPlayer,
  cyclePlayerClothesLogic,
  stepPlayerPhysics,
  breakBlockLogic,
  placeBlockLogic,
  toggleTwoBlockDoorLogic,
  damageEntityLogic,
  tameWolfLogic,
  stepTamedWolfAILogic,
  stepEnemyCombatLogic,
  stepEntityMovementWithCollision,
  despawnDaytimeMonsters,
  isNightTime,
  getDayPhaseLabel,
  raycastBlock,
  distance3D,
  nearestPlayer,
  countItemInInventory,
  swapInventorySlots,
  craftWoodToPlanksLogic,
  craftPlanksToTableLogic,
  craftPlanksToSticksLogic,
  craftWoodPickaxeLogic,
  craftStonePickaxeLogic,
  craftWoodSwordLogic,
  craftStoneSwordLogic,
  craftPlanksToBoatLogic,
  craftWoolAndPlanksToBedLogic,
  craftPlanksToDoorLogic,
  craftChestLogic,
  craftTorchesLogic,
  getPlayerAttackDamage,
  placeBoatInWaterLogic,
  mountBoatLogic,
  dismountBoatLogic,
  toggleMountHorseLogic,
  findValidMonsterSpawnPoint,
  spawnRainPuddleLogic,
  checkRedLightViolationLogic,
  getNearestLostVillagerCompass,
  rescueVillagerLogic,
  serializeSaveGame,
  deserializeSaveGame,
  generateRoomCode,
  normalizeRoomCode,
  BUILD_BATTLE_DURATION_SEC,
  BUILD_BATTLE_FLOOR_Y,
  formatBuildBattleTimer,
  equipBuildBattleCreativeInventory,
  setupBuildBattleArena,
  openBuildBattleDividingWall,
  getAiHouseBlueprint,
  stepAiBuilderBot,
  setupRedLightArena,
  type EntityData,
  type PlayerState,
  type BoatData,
  type WeatherType,
  type VillagerCompassReading,
  type GameModeType,
  type BuildBattleOpponent,
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
      type: 'weather:state';
      weather: WeatherType;
    }
  | {
      type: 'mode:select';
      mode: GameModeType;
      opponent: BuildBattleOpponent;
    }
  | {
      type: 'buildbattle:vote';
      voterId: string;
      target: 'player1' | 'opponent';
    }
  | {
      type: 'world:sync';
      modifications: Array<[string, number]>;
      dayTime: number;
      challengeState: 'off' | 'green' | 'red';
      weather: WeatherType;
      gameMode?: GameModeType;
    };

const PEER_PREFIX = 'VOXELWORLD-SURVIVAL-2026-';

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
    // Fallback silencioso a localStorage
  }
}

export function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'mp_lobby'>('main');
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isQuickCraftOpen, setIsQuickCraftOpen] = useState(false);
  const [isCraftingTableOpen, setIsCraftingTableOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [selectedSwapSlot, setSelectedSwapSlot] = useState<number | null>(null);
  const [isTabHeld, setIsTabHeld] = useState(false);

  // Estado PWA ("Instalar Juego")
  const [pwaInstallBannerMsg, setPwaInstallBannerMsg] = useState<string | null>(null);
  const deferredInstallPromptRef = useRef<any>(null);

  // Estado Multijugador PeerJS y Selección de Modos
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [mpStatus, setMpStatus] = useState<'offline' | 'connecting' | 'hosting' | 'connected'>('offline');
  const [mpError, setMpError] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState<number>(1);
  const [isHost, setIsHost] = useState<boolean>(true);
  const isHostRef = useRef<boolean>(true);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Modo de Juego Activo: 'survival' | 'red_light' | 'build_battle'
  const [gameMode, setGameMode] = useState<GameModeType>('survival');
  const gameModeRef = useRef<GameModeType>('survival');

  // Estado de "Batalla de Construcción" (Build Battle)
  const [buildBattleOpponent, setBuildBattleOpponent] = useState<BuildBattleOpponent>('ai');
  const buildBattleOpponentRef = useRef<BuildBattleOpponent>('ai');
  const [buildBattleTimeLeft, setBuildBattleTimeLeft] = useState<number>(BUILD_BATTLE_DURATION_SEC);
  const buildBattleTimeLeftRef = useRef<number>(BUILD_BATTLE_DURATION_SEC);
  const [buildBattleVotingPhase, setBuildBattleVotingPhase] = useState<boolean>(false);
  const buildBattleVotingPhaseRef = useRef<boolean>(false);
  const [buildBattleVotes, setBuildBattleVotes] = useState<{
    player1: number;
    opponent: number;
    winner: string | null;
  }>({ player1: 0, opponent: 0, winner: null });

  // Estado Desafío "Luz Roja, Luz Verde" y alerta "¡TE MOVISTE!"
  const [challengeState, setChallengeState] = useState<'off' | 'green' | 'red'>('off');
  const challengeStateRef = useRef<'off' | 'green' | 'red'>('off');
  const [movedDeathBanner, setMovedDeathBanner] = useState<string | null>(null);

  // Estado de Clima Dinámico ('clear' | 'rain' | 'snow')
  const [weatherState, setWeatherState] = useState<WeatherType>('clear');
  const weatherStateRef = useRef<WeatherType>('clear');

  // Estado Brújula HUD Minimalista (Aldeanos Perdidos)
  const [compassState, setCompassState] = useState<VillagerCompassReading>({
    targetName: LOST_VILLAGER_SPAWNS[0].name,
    distance: 101,
    relativeAngleDeg: 135,
    cardinal: 'SE',
    rescuedCount: 0,
    totalCount: LOST_VILLAGER_SPAWNS.length,
    allRescued: false,
  });

  // Chat flotante sobre cabezas
  const [floatingChats, setFloatingChats] = useState<FloatingChatBubble[]>([]);
  const floatingChatsRef = useRef<FloatingChatBubble[]>([]);

  // Wolf naming modal state
  const [wolfModal, setWolfModal] = useState<{ open: boolean; wolfId: number | null }>({
    open: false,
    wolfId: null,
  });
  const [wolfNameInput, setWolfNameInput] = useState('Fenrir');

  const [, setUiTick] = useState(0);
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(SAVE_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const [fatalEngineError, setFatalEngineError] = useState<string | null>(null);

  const actionsRef = useRef<{
    unlockAudio: () => void;
    confirmWolfName: (name: string) => void;
    cancelWolfName: () => void;
    craftPlanks: () => void;
    craftTable: () => void;
    craftSticks: () => void;
    craftWoodPickaxe: () => void;
    craftStonePickaxe: () => void;
    craftWoodSword: () => void;
    craftStoneSword: () => void;
    craftBoat: () => void;
    craftBed: () => void;
    craftDoor: () => void;
    craftChest: () => void;
    craftTorches: () => void;
    placeCraftingTableInFront: () => void;
    changeClothes: () => void;
    saveGame: () => void;
    toggleRedGreenChallenge: () => void;
    setRedGreenPhaseExplicit: (phase: 'off' | 'green' | 'red') => void;
    selectGameMode: (mode: GameModeType, opponent?: BuildBattleOpponent) => void;
    finishBuildBattleTimerNow: () => void;
    voteBuildBattle: (target: 'player1' | 'opponent') => void;
    cycleWeather: () => void;
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
    toggleQuickCraftModal: () => void;
    closeCraftingTableModal: () => void;
  } | null>(null);

  const plRef = useRef<PlayerState | null>(null);
  const joyVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyTouchIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const lookTouchRef = useRef<{ id: number; lastX: number; lastY: number } | null>(null);
  const camAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0.75, pitch: -0.1 });

  // Registro dinámico de Service Worker y manifest.json mediante Data URIs para PWA
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
        name: 'VoxelWorld — Supervivencia PBR & Desafíos Multijugador',
        short_name: 'VoxelWorld',
        description:
          'Sandbox 3D realista con texturas pixel-art HD 64x64, clima dinámico, brújula de aldeanos y Luz Roja Luz Verde.',
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
    actionsRef.current?.unlockAudio();
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
    let cleanupEngine: (() => void) | null = null;
    let loadHandler: (() => void) | null = null;

    // REQUISITO 3: Función de captura de errores visibles (inyecta un div con z-index alto e imprime error.message)
    const reportFatalEngineError = (error: unknown) => {
      const errMessage =
        error instanceof Error ? error.message || String(error) : String(error);
      setFatalEngineError(errMessage);
      try {
        let errDiv = document.getElementById('vercel-fatal-error-banner');
        if (!errDiv && document.body) {
          errDiv = document.createElement('div');
          errDiv.id = 'vercel-fatal-error-banner';
          errDiv.style.cssText =
            'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999999;max-width:92vw;width:680px;background:rgba(15,23,42,0.97);border:2px solid #f43f5e;color:#ffe4e6;padding:16px 20px;border-radius:14px;font-family:monospace;box-shadow:0 0 40px rgba(244,63,94,0.65);';
          document.body.appendChild(errDiv);
        }
        if (errDiv) {
          errDiv.innerHTML = `<div style="font-weight:800;color:#fb7185;margin-bottom:6px;font-size:14px;">⚠️ Error detectado en motor 3D:</div><div style="font-size:13px;word-break:break-word;">${errMessage}</div>`;
        }
      } catch {
        // Ignorar si el DOM aún no admite inyección
      }
    };

    const startEngineWhenDomReady = () => {
      try {
        const container = mountRef.current || document.getElementById('root') || document.body;
        if (!container) return;

        const touchDetected =
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(pointer: coarse)').matches;
        setIsTouchDevice(touchDetected);

        // ─── REQUISITO 2: POLÍTICA DE AUTOPLAY DE AUDIO (WEBAUDIO API) ─────
        // AudioContext SOLO se crea o se reanuda (resume()) DESPUÉS de que el jugador
        // haga clic en algún botón del menú principal (ej. "Un Jugador" o "Multijugador").
        let audioCtx: AudioContext | null = null;
        let audioUnlockedByMenuClick = false;

        const unlockAudioFromMenu = () => {
          audioUnlockedByMenuClick = true;
          try {
            if (!audioCtx) {
              const Ctx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              if (Ctx) audioCtx = new Ctx();
            }
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
            }
          } catch {
            // Ignorar restricciones de reproducción automática del navegador
          }
        };

        const ensureAudio = () => {
          if (!audioUnlockedByMenuClick) return;
          unlockAudioFromMenu();
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
          // Bloquear estrictamente cualquier sonido antes de hacer clic en el menú principal
          if (!audioUnlockedByMenuClick || !audioCtx) return;
          try {
            if (audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
              return;
            }
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

        // ─── RENDERER 3D ENVUELTO EN TRY-CATCH GLOBAL PARA VERCEL ───
        const initW = Math.max(window.innerWidth || 1280, 320);
        const initH = Math.max(window.innerHeight || 720, 240);
        const mainCanvas = document.createElement('canvas');
        const glAttrs: WebGLContextAttributes = {
          antialias: false,
          alpha: false,
          depth: true,
          stencil: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        };
        const glContext = (mainCanvas.getContext('webgl2', glAttrs) ||
          mainCanvas.getContext('webgl', glAttrs) ||
          mainCanvas.getContext('experimental-webgl', glAttrs)) as WebGL2RenderingContext | null;

        let webglRenderer: THREE.WebGLRenderer | null = null;
        let isSoftwareGl = false;

        if (glContext) {
          webglRenderer = new THREE.WebGLRenderer({
            canvas: mainCanvas,
            context: glContext,
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance',
          });
          try {
            const dbgExt = glContext.getExtension('WEBGL_debug_renderer_info');
            const param = dbgExt ? dbgExt.UNMASKED_RENDERER_WEBGL : glContext.RENDERER;
            const gpuStr = String(glContext.getParameter(param) || '');
            isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuStr);
          } catch {
            isSoftwareGl = false;
          }
          webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
          webglRenderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
          webglRenderer.setSize(initW, initH);
          webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
          webglRenderer.toneMappingExposure = 1.08;
          webglRenderer.shadowMap.enabled = !isSoftwareGl;
          webglRenderer.shadowMap.type = THREE.PCFShadowMap;
        }

        const activeCanvas = webglRenderer ? webglRenderer.domElement : document.createElement('canvas');
        activeCanvas.id = 'c';
        activeCanvas.className = 'block w-full h-full cursor-crosshair select-none';
        if (!webglRenderer) {
          activeCanvas.width = initW;
          activeCanvas.height = initH;
        }
        const fallbackCtx3D = !webglRenderer ? activeCanvas.getContext('2d', { alpha: false }) : null;

        const renderer = {
          domElement: activeCanvas,
          getContext: () => glContext as WebGL2RenderingContext,
          setViewport: (x: number, y: number, w: number, h: number) => {
            if (webglRenderer) webglRenderer.setViewport(x, y, w, h);
          },
          setSize: (w: number, h: number) => {
            const safeW = Math.max(w || 1280, 320);
            const safeH = Math.max(h || 720, 240);
            if (webglRenderer) {
              webglRenderer.setSize(safeW, safeH);
            } else {
              activeCanvas.width = safeW;
              activeCanvas.height = safeH;
            }
          },
          dispose: () => {
            webglRenderer?.dispose();
          },
        };

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const skyBgColor = new THREE.Color(0x87ceeb);
        scene.background = skyBgColor;
        const sceneFog = new THREE.FogExp2(0x87ceeb, 0.011);
        scene.fog = sceneFog;

        const cam1 = new THREE.PerspectiveCamera(75, initW / initH, 0.1, 145);

        // Renderizado directo al framebuffer de WebGLRenderer para máxima compatibilidad en GPUs de producción (Vercel)
        const composer: EffectComposer | null = null;

    const ambL = new THREE.AmbientLight(0xffffff, 0.58);
    scene.add(ambL);
    const hemiL = new THREE.HemisphereLight(0xbbeeff, 0x3d4c33, 0.5);
    scene.add(hemiL);
    const sunL = new THREE.DirectionalLight(0xfff5e0, 1.15);
    sunL.position.set(60, 100, 40);
    sunL.castShadow = !isSoftwareGl;
    sunL.shadow.mapSize.width = 1024;
    sunL.shadow.mapSize.height = 1024;
    sunL.shadow.camera.near = 0.5;
    sunL.shadow.camera.far = 220;
    sunL.shadow.camera.left = -48;
    sunL.shadow.camera.right = 48;
    sunL.shadow.camera.top = 48;
    sunL.shadow.camera.bottom = -48;
    sunL.shadow.bias = -0.0005;
    sunL.shadow.normalBias = 0.02;
    scene.add(sunL);
    scene.add(sunL.target);

    const skyGeo = new THREE.SphereGeometry(135, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 10, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.3, 0.45) })
    );
    scene.add(sunMesh);

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 10, 10),
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

    let dayTime = 0.35;
    const DAY_SPEED = 0.008;

    // ─── REQUISITO 4: TEXTURAS CLÁSICAS DE PÍXELES MEDIANOS (16x16 CON fillRect) ──
    function mkTex(blockId: number, hexColor: number): THREE.CanvasTexture {
      const size = 16;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const hash2D = (x: number, y: number, seed = 1) => {
        const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
        return s - Math.floor(s);
      };

      const baseCol = new THREE.Color(hexColor);
      const toRgbStr = (r: number, g: number, b: number) =>
        `rgb(${Math.max(0, Math.min(255, Math.floor(r)))},${Math.max(
          0,
          Math.min(255, Math.floor(g))
        )},${Math.max(0, Math.min(255, Math.floor(b)))})`;

      if (blockId === BT.WOOD) {
        // MADERA (16x16): Vetas verticales oscuras y claras con fillRect
        const barkCols = [
          'rgb(62,38,18)',
          'rgb(92,58,30)',
          'rgb(118,76,42)',
          'rgb(142,96,54)',
          'rgb(82,50,25)',
        ];
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const shift = Math.floor(hash2D(x, Math.floor(y / 4), 11) * 2);
            ctx.fillStyle = barkCols[(x + shift) % barkCols.length];
            ctx.fillRect(x, y, 1, 1);
          }
        }
        // Surcos verticales oscuros y nudo
        ctx.fillStyle = 'rgb(44,26,12)';
        ctx.fillRect(3, 0, 1, 16);
        ctx.fillRect(9, 0, 1, 16);
        ctx.fillRect(13, 0, 1, 16);
        ctx.fillRect(6, 6, 3, 4);
        ctx.fillStyle = 'rgb(148,100,56)';
        ctx.fillRect(7, 7, 1, 2);
      } else if (
        blockId === BT.PLANK ||
        blockId === BT.TABLE ||
        blockId === BT.CHAIR ||
        blockId === BT.DOOR ||
        blockId === BT.DOOR_OPEN ||
        blockId === BT.CHEST
      ) {
        // TABLONES (16x16): 4 tablas horizontales separadas por líneas rectas y pequeños clavos en las esquinas
        const boardH = 4;
        for (let y = 0; y < size; y++) {
          const row = Math.floor(y / boardH);
          for (let x = 0; x < size; x++) {
            const n = (hash2D(x + row * 3, y, 31) - 0.5) * 18;
            ctx.fillStyle = toRgbStr(
              baseCol.r * 245 + n,
              baseCol.g * 245 + n * 0.85,
              baseCol.b * 245 + n * 0.7
            );
            ctx.fillRect(x, y, 1, 1);
          }
        }

        for (let row = 0; row < 4; row++) {
          const topY = row * boardH;
          // Línea recta separadora de tabla
          ctx.fillStyle = 'rgb(74,46,21)';
          ctx.fillRect(0, topY, size, 1);

          // Junta vertical alternada
          const splitX = row % 2 === 0 ? 8 : 12;
          ctx.fillRect(splitX, topY, 1, boardH);

          // Pequeños "clavos" en las esquinas de cada tabla (1x1 píxel con fillRect)
          ctx.fillStyle = 'rgb(42,46,52)';
          ctx.fillRect(1, topY + 1, 1, 1);
          ctx.fillRect(splitX - 2, topY + 2, 1, 1);
          ctx.fillRect(size - 2, topY + 1, 1, 1);
        }

        if (blockId === BT.TABLE) {
          ctx.fillStyle = 'rgb(58,34,14)';
          ctx.fillRect(3, 3, 10, 1);
          ctx.fillRect(3, 12, 10, 1);
          ctx.fillRect(3, 3, 1, 10);
          ctx.fillRect(12, 3, 1, 10);
        } else if (blockId === BT.CHEST) {
          ctx.fillStyle = 'rgb(38,26,14)';
          ctx.fillRect(0, 6, size, 1);
          ctx.fillStyle = 'rgb(245,198,54)';
          ctx.fillRect(7, 5, 2, 3);
        }
      } else if (blockId === BT.STONE || blockId === BT.COBBLE || blockId === BT.BEDROCK) {
        // PIEDRA Y ADOQUÍN (16x16): Ruido mineral y grietas irregulares con fillRect
        const tones =
          blockId === BT.BEDROCK
            ? [
                [34, 34, 38],
                [52, 52, 58],
                [22, 22, 26],
              ]
            : [
                [108, 110, 114],
                [124, 126, 130],
                [92, 94, 98],
                [138, 140, 144],
              ];
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = Math.floor(hash2D(x, y, 17) * tones.length);
            const [r, g, b] = tones[idx];
            ctx.fillStyle = toRgbStr(r, g, b);
            ctx.fillRect(x, y, 1, 1);
          }
        }
        // Grietas irregulares talladas píxel por píxel
        ctx.fillStyle = 'rgb(46,48,52)';
        const cracks =
          blockId === BT.COBBLE
            ? [
                [2, 3, 4, 1],
                [5, 4, 1, 3],
                [9, 2, 4, 1],
                [11, 3, 1, 4],
                [3, 10, 5, 1],
                [7, 11, 4, 1],
                [12, 9, 1, 5],
              ]
            : [
                [3, 4, 4, 1],
                [6, 5, 2, 1],
                [10, 11, 4, 1],
                [12, 12, 2, 1],
              ];
        for (const [cx, cy, cw, ch] of cracks) {
          ctx.fillRect(cx, cy, cw, ch);
        }
      } else if (blockId === BT.BRICK) {
        // LADRILLO (16x16): Filas clásicas de ladrillo con juntas de mortero
        for (let y = 0; y < size; y++) {
          const row = Math.floor(y / 4);
          const mortarY = y % 4 === 0;
          for (let x = 0; x < size; x++) {
            const mortarX = (x + (row % 2) * 4) % 8 === 0;
            if (mortarY || mortarX) {
              ctx.fillStyle = 'rgb(202,196,186)';
            } else {
              const n = (hash2D(x, y, 14) - 0.5) * 20;
              ctx.fillStyle = toRgbStr(188 + n, 76 + n * 0.4, 52 + n * 0.3);
            }
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else if (blockId === BT.GOLD || blockId === BT.DIAMOND) {
        // BLOQUES DE ORO Y DIAMANTE (16x16): Bisel brillante estilo Minecraft clásico
        const isGold = blockId === BT.GOLD;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const onOuter = x === 0 || y === 0 || x === size - 1 || y === size - 1;
            const onHighlight = x === 1 || y === 1 || x + y === 7 || x + y === 13;
            if (onOuter) {
              ctx.fillStyle = isGold ? 'rgb(180,120,8)' : 'rgb(14,145,175)';
            } else if (onHighlight) {
              ctx.fillStyle = isGold ? 'rgb(255,245,150)' : 'rgb(185,250,255)';
            } else {
              ctx.fillStyle = isGold ? 'rgb(248,200,34)' : 'rgb(42,212,238)';
            }
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else if (blockId === BT.GRASS || blockId === BT.DIRT || blockId === BT.LEAVES) {
        // PASTO, TIERRA Y HOJAS (16x16): Manchas irregulares de píxeles limpios
        const palette =
          blockId === BT.DIRT
            ? [
                [124, 84, 46],
                [146, 98, 54],
                [104, 68, 35],
              ]
            : blockId === BT.LEAVES
              ? [
                  [36, 92, 26],
                  [48, 116, 34],
                  [28, 72, 18],
                ]
              : [
                  [72, 166, 50],
                  [88, 186, 62],
                  [58, 140, 40],
                  [114, 84, 48],
                ];
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const roll = hash2D(x, y, blockId * 29);
            let idx = Math.floor(roll * palette.length) % palette.length;
            if (blockId === BT.GRASS && idx === 3 && roll < 0.88) idx = 0;
            const [r, g, b] = palette[idx];
            ctx.fillStyle = toRgbStr(r, g, b);
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const n = (hash2D(x, y, blockId * 19) - 0.5) * 24;
            ctx.fillStyle = toRgbStr(
              baseCol.r * 255 + n,
              baseCol.g * 255 + n,
              baseCol.b * 255 + n
            );
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const BMAT: Record<number, THREE.MeshStandardMaterial> = {};
    for (const [k, d] of Object.entries(BD)) {
      const id = Number(k);
      const tex = mkTex(id, d.c);
      const isRocky = id === BT.STONE || id === BT.COBBLE || id === BT.BEDROCK || id === BT.BRICK;
      const isWoody =
        id === BT.WOOD ||
        id === BT.PLANK ||
        id === BT.TABLE ||
        id === BT.CHAIR ||
        id === BT.DOOR ||
        id === BT.CHEST;
      const isShiny = id === BT.GOLD || id === BT.DIAMOND;
      const isWater = id === BT.WATER || id === BT.PUDDLE;

      const matParams: THREE.MeshStandardMaterialParameters = {
        color: 0xffffff,
        map: tex,
        bumpMap: tex,
        bumpScale: isWater ? 0.005 : isRocky ? 0.045 : 0.025,
        roughness: isWater ? 0.15 : isShiny ? 0.25 : isWoody ? 0.72 : isRocky ? 0.88 : 0.8,
        metalness: isShiny ? 0.35 : isWater ? 0.15 : 0.02,
      };
      if (d.tr) {
        matParams.transparent = true;
        matParams.opacity = d.op;
      }
      if (d.em) {
        matParams.emissive = new THREE.Color(d.em);
        matParams.emissiveIntensity = id === BT.TORCH ? 2.4 : 1.1;
      }
      BMAT[id] = new THREE.MeshStandardMaterial(matParams);
    }

    // ─── MUNDO INFINITO POR CHUNKS Y GUARDADO AUTOMÁTICO ─────────────
    const world = createInfiniteWorld();
    const PL1 = createPlayer();
    plRef.current = PL1;

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
      // Continuar con mundo nuevo
    }

    const VIEW_CHUNK_RADIUS = 2;
    ensureChunksAroundPlayer(world, PL1.pos.x, PL1.pos.z, VIEW_CHUNK_RADIUS);

    const bGeo = new THREE.BoxGeometry(1, 1, 1);

    const iMeshes: Record<number, THREE.InstancedMesh> = {};
    const torchLights: THREE.PointLight[] = [];
    const dummy = new THREE.Object3D();
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();

    function vis(x: number, y: number, z: number): boolean {
      const b = gB(world, x, y, z);
      if (b === BT.AIR) return false;
      if (b === BT.DOOR_OPEN || b === BT.TORCH || b === BT.PUDDLE || b === BT.CHAIR) return true;
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

    function rebuildMeshes(): void {
      for (const k of Object.keys(iMeshes)) {
        const id = Number(k);
        scene.remove(iMeshes[id]);
        iMeshes[id].dispose();
        delete iMeshes[id];
      }
      for (const tl of torchLights) {
        scene.remove(tl);
      }
      torchLights.length = 0;

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
        const im = new THREE.InstancedMesh(bGeo, BMAT[b], c);
        im.castShadow = b !== BT.WATER && b !== BT.PUDDLE;
        im.receiveShadow = true;
        const p = pos[b];
        for (let i = 0; i < c; i++) {
          const bx = p[i * 3] + 0.5;
          const by = p[i * 3 + 1] + 0.5;
          const bz = p[i * 3 + 2] + 0.5;
          if (b === BT.DOOR_OPEN) {
            dummy.position.set(bx - 0.41, by, bz);
            dummy.scale.set(0.18, 1, 0.96);
          } else if (b === BT.TORCH) {
            dummy.position.set(bx, by - 0.14, bz);
            dummy.scale.set(0.2, 0.72, 0.2);
          } else if (b === BT.PUDDLE) {
            dummy.position.set(bx, by - 0.47, bz);
            dummy.scale.set(0.92, 0.06, 0.92);
          } else if (b === BT.CHAIR) {
            dummy.position.set(bx, by - 0.17, bz);
            dummy.scale.set(0.76, 0.65, 0.76);
          } else {
            dummy.position.set(bx, by, bz);
            dummy.scale.set(1, 1, 1);
          }
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);

          if (b === BT.TORCH && torchLights.length < 18) {
            const ptLight = new THREE.PointLight(0xff9922, 2.2, 14, 1.5);
            ptLight.position.set(bx, by + 0.25, bz);
            scene.add(ptLight);
            torchLights.push(ptLight);
          }
        }
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingBox();
        im.computeBoundingSphere();
        im.frustumCulled = true;
        scene.add(im);
        iMeshes[b] = im;
      }
    }

    rebuildMeshes();

    // ─── SISTEMA DE CLIMA DINÁMICO (PARTÍCULAS DE LLUVIA Y NIEVE) ────
    const WEATHER_PARTICLE_COUNT = 450;
    const weatherOffsets = new Float32Array(WEATHER_PARTICLE_COUNT * 3);
    const weatherPositions = new Float32Array(WEATHER_PARTICLE_COUNT * 3);
    for (let i = 0; i < WEATHER_PARTICLE_COUNT; i++) {
      weatherOffsets[i * 3] = (Math.random() - 0.5) * 38;
      weatherOffsets[i * 3 + 1] = Math.random() * 22;
      weatherOffsets[i * 3 + 2] = (Math.random() - 0.5) * 38;
    }
    const weatherGeo = new THREE.BufferGeometry();
    weatherGeo.setAttribute('position', new THREE.BufferAttribute(weatherPositions, 3));
    const weatherMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.22,
      transparent: true,
      opacity: 0.78,
    });
    const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
    weatherPoints.visible = false;
    scene.add(weatherPoints);

    // ─── PARTÍCULAS Y FEEDBACK VISUAL ────────────────────────────────
    const particles: FloatingParticle[] = [];
    const partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);

    function spawnBlockParticles(wx: number, wy: number, wz: number, colorHex: number, count = 12) {
      const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
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

    // ─── MODELOS 3D DE BOTES Y AVATARES ──────────────────────────────
    const boats: BoatData[] = [];
    const boatMeshes = new Map<number, THREE.Group>();
    let nextBoatId = 1;

    function createBoatMesh(): THREE.Group {
      const g = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.65 });
      const plankMat = new THREE.MeshStandardMaterial({ color: 0xc1874b, roughness: 0.6 });
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

    // ─── MULTIJUGADOR ONLINE (PEERJS), PVP Y SINCRONIZACIÓN DE DESAFÍO ─
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
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: palette.hex, roughness: 0.55 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMat);
      head.position.set(0, 1.48, 0);
      group.add(head);

      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
      eyeL.position.set(-0.11, 1.5, -0.25);
      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
      eyeR.position.set(0.11, 1.5, -0.25);
      group.add(eyeL, eyeR);

      const pupL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06), pupilMat);
      pupL.position.set(-0.11, 1.5, -0.26);
      const pupR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06), pupilMat);
      pupR.position.set(0.11, 1.5, -0.26);
      group.add(pupL, pupR);

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
        expiresAt: performance.now() + 5000,
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

    // Requisito 5: Lógica de Muerte Estricta en "Luz Roja" -> HP baja a 0 al instante y muestra "¡TE MOVISTE!"
    let redLightRespawnTimeout: number | undefined;
    function triggerStrictRedLightElimination() {
      const check = checkRedLightViolationLogic('red', PL1, { keyCode: 'KeyW' });
      PL1.hp = 0; // Baja a 0 al instante
      buildHP();
      playSfx('redlight');
      triggerDamageOverlay();
      setMovedDeathBanner(check.message || '¡TE MOVISTE!');
      showMsg('¡TE MOVISTE!');

      clearTimeout(redLightRespawnTimeout);
      redLightRespawnTimeout = window.setTimeout(() => {
        setMovedDeathBanner(null);
        PL1.inBoat = false;
        PL1.activeBoatId = null;
        PL1.mountedHorseId = null;
        PL1.hp = 20;
        PL1.invul = 2.0;
        if (gameModeRef.current === 'red_light') {
          PL1.pos.x = 0.5;
          PL1.pos.y = 11.05;
          PL1.pos.z = 5.5;
          camAnglesRef.current.yaw = 0;
        } else {
          ensureChunksAroundPlayer(world, SPAWN_X, SPAWN_Z, VIEW_CHUNK_RADIUS);
          PL1.pos.x = SPAWN_X;
          PL1.pos.y = getSpawnY();
          PL1.pos.z = SPAWN_Z;
        }
        PL1.vel.x = 0;
        PL1.vel.y = 0;
        PL1.vel.z = 0;
        activeCenterCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
        activeCenterCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);
        rebuildMeshes();
        buildHP();
      }, 1500);
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
            (rp.torso.material as THREE.MeshStandardMaterial).color.setHex(entry.hex);
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
          const dmg = msg.damage || 2;
          PL1.hp = Math.max(0, PL1.hp - dmg);
          PL1.invul = 0.5;
          playSfx('hurt');
          triggerDamageOverlay();
          buildHP();
          if (PL1.hp <= 0) {
            triggerPlayerDeathAndRespawn('💀 ¡Fuiste derrotado en PvP! Reapareciendo en el Spawn...');
            buildHP();
          } else {
            showMsg(`⚔️ ¡Recibiste un golpe PvP (-${Math.ceil(dmg / 2)} ❤️)!`);
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
          (rp.torso.material as THREE.MeshStandardMaterial).color.setHex(entry.hex);
        }
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'challenge:state') {
        // Requisito 2: Recibir estado exacto de Luz Verde o Luz Roja por PeerJS
        challengeStateRef.current = msg.state;
        setChallengeState(msg.state);
        if (msg.state === 'green') {
          playSfx('greenlight');
          showMsg('🟢 ¡LUZ VERDE! Puedes moverte.');
        } else if (msg.state === 'red') {
          playSfx('redlight');
          showMsg('🔴 ¡LUZ ROJA! No muevas ni el teclado ni el mouse.');
        } else {
          showMsg('⏹️ Desafío finalizado.');
        }
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'weather:state') {
        weatherStateRef.current = msg.weather;
        setWeatherState(msg.weather);
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'mode:select') {
        activateGameModeInternal(msg.mode, msg.opponent, false);
        broadcastNetMessage(msg, fromConn.peer);
      } else if (msg.type === 'buildbattle:vote') {
        setBuildBattleVotes((prev) => {
          const p1 = prev.player1 + (msg.target === 'player1' ? 1 : 0);
          const opp = prev.opponent + (msg.target === 'opponent' ? 1 : 0);
          const winner =
            p1 > opp
              ? '🏆 ¡Jugador 1 va ganando la votación!'
              : opp > p1
                ? '🏆 ¡Construcción Rival va ganando!'
                : '🤝 ¡Empate técnico en la votación!';
          return { player1: p1, opponent: opp, winner };
        });
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
        if (msg.weather) {
          weatherStateRef.current = msg.weather;
          setWeatherState(msg.weather);
        }
        if (msg.gameMode) {
          gameModeRef.current = msg.gameMode;
          setGameMode(msg.gameMode);
        }
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
          weather: weatherStateRef.current,
        } satisfies NetworkMessage);

        // Si el desafío ya está activo, enviar inmediatamente el estado actual al nuevo jugador
        if (challengeStateRef.current !== 'off') {
          conn.send({
            type: 'challenge:state',
            state: challengeStateRef.current,
          } satisfies NetworkMessage);
        }

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
      isHostRef.current = true;
      setIsHost(true);
      setMpStatus('connecting');

      try {
        if (peerInstance) peerInstance.destroy();
        // REQUISITO 1: Configuración Segura de PeerJS (HTTPS) en Vercel con { secure: true }
        const peer = new Peer(`${PEER_PREFIX}${code}`, {
          secure: true,
        });
        peerInstance = peer;

        peer.on('open', (id) => {
          myPeerId = id;
          setMpStatus('hosting');
          showMsg(`📡 Sala segura HTTPS creada: Código ${code}`);
        });

        peer.on('connection', (conn) => {
          registerConnection(conn);
        });

        peer.on('error', (err) => {
          console.warn('PeerJS Host Error:', err);
          setMpStatus('hosting');
        });
      } catch (err) {
        console.warn('PeerJS Host Init Catch:', err);
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
      isHostRef.current = false;
      setIsHost(false);
      setMpStatus('connecting');

      try {
        if (peerInstance) peerInstance.destroy();
        // REQUISITO 1: Configuración Segura de PeerJS (HTTPS) en Vercel con { secure: true }
        const peer = new Peer({
          secure: true,
        });
        peerInstance = peer;

        peer.on('open', (id) => {
          myPeerId = id;
          const conn = peer.connect(`${PEER_PREFIX}${clean}`, { reliable: true });
          conn.on('error', (connErr) => {
            console.warn('PeerJS DataConnection Error:', connErr);
          });
          registerConnection(conn);
          setShowJoinModal(false);
        });

        peer.on('error', (err) => {
          console.warn('PeerJS Client Error:', err);
          setMpError(`No se pudo conectar a la sala ${clean}. Verifica el código.`);
          setMpStatus('offline');
        });
      } catch (err) {
        console.warn('PeerJS Client Init Catch:', err);
        setMpError('Error al inicializar PeerJS.');
        setMpStatus('offline');
      }
    }

    // ─── ENTIDADES: ANIMALES, CABALLOS, LOBOS, MONSTRUOS Y ALDEANOS PERDIDOS ──
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
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 })
      );
      m.position.set(ox, oy, oz);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    function addVillager(id: number, name: string, x: number, z: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const sy = surfY(world, x, z);
      const g = new THREE.Group();
      const legs: THREE.Mesh[] = [];
      // Túnica esmeralda/dorada de aldeano perdido
      const l1 = mkBox(0.2, 0.55, 0.2, 0x4b3621, -0.12, 0.275, 0);
      const l2 = mkBox(0.2, 0.55, 0.2, 0x4b3621, 0.12, 0.275, 0);
      g.add(l1, l2);
      legs.push(l1, l2);
      g.add(mkBox(0.52, 0.75, 0.32, 0x059669, 0, 0.92, 0));
      g.add(mkBox(0.46, 0.5, 0.46, 0xe0ac69, 0, 1.54, 0));
      // Sombrero/distintivo dorado para ser fácil de divisar
      g.add(mkBox(0.58, 0.14, 0.58, 0xfbbf24, 0, 1.82, 0));
      g.position.set(x + 0.5, sy + 0.25, z + 0.5);
      scene.add(g);
      entities.push({
        id,
        mesh: g,
        legs,
        type: 'villager',
        vname: name,
        rescued: false,
        pos: g.position,
        vel: new THREE.Vector3(),
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 20,
        maxHp: 20,
      });
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
      g.position.set(x + 0.5, sy + 0.25, z + 0.5);
      scene.add(g);
      const initAng = Math.random() * Math.PI * 2;
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs,
        type,
        pos: g.position,
        vel: new THREE.Vector3(Math.sin(initAng) * 1.5, 0, Math.cos(initAng) * 1.5),
        state: 'idle',
        timer: 2 + Math.random() * 3,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: cfg.hp,
        maxHp: cfg.hp,
      });
    }

    function addHorse(x: number, z: number) {
      const sy = surfY(world, x, z);
      if (sy <= SEA + 1) return;
      const g = new THREE.Group();
      const coatColors = [0x8b4513, 0xa0522d, 0x6b3e26, 0xd2a679];
      const coat = coatColors[Math.floor(Math.random() * coatColors.length)];
      const maneCol = 0x2b1b12;
      const saddleCol = 0xb45309;

      g.add(mkBox(0.88, 0.72, 1.55, coat, 0, 0.95, 0));
      g.add(mkBox(0.92, 0.16, 0.58, saddleCol, 0, 1.34, -0.05));
      g.add(mkBox(0.38, 0.65, 0.42, coat, 0, 1.42, 0.68));
      g.add(mkBox(0.36, 0.36, 0.62, coat, 0, 1.68, 0.92));
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

      g.position.set(x + 0.5, sy + 0.25, z + 0.5);
      scene.add(g);
      const initAng = Math.random() * Math.PI * 2;
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs,
        type: 'horse',
        pos: g.position,
        vel: new THREE.Vector3(Math.sin(initAng) * 2.0, 0, Math.cos(initAng) * 2.0),
        state: 'idle',
        timer: 2 + Math.random() * 3,
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
      g.position.set(x, sy + 0.2, z);
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

      g.position.set(x, sy + 0.2, z);
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
      g.position.set(x + 0.5, sy + 0.25, z + 0.5);
      scene.add(g);
      const initAng = Math.random() * Math.PI * 2;
      entities.push({
        id: nextEntityId++,
        mesh: g,
        legs,
        type: 'wolf',
        pos: g.position,
        vel: new THREE.Vector3(Math.sin(initAng) * 1.8, 0, Math.cos(initAng) * 1.8),
        state: 'idle',
        timer: 2 + Math.random() * 3,
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
      g.position.set(x, sy + 0.2, z);
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

    // Generar los Aldeanos Perdidos en coordenadas lejanas al spawn para la Brújula HUD
    for (const lv of LOST_VILLAGER_SPAWNS) {
      addVillager(lv.id, lv.name, lv.x, lv.z);
    }

    // Spawn inicial de fauna en la gran isla/continente inicial
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
      addAnimal('cow', (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26);
      addAnimal('chicken', (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22);
    }
    for (const [wx, wz] of [
      [3, -4],
      [-6, -5],
      [9, 5],
    ]) {
      addWolf(wx, wz);
    }
    for (let i = 0; i < 8; i++) {
      addFish(28 + Math.random() * 18, (Math.random() - 0.5) * 35);
    }

    // ─── CONTROLES POINTER LOCK & TECLADO (CON MUERTE ESTRICTA EN LUZ ROJA) ──
    const keys: Record<string, boolean> = {};
    let jumpJustPressed = false;
    let jumpJustReleased = false;
    let pointerLocked = false;
    let inventoryOpenLocal = false;
    let quickCraftOpenLocal = false;
    let craftingTableOpenLocal = false;
    let chatOpenLocal = false;
    let wolfModalOpenLocal = false;
    let localWalkPhase = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      // Requisito 1: Paneles ocultables mientras se mantiene presionada la tecla TAB
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsTabHeld(true);
        return;
      }

      if (wolfModalOpenLocal || chatOpenLocal) {
        if (e.code === 'Escape' && chatOpenLocal) {
          chatOpenLocal = false;
          setIsChatOpen(false);
        }
        return;
      }

      // REQUISITO 2: Lógica de Muerte Estricta en "Luz Roja" al presionar WASD, Space o Flechas
      if (challengeStateRef.current === 'red') {
        const violation = checkRedLightViolationLogic('red', PL1, { keyCode: e.code });
        if (violation.violated) {
          e.preventDefault();
          triggerStrictRedLightElimination();
          return;
        }
      }

      // Tecla T abre el input de chat en vivo
      if (e.code === 'KeyT' && !inventoryOpenLocal && !quickCraftOpenLocal && !craftingTableOpenLocal) {
        e.preventDefault();
        chatOpenLocal = true;
        setIsChatOpen(true);
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }

      // Requisito 3: Al presionar la tecla X se abre la ventana de Crafteo Rápido
      if (e.code === 'KeyX') {
        e.preventDefault();
        ensureAudio();
        craftingTableOpenLocal = false;
        setIsCraftingTableOpen(false);
        inventoryOpenLocal = false;
        setIsInventoryOpen(false);
        quickCraftOpenLocal = !quickCraftOpenLocal;
        setIsQuickCraftOpen(quickCraftOpenLocal);
        if (quickCraftOpenLocal) {
          if (document.pointerLockElement) document.exitPointerLock();
        } else if (!touchDetected) {
          renderer.domElement.requestPointerLock?.();
        }
        return;
      }

      if ((e.code === 'ShiftLeft' || e.code === 'KeyZ') && (PL1.inBoat || PL1.mountedHorseId !== null)) {
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

      if (e.code === 'KeyE') {
        e.preventDefault();
        ensureAudio();
        if (craftingTableOpenLocal || quickCraftOpenLocal) {
          craftingTableOpenLocal = false;
          quickCraftOpenLocal = false;
          setIsCraftingTableOpen(false);
          setIsQuickCraftOpen(false);
          if (!touchDetected) renderer.domElement.requestPointerLock?.();
          return;
        }
        inventoryOpenLocal = !inventoryOpenLocal;
        setIsInventoryOpen(inventoryOpenLocal);
        setSelectedSwapSlot(null);
        if (inventoryOpenLocal) {
          if (document.pointerLockElement) document.exitPointerLock();
        } else if (!touchDetected) {
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
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsTabHeld(false);
        return;
      }
      if (e.code === 'Space') {
        jumpJustReleased = true;
      }
      keys[e.code] = false;
    };

    const onWindowBlur = () => {
      setIsTabHeld(false);
      for (const k of Object.keys(keys)) {
        keys[k] = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === renderer.domElement;
      if (
        !pointerLocked &&
        !wolfModalOpenLocal &&
        !inventoryOpenLocal &&
        !quickCraftOpenLocal &&
        !craftingTableOpenLocal &&
        !chatOpenLocal &&
        !touchDetected
      ) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else if (pointerLocked) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        setHasStartedOnce(true);
      }
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // REQUISITO 5: Escuchar activamente e.movementX y e.movementY en el PointerLock durante "Luz Roja"
    const onMouseMove = (e: MouseEvent) => {
      if (challengeStateRef.current === 'red' && (pointerLocked || isPlayingRef.current)) {
        const violation = checkRedLightViolationLogic('red', PL1, {
          movementX: e.movementX,
          movementY: e.movementY,
        });
        if (violation.violated) {
          triggerStrictRedLightElimination();
          return;
        }
      }
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

    // Registro de bloques colocados por el jugador para proteger la arena en Batalla de Construcción
    const playerPlacedBlocks = new Set<string>();

    // ─── INTERACCIÓN: doBreak (CLIC IZQ) Y doPlace (CLIC DER) CON MAPAS INDESTRUCTIBLES ──
    function doBreak() {
      ensureAudio();
      const yaw = camAnglesRef.current.yaw;
      const pitch = camAnglesRef.current.pitch;
      const lookDir = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ).normalize();

      // PvP Habilitado
      for (const [pid, rp] of remotePlayers.entries()) {
        const dPlayer = PL1.pos ? distance3D(PL1.pos, rp.group.position) : 999;
        if (dPlayer < 4.2) {
          const toRemote = new THREE.Vector3(
            rp.group.position.x - PL1.pos.x,
            rp.group.position.y + 1.0 - (PL1.pos.y + PL1.eyeH),
            rp.group.position.z - PL1.pos.z
          ).normalize();
          if (lookDir.dot(toRemote) > 0.45) {
            const pvpDmg = getPlayerAttackDamage(PL1, true);
            playSfx('hit');
            spawnBlockParticles(rp.group.position.x, rp.group.position.y + 1.1, rp.group.position.z, 0xef4444, 12);
            broadcastNetMessage({
              type: 'pvp:hit',
              targetPeerId: pid,
              attackerPeerId: myPeerId,
              damage: pvpDmg,
            });
            showMsg(`⚔️ ¡Golpe PvP conectado (-${Math.ceil(pvpDmg / 2)} ❤️ al rival)!`);
            return;
          }
        }
      }

      // Atacar mobs/animales cercanos (excepto aldeanos)
      let attackedEntity = false;
      for (const e of entities) {
        if (!e.alive || e.state === 'ko' || e.type === 'villager') continue;
        const d = distance3D(PL1.pos, e.pos);
        if (d < 4.2) {
          const toEnt = new THREE.Vector3(
            e.pos.x - PL1.pos.x,
            e.pos.y + 0.8 - (PL1.pos.y + PL1.eyeH),
            e.pos.z - PL1.pos.z
          ).normalize();
          if (lookDir.dot(toEnt) > 0.45) {
            const dmg = getPlayerAttackDamage(PL1, false);
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
        // Requisito 2: En "Luz Roja" desactivar totalmente la capacidad de romper bloques
        if (gameModeRef.current === 'red_light') {
          showMsg('🚫 En Luz Roja está desactivado romper bloques.');
          return;
        }

        const hit = raycastBlock(world, PL1.pos, PL1.eyeH, yaw, pitch);
        if (hit) {
          const res = breakBlockLogic(
            world,
            PL1,
            hit.bx,
            hit.by,
            hit.bz,
            gameModeRef.current,
            gameModeRef.current === 'build_battle' ? playerPlacedBlocks : undefined
          );
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
            if (itemDef && gameModeRef.current !== 'build_battle') {
              const yieldTxt = res.bonusYield && res.bonusYield > 1 ? `x${res.bonusYield} (¡Pico!)` : '+1';
              showMsg(`⛏️ Recolectaste ${yieldTxt} ${itemDef.ic} ${itemDef.n}`);
            }
          } else if (res.blockedReason) {
            showMsg(res.blockedReason);
          }
        }
      }
    }

    function doPlace() {
      ensureAudio();
      const yaw = camAnglesRef.current.yaw;
      const pitch = camAnglesRef.current.pitch;

      // Requisito 2: En "Luz Roja" desactivar totalmente la capacidad de colocar bloques
      if (gameModeRef.current === 'red_light') {
        showMsg('🚫 En Luz Roja está desactivado colocar bloques.');
        return;
      }

      // 0. Rescatar Aldeano Perdido si está cerca
      for (const e of entities) {
        if (e.alive && e.type === 'villager' && !e.rescued && distance3D(PL1.pos, e.pos) < 5.0) {
          const res = rescueVillagerLogic(e, PL1);
          if (res.rescued) {
            playSfx('tame');
            spawnBlockParticles(e.pos.x, e.pos.y + 1.2, e.pos.z, 0x34d399, 14);
            showMsg(`🧭 ¡Rescataste a ${res.name}! La brújula apunta al siguiente aldeano.`);
            return;
          }
        }
      }

      // 1. Verificar si clic derecho apunta a un Caballo para Montar/Desmontar
      for (const e of entities) {
        if (e.alive && e.type === 'horse' && distance3D(PL1.pos, e.pos) < 4.5) {
          const mounted = toggleMountHorseLogic(PL1, e);
          playSfx('horse');
          if (mounted) {
            showMsg('🐎 ¡Montaste al Caballo! Velocidad y salto aumentados (Clic Der o Shift para desmontar).');
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
            showMsg('⛵ ¡Subiste al Bote! Navega con WASD y pulsa Shift para bajar.');
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

      // 5. Raycast al bloque apuntado: Puerta de 2 bloques, Mesa de Crafteo colocada o colocar bloque
      const hit = raycastBlock(world, PL1.pos, PL1.eyeH, yaw, pitch);
      if (!hit) return;

      const targetBlock = gB(world, hit.bx, hit.by, hit.bz);

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

      if (targetBlock === BT.TABLE && gameModeRef.current !== 'build_battle') {
        quickCraftOpenLocal = false;
        setIsQuickCraftOpen(false);
        craftingTableOpenLocal = true;
        setIsCraftingTableOpen(true);
        if (document.pointerLockElement) document.exitPointerLock();
        showMsg('🪑 Mesa de Crafteo abierta: Catálogo completo de herramientas, armas PvP y bloques.');
        return;
      }

      const isCreativeBuildBattle = gameModeRef.current === 'build_battle';
      const res = placeBlockLogic(
        world,
        PL1,
        hit.bx,
        hit.by,
        hit.bz,
        hit.nx,
        hit.ny,
        hit.nz,
        isCreativeBuildBattle,
        gameModeRef.current,
        playerPlacedBlocks
      );
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
          showMsg('🚪 Puerta Doble colocada (Clic derecho sobre ella para abrir/cerrar).');
        } else if (res.blockType === BT.TABLE && !isCreativeBuildBattle) {
          showMsg('🪑 ¡Mesa de Crafteo colocada en el piso! Haz Clic Derecho sobre ella para abrir el catálogo.');
        } else if (res.blockType === BT.TORCH) {
          showMsg('🕯️ ¡Antorcha colocada! Emite luz PointLight y repele a las arañas en un radio de 5 bloques.');
        }
      } else if (res.blockedReason) {
        showMsg(res.blockedReason);
      } else if (PL1.sel === 0) {
        showMsg('🎒 Mano vacía: rompe árboles (🪵) o presiona [X] para el Crafteo Rápido.');
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      ensureAudio();
      if (!pointerLocked) return;
      if (e.button === 0) {
        doBreak();
      } else if (e.button === 2) {
        doPlace();
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
        }</span><span class="slot-icon text-lg leading-none">${
          d ? d.ic : '<span class="text-slate-600 text-xs">·</span>'
        }</span>${
          slot && slot.count > 0
            ? `<span class="slot-count absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-amber-300 drop-shadow">${slot.count}</span>`
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
            : '🤲 Mano vacía — Presiona [X] para Crafteo Rápido o rompe bloques (Clic Izq)';
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

    let challengeSwitchT = 3.5;

    // ─── AVATAR 3D DEL BOT IA CONSTRUCTOR Y MUÑECA DE LUZ ROJA ────────
    const aiBotVisual = createRemotePlayerMesh(4); // Traje Ámbar Oro para el Bot IA
    aiBotVisual.group.visible = false;
    aiBotVisual.group.position.set(7.5, BUILD_BATTLE_FLOOR_Y + 1.05, 0.5);

    const redLightDollGroup = new THREE.Group();
    redLightDollGroup.add(mkBox(0.9, 1.4, 0.55, 0xf97316, 0, 0.7, 0)); // Vestido naranja
    redLightDollGroup.add(mkBox(0.75, 0.75, 0.75, 0xfde68a, 0, 1.75, 0)); // Cabeza
    redLightDollGroup.add(mkBox(0.82, 0.25, 0.82, 0x1e293b, 0, 2.15, 0)); // Cabello
    redLightDollGroup.position.set(0.5, 11, -19.5);
    redLightDollGroup.visible = false;
    scene.add(redLightDollGroup);

    let aiHouseBlueprint = getAiHouseBlueprint(BUILD_BATTLE_FLOOR_Y);
    let aiBuildProgressIdx = 0;
    let aiBuildStepTimer = 0;

    function triggerBuildBattleTimeUp() {
      buildBattleTimeLeftRef.current = 0;
      setBuildBattleTimeLeft(0);
      buildBattleVotingPhaseRef.current = true;
      setBuildBattleVotingPhase(true);
      openBuildBattleDividingWall(world);
      rebuildMeshes();
      playSfx('craft');
      showMsg('⏰ ¡00:00 TIEMPO TERMINADO! El muro cayó: vuela libremente (Espacio/Shift) y vota quién ganó.');
    }

    function activateGameModeInternal(
      mode: GameModeType,
      opponent: BuildBattleOpponent = buildBattleOpponentRef.current,
      shouldBroadcast = true
    ) {
      gameModeRef.current = mode;
      setGameMode(mode);
      buildBattleOpponentRef.current = opponent;
      setBuildBattleOpponent(opponent);
      setMovedDeathBanner(null);
      playerPlacedBlocks.clear();

      if (mode === 'survival') {
        challengeStateRef.current = 'off';
        setChallengeState('off');
        buildBattleVotingPhaseRef.current = false;
        setBuildBattleVotingPhase(false);
        aiBotVisual.group.visible = false;
        redLightDollGroup.visible = false;
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
        buildHotbar();
        showMsg('🌲 Modo Supervivencia Infinita activado.');
      } else if (mode === 'red_light') {
        buildBattleVotingPhaseRef.current = false;
        setBuildBattleVotingPhase(false);
        aiBotVisual.group.visible = false;
        const arena = setupRedLightArena(world);
        redLightDollGroup.visible = true;
        redLightDollGroup.position.set(0.5, 11, arena.finishZ - 1.2);
        PL1.pos.x = arena.startX;
        PL1.pos.y = arena.startY;
        PL1.pos.z = arena.startZ;
        PL1.vel.x = 0;
        PL1.vel.y = 0;
        PL1.vel.z = 0;
        camAnglesRef.current.yaw = 0;
        camAnglesRef.current.pitch = -0.05;
        challengeStateRef.current = 'green';
        challengeSwitchT = 3.5;
        setChallengeState('green');
        activeCenterCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
        activeCenterCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);
        rebuildMeshes();
        buildHotbar();
        playSfx('greenlight');
        showMsg('🚦 ¡Arena Cerrada de Luz Roja, Luz Verde! Llega a la meta dorada sin moverte en Luz Roja.');
      } else if (mode === 'build_battle') {
        challengeStateRef.current = 'off';
        setChallengeState('off');
        redLightDollGroup.visible = false;
        const arena = setupBuildBattleArena(world);
        equipBuildBattleCreativeInventory(PL1);
        PL1.pos.x = arena.playerSpawn.x;
        PL1.pos.y = arena.playerSpawn.y;
        PL1.pos.z = arena.playerSpawn.z;
        PL1.vel.x = 0;
        PL1.vel.y = 0;
        PL1.vel.z = 0;
        camAnglesRef.current.yaw = -Math.PI / 2;
        camAnglesRef.current.pitch = -0.15;

        buildBattleTimeLeftRef.current = BUILD_BATTLE_DURATION_SEC;
        setBuildBattleTimeLeft(BUILD_BATTLE_DURATION_SEC);
        buildBattleVotingPhaseRef.current = false;
        setBuildBattleVotingPhase(false);
        setBuildBattleVotes({ player1: 0, opponent: 0, winner: null });

        aiHouseBlueprint = getAiHouseBlueprint(arena.floorY);
        aiBuildProgressIdx = 0;
        aiBuildStepTimer = 0;
        aiBotVisual.group.visible = opponent === 'ai';
        aiBotVisual.group.position.set(arena.opponentSpawn.x, arena.opponentSpawn.y, arena.opponentSpawn.z);

        activeCenterCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
        activeCenterCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);
        rebuildMeshes();
        buildHotbar();
        setUiTick((t) => t + 1);
        showMsg(
          opponent === 'ai'
            ? '🏰 ¡Batalla de Construcción (06:00) vs Bot IA! Inventario Creativo Infinito activado.'
            : '🏰 ¡Batalla de Construcción (06:00) vs Amigos! Inventario Creativo Infinito activado.'
        );
      }

      if (shouldBroadcast) {
        broadcastNetMessage({
          type: 'mode:select',
          mode,
          opponent,
        });
      }
    }

    // ─── ACCIONES EXPUESTAS A MODALES Y BOTONES DE REACT ──────────────
    actionsRef.current = {
      unlockAudio: () => {
        unlockAudioFromMenu();
      },
      confirmWolfName: (name: string) => {
        ensureAudio();
        const target = entities.find((e) => e.id === wolfModal.wolfId);
        if (target && target.alive && target.type === 'wolf' && !target.tamed) {
          const res = tameWolfLogic(target, PL1, name);
          if (res.tamed) {
            target.mesh.children.forEach((c) => {
              const meshChild = c as THREE.Mesh;
              if (meshChild.material) {
                (meshChild.material as THREE.MeshStandardMaterial).color.setHex(0xddaa44);
              }
            });
            target.mesh.add(mkBox(0.44, 0.1, 0.44, 0xff2200, 0, 0.62, 0.42));
            playSfx('tame');
            showMsg(`🐕 ¡${res.name} domesticado! Te seguirá a todas partes (teletransporte >15 bloques).`);
          }
        }
        wolfModalOpenLocal = false;
        setWolfModal({ open: false, wolfId: null });
        if (!touchDetected) renderer.domElement.requestPointerLock?.();
      },
      cancelWolfName: () => {
        wolfModalOpenLocal = false;
        setWolfModal({ open: false, wolfId: null });
        if (!touchDetected) renderer.domElement.requestPointerLock?.();
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
          showMsg('🪑 ¡Mesa de Crafteo creada! Colócala físicamente en el piso con Clic Derecho.');
        } else {
          showMsg('❌ Necesitas 4 📦 Tablones para crear una 🪑 Mesa de Crafteo.');
        }
      },
      placeCraftingTableInFront: () => {
        ensureAudio();
        const tableSlotIdx = PL1.inventory.findIndex((s) => s && s.type === BT.TABLE && s.count > 0);
        if (tableSlotIdx < 0) {
          showMsg('❌ Primero crea una 🪑 Mesa de Crafteo (4 Tablones) en esta ventana.');
          return;
        }
        PL1.si = tableSlotIdx < HOTBAR_SIZE ? tableSlotIdx : PL1.si;
        const yaw = camAnglesRef.current.yaw;
        const tx = Math.floor(PL1.pos.x - Math.sin(yaw) * 2.0);
        const tz = Math.floor(PL1.pos.z - Math.cos(yaw) * 2.0);
        const ty = surfY(world, tx, tz);
        sB(world, tx, ty, tz, BT.TABLE);
        const slot = PL1.inventory[tableSlotIdx];
        if (slot) {
          slot.count -= 1;
          if (slot.count <= 0) PL1.inventory[tableSlotIdx] = null;
        }
        playSfx('place');
        rebuildMeshes();
        buildHotbar();
        broadcastNetMessage({ type: 'block:set', x: tx, y: ty, z: tz, blockType: BT.TABLE });
        quickCraftOpenLocal = false;
        setIsQuickCraftOpen(false);
        craftingTableOpenLocal = true;
        setIsCraftingTableOpen(true);
        showMsg('🪑 ¡Mesa colocada físicamente frente a ti y abierta!');
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
      craftWoodSword: () => {
        ensureAudio();
        const res = craftWoodSwordLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('🗡️ ¡Espada de Madera crafteada para PvP y combate!');
        } else {
          showMsg('❌ Necesitas 2 📦 Tablones + 1 🥢 Palo para la Espada de Madera.');
        }
      },
      craftStoneSword: () => {
        ensureAudio();
        const res = craftStoneSwordLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('⚔️ ¡Espada de Piedra crafteada! Daño letal en PvP (3 ❤️ por golpe).');
        } else {
          showMsg('❌ Necesitas 2 🪨 Piedras + 1 🥢 Palo para la Espada de Piedra.');
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
          showMsg('❌ Necesitas 2 📦 Tablones para craftear 1 🚪 Puerta Doble.');
        }
      },
      craftChest: () => {
        ensureAudio();
        const res = craftChestLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg('🧰 ¡Cofre de almacenamiento crafteado!');
        } else {
          showMsg('❌ Necesitas 4 📦 Tablones para craftear 1 🧰 Cofre.');
        }
      },
      craftTorches: () => {
        ensureAudio();
        const res = craftTorchesLogic(PL1);
        if (res.crafted) {
          playSfx('craft');
          buildHotbar();
          setUiTick((t) => t + 1);
          showMsg(`🕯️ ¡Crafteaste +4 Antorchas (1 Palo + 1 Tablón)! Emiten luz PointLight y repelen arañas.`);
        } else {
          showMsg('❌ Necesitas 1 🥢 Palo + 1 📦 Tablón para craftear Antorchas.');
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
          showMsg('💾 ¡Partida guardada en IndexedDB y localStorage!');
        } catch {
          showMsg('⚠️ No se pudo guardar en el almacenamiento local.');
        }
      },
      toggleRedGreenChallenge: () => {
        ensureAudio();
        const next = challengeStateRef.current === 'off' ? 'green' : 'off';
        challengeStateRef.current = next;
        challengeSwitchT = 3.2;
        setChallengeState(next);
        if (next === 'green') {
          playSfx('greenlight');
          showMsg('🚦 ¡Desafío "Luz Roja, Luz Verde" ACTIVADO para toda la sala!');
        } else {
          setMovedDeathBanner(null);
          showMsg('🚦 Desafío "Luz Roja, Luz Verde" finalizado.');
        }
        broadcastNetMessage({
          type: 'challenge:state',
          state: next,
        });
      },
      setRedGreenPhaseExplicit: (phase: 'off' | 'green' | 'red') => {
        ensureAudio();
        challengeStateRef.current = phase;
        challengeSwitchT = phase === 'green' ? 3.5 : 2.8;
        setChallengeState(phase);
        if (phase === 'green') playSfx('greenlight');
        else if (phase === 'red') playSfx('redlight');
        broadcastNetMessage({
          type: 'challenge:state',
          state: phase,
        });
      },
      selectGameMode: (mode: GameModeType, opponent?: BuildBattleOpponent) => {
        ensureAudio();
        activateGameModeInternal(mode, opponent || buildBattleOpponentRef.current, true);
      },
      finishBuildBattleTimerNow: () => {
        ensureAudio();
        triggerBuildBattleTimeUp();
      },
      voteBuildBattle: (target: 'player1' | 'opponent') => {
        ensureAudio();
        playSfx('tame');
        setBuildBattleVotes((prev) => {
          const p1 = prev.player1 + (target === 'player1' ? 1 : 0);
          const opp = prev.opponent + (target === 'opponent' ? 1 : 0);
          const winner =
            p1 > opp
              ? '🏆 ¡Ganador: Tu Construcción (Jugador 1)!'
              : opp > p1
                ? `🏆 ¡Ganador: Construcción ${buildBattleOpponentRef.current === 'ai' ? 'del Bot IA' : 'de tu Amigo'}!`
                : '🤝 ¡Empate en la Batalla de Construcción!';
          showMsg(winner);
          return { player1: p1, opponent: opp, winner };
        });
        broadcastNetMessage({
          type: 'buildbattle:vote',
          voterId: myPeerId,
          target,
        });
      },
      cycleWeather: () => {
        ensureAudio();
        const order: WeatherType[] = ['clear', 'rain', 'snow'];
        const next = order[(order.indexOf(weatherStateRef.current) + 1) % order.length];
        weatherStateRef.current = next;
        setWeatherState(next);
        broadcastNetMessage({ type: 'weather:state', weather: next });
        if (next === 'rain') {
          const pud = spawnRainPuddleLogic(world, PL1.pos);
          if (pud.spawned) rebuildMeshes();
          showMsg('🌧️ Clima: Lluvia intensa (Visibilidad reducida y formación de charcos).');
        } else if (next === 'snow') {
          showMsg('🌨️ Clima: Tormenta de Nieve.');
        } else {
          showMsg('☀️ Clima: Cielo despejado.');
        }
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
        doBreak();
      },
      touchActionPlace: () => {
        doPlace();
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
      toggleQuickCraftModal: () => {
        craftingTableOpenLocal = false;
        setIsCraftingTableOpen(false);
        quickCraftOpenLocal = !quickCraftOpenLocal;
        setIsQuickCraftOpen(quickCraftOpenLocal);
        if (quickCraftOpenLocal && document.pointerLockElement) {
          document.exitPointerLock();
        }
      },
      closeCraftingTableModal: () => {
        craftingTableOpenLocal = false;
        setIsCraftingTableOpen(false);
        if (!touchDetected) renderer.domElement.requestPointerLock?.();
      },
    };

    buildHotbar();
    buildHP();

    // ─── BUCLE PRINCIPAL DE SIMULACIÓN, BRÚJULA, CLIMA Y DESAFÍO ─────
    let zSpawnT = 0;
    let netSyncT = 0;
    let compassSyncT = 0;
    let weatherCycleT = 38.0;
    let puddleSpawnT = 0;
    let lastT = performance.now();
    let animFrameId = 0;

    function updateWeatherAndDayNight(dt: number, nowSec: number) {
      dayTime = (dayTime + DAY_SPEED * dt) % 1;
      const ang = dayTime * Math.PI * 2;
      const sy = Math.sin(ang);
      const cy = Math.cos(ang);

      sunMesh.position.set(PL1.pos.x + cy * 105, sy * 105, PL1.pos.z + 30);
      moonMesh.position.set(PL1.pos.x - cy * 105, -sy * 105, PL1.pos.z - 30);
      skyMesh.position.set(PL1.pos.x, 0, PL1.pos.z);
      stars.position.set(PL1.pos.x, 0, PL1.pos.z);
      sunL.position.copy(sunMesh.position);
      sunL.target.position.set(PL1.pos.x, PL1.pos.y, PL1.pos.z);
      sunL.target.updateMatrixWorld();

      if (isHostRef.current) {
        weatherCycleT -= dt;
        if (weatherCycleT <= 0) {
          weatherCycleT = 32 + Math.random() * 25;
          const r = Math.random();
          const nextW: WeatherType = r < 0.45 ? 'clear' : r < 0.78 ? 'rain' : 'snow';
          if (nextW !== weatherStateRef.current) {
            weatherStateRef.current = nextW;
            setWeatherState(nextW);
            broadcastNetMessage({ type: 'weather:state', weather: nextW });
          }
        }
      }

      const curWeather = weatherStateRef.current;
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

      if (curWeather === 'rain') {
        skyCol.lerp(new THREE.Color(0x334155), 0.55);
        sceneFog.density = 0.022;
      } else if (curWeather === 'snow') {
        skyCol.lerp(new THREE.Color(0xcbd5e1), 0.45);
        sceneFog.density = 0.025;
      } else {
        sceneFog.density = 0.011;
      }

      skyBgColor.copy(skyCol);
      skyMat.color.copy(skyCol);
      sceneFog.color.copy(skyCol);
      const stormDim = curWeather === 'clear' ? 1.0 : 0.68;
      ambL.intensity = (0.18 + dayF * 0.52) * stormDim;
      sunL.intensity = dayF * 1.15 * stormDim;
      stMat.opacity = curWeather === 'clear' ? Math.max(0, 1 - dayF * 2.5) : 0;

      const nightBoost = isNightTime(dayTime) ? 2.8 : 1.3;
      for (const tl of torchLights) {
        tl.intensity = nightBoost + Math.sin(nowSec * 9 + tl.position.x) * 0.25;
      }

      if (curWeather === 'rain' || curWeather === 'snow') {
        weatherPoints.visible = true;
        weatherMat.color.setHex(curWeather === 'rain' ? 0x60a5fa : 0xffffff);
        weatherMat.size = curWeather === 'rain' ? 0.18 : 0.28;
        const fallSpeed = curWeather === 'rain' ? 16.5 : 4.2;
        const posAttr = weatherGeo.getAttribute('position') as THREE.BufferAttribute;

        for (let i = 0; i < WEATHER_PARTICLE_COUNT; i++) {
          weatherOffsets[i * 3 + 1] -= fallSpeed * dt;
          if (curWeather === 'snow') {
            weatherOffsets[i * 3] += Math.sin(nowSec * 2 + i) * 0.8 * dt;
          }
          if (weatherOffsets[i * 3 + 1] < -4) {
            weatherOffsets[i * 3 + 1] = 18 + Math.random() * 4;
          }
          posAttr.setXYZ(
            i,
            PL1.pos.x + weatherOffsets[i * 3],
            PL1.pos.y + weatherOffsets[i * 3 + 1],
            PL1.pos.z + weatherOffsets[i * 3 + 2]
          );
        }
        posAttr.needsUpdate = true;

        if (curWeather === 'rain') {
          puddleSpawnT += dt;
          if (puddleSpawnT > 4.5) {
            puddleSpawnT = 0;
            const pud = spawnRainPuddleLogic(world, PL1.pos);
            if (pud.spawned) {
              rebuildMeshes();
            }
          }
        }
      } else {
        weatherPoints.visible = false;
      }

      const despawned = despawnDaytimeMonsters(entities, dayTime);
      for (const d of despawned) {
        const me = d as MeshEntity;
        spawnBlockParticles(me.pos.x, me.pos.y + 1, me.pos.z, 0xffaa22, 8);
        scene.remove(me.mesh);
      }

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

        if (e.type === 'villager') {
          // Si el jugador se acerca a un aldeano perdido, rescatarlo automáticamente o mirar hacia el jugador
          const dV = distance3D(PL1.pos, e.pos);
          if (!e.rescued && dV < 3.6) {
            const rRes = rescueVillagerLogic(e, PL1);
            if (rRes.rescued) {
              playSfx('tame');
              spawnBlockParticles(e.pos.x, e.pos.y + 1.2, e.pos.z, 0x34d399, 14);
              showMsg(`🧭 ¡Rescataste a ${rRes.name}!`);
            }
          }
          const dx = PL1.pos.x - e.pos.x;
          const dz = PL1.pos.z - e.pos.z;
          if (Math.hypot(dx, dz) < 18) {
            e.mesh.rotation.y = Math.atan2(dx, dz);
          }
          continue;
        }

        if (e.type === 'horse' && e.riddenByPlayer && PL1.mountedHorseId === e.id) {
          e.mesh.position.set(PL1.pos.x, PL1.pos.y - 0.55, PL1.pos.z);
          e.mesh.rotation.y = camAnglesRef.current.yaw + Math.PI;
          const speed = Math.hypot(PL1.vel.x, PL1.vel.z);
          e.legs.forEach((l, i) => {
            l.rotation.x = speed > 0.2 ? Math.sin(nowSec * 14 + i * Math.PI) * 0.65 : 0;
          });
          continue;
        }

        if (e.type === 'fish') {
          e.timer -= dt;
          if (e.timer <= 0) {
            e.vel.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 4);
            e.timer = 2 + Math.random() * 3;
          }
          e.pos.addScaledVector(e.vel, dt);
          e.pos.y = Math.min(SEA - 0.4, Math.max(2, e.pos.y));
          if (e.vel.lengthSq() > 0.01) e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
        } else if (e.type === 'cow' || e.type === 'sheep' || e.type === 'chicken' || e.type === 'horse') {
          e.timer -= dt;
          if (e.timer <= 0) {
            if (Math.random() < 0.78) {
              const a = Math.random() * Math.PI * 2;
              const sp = e.type === 'horse' ? 2.6 : e.type === 'chicken' ? 2.2 : 1.7;
              e.vel.set(Math.sin(a) * sp, 0, Math.cos(a) * sp);
            } else {
              e.vel.set(0, 0, 0);
            }
            e.timer = 2 + Math.random() * 3.5;
          }
          stepEntityMovementWithCollision(world, e, dt);
          const h = getH(Math.floor(e.pos.x), Math.floor(e.pos.z));
          if (h <= SEA) {
            e.vel.negate();
          }
          if (Math.hypot(e.vel.x, e.vel.z) > 0.08) {
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
              e.state === 'panic'
                ? 0x38bdf8
                : e.state === 'windup'
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
            e.vel.x = Math.sin(a) * 1.4;
            e.vel.z = Math.cos(a) * 1.4;
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
        } else if (e.type === 'wolf' && !e.tamed) {
          const np = nearestPlayer(e.pos, PL1);
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
          } else {
            e.timer -= dt;
            if (e.timer <= 0) {
              const a = Math.random() * Math.PI * 2;
              e.vel.set(Math.sin(a) * 2.0, 0, Math.cos(a) * 2.0);
              e.timer = 2 + Math.random() * 3;
            }
          }
          stepEntityMovementWithCollision(world, e, dt);
          if (Math.hypot(e.vel.x, e.vel.z) > 0.05) {
            e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
            e.legs.forEach((l, i) => {
              l.rotation.x = Math.sin(nowSec * 10 + i * Math.PI) * 0.5;
            });
          }
        } else if (e.type === 'wolf_t' || e.tamed) {
          const wolfRes = stepTamedWolfAILogic(
            world,
            e,
            PL1,
            entities,
            dt,
            camAnglesRef.current.yaw
          );

          if (wolfRes.teleported) {
            spawnBlockParticles(e.pos.x, e.pos.y + 0.5, e.pos.z, 0x22d3ee, 10);
          }
          if (wolfRes.attackedEnemy) {
            playSfx('hit');
            spawnBlockParticles(
              wolfRes.attackedEnemy.pos.x,
              wolfRes.attackedEnemy.pos.y + 1,
              wolfRes.attackedEnemy.pos.z,
              0xffaa00,
              8
            );
            if (wolfRes.enemyDefeated) {
              showMsg(`🐕 ¡${e.wname || 'Tu lobo'} eliminó a un monstruo!`);
            }
          }

          if (Math.hypot(e.vel.x, e.vel.z) > 0.05) {
            e.mesh.rotation.y = Math.atan2(e.vel.x, e.vel.z);
            e.legs.forEach((l, i) => {
              l.rotation.x = Math.sin(nowSec * 12 + i * Math.PI) * 0.55;
            });
          } else {
            const dx = PL1.pos.x - e.pos.x;
            const dz = PL1.pos.z - e.pos.z;
            if (Math.hypot(dx, dz) > 0.2) {
              e.mesh.rotation.y = Math.atan2(dx, dz);
            }
            e.legs.forEach((l) => {
              l.rotation.x = 0;
            });
          }
        }
      }
    }

    let panoramaAngle = 0.6;
    let buildTimerSecAccum = 0;
    let disposed = false;
    let timerId = 0;
    let renderedFrames = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            timerId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          }
        };
        timerId = window.setTimeout(poll, 5);
      } else {
        timerId = window.setTimeout(cb, 80);
      }
    }

    function loop() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;

      // Requisito 5: El anfitrión alterna entre Luz Verde y Luz Roja y lo envía por PeerJS a toda la sala
      if (isHostRef.current && challengeStateRef.current !== 'off') {
        challengeSwitchT -= dt;
        if (challengeSwitchT <= 0) {
          const nextState = challengeStateRef.current === 'green' ? 'red' : 'green';
          challengeStateRef.current = nextState;
          setChallengeState(nextState);
          challengeSwitchT = nextState === 'green' ? 3.5 + Math.random() * 1.5 : 2.6 + Math.random() * 1.0;
          if (nextState === 'green') playSfx('greenlight');
          else playSfx('redlight');
          broadcastNetMessage({
            type: 'challenge:state',
            state: nextState,
          });
        }
      }

      // Rotación de la muñeca en la arena de Luz Roja
      if (redLightDollGroup.visible) {
        const targetDollYaw = challengeStateRef.current === 'red' ? 0 : Math.PI;
        redLightDollGroup.rotation.y += (targetDollYaw - redLightDollGroup.rotation.y) * Math.min(1, dt * 10);
      }

      // Requisito 3: Temporizador de 6 Minutos y Bot IA Constructor en "Batalla de Construcción"
      if (gameModeRef.current === 'build_battle' && !buildBattleVotingPhaseRef.current) {
        buildTimerSecAccum += dt;
        if (buildTimerSecAccum >= 1.0) {
          buildTimerSecAccum -= 1.0;
          const nextSec = Math.max(0, buildBattleTimeLeftRef.current - 1);
          buildBattleTimeLeftRef.current = nextSec;
          setBuildBattleTimeLeft(nextSec);
          if (nextSec <= 0) {
            triggerBuildBattleTimeUp();
          }
        }

        // Si se juega contra la IA, el Bot construye su casa paso a paso en la otra mitad (x > 0)
        if (buildBattleOpponentRef.current === 'ai' && aiBuildProgressIdx < aiHouseBlueprint.length) {
          aiBuildStepTimer += dt;
          if (aiBuildStepTimer >= 0.42) {
            aiBuildStepTimer = 0;
            const step = aiHouseBlueprint[aiBuildProgressIdx];
            aiBuildProgressIdx++;
            if (step) {
              sB(world, step.x, step.y, step.z, step.blockType);
              aiBotVisual.group.position.set(step.x - 1.1, BUILD_BATTLE_FLOOR_Y + 1.05, step.z);
              aiBotVisual.group.rotation.y = Math.atan2(1, 0);
              aiBotVisual.arms.forEach((a, idx) => {
                a.rotation.x = Math.sin(now * 0.015 + idx) * 0.9;
              });
              rebuildMeshes();
            }
          }
        }
      }

      const activeControls =
        (pointerLocked || touchDetected || isPlayingRef.current) &&
        !wolfModalOpenLocal &&
        !inventoryOpenLocal &&
        !quickCraftOpenLocal &&
        !craftingTableOpenLocal &&
        !chatOpenLocal;

      const isFreeFlight =
        gameModeRef.current === 'build_battle' && buildBattleVotingPhaseRef.current;

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
        flying: isFreeFlight,
        descendHeld: activeControls && !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyZ']),
      };

      // Muerte estricta si mantiene teclas presionadas o mueve el joystick durante Luz Roja
      if (challengeStateRef.current === 'red' && PL1.hp > 0) {
        const stepCheck = checkRedLightViolationLogic('red', PL1, { inputStep: playerInput });
        if (stepCheck.violated) {
          triggerStrictRedLightElimination();
        }
      }

      if (PL1.hp > 0) {
        const activeBoat = PL1.inBoat ? boats.find((b) => b.id === PL1.activeBoatId) || null : null;
        const mountedHorse =
          PL1.mountedHorseId !== null
            ? entities.find((e) => e.id === PL1.mountedHorseId && e.alive) || null
            : null;

        const phys = stepPlayerPhysics(world, PL1, playerInput, dt, activeBoat, mountedHorse);

        // Si el jugador llega a la línea de meta en Luz Roja (z <= -18)
        if (gameModeRef.current === 'red_light' && PL1.pos.z <= -17.5 && challengeStateRef.current !== 'off') {
          challengeStateRef.current = 'off';
          setChallengeState('off');
          playSfx('tame');
          showMsg('🏆 ¡CRUZASTE LA META EN LUZ ROJA, LUZ VERDE! ¡VICTORIA!');
        }

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

      const curCX = Math.floor(PL1.pos.x / CHUNK_SIZE);
      const curCZ = Math.floor(PL1.pos.z / CHUNK_SIZE);
      if (curCX !== activeCenterCX || curCZ !== activeCenterCZ) {
        activeCenterCX = curCX;
        activeCenterCZ = curCZ;
        ensureChunksAroundPlayer(world, PL1.pos.x, PL1.pos.z, VIEW_CHUNK_RADIUS);
        rebuildMeshes();
      }

      // Actualizar lectura de la Brújula HUD minimalista hacia los aldeanos perdidos
      compassSyncT += dt;
      if (compassSyncT >= 0.12) {
        compassSyncT = 0;
        setCompassState(
          getNearestLostVillagerCompass(PL1.pos, camAnglesRef.current.yaw, entities)
        );
      }

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

      // Requisito 1: Si está en el Menú Principal, fondo panorámico 3D que gira lentamente
      if (!isPlayingRef.current) {
        panoramaAngle += dt * 0.16;
        const panoRadius = 18;
        cam1.position.set(
          PL1.pos.x + Math.cos(panoramaAngle) * panoRadius,
          PL1.pos.y + 8.5,
          PL1.pos.z + Math.sin(panoramaAngle) * panoRadius
        );
        cam1.lookAt(PL1.pos.x, PL1.pos.y + 1.5, PL1.pos.z);
        cam1.updateMatrixWorld();
      } else {
        cam1.position.set(PL1.pos.x, PL1.pos.y + PL1.eyeH, PL1.pos.z);
        cam1.rotation.order = 'YXZ';
        cam1.rotation.y = camAnglesRef.current.yaw;
        cam1.rotation.x = camAnglesRef.current.pitch;
        cam1.rotation.z = 0;
        cam1.updateMatrixWorld();
      }

      projScreenMatrix.multiplyMatrices(cam1.projectionMatrix, cam1.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);
      for (const im of Object.values(iMeshes)) {
        if (im.boundingSphere) {
          im.visible = frustum.intersectsSphere(im.boundingSphere);
        }
      }

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

      updateWeatherAndDayNight(dt, now / 1000);
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

      try {
        if (webglRenderer) {
          renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
          if (composer) {
            (composer as EffectComposer).render();
          } else {
            webglRenderer.render(scene, cam1);
          }
        } else if (fallbackCtx3D) {
          const entityGroups: THREE.Object3D[] = [];
          for (const ent of entities) {
            if (ent.alive) entityGroups.push(ent.mesh);
          }
          for (const rp of remotePlayers.values()) {
            entityGroups.push(rp.group);
          }
          renderTrue3DScene({
            ctx: fallbackCtx3D,
            width: activeCanvas.width,
            height: activeCanvas.height,
            camera: cam1,
            world,
            bmat: BMAT,
            skyColor: skyMat.color,
            sunPos: sunMesh.position,
            moonPos: moonMesh.position,
            dayTime,
            selBox,
            entityGroups,
            torchLights,
          });
        }
      } catch (renderErr) {
        reportFatalEngineError(renderErr);
      }
      renderedFrames++;
      if (container) container.dataset.frames = String(renderedFrames);

      if (webglRenderer && isSoftwareGl) {
        afterDraw(() => {
          if (!disposed) animFrameId = requestAnimationFrame(loop);
        });
      } else {
        animFrameId = requestAnimationFrame(loop);
      }
    }

    animFrameId = requestAnimationFrame(loop);

    const onResize = () => {
      const safeW = Math.max(window.innerWidth || 1280, 320);
      const safeH = Math.max(window.innerHeight || 720, 240);
      renderer.setSize(safeW, safeH);
      if (composer) (composer as EffectComposer).setSize(safeW, safeH);
      cam1.aspect = safeW / safeH;
      cam1.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    cleanupEngine = () => {
      disposed = true;
      cancelAnimationFrame(animFrameId);
      clearTimeout(timerId);
      clearTimeout(redLightRespawnTimeout);
      if (peerInstance) peerInstance.destroy();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      if (composer) (composer as EffectComposer).dispose();
      renderer.dispose();
    };
      } catch (initErr) {
        reportFatalEngineError(initErr);
      }
    };

    // REQUISITO 4: Esperar a que la ventana y el DOM estén completamente listos (window.onload / readyState === 'complete')
    if (document.readyState === 'complete') {
      startEngineWhenDomReady();
    } else {
      loadHandler = () => {
        startEngineWhenDomReady();
      };
      window.addEventListener('load', loadHandler, { once: true });
    }

    return () => {
      if (loadHandler) {
        window.removeEventListener('load', loadHandler);
      }
      if (cleanupEngine) {
        cleanupEngine();
      }
    };
  }, []);

  const handleStartSingleOrResume = () => {
    actionsRef.current?.unlockAudio();
    isPlayingRef.current = true;
    setIsPlaying(true);
    setHasStartedOnce(true);
    try {
      const canvas = mountRef.current?.querySelector('canvas');
      if (canvas && canvas.requestPointerLock && !isTouchDevice) {
        const res = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        res?.catch?.(() => {});
      }
    } catch {
      // Ignorar si el iframe bloquea PointerLock en el primer clic
    }
  };

  const handlePlaySingleplayerSurvival = () => {
    actionsRef.current?.unlockAudio();
    actionsRef.current?.selectGameMode('survival');
    handleStartSingleOrResume();
  };

  const handleCreateRoomClick = () => {
    actionsRef.current?.unlockAudio();
    actionsRef.current?.createRoom();
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actionsRef.current?.unlockAudio();
    actionsRef.current?.joinRoom(joinCodeInput);
    handleStartSingleOrResume();
  };

  const handleSelectModeAndStart = (mode: GameModeType, opp?: BuildBattleOpponent) => {
    actionsRef.current?.unlockAudio();
    actionsRef.current?.selectGameMode(mode, opp);
    handleStartSingleOrResume();
  };

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
  const tableCount = pl ? countItemInInventory(pl, BT.TABLE) : 0;
  const stickCount = pl ? countItemInInventory(pl, BT.STICK) : 0;
  const stoneCount = pl ? countItemInInventory(pl, BT.STONE) : 0;
  const woolCount = pl ? countItemInInventory(pl, BT.WOOL) : 0;
  const currentClothes =
    CLOTHES_PALETTE[(pl?.clothesIdx ?? 0) % CLOTHES_PALETTE.length] || CLOTHES_PALETTE[0];

  const weatherBadge =
    weatherState === 'rain'
      ? '🌧️ Lluvia (Charcos)'
      : weatherState === 'snow'
        ? '🌨️ Nieve'
        : '☀️ Despejado';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Three.js Fullscreen Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* REQUISITO 3: Div con z-index alto para imprimir cualquier error fatal exacto (error.message) */}
      {fatalEngineError && (
        <div
          id="fatalErrorOverlayReact"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] max-w-[92vw] w-[680px] p-4 rounded-2xl bg-slate-950/95 border-2 border-rose-500 text-rose-100 font-mono shadow-2xl"
        >
          <div className="text-sm font-extrabold text-rose-400 mb-1">
            ⚠️ Error detectado en motor 3D:
          </div>
          <div className="text-xs break-words">{fatalEngineError}</div>
        </div>
      )}

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

      {/* Mensajes de Chat Flotantes sobre la cabeza del personaje (5 segundos) */}
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
                  bg-slate-950/85
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

      {/* Texto Gigante en Pantalla para Desafío "Luz Roja, Luz Verde" */}
      {challengeState !== 'off' && (
        <div
          id="redGreenBanner"
          className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2"
        >
          <div
            className={`
              px-8 py-3 rounded-3xl border-2 font-black tracking-wider uppercase
              text-2xl sm:text-4xl shadow-2xl transition-all duration-150
              ${
                challengeState === 'green'
                  ? 'bg-emerald-950/85 border-emerald-400 text-emerald-300 shadow-[0_0_45px_rgba(16,185,129,0.75)]'
                  : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_55px_rgba(244,63,94,0.85)] animate-pulse'
              }
            `}
          >
            {challengeState === 'green'
              ? '🟢 ¡LUZ VERDE! — ¡PUEDES MOVERTE!'
              : '🔴 ¡LUZ ROJA! — ¡QUIETO (NI TECLADO NI MOUSE)!'}
          </div>
        </div>
      )}

      {/* REQUISITO 2: Mensaje Gigante "¡TE MOVISTE!" cuando el jugador muere en Luz Roja */}
      {movedDeathBanner && (
        <div
          id="movedAlertBanner"
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-rose-950/50"
        >
          <div className="px-10 py-6 rounded-3xl bg-slate-950/95 border-4 border-rose-500 shadow-[0_0_80px_rgba(244,63,94,0.95)] text-center">
            <div className="text-4xl sm:text-6xl font-black tracking-widest text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">
              {movedDeathBanner}
            </div>
            <div className="text-sm font-mono text-rose-200 mt-2">
              HP: 0/20 — Eliminado en Luz Roja. Reapareciendo en el Spawn...
            </div>
          </div>
        </div>
      )}

      {/* REQUISITO 3: Temporizador Gigante de 6 Minutos y Panel de Votación para "Batalla de Construcción" */}
      {gameMode === 'build_battle' && (
        <div
          id="buildBattleTimerBanner"
          className="pointer-events-auto fixed top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2"
        >
          <div className="px-7 py-2.5 rounded-2xl bg-slate-950/90 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.45)] flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                🏰 Batalla de Construcción ({buildBattleOpponent === 'ai' ? 'vs 🤖 Bot IA' : 'vs 👥 Amigos'})
              </span>
              <span
                id="buildBattleTimerText"
                className="text-3xl sm:text-5xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              >
                {formatBuildBattleTimer(buildBattleTimeLeft)}
              </span>
            </div>

            {isHost && !buildBattleVotingPhase && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <button
                    id="btnBattleVsAI"
                    type="button"
                    onClick={() => actionsRef.current?.selectGameMode('build_battle', 'ai')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer border ${
                      buildBattleOpponent === 'ai'
                        ? 'bg-amber-400 text-slate-950 border-amber-200'
                        : 'bg-slate-800 text-slate-300 border-white/15'
                    }`}
                  >
                    🤖 Contra IA
                  </button>
                  <button
                    id="btnBattleVsFriends"
                    type="button"
                    onClick={() => actionsRef.current?.selectGameMode('build_battle', 'friends')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer border ${
                      buildBattleOpponent === 'friends'
                        ? 'bg-cyan-400 text-slate-950 border-cyan-200'
                        : 'bg-slate-800 text-slate-300 border-white/15'
                    }`}
                  >
                    👥 Contra Amigos
                  </button>
                </div>
                <button
                  id="btnFinishBuildBattleTimer"
                  type="button"
                  onClick={() => actionsRef.current?.finishBuildBattleTimerNow()}
                  className="px-2.5 py-1 rounded bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400/60 text-[10px] font-bold text-rose-200 cursor-pointer"
                >
                  ⏩ Terminar (00:00 Vuelo/Votar)
                </button>
              </div>
            )}
          </div>

          {buildBattleVotingPhase && (
            <div
              id="buildBattleVotePanel"
              className="px-6 py-4 rounded-2xl bg-slate-950/95 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)] text-center text-white flex flex-col items-center gap-2"
            >
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                🕊️ ¡Vuelo Libre Activo (Espacio subir / Shift bajar)! Vota por la mejor construcción:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btnVotePlayer1"
                  type="button"
                  onClick={() => actionsRef.current?.voteBuildBattle('player1')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  ⭐ Votar Mi Construcción ({buildBattleVotes.player1})
                </button>
                <button
                  id="btnVoteOpponent"
                  type="button"
                  onClick={() => actionsRef.current?.voteBuildBattle('opponent')}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer"
                >
                  ⭐ Votar {buildBattleOpponent === 'ai' ? 'Casa del Bot IA' : 'Construcción Amigo'} ({buildBattleVotes.opponent})
                </button>
              </div>
              {buildBattleVotes.winner && (
                <div id="buildBattleWinnerText" className="text-sm font-extrabold text-yellow-300 mt-1">
                  {buildBattleVotes.winner}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Center Crosshair */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-10">
        <div className="relative w-5 h-5 flex items-center justify-center">
          <span className="absolute w-4 h-[2px] bg-cyan-300/90 shadow-[0_0_8px_#22d3ee]" />
          <span className="absolute h-4 w-[2px] bg-cyan-300/90 shadow-[0_0_8px_#22d3ee]" />
        </div>
      </div>

      {/* Requisito 1: Top HUD Bar Limpio y Responsivo
          - En PC ningún panel tapa el centro de la visión (solo esquinas superiores).
          - Botones de selección de modo ocultos durante la partida (solo en el Lobby).
          - Brújula de rescate y panel de estadísticas avanzadas ocultos por defecto (solo visibles al mantener presionada la tecla TAB). */}
      <div
        id="topHudBar"
        className="fixed top-3 inset-x-3 flex items-start justify-between gap-2 z-20 pointer-events-none"
      >
        {/* Esquina Superior Izquierda: Corazones Esenciales + Paneles Ocultables con [TAB] */}
        <div className="flex flex-col gap-1.5 pointer-events-auto max-w-[46vw]">
          {/* Barra compacta siempre visible: Vida + Acciones Rápidas */}
          <div
            id="hudEssentialLeft"
            className="
              inf flex flex-col gap-1 px-3 py-2 rounded-2xl
              bg-[rgba(10,10,15,0.62)]
              border border-emerald-400/25
              text-xs text-slate-200
            "
          >
            <div className="flex items-center justify-between gap-2">
              <div id="hp1" className="hpbar flex items-center gap-0.5" />
              <span className="text-[10px] font-mono text-emerald-300/90 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30">
                [TAB] Info
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
              <button
                id="btnChangeClothes"
                type="button"
                onClick={() => actionsRef.current?.changeClothes()}
                className="
                  px-2 py-0.5 rounded-lg bg-purple-500/25 hover:bg-purple-500/40
                  border border-purple-400/50 text-purple-200 font-semibold transition cursor-pointer
                  flex items-center gap-1
                "
              >
                <span
                  className="w-2 h-2 rounded-full border border-white/60 inline-block"
                  style={{ backgroundColor: currentClothes.css }}
                />
                👕 Ropa
              </button>

              <button
                id="btnOpenChat"
                type="button"
                onClick={() => {
                  setIsChatOpen(true);
                  if (document.pointerLockElement) document.exitPointerLock();
                }}
                className="
                  px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35
                  border border-cyan-400/50 text-cyan-200 font-semibold transition cursor-pointer
                "
              >
                💬 Chat [T]
              </button>

              <button
                id="btnOpenQuickCraftHud"
                type="button"
                onClick={() => actionsRef.current?.toggleQuickCraftModal()}
                className="
                  px-2.5 py-0.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40
                  border border-emerald-400/60 text-emerald-200 font-bold
                  transition cursor-pointer
                "
              >
                ⚡ Crafteo [X]
              </button>
            </div>
          </div>

          {/* PANEL OCULTABLE 1 (Solo visible mientras se mantiene presionada la tecla TAB): Brújula de Rescate */}
          <div
            id="villagerCompassHud"
            style={{ display: isTabHeld ? 'flex' : 'none' }}
            className="
              items-center gap-2.5 px-3 py-2 rounded-2xl
              bg-[rgba(10,12,18,0.82)]
              border border-amber-400/40
              shadow-[0_0_20px_rgba(251,191,36,0.2)]
              text-xs text-slate-100
            "
          >
            <div className="relative w-7 h-7 rounded-full bg-slate-900/90 border border-amber-400/50 flex items-center justify-center shrink-0">
              <div
                id="compassNeedle"
                style={{ transform: `rotate(${compassState.relativeAngleDeg}deg)` }}
                className="transition-transform duration-150 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L16 14H8L12 2Z" fill="#fbbf24" />
                  <path d="M12 22L8 14H16L12 22Z" fill="#64748b" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                  🧭 Brújula de Rescate
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[10px] font-mono text-amber-200">
                  {compassState.rescuedCount}/{compassState.totalCount}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-300">
                {compassState.allRescued
                  ? '✅ ¡Todos los aldeanos rescatados!'
                  : `${compassState.targetName}: ${compassState.distance}m (${compassState.cardinal})`}
              </div>
            </div>
          </div>

          {/* PANEL OCULTABLE 2 (Solo visible mientras se mantiene presionada la tecla TAB): Estadísticas Avanzadas */}
          <div
            id="advancedStatsPanel"
            style={{ display: isTabHeld ? 'flex' : 'none' }}
            className="
              inf flex-col gap-1 px-3.5 py-2 rounded-2xl
              bg-[rgba(10,12,18,0.82)]
              border border-cyan-400/35
              shadow-[0_0_20px_rgba(34,211,238,0.18)]
              text-xs text-slate-200
            "
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold uppercase text-emerald-400">
                {gameMode === 'build_battle'
                  ? '🏰 Batalla Construcción'
                  : gameMode === 'red_light'
                    ? '🚦 Luz Roja'
                    : '⚔️ Supervivencia'}
              </span>
              <span className="text-slate-500">|</span>
              <span id="pos1" className="font-mono text-cyan-300">
                0, 10, 0
              </span>
              <span className="text-slate-500">|</span>
              <span id="bones1" className="font-mono text-amber-300">
                🦴 3
              </span>
            </div>
            <div className="font-mono text-emerald-300 text-[11px]">
              🪵 Madera: <span id="woodCountHud">{woodCount}</span> · 📦 Tablones:{' '}
              <span id="plankCountHud">{plankCount}</span> · 🧶 Lana:{' '}
              <span id="woolCountHud">{woolCount}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {roomCode
                ? `🌐 Sala Activa: ${roomCode} (${peerCount} jug.)`
                : '💡 Clic Der en 🪑 Mesa abre Catálogo · Antorchas repelen arañas (5m)'}
            </div>
          </div>
        </div>

        {/* Esquina Superior Derecha: Clima, Ciclo Solar y Guardado (sin tapar el centro de la visión) */}
        <div
          id="hudWeatherPanel"
          className="
            inf pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl
            bg-[rgba(10,10,15,0.62)]
            border border-cyan-400/30
            text-xs text-slate-200
          "
        >
          <span
            id="dn"
            className="text-xs font-semibold tracking-wide text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          >
            ☀️ Día
          </span>
          <button
            id="btnCycleWeather"
            type="button"
            onClick={() => actionsRef.current?.cycleWeather()}
            className="px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-[11px] font-semibold text-sky-200 cursor-pointer"
          >
            {weatherBadge}
          </button>

          {isHost && challengeState !== 'off' && (
            <button
              id="btnForceRedLight"
              type="button"
              onClick={() =>
                actionsRef.current?.setRedGreenPhaseExplicit(
                  challengeState === 'red' ? 'green' : 'red'
                )
              }
              className="px-2 py-0.5 rounded-md bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/60 text-[11px] font-bold text-amber-200 cursor-pointer"
            >
              {challengeState === 'red' ? '🟢 Verde' : '🔴 Roja'}
            </button>
          )}

          <button
            id="btnHudSave"
            type="button"
            onClick={() => actionsRef.current?.saveGame()}
            className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-[11px] text-emerald-200 font-semibold cursor-pointer"
          >
            💾 Guardar
          </button>
        </div>
      </div>

      {/* Floating Notification Toast */}
      <div
        id="msg"
        className="
          pointer-events-none fixed top-36 left-1/2 -translate-x-1/2 z-20
          px-5 py-2 rounded-xl
          bg-[rgba(10,10,15,0.85)]
          border border-emerald-400/40
          text-sm font-bold text-emerald-300
          shadow-[0_0_24px_rgba(16,185,129,0.3)]
          opacity-0 transition-opacity duration-300
        "
      />

      {/* Input de Chat en Vivo al presionar la tecla T */}
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
              bg-slate-950/90 border border-cyan-400/50
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
              bg-slate-950/60 border-2 border-cyan-400/40
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
                🧱/🪑
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
                  actionsRef.current?.toggleQuickCraftModal();
                }}
                className="w-14 h-14 rounded-2xl bg-amber-500/80 border border-amber-300 text-slate-950 font-extrabold text-xs shadow-lg active:scale-95"
              >
                ⚡ [X]
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Centered Hotbar */}
      <div
        id="bottomHotbarWrap"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-auto"
      >
        <div
          id="activeBlockLabel"
          className="
            px-3.5 py-1 rounded-full
            bg-[rgba(10,10,15,0.75)]
            border border-white/10
            text-[11px] font-medium text-cyan-200 tracking-wide
          "
        >
          🤲 Mano vacía — Presiona [X] para Crafteo Rápido o rompe bloques (Clic Izq)
        </div>
        <div
          id="hb1"
          className="
            hb flex items-center gap-1.5 p-2 rounded-2xl
            bg-[rgba(10,10,15,0.65)]
            border border-emerald-400/25
            shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_20px_rgba(16,185,129,0.15)]
          "
        />
      </div>

      {/* MENÚ DE CRAFTEO RÁPIDO (TECLA X) — SOLO MADERA -> TABLONES Y TABLONES -> MESA DE CRAFTEO */}
      {isQuickCraftOpen && pl && (
        <div
          id="quickCraftModal"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <div
            className="
              w-full max-w-md p-6 rounded-3xl
              bg-[rgba(10,12,20,0.92)]
              border border-emerald-400/45
              shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_36px_rgba(16,185,129,0.22)]
              text-white
            "
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                  ⚡ Crafteo Rápido de Mano [Tecla X]
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Carpintería Básica
                </h2>
              </div>
              <button
                id="btnCloseQuickCraft"
                type="button"
                onClick={() => actionsRef.current?.toggleQuickCraftModal()}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cerrar [X]
              </button>
            </div>

            <div className="flex items-center justify-around p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs mb-4">
              <span className="font-mono text-amber-300">🪵 Madera: {woodCount}</span>
              <span className="font-mono text-emerald-300">📦 Tablones: {plankCount}</span>
              <span className="font-mono text-cyan-300">🪑 Mesas: {tableCount}</span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-400/35 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    1. Madera ➔ Tablones
                  </div>
                  <div className="text-xs text-slate-400">
                    1 🪵 Madera ➔ 4 📦 Tablones
                  </div>
                </div>
                <button
                  id="quickRecipeWoodToPlanks"
                  type="button"
                  onClick={() => actionsRef.current?.craftPlanks()}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Crear Tablones
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-400/35 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-amber-300">
                    2. Tablones ➔ Mesa de Crafteo
                  </div>
                  <div className="text-xs text-slate-400">
                    4 📦 Tablones ➔ 1 🪑 Mesa de Crafteo
                  </div>
                </div>
                <button
                  id="quickRecipePlanksToTable"
                  type="button"
                  onClick={() => actionsRef.current?.craftTable()}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Crear Mesa
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 text-xs text-cyan-200 space-y-2">
              <p className="leading-relaxed">
                💡 <strong>Para construir recetas complejas</strong> (Picos, Espadas PvP, Botes, Camas, Puertas Dobles, Cofres y Antorchas), <strong>coloca la 🪑 Mesa de Crafteo en el piso</strong> y haz <strong>Clic Derecho</strong> sobre ella.
              </p>
              {tableCount > 0 && (
                <button
                  id="btnPlaceAndOpenTable"
                  type="button"
                  onClick={() => actionsRef.current?.placeCraftingTableInFront()}
                  className="w-full py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  🪑 Colocar Mesa en el piso frente a mí y Abrirla
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VENTANA DE MESA DE CRAFTEO AVANZADA (AL HACER CLIC DERECHO SOBRE LA MESA COLOCADA) */}
      {isCraftingTableOpen && pl && (
        <div
          id="craftingTableModal"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <div
            className="
              w-full max-w-3xl p-6 rounded-3xl
              bg-[rgba(12,14,22,0.92)]
              border border-amber-400/45
              shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_40px_rgba(245,158,11,0.22)]
              text-white max-h-[90vh] overflow-y-auto
            "
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">
                  🪑 Mesa de Crafteo Colocada — Catálogo Extenso
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Picos, Espadas PvP, Botes, Camas, Puertas Dobles, Cofres y Antorchas
                </h2>
              </div>
              <button
                id="btnCloseCraftingTable"
                type="button"
                onClick={() => actionsRef.current?.closeCraftingTableModal()}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cerrar [E]
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mb-4 p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs">
              <span className="text-slate-400 font-semibold">Recursos:</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-900/75 border border-emerald-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-emerald-300">📦 Tablones</div>
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

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-amber-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-amber-300">🥢 Palos</div>
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

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-cyan-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-cyan-300">⛏️ Pico de Madera (x2)</div>
                  <div className="text-xs text-slate-400">3 📦 Tablones + 2 🥢 Palos</div>
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

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-indigo-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-indigo-300">⚒️ Pico de Piedra (x3)</div>
                  <div className="text-xs text-slate-400">3 🪨 Piedras + 2 🥢 Palos</div>
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

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-orange-400/35 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-orange-300">🗡️ Espada de Madera (PvP)</div>
                  <div className="text-xs text-slate-400">2 📦 Tablones + 1 🥢 Palo (2 ❤️ PvP)</div>
                </div>
                <button
                  id="recipeWoodSword"
                  type="button"
                  onClick={() => actionsRef.current?.craftWoodSword()}
                  className="px-3.5 py-2 rounded-xl bg-orange-400 hover:bg-orange-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-rose-500/40 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-rose-300">⚔️ Espada de Piedra (PvP)</div>
                  <div className="text-xs text-slate-400">2 🪨 Piedras + 1 🥢 Palo (3 ❤️ PvP)</div>
                </div>
                <button
                  id="recipeStoneSword"
                  type="button"
                  onClick={() => actionsRef.current?.craftStoneSword()}
                  className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-sky-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-sky-300">⛵ Bote de Navegación</div>
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

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-pink-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-pink-300">🛏️ Cama</div>
                  <div className="text-xs text-slate-400">3 🧶 Lanas + 3 📦 Tablones</div>
                </div>
                <button
                  id="recipeBed"
                  type="button"
                  onClick={() => actionsRef.current?.craftBed()}
                  className="px-3.5 py-2 rounded-xl bg-pink-400 hover:bg-pink-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-amber-300/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-amber-200">🚪 Puerta Doble (2 Bloques)</div>
                  <div className="text-xs text-slate-400">2 📦 Tablones ➔ 1 🚪 Puerta</div>
                </div>
                <button
                  id="recipeDoor"
                  type="button"
                  onClick={() => actionsRef.current?.craftDoor()}
                  className="px-3.5 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-yellow-400/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-yellow-300">🧰 Cofre de Madera</div>
                  <div className="text-xs text-slate-400">4 📦 Tablones ➔ 1 🧰 Cofre</div>
                </div>
                <button
                  id="recipeChest"
                  type="button"
                  onClick={() => actionsRef.current?.craftChest()}
                  className="px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Craftear
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/75 border border-amber-400/50 flex items-center justify-between gap-2 sm:col-span-2">
                <div>
                  <div className="text-sm font-bold text-amber-300">
                    🕯️ Antorchas (Luz PointLight + Repelente de Arañas)
                  </div>
                  <div className="text-xs text-slate-400">
                    1 🥢 Palo + 1 📦 Tablón ➔ 4 🕯️ Antorchas (Ahuyenta arañas en radio de 5 bloques)
                  </div>
                </div>
                <button
                  id="recipeTorches"
                  type="button"
                  onClick={() => actionsRef.current?.craftTorches()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
                >
                  Craftear +4 🕯️
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
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div
            className="
              w-full max-w-xl p-6 rounded-3xl
              bg-[rgba(12,14,22,0.9)]
              border border-emerald-400/35
              shadow-[0_24px_64px_rgba(0,0,0,0.85)]
              text-white
            "
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                  Almacenamiento Personal
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
                    setIsQuickCraftOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-xs font-semibold text-emerald-200 cursor-pointer"
                >
                  ⚡ Crafteo Rápido [X]
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
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70">
          <div
            className="
              w-full max-w-sm p-6 rounded-3xl
              bg-[rgba(12,14,22,0.9)]
              border border-amber-400/40
              shadow-[0_20px_50px_rgba(0,0,0,0.8)]
              text-center text-white
            "
          >
            <div className="text-3xl mb-2">🐕</div>
            <h2 className="text-lg font-bold text-amber-300 mb-1">¡Domesticar Lobo Guardián!</h2>
            <p className="text-xs text-slate-300 mb-4">
              Seguirá activamente tu posición exacta y se teletransportará detrás de ti si te alejas a más de 15 bloques.
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

      {/* REQUISITO 1 y 2: Menú Principal Limpio (Estilo Minecraft) con Panorámica 3D y Submenú Multijugador */}
      {!isPlaying &&
        !wolfModal.open &&
        !isInventoryOpen &&
        !isQuickCraftOpen &&
        !isCraftingTableOpen &&
        !isChatOpen && (
          <div
            id="ov"
            className="fixed inset-0 z-30 flex flex-col items-center justify-between py-12 px-4 bg-black/35"
          >
            {/* Título Gigante de "VoxelWorld" arriba al centro estilo Minecraft */}
            <div className="flex flex-col items-center mt-2 select-none">
              <div className="relative">
                <h1
                  id="mcTitle"
                  style={{
                    textShadow:
                      '0 4px 0 #1e293b, 0 8px 0 #0f172a, 0 12px 24px rgba(0,0,0,0.9)',
                  }}
                  className="text-5xl sm:text-7xl font-black tracking-widest uppercase text-stone-100 font-mono"
                >
                  VoxelWorld
                </h1>
                <span className="absolute -bottom-3 -right-6 sm:-right-12 -rotate-12 text-xs sm:text-sm font-extrabold text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] animate-pulse">
                  ¡16x16 Edition!
                </span>
              </div>
              <p className="mt-4 text-xs font-mono uppercase tracking-widest text-stone-300 drop-shadow">
                {menuView === 'main'
                  ? 'Edición Clásica 16x16 · Supervivencia y Desafíos Online'
                  : 'Sala Multijugador P2P · Selección de Modo'}
              </p>
            </div>

            {/* Columna Central con Botones Anchos de Color Gris/Oscuro (Estilo Minecraft) */}
            {menuView === 'main' ? (
              <div className="w-full max-w-md flex flex-col items-center gap-3.5 my-auto">
                {pwaInstallBannerMsg && (
                  <div className="w-full p-2.5 bg-[#262626]/95 border-2 border-stone-500 text-xs text-amber-200 text-center font-mono">
                    {pwaInstallBannerMsg}
                  </div>
                )}

                <button
                  id="btnSingleplayer"
                  type="button"
                  onClick={handlePlaySingleplayerSurvival}
                  className="
                    w-full py-3.5 px-6
                    bg-[#4a4a4a] hover:bg-[#5e5e66] active:bg-[#383838]
                    border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f]
                    text-white font-mono font-bold text-base tracking-wide
                    shadow-[0_6px_0_#141414] cursor-pointer transition
                  "
                >
                  Un Jugador (Solitario)
                </button>

                <button
                  id="btnMultiplayerMenu"
                  type="button"
                  onClick={() => {
                    actionsRef.current?.unlockAudio();
                    setMenuView('mp_lobby');
                  }}
                  className="
                    w-full py-3.5 px-6
                    bg-[#4a4a4a] hover:bg-[#5e5e66] active:bg-[#383838]
                    border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f]
                    text-white font-mono font-bold text-base tracking-wide
                    shadow-[0_6px_0_#141414] cursor-pointer transition
                  "
                >
                  Multijugador (Desafíos con Amigos)
                </button>

                <button
                  id="btnInstallPWA"
                  type="button"
                  onClick={handleInstallPWAClick}
                  className="
                    w-full py-3.5 px-6
                    bg-[#3d3d3d] hover:bg-[#52525b] active:bg-[#2e2e2e]
                    border-2 border-t-[#787878] border-l-[#787878] border-r-[#1a1a1a] border-b-[#1a1a1a]
                    text-amber-300 font-mono font-bold text-base tracking-wide
                    shadow-[0_6px_0_#141414] cursor-pointer transition
                  "
                >
                  Instalar Juego (PWA)
                </button>

                {hasStartedOnce && (
                  <div className="w-full grid grid-cols-2 gap-3 pt-2">
                    <button
                      id="btnSaveGame"
                      type="button"
                      onClick={() => actionsRef.current?.saveGame()}
                      className="
                        py-2.5 px-4
                        bg-[#363636] hover:bg-[#4a4a4a]
                        border-2 border-t-[#737373] border-l-[#737373] border-r-[#1a1a1a] border-b-[#1a1a1a]
                        text-emerald-300 font-mono font-bold text-xs cursor-pointer
                      "
                    >
                      💾 Guardar Partida {hasSavedGame ? '✓' : ''}
                    </button>
                    <button
                      id="startBtn"
                      type="button"
                      onClick={handleStartSingleOrResume}
                      className="
                        py-2.5 px-4
                        bg-[#363636] hover:bg-[#4a4a4a]
                        border-2 border-t-[#737373] border-l-[#737373] border-r-[#1a1a1a] border-b-[#1a1a1a]
                        text-white font-mono font-bold text-xs cursor-pointer
                      "
                    >
                      ▶️ Reanudar Partida
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* REQUISITO 2: Submenú Limpio de Multijugador (PeerJS) y Selección de los 3 Modos */
              <div
                id="mpSubmenu"
                className="w-full max-w-lg p-6 bg-[#1f1f23]/95 border-2 border-t-[#6b6b6b] border-l-[#6b6b6b] border-r-[#121214] border-b-[#121214] shadow-2xl text-white font-mono flex flex-col gap-4 my-auto"
              >
                <div className="flex items-center justify-between border-b border-stone-700 pb-2.5">
                  <span className="text-sm font-bold uppercase tracking-wider text-stone-200">
                    🌐 Conexión de Sala (PeerJS)
                  </span>
                  <button
                    id="btnBackMainMenu"
                    type="button"
                    onClick={() => setMenuView('main')}
                    className="px-3 py-1 bg-[#3b3b3b] hover:bg-[#525252] border border-stone-500 text-xs text-stone-200 cursor-pointer"
                  >
                    ← Volver
                  </button>
                </div>

                {/* Crear o Unirse con Código de Sala */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    id="btnCreateRoom"
                    type="button"
                    onClick={handleCreateRoomClick}
                    className="
                      py-3 px-4
                      bg-[#4a4a4a] hover:bg-[#5e5e66]
                      border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f]
                      text-emerald-300 font-bold text-xs cursor-pointer
                    "
                  >
                    📡 Crear Sala (Generar Código)
                  </button>

                  <form onSubmit={handleJoinRoomSubmit} className="flex gap-1.5">
                    <input
                      id="inputRoomCode"
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      maxLength={6}
                      className="w-full px-3 py-2 bg-black border-2 border-stone-600 text-center text-sm uppercase tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      id="btnConnectRoom"
                      type="submit"
                      className="px-3.5 py-2 bg-[#4a4a4a] hover:bg-[#5e5e66] border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f] text-xs font-bold text-cyan-300 cursor-pointer shrink-0"
                    >
                      Unirse
                    </button>
                  </form>
                </div>

                {roomCode && (
                  <div className="py-2 px-3 bg-black/70 border border-emerald-500/50 text-xs text-center text-emerald-300">
                    Código de Sala Activo:{' '}
                    <strong className="text-base text-white tracking-widest">{roomCode}</strong> ({peerCount}{' '}
                    jugador{peerCount === 1 ? '' : 'es'})
                  </div>
                )}

                {mpError && <div className="text-xs text-rose-400 text-center">{mpError}</div>}

                {/* REQUISITO 2: El anfitrión elige a qué jugar mediante tres botones */}
                <div className="border-t border-stone-700 pt-3 flex flex-col gap-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-300 text-center">
                    🎮 Elige el Modo de Juego de la Sala (Anfitrión):
                  </div>

                  <button
                    id="btnModeSurvival"
                    type="button"
                    onClick={() => handleSelectModeAndStart('survival')}
                    className="
                      w-full py-3 px-4
                      bg-[#4a4a4a] hover:bg-[#5e5e66]
                      border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f]
                      text-white font-bold text-sm tracking-wide cursor-pointer text-left flex items-center justify-between
                    "
                  >
                    <span>🌲 Supervivencia Cooperativa</span>
                    <span className="text-[11px] text-emerald-300">Mundo Infinito</span>
                  </button>

                  <button
                    id="btnModeRedLight"
                    type="button"
                    onClick={() => handleSelectModeAndStart('red_light')}
                    className="
                      w-full py-3 px-4
                      bg-[#4a4a4a] hover:bg-[#5e5e66]
                      border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f]
                      text-white font-bold text-sm tracking-wide cursor-pointer text-left flex items-center justify-between
                    "
                  >
                    <span>🚦 Minijuego: Luz Roja</span>
                    <span className="text-[11px] text-rose-300">Arena Cerrada Estricta</span>
                  </button>

                  <div className="flex flex-col gap-1.5">
                    <button
                      id="btnModeBuildBattle"
                      type="button"
                      onClick={() => handleSelectModeAndStart('build_battle', buildBattleOpponent)}
                      className="
                        w-full py-3 px-4
                        bg-[#4a4a4a] hover:bg-[#5e5e66]
                        border-2 border-t-[#8c8c8c] border-l-[#8c8c8c] border-r-[#1f1f1f] border-b-[#1f1f1f]
                        text-white font-bold text-sm tracking-wide cursor-pointer text-left flex items-center justify-between
                      "
                    >
                      <span>🏰 Batalla de Construcción</span>
                      <span className="text-[11px] text-amber-300">6 Min · Creativo · Vuelo</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btnLobbyBattleAI"
                        type="button"
                        onClick={() => handleSelectModeAndStart('build_battle', 'ai')}
                        className="py-1.5 px-3 bg-[#333338] hover:bg-[#45454d] border border-amber-400/50 text-[11px] font-bold text-amber-200 cursor-pointer"
                      >
                        🤖 Jugar vs IA (Bot Casa)
                      </button>
                      <button
                        id="btnLobbyBattleFriends"
                        type="button"
                        onClick={() => handleSelectModeAndStart('build_battle', 'friends')}
                        className="py-1.5 px-3 bg-[#333338] hover:bg-[#45454d] border border-cyan-400/50 text-[11px] font-bold text-cyan-200 cursor-pointer"
                      >
                        👥 Jugar vs Amigos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pie de pantalla estilo Minecraft */}
            <div className="w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-stone-300 drop-shadow px-2">
              <span>VoxelWorld 1.16 (16x16 Pixel Art)</span>
              <span>THREE.InstancedMesh · IndexedDB Save</span>
            </div>
          </div>
        )}
    </div>
  );
}

export default App;
