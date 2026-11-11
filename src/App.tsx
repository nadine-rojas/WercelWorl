/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Peer, { type DataConnection } from 'peerjs';
import {
  BT,
  BD,
  WH,
  SEA,
  HOTBAR_SIZE,
  BACKPACK_SIZE,
  TOTAL_INV_SLOTS,
  MAX_ENDERMEN,
  ENDERMAN_SPAWN_CHANCE,
  MAX_ZOMBIES,
  MAX_SPIDERS,
  SPAWN_X,
  SPAWN_Z,
  VX,
  VZ,
  VILLAGE_SIZE,
  LOST_VILLAGER_ISLANDS,
  TOTAL_VILLAGERS_TO_RESCUE,
  createInfiniteWorld,
  ensureChunksAroundPlayer,
  gB,
  sB,
  surfY,
  createPlayer,
  nearestPlayer,
  stepPlayerPhysics,
  raycastBlock,
  breakBlockLogic,
  placeBlockLogic,
  craftWoodToPlanksLogic,
  craftPlanksToDoorLogic,
  craftPlanksToBoatLogic,
  placeBoatInWaterLogic,
  mountBoatLogic,
  dismountBoatLogic,
  interactVillagerRescueLogic,
  countItemInInventory,
  swapInventorySlots,
  hasLineOfSight,
  stepEntityMovementWithCollision,
  despawnDaytimeMonsters,
  isNightTime,
  getDayPhaseLabel,
  getDistanceToVillage,
  getCompassDirectionToVillage,
  generateRoomCode,
  normalizeRoomCode,
  type InfiniteWorld,
  type PlayerState,
  type EntityData,
  type InventorySlot,
  type BoatData,
} from './game/voxelWorldLogic';
import { soundEngine } from './game/soundEngine';
import { STANDALONE_HTML_CODE } from './game/standaloneHtmlTemplate';

interface ThreeEntity extends EntityData {
  mesh: THREE.Group;
  dir: number;
  tmr: number;
  spd: number;
  legs: THREE.Mesh[];
  atkCd: number;
  tpCd?: number;
  angry?: boolean;
  owner?: PlayerState | null;
  collar?: THREE.Mesh;
  eyeMat?: THREE.MeshBasicMaterial;
  tail?: THREE.Mesh;
  home?: { x: number; z: number };
  beacon?: THREE.Mesh;
}

interface ThreeBoat extends BoatData {
  mesh: THREE.Group;
  passengerMesh: THREE.Group;
}

interface RemotePeerState {
  peerId: string;
  mesh: THREE.Group;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
  boatMesh: THREE.Group;
  targetPos: THREE.Vector3;
  yaw: number;
  pitch: number;
  inBoat: boolean;
  lastSeen: number;
}

type NetMessage =
  | {
      type: 'player:move';
      peerId: string;
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      inBoat: boolean;
    }
  | {
      type: 'block:set';
      x: number;
      y: number;
      z: number;
      t: number;
    }
  | {
      type: 'villager:rescued';
      villagerId: number;
      rescuedCount: number;
    }
  | {
      type: 'init:state';
      modifiedBlocks: Array<[string, number]>;
      rescuedVillagerIds: number[];
      rescuedCount: number;
    };

interface ParticleData {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

const PH = 1.75;
const PEER_PREFIX = 'voxelworld-room-';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [pointerLocked, setPointerLocked] = useState(false);
  const [hp, setHp] = useState(20);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [inventory, setInventory] = useState<(InventorySlot | null)[]>(() =>
    Array.from({ length: TOTAL_INV_SLOTS }, () => null)
  );
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [swapSourceIdx, setSwapSourceIdx] = useState<number | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 12, z: 0 });
  const [villageDist, setVillageDist] = useState(209);
  const [villageDir, setVillageDir] = useState('SE');
  const [villageDiscovered, setVillageDiscovered] = useState(false);
  const [villagersRescued, setVillagersRescued] = useState(0);
  const [nearestLostVillagerDist, setNearestLostVillagerDist] = useState<number | null>(45);
  const [nearestLostVillagerDir, setNearestLostVillagerDir] = useState<string>('SE');
  const [inBoatUI, setInBoatUI] = useState(false);
  const [hasBoatPassengerUI, setHasBoatPassengerUI] = useState(false);
  const [dayPhase, setDayPhase] = useState('☀️ Día');
  const [isNightUI, setIsNightUI] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [blocksCollectedCount, setBlocksCollectedCount] = useState(0);

  // Multiplayer (PeerJS) State
  const [roomMode, setRoomMode] = useState<'none' | 'created' | 'join-input' | 'connected'>('none');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [netStatus, setNetStatus] = useState<string>('Desconectado');
  const [connectedPeersCount, setConnectedPeersCount] = useState<number>(0);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  // Mobile / Touch Controls State
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  });
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyTouchIdRef = useRef<number | null>(null);
  const lookTouchRef = useRef<{ id: number; lastX: number; lastY: number } | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const inventoryOpenRef = useRef(inventoryOpen);
  inventoryOpenRef.current = inventoryOpen;

  const showCodeModalRef = useRef(showCodeModal);
  showCodeModalRef.current = showCodeModal;

  const isTouchDeviceRef = useRef(isTouchDevice);
  isTouchDeviceRef.current = isTouchDevice;

  const actionsRef = useRef<{
    requestPointerLock: () => void;
    respawnPlayer: () => void;
    selectHotbarSlot: (idx: number) => void;
    craftPlanks: () => void;
    craftDoor: () => void;
    craftBoat: () => void;
    useOrMountBoat: () => void;
    rescueInteract: () => void;
    swapSlots: (idxA: number, idxB: number) => void;
    toggleTimeOfDay: () => void;
    createMultiplayerRoom: () => string;
    joinMultiplayerRoom: (codeToJoin: string) => void;
    triggerAttackOrBreak: () => void;
    triggerPlaceOrInteract: () => void;
    triggerJump: () => void;
    rotateCameraBy: (dYaw: number, dPitch: number) => void;
  } | null>(null);

  // Sync dataset attributes on body for automated verification
  useEffect(() => {
    document.body.dataset.state = gameState;
    document.body.dataset.pointerLocked = String(pointerLocked);
    document.body.dataset.night = String(isNightUI);
    document.body.dataset.inBoat = String(inBoatUI);
    document.body.dataset.rescued = String(villagersRescued);
    document.body.dataset.roomCode = roomCode;
  }, [gameState, pointerLocked, isNightUI, inBoatUI, villagersRescued, roomCode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let toastTimer: number | null = null;
    const showToast = (txt: string, dur = 3200) => {
      setToastMsg(txt);
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setToastMsg(null), dur);
    };

    const syncInventoryUI = (pl: PlayerState) => {
      setInventory(pl.inventory.map((s) => (s ? { ...s } : null)));
      setSelectedSlot(pl.si);
      const totalItems = pl.inventory.reduce((sum, s) => sum + (s ? s.count : 0), 0);
      setBlocksCollectedCount(totalItems);
      setInBoatUI(pl.inBoat);
      setHasBoatPassengerUI(pl.boatPassengerId !== null);
      setVillagersRescued(pl.villagersRescued);
    };

    // 1. RENDERER & SCENE (Full Screen)
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '' : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Basic Render/i.test(rendererStr);

    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 35, 92);

    const cam1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 140);

    // 2. LIGHTING & CELESTIAL BODIES (Sun, Moon, Stars)
    const ambLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 0.9);
    sunLight.position.set(50, 90, 40);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 160;
      sunLight.shadow.camera.left = -60;
      sunLight.shadow.camera.right = 60;
      sunLight.shadow.camera.top = 60;
      sunLight.shadow.camera.bottom = -60;
    }
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.3);
    scene.add(hemiLight);

    const skyGroup = new THREE.Group();
    scene.add(skyGroup);

    const sunMesh = new THREE.Mesh(
      new THREE.BoxGeometry(7, 7, 7),
      new THREE.MeshBasicMaterial({ color: 0xffe066 })
    );
    skyGroup.add(sunMesh);

    const moonGroup = new THREE.Group();
    const moonCore = new THREE.Mesh(
      new THREE.BoxGeometry(6, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    const moonGlow = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 7.2, 7.2),
      new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.25 })
    );
    const craterMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const crater1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.2), craterMat);
    crater1.position.set(-1.2, 1.1, 3.05);
    const crater2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.2), craterMat);
    crater2.position.set(1.3, -1.0, 3.05);
    moonGroup.add(moonCore, moonGlow, crater1, crater2);
    skyGroup.add(moonGroup);

    const starCount = 360;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.46 + 0.06;
      const r = 95;
      starPositions[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi);
      starPositions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 1.6,
      transparent: true,
      opacity: 0,
    });
    const starField = new THREE.Points(starGeo, starMat);
    skyGroup.add(starField);

    // 3. PROCEDURAL TEXTURES & MATERIALS
    function mkTex(fn: (ctx: CanvasRenderingContext2D) => void) {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d')!;
      fn(ctx);
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    }

    function noise(ctx: CanvasRenderingContext2D, col: string, n = 35, sz = 1) {
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        ctx.fillRect((Math.random() * 16) | 0, (Math.random() * 16) | 0, sz, sz);
      }
    }

    const TX = {
      gTop: mkTex((c) => {
        c.fillStyle = '#5a9e32';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#4c8829', 45);
        noise(c, '#6ab83d', 30);
      }),
      gSide: mkTex((c) => {
        c.fillStyle = '#8B6538';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#7a5730', 40);
        c.fillStyle = '#5a9e32';
        c.fillRect(0, 0, 16, 3);
        for (let x = 0; x < 16; x++) {
          c.fillRect(x, 3, 1, (Math.random() * 3) | 0);
        }
      }),
      dirt: mkTex((c) => {
        c.fillStyle = '#8B6538';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#7a5730', 50);
        noise(c, '#9c7543', 30);
      }),
      stone: mkTex((c) => {
        c.fillStyle = '#808080';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#6e6e6e', 55, 2);
        noise(c, '#929292', 35);
      }),
      wSide: mkTex((c) => {
        c.fillStyle = '#6B4c2a';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#5a3e20';
        for (let x = 0; x < 16; x += 3) c.fillRect(x, 0, 1, 16);
        noise(c, '#7c5c36', 25);
      }),
      wTop: mkTex((c) => {
        c.fillStyle = '#a07848';
        c.fillRect(0, 0, 16, 16);
        c.strokeStyle = '#6B4c2a';
        c.lineWidth = 1;
        c.strokeRect(1, 1, 14, 14);
        c.strokeRect(4, 4, 8, 8);
      }),
      leaf: mkTex((c) => {
        c.fillStyle = '#2e6e1e';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#235816', 50);
        noise(c, '#3d8829', 40);
      }),
      sand: mkTex((c) => {
        c.fillStyle = '#dbd08c';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#ccc07a', 45);
        noise(c, '#eae09e', 30);
      }),
      water: mkTex((c) => {
        c.fillStyle = '#2868a8';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#3478b8';
        for (let y = 0; y < 16; y += 4) c.fillRect(0, y, 16, 2);
      }),
      brick: mkTex((c) => {
        c.fillStyle = '#a04838';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#c8bfb0';
        for (let y = 0; y < 16; y += 4) {
          c.fillRect(0, y, 16, 1);
          const off = ((y / 4) % 2) * 4;
          for (let x = off; x < 16; x += 8) c.fillRect(x, y, 1, 4);
        }
      }),
      plank: mkTex((c) => {
        c.fillStyle = '#b8935a';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#9e7c48';
        for (let y = 0; y < 16; y += 4) c.fillRect(0, y, 16, 1);
        noise(c, '#c8a368', 25);
      }),
      glass: mkTex((c) => {
        c.clearRect(0, 0, 16, 16);
        c.strokeStyle = '#c8e8ff';
        c.lineWidth = 2;
        c.strokeRect(1, 1, 14, 14);
        c.fillStyle = 'rgba(190,225,255,0.18)';
        c.fillRect(2, 2, 12, 12);
      }),
      cobble: mkTex((c) => {
        c.fillStyle = '#6e6e6e';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#585858', 50, 2);
        noise(c, '#858585', 40, 2);
      }),
      door: mkTex((c) => {
        c.fillStyle = '#6B4226';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#54321a';
        c.fillRect(2, 2, 5, 5);
        c.fillRect(9, 2, 5, 5);
        c.fillRect(2, 9, 5, 5);
        c.fillRect(9, 9, 5, 5);
        c.fillStyle = '#ffd700';
        c.fillRect(12, 8, 2, 2);
      }),
      snow: mkTex((c) => {
        c.fillStyle = '#f0f5f8';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#dce6ec', 35);
      }),
      craftTop: mkTex((c) => {
        c.fillStyle = '#8B5A2B';
        c.fillRect(0, 0, 16, 16);
        c.strokeStyle = '#3d2314';
        c.lineWidth = 1;
        for (let i = 0; i <= 16; i += 5) {
          c.beginPath();
          c.moveTo(i, 0);
          c.lineTo(i, 16);
          c.stroke();
          c.beginPath();
          c.moveTo(0, i);
          c.lineTo(16, i);
          c.stroke();
        }
      }),
      bedTop: mkTex((c) => {
        c.fillStyle = '#cc2233';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#f0f0f0';
        c.fillRect(0, 0, 16, 5);
        c.fillStyle = '#aa1828';
        c.fillRect(0, 5, 16, 1);
      }),
      bedSide: mkTex((c) => {
        c.fillStyle = '#b8935a';
        c.fillRect(0, 0, 16, 16);
        c.fillStyle = '#cc2233';
        c.fillRect(0, 2, 16, 8);
      }),
      lava: mkTex((c) => {
        c.fillStyle = '#ff5500';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#ffaa00', 40, 2);
      }),
      bedrock: mkTex((c) => {
        c.fillStyle = '#222222';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#444444', 50, 2);
      }),
      ice: mkTex((c) => {
        c.fillStyle = '#aaddff';
        c.fillRect(0, 0, 16, 16);
        noise(c, '#ffffff', 30);
      }),
    };

    const ml = (t: THREE.Texture, tr = false, op = 1) =>
      new THREE.MeshLambertMaterial({ map: t, transparent: tr, opacity: op });

    const MATS: Record<number, THREE.Material | THREE.Material[]> = {
      [BT.GRASS]: [ml(TX.gSide), ml(TX.gSide), ml(TX.gTop), ml(TX.dirt), ml(TX.gSide), ml(TX.gSide)],
      [BT.DIRT]: ml(TX.dirt),
      [BT.STONE]: ml(TX.stone),
      [BT.WOOD]: [ml(TX.wSide), ml(TX.wSide), ml(TX.wTop), ml(TX.wTop), ml(TX.wSide), ml(TX.wSide)],
      [BT.LEAVES]: ml(TX.leaf),
      [BT.SAND]: ml(TX.sand),
      [BT.WATER]: ml(TX.water, true, 0.72),
      [BT.BRICK]: ml(TX.brick),
      [BT.PLANK]: ml(TX.plank),
      [BT.GLASS]: ml(TX.glass, true, 0.45),
      [BT.COBBLE]: ml(TX.cobble),
      [BT.DOOR]: ml(TX.door),
      [BT.SNOW]: ml(TX.snow),
      [BT.TABLE]: [ml(TX.plank), ml(TX.plank), ml(TX.craftTop), ml(TX.plank), ml(TX.plank), ml(TX.plank)],
      [BT.BED]: [ml(TX.bedSide), ml(TX.bedSide), ml(TX.bedTop), ml(TX.plank), ml(TX.bedSide), ml(TX.bedSide)],
      [BT.LAVA]: new THREE.MeshBasicMaterial({ map: TX.lava }),
      [BT.BEDROCK]: ml(TX.bedrock),
      [BT.ICE]: ml(TX.ice, true, 0.8),
    };

    // 4. INFINITE CHUNK WORLD GENERATION & MESHING
    const RENDER_RADIUS = isSoftwareGl ? 2 : 3;
    const world: InfiniteWorld = createInfiniteWorld();
    ensureChunksAroundPlayer(world, SPAWN_X, SPAWN_Z, RENDER_RADIUS);

    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const wMeshGroup = new THREE.Group();
    scene.add(wMeshGroup);
    let instMeshes: Record<number, THREE.InstancedMesh> = {};
    const dummy = new THREE.Object3D();

    let lastBuiltCenterCx = -99999;
    let lastBuiltCenterCz = -99999;

    function rebuildMeshes(centerX: number, centerZ: number) {
      ensureChunksAroundPlayer(world, centerX, centerZ, RENDER_RADIUS);
      lastBuiltCenterCx = Math.floor(centerX / 16);
      lastBuiltCenterCz = Math.floor(centerZ / 16);

      while (wMeshGroup.children.length) {
        const m = wMeshGroup.children[0] as THREE.InstancedMesh;
        m.dispose();
        wMeshGroup.remove(m);
      }
      instMeshes = {};

      const buckets: Record<number, number[]> = {};
      const minX = Math.floor(centerX) - RENDER_RADIUS * 16;
      const maxX = Math.floor(centerX) + RENDER_RADIUS * 16;
      const minZ = Math.floor(centerZ) - RENDER_RADIUS * 16;
      const maxZ = Math.floor(centerZ) + RENDER_RADIUS * 16;

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let y = 0; y < WH; y++) {
            const b = gB(world, x, y, z);
            if (b === BT.AIR) continue;
            if (b === BT.WATER && y < SEA && gB(world, x, y + 1, z) === BT.WATER) continue;

            const vis =
              b === BT.WATER ||
              b === BT.GLASS ||
              gB(world, x + 1, y, z) === 0 ||
              gB(world, x - 1, y, z) === 0 ||
              gB(world, x, y + 1, z) === 0 ||
              gB(world, x, y - 1, z) === 0 ||
              gB(world, x, y, z + 1) === 0 ||
              gB(world, x, y, z - 1) === 0 ||
              gB(world, x + 1, y, z) === BT.WATER ||
              gB(world, x - 1, y, z) === BT.WATER ||
              gB(world, x, y + 1, z) === BT.WATER ||
              gB(world, x, y, z + 1) === BT.WATER ||
              gB(world, x, y, z - 1) === BT.WATER ||
              gB(world, x + 1, y, z) === BT.GLASS ||
              gB(world, x - 1, y, z) === BT.GLASS ||
              gB(world, x, y + 1, z) === BT.GLASS ||
              gB(world, x, y, z + 1) === BT.GLASS ||
              gB(world, x, y, z - 1) === BT.GLASS;

            if (vis) {
              if (!buckets[b]) buckets[b] = [];
              buckets[b].push(x, y, z);
            }
          }
        }
      }

      for (const tStr in buckets) {
        const t = Number(tStr);
        const pos = buckets[t];
        const cnt = pos.length / 3;
        const mat = MATS[t] || MATS[BT.STONE];
        const im = new THREE.InstancedMesh(bGeo, mat, cnt);
        if (t !== BT.WATER && t !== BT.GLASS && t !== BT.LAVA && !isSoftwareGl) {
          im.castShadow = true;
          im.receiveShadow = true;
        }
        for (let i = 0; i < cnt; i++) {
          dummy.position.set(pos[i * 3] + 0.5, pos[i * 3 + 1] + 0.5, pos[i * 3 + 2] + 0.5);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
        wMeshGroup.add(im);
        instMeshes[t] = im;
      }
    }

    // 5. PLAYER 1 STATE
    const PL1: PlayerState = createPlayer();
    let yaw = 0.75; // Mirando hacia el árbol inicial en (4,4)
    let pitch = -0.1;

    syncInventoryUI(PL1);
    rebuildMeshes(PL1.pos.x, PL1.pos.z);

    const hlBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
      new THREE.LineBasicMaterial({ color: 0x22d3ee })
    );
    scene.add(hlBox);

    // 6. ENTITIES, SPIDERS, LOST VILLAGERS & BOATS
    const ENT: ThreeEntity[] = [];
    const BOATS: ThreeBoat[] = [];
    let nextEntId = 1;
    let nextBoatId = 1;

    function box(
      w: number,
      h: number,
      d: number,
      col: number,
      x = 0,
      y = 0,
      z = 0
    ): THREE.Mesh {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col })
      );
      m.position.set(x, y, z);
      if (!isSoftwareGl) m.castShadow = true;
      return m;
    }

    function createVillagerMeshGroup(role: number, showRescueBeacon: boolean): {
      g: THREE.Group;
      l1: THREE.Mesh;
      l2: THREE.Mesh;
      beacon?: THREE.Mesh;
    } {
      const g = new THREE.Group();
      const rCols = [0x8b5a2b, 0x22d3ee, 0x7b2d8b, 0x2d6b3b, 0xb83030, 0x3060a8];
      const rc = rCols[role % rCols.length];
      g.add(box(0.5, 0.7, 0.35, rc, 0, 0.65, 0));
      g.add(box(0.45, 0.45, 0.45, 0xd4a574, 0, 1.25, 0));
      g.add(box(0.1, 0.16, 0.12, 0xc09060, 0, 1.2, 0.25));
      g.add(box(0.08, 0.06, 0.05, 0x222222, -0.1, 1.3, 0.23));
      g.add(box(0.08, 0.06, 0.05, 0x222222, 0.1, 1.3, 0.23));
      g.add(box(0.4, 0.25, 0.3, rc, 0, 0.75, 0.1));
      const l1 = box(0.2, 0.3, 0.25, 0x5c3a1e, -0.12, 0.15, 0);
      const l2 = box(0.2, 0.3, 0.25, 0x5c3a1e, 0.12, 0.15, 0);
      g.add(l1, l2);
      g.add(box(0.6, 0.12, 0.6, 0xd4b84a, 0, 1.52, 0));

      let beacon: THREE.Mesh | undefined;
      if (showRescueBeacon) {
        beacon = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.45, 0.28),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        beacon.position.set(0, 2.25, 0);
        g.add(beacon);
      }
      return { g, l1, l2, beacon };
    }

    /**
     * Requisito 3: La Aldea comienza completamente vacía (0 aldeanos).
     * Los aldeanos se generan dispersos en islas lejanas, quietos y esperando ser rescatados.
     */
    function addLostVillager(x: number, z: number, role: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const y = surfY(world, x | 0, z | 0);
      const { g, l1, l2, beacon } = createVillagerMeshGroup(role, true);
      g.position.set(x, y, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type: 'villager',
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 20,
        maxHp: 20,
        dir: 0,
        tmr: 0,
        spd: 1.4,
        legs: [l1, l2],
        atkCd: 0,
        home: { x, z },
        rescued: false,
        inBoat: false,
        beacon,
      });
    }

    function createBoatMeshGroup(): { mesh: THREE.Group; passengerMesh: THREE.Group } {
      const g = new THREE.Group();
      // Casco de madera del bote (ancho y navegable)
      g.add(box(1.5, 0.18, 2.3, 0x8b5a2b, 0, 0.09, 0));
      // Bordes laterales
      g.add(box(0.14, 0.38, 2.3, 0xa06b35, -0.68, 0.28, 0));
      g.add(box(0.14, 0.38, 2.3, 0xa06b35, 0.68, 0.28, 0));
      // Proa y popa
      g.add(box(1.22, 0.38, 0.16, 0xa06b35, 0, 0.28, 1.07));
      g.add(box(1.22, 0.38, 0.16, 0xa06b35, 0, 0.28, -1.07));
      // Banco central y remos
      g.add(box(1.2, 0.12, 0.35, 0xc89658, 0, 0.22, 0.15));
      g.add(box(0.95, 0.08, 0.14, 0x5c3a1e, -0.95, 0.35, 0.15));
      g.add(box(0.95, 0.08, 0.14, 0x5c3a1e, 0.95, 0.35, 0.15));

      // Modelo de Aldeano Pasajero sentado en la popa del bote (oculto hasta rescatar uno)
      const { g: passengerMesh } = createVillagerMeshGroup(1, false);
      passengerMesh.scale.setScalar(0.85);
      passengerMesh.position.set(0, 0.18, -0.55);
      passengerMesh.visible = false;
      g.add(passengerMesh);

      return { mesh: g, passengerMesh };
    }

    function spawnBoatMesh(boatData: BoatData): ThreeBoat {
      const { mesh, passengerMesh } = createBoatMeshGroup();
      mesh.position.set(boatData.pos.x, boatData.pos.y, boatData.pos.z);
      scene.add(mesh);
      const tb: ThreeBoat = {
        ...boatData,
        mesh,
        passengerMesh,
      };
      BOATS.push(tb);
      return tb;
    }

    /**
     * Requisito 2: Nuevo Modelo 3D de Araña Nocturna (ancha, oscura, 8 patas articuladas y ojos rojos brillantes)
     */
    function addSpider(x: number, z: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const y = surfY(world, x | 0, z | 0);
      if (y <= SEA + 1) return;

      const g = new THREE.Group();
      // Cefalotórax y abdomen ancho y oscuro
      g.add(box(0.68, 0.36, 0.58, 0x1a1721, 0, 0.34, 0.24));
      g.add(box(0.92, 0.46, 0.85, 0x121018, 0, 0.38, -0.35));
      // Cabeza delantera
      g.add(box(0.52, 0.32, 0.34, 0x221e2b, 0, 0.35, 0.56));

      // 4 Ojos Rojos Brillantes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
      e1.position.set(-0.14, 0.4, 0.74);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
      e2.position.set(0.14, 0.4, 0.74);
      const e3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.05), eyeMat);
      e3.position.set(-0.22, 0.32, 0.73);
      const e4 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.05), eyeMat);
      e4.position.set(0.22, 0.32, 0.73);
      g.add(e1, e2, e3, e4);

      // 8 Patas articuladas extendidas hacia los lados
      const legs: THREE.Mesh[] = [];
      const zOffsets = [-0.36, -0.1, 0.14, 0.38];
      for (const zo of zOffsets) {
        const legL = box(0.62, 0.1, 0.1, 0x272330, -0.58, 0.24, zo);
        legL.rotation.z = 0.32;
        const legR = box(0.62, 0.1, 0.1, 0x272330, 0.58, 0.24, zo);
        legR.rotation.z = -0.32;
        g.add(legL, legR);
        legs.push(legL, legR);
      }

      g.position.set(x, y, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type: 'spider',
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'chase',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 12,
        maxHp: 12,
        dir: Math.random() * 6.28,
        tmr: 0,
        spd: 3.6, // Rápida
        legs,
        atkCd: 0,
        jumpCd: 1.2 + Math.random(),
      });
    }

    const ANIMALS: Record<
      string,
      { b: [number, number, number]; h: [number, number, number]; l: [number, number]; col: number; spd: number }
    > = {
      cow: { b: [0.65, 0.55, 0.95], h: [0.42, 0.42, 0.4], l: [0.18, 0.32], col: 0x5c3820, spd: 1.3 },
      sheep: { b: [0.65, 0.55, 0.85], h: [0.36, 0.36, 0.38], l: [0.15, 0.28], col: 0xf0ede6, spd: 1.4 },
      chicken: { b: [0.32, 0.3, 0.4], h: [0.22, 0.25, 0.22], l: [0.06, 0.18], col: 0xfafafa, spd: 2.0 },
    };

    function addAnimal(type: 'cow' | 'sheep' | 'chicken', x: number, z: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const y = surfY(world, x | 0, z | 0);
      if (y <= SEA + 1) return;
      const cfg = ANIMALS[type];
      const g = new THREE.Group();
      const [bw, bh, bd] = cfg.b;
      const [hw, hh, hd] = cfg.h;
      const [lw, lh] = cfg.l;
      g.add(box(bw, bh, bd, cfg.col, 0, lh + bh / 2, 0));
      const hdCol = type === 'sheep' ? 0x444444 : cfg.col;
      g.add(box(hw, hh, hd, hdCol, 0, lh + bh - 0.05, bd / 2 + hd / 2 - 0.08));
      g.add(box(0.06, 0.06, 0.04, 0x111111, -hw * 0.3, lh + bh + 0.02, bd / 2 + hd - 0.06));
      g.add(box(0.06, 0.06, 0.04, 0x111111, hw * 0.3, lh + bh + 0.02, bd / 2 + hd - 0.06));
      if (type === 'cow') {
        g.add(box(0.22, 0.2, 0.02, 0xf0f0f0, bw / 2 + 0.01, lh + bh * 0.6, 0.1));
        g.add(box(0.06, 0.14, 0.06, 0xd8d0b8, -hw * 0.4, lh + bh + hh * 0.4, bd / 2 + 0.1));
        g.add(box(0.06, 0.14, 0.06, 0xd8d0b8, hw * 0.4, lh + bh + hh * 0.4, bd / 2 + 0.1));
      }
      if (type === 'chicken') {
        g.add(box(0.08, 0.05, 0.1, 0xffaa00, 0, lh + bh - 0.06, bd / 2 + hd));
        g.add(box(0.04, 0.1, 0.1, 0xcc2222, 0, lh + bh + hh * 0.4, bd / 2 + hd * 0.4));
      }
      const legs: THREE.Mesh[] = [];
      const lx = bw * 0.32;
      const lz = bd * 0.32;
      for (const [ox, oz] of [
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ]) {
        const lCol = type === 'chicken' ? 0xffaa00 : type === 'sheep' ? 0x444444 : cfg.col;
        const lg = box(lw, lh, lw, lCol, ox, lh / 2, oz);
        g.add(lg);
        legs.push(lg);
      }
      g.position.set(x, y, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type,
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 8,
        maxHp: 8,
        dir: Math.random() * 6.28,
        tmr: Math.random() * 4,
        spd: cfg.spd,
        legs,
        atkCd: 0,
      });
    }

    function addShark(x: number, z: number) {
      const g = new THREE.Group();
      g.add(box(0.7, 0.45, 1.9, 0x48627a, 0, 0, 0));
      g.add(box(0.62, 0.15, 1.6, 0xdce6f0, 0, -0.2, 0));
      g.add(box(0.5, 0.32, 0.55, 0x48627a, 0, 0.02, 1.15));
      g.add(box(0.4, 0.08, 0.35, 0xffffff, 0, -0.12, 1.1));
      g.add(box(0.08, 0.55, 0.45, 0x364d63, 0, 0.45, -0.1));
      const tail = box(0.1, 0.55, 0.5, 0x364d63, 0, 0.05, -1.15);
      g.add(tail);
      g.add(box(0.45, 0.06, 0.3, 0x364d63, -0.5, -0.1, 0.25));
      g.add(box(0.45, 0.06, 0.3, 0x364d63, 0.5, -0.1, 0.25));
      g.add(box(0.07, 0.07, 0.07, 0x111111, -0.26, 0.1, 0.9));
      g.add(box(0.07, 0.07, 0.07, 0x111111, 0.26, 0.1, 0.9));
      g.position.set(x, SEA - 0.3, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type: 'shark',
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 16,
        maxHp: 16,
        dir: Math.random() * 6.28,
        tmr: Math.random() * 3,
        spd: 3.4,
        legs: [tail],
        atkCd: 0,
      });
    }

    function addWolf(x: number, z: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const y = surfY(world, x | 0, z | 0);
      if (y <= SEA + 1) return;
      const g = new THREE.Group();
      g.add(box(0.45, 0.4, 0.85, 0x9aa0a6, 0, 0.42, 0));
      g.add(box(0.5, 0.44, 0.35, 0x80868b, 0, 0.45, 0.28));
      const collar = box(0.52, 0.46, 0.1, 0xcc2222, 0, 0.45, 0.38);
      collar.visible = false;
      g.add(collar);
      g.add(box(0.38, 0.35, 0.38, 0x9aa0a6, 0, 0.58, 0.55));
      g.add(box(0.2, 0.18, 0.26, 0x70757a, 0, 0.5, 0.82));
      g.add(box(0.1, 0.14, 0.08, 0x70757a, -0.13, 0.8, 0.5));
      g.add(box(0.1, 0.14, 0.08, 0x70757a, 0.13, 0.8, 0.5));
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat);
      e1.position.set(-0.11, 0.62, 0.75);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat);
      e2.position.set(0.11, 0.62, 0.75);
      g.add(e1, e2);
      const tail = box(0.12, 0.12, 0.4, 0x80868b, 0, 0.5, -0.55);
      g.add(tail);
      const legs: THREE.Mesh[] = [];
      for (const [ox, oz] of [
        [-0.14, -0.28],
        [0.14, -0.28],
        [-0.14, 0.28],
        [0.14, 0.28],
      ]) {
        const lg = box(0.13, 0.28, 0.13, 0x80868b, ox, 0.14, oz);
        g.add(lg);
        legs.push(lg);
      }
      g.position.set(x, y, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type: 'wolf',
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 14,
        maxHp: 14,
        dir: Math.random() * 6.28,
        tmr: Math.random() * 3,
        spd: 2.3,
        legs,
        tamed: false,
        owner: null,
        angry: false,
        atkCd: 0,
        collar,
        eyeMat,
        tail,
      });
    }

    function addEnderman(x: number, z: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const y = surfY(world, x | 0, z | 0);
      if (y <= SEA + 1) return;
      const g = new THREE.Group();
      g.add(box(0.45, 0.9, 0.28, 0x111116, 0, 1.65, 0));
      g.add(box(0.45, 0.45, 0.45, 0x111116, 0, 2.35, 0));
      const em = new THREE.MeshBasicMaterial({ color: 0xe040fb });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), em);
      e1.position.set(-0.12, 2.35, 0.23);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), em);
      e2.position.set(0.12, 2.35, 0.23);
      g.add(e1, e2);
      const a1 = box(0.12, 1.3, 0.12, 0x111116, -0.32, 1.45, 0);
      const a2 = box(0.12, 1.3, 0.12, 0x111116, 0.32, 1.45, 0);
      const l1 = box(0.14, 1.2, 0.14, 0x111116, -0.12, 0.6, 0);
      const l2 = box(0.14, 1.2, 0.14, 0x111116, 0.12, 0.6, 0);
      g.add(a1, a2, l1, l2);
      g.position.set(x, y, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type: 'enderman',
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'idle',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 28,
        maxHp: 28,
        dir: Math.random() * 6.28,
        tmr: Math.random() * 3,
        spd: 2.2,
        legs: [l1, l2, a1, a2],
        angry: false,
        atkCd: 0,
        tpCd: 0,
      });
    }

    function addZombie(x: number, z: number) {
      ensureChunksAroundPlayer(world, x, z, 0);
      const y = surfY(world, x | 0, z | 0);
      if (y <= SEA + 1) return;
      const g = new THREE.Group();
      g.add(box(0.5, 0.65, 0.3, 0x2b6e6e, 0, 0.65, 0));
      g.add(box(0.45, 0.45, 0.45, 0x4a7c3f, 0, 1.22, 0));
      const em = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.05), em);
      e1.position.set(-0.1, 1.26, 0.23);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.05), em);
      e2.position.set(0.1, 1.26, 0.23);
      g.add(e1, e2);
      g.add(box(0.2, 0.4, 0.55, 0x4a7c3f, -0.35, 0.85, 0.2));
      g.add(box(0.2, 0.4, 0.55, 0x4a7c3f, 0.35, 0.85, 0.2));
      const l1 = box(0.22, 0.35, 0.25, 0x2a2a6e, -0.12, 0.17, 0);
      const l2 = box(0.22, 0.35, 0.25, 0x2a2a6e, 0.12, 0.17, 0);
      g.add(l1, l2);
      g.position.set(x, y, z);
      scene.add(g);
      ENT.push({
        id: nextEntId++,
        type: 'zombie',
        mesh: g,
        pos: g.position,
        vel: { x: 0, y: 0, z: 0 },
        state: 'chase',
        timer: 0,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        alive: true,
        hp: 14,
        maxHp: 14,
        dir: Math.random() * 6.28,
        tmr: 0,
        spd: 2.3,
        legs: [l1, l2],
        atkCd: 0,
      });
    }

    // Requisito 3: La aldea empieza vacía (0 aldeanos allí).
    // Generamos los 5 aldeanos perdidos dispersos en islas lejanas esperando rescate:
    LOST_VILLAGER_ISLANDS.forEach((isl, idx) => {
      addLostVillager(isl.x + 0.5, isl.z + 0.5, idx);
    });

    // Spawn fauna alrededor de la zona inicial
    const aTypes: Array<'cow' | 'sheep' | 'chicken'> = ['cow', 'sheep', 'chicken'];
    for (let i = 0; i < 9; i++) {
      const ax = (Math.random() - 0.5) * 44;
      const az = (Math.random() - 0.5) * 44;
      addAnimal(aTypes[i % 3], ax, az);
    }
    for (let i = 0; i < 3; i++) {
      const wx = 8 + (Math.random() - 0.5) * 24;
      const wz = 8 + (Math.random() - 0.5) * 24;
      addWolf(wx, wz);
    }
    for (let i = 0; i < 4; i++) {
      const sx = 22 + Math.random() * 30;
      const sz = 22 + Math.random() * 30;
      addShark(sx, sz);
    }

    // 7. PARTICLES
    const PARTS: ParticleData[] = [];
    const pGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);

    function spawnParts(x: number, y: number, z: number, col: number, n = 10) {
      const m = new THREE.MeshBasicMaterial({ color: col });
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(pGeo, m);
        p.position.set(
          x + 0.5 + (Math.random() - 0.5) * 0.6,
          y + 0.5 + (Math.random() - 0.5) * 0.6,
          z + 0.5 + (Math.random() - 0.5) * 0.6
        );
        scene.add(p);
        PARTS.push({
          mesh: p,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 4 + 1,
            (Math.random() - 0.5) * 4
          ),
          life: 0.6 + Math.random() * 0.4,
        });
      }
    }

    // 8. MULTIJUGADOR ONLINE P2P CON PEERJS
    let peerInstance: Peer | null = null;
    const activeConnections = new Map<string, DataConnection>();
    const remotePeers = new Map<string, RemotePeerState>();

    function createRemotePlayerAvatar(peerId: string): RemotePeerState {
      const existing = remotePeers.get(peerId);
      if (existing) return existing;

      const g = new THREE.Group();
      // Torso cian/esmeralda de jugador online
      g.add(box(0.52, 0.72, 0.3, 0x0ea5e9, 0, 0.72, 0));
      // Brazos
      g.add(box(0.18, 0.65, 0.22, 0x38bdf8, -0.36, 0.72, 0));
      g.add(box(0.18, 0.65, 0.22, 0x38bdf8, 0.36, 0.72, 0));
      // Cabeza
      const head = box(0.46, 0.46, 0.46, 0xf1c27d, 0, 1.32, 0);
      head.add(box(0.08, 0.07, 0.05, 0x111111, -0.1, 0.04, -0.24));
      head.add(box(0.08, 0.07, 0.05, 0x111111, 0.1, 0.04, -0.24));
      g.add(head);
      // Piernas
      const l1 = box(0.22, 0.38, 0.25, 0x1e293b, -0.13, 0.19, 0);
      const l2 = box(0.22, 0.38, 0.25, 0x1e293b, 0.13, 0.19, 0);
      g.add(l1, l2);

      // Bote adjunto para cuando el jugador remoto navega
      const { mesh: boatMesh } = createBoatMeshGroup();
      boatMesh.position.set(0, -0.2, 0);
      boatMesh.visible = false;
      g.add(boatMesh);

      g.position.set(SPAWN_X + 1.5, surfY(world, 1, 1), SPAWN_Z + 1.5);
      scene.add(g);

      const rp: RemotePeerState = {
        peerId,
        mesh: g,
        head,
        legs: [l1, l2],
        boatMesh,
        targetPos: g.position.clone(),
        yaw: 0,
        pitch: 0,
        inBoat: false,
        lastSeen: performance.now(),
      };
      remotePeers.set(peerId, rp);
      return rp;
    }

    function removeRemotePlayerAvatar(peerId: string) {
      const rp = remotePeers.get(peerId);
      if (rp) {
        scene.remove(rp.mesh);
        remotePeers.delete(peerId);
      }
    }

    function broadcastNetMessage(msg: NetMessage, excludePeerId?: string) {
      for (const [pid, conn] of activeConnections.entries()) {
        if (pid !== excludePeerId && conn.open) {
          try {
            conn.send(msg);
          } catch {
            // Ignore transient send error
          }
        }
      }
    }

    function handleIncomingNetMessage(msg: NetMessage, fromPeerId: string) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'player:move') {
        const rp = createRemotePlayerAvatar(msg.peerId || fromPeerId);
        rp.targetPos.set(msg.x, msg.y - 0.1, msg.z);
        rp.yaw = msg.yaw;
        rp.pitch = msg.pitch;
        rp.inBoat = msg.inBoat;
        rp.boatMesh.visible = msg.inBoat;
        rp.lastSeen = performance.now();
        // Si somos el Host, reenviar a otros invitados
        broadcastNetMessage(msg, fromPeerId);
      } else if (msg.type === 'block:set') {
        // Idempotent block mutation
        if (gB(world, msg.x, msg.y, msg.z) !== msg.t) {
          sB(world, msg.x, msg.y, msg.z, msg.t);
          rebuildMeshes(PL1.pos.x, PL1.pos.z);
        }
        broadcastNetMessage(msg, fromPeerId);
      } else if (msg.type === 'villager:rescued') {
        const v = ENT.find((e) => e.id === msg.villagerId && e.type === 'villager');
        if (v && !v.rescued) {
          v.inBoat = false;
          v.rescued = true;
          v.mesh.visible = true;
          if (v.beacon) v.beacon.visible = false;
          v.pos.x = VX + 8 + (msg.rescuedCount % 4) * 2;
          v.pos.y = SEA + 3;
          v.pos.z = VZ + 8;
          v.home = { x: v.pos.x, z: v.pos.z };
        }
        PL1.villagersRescued = Math.max(PL1.villagersRescued, msg.rescuedCount);
        setVillagersRescued(PL1.villagersRescued);
        showToast(`🤝 ¡Tu compañero rescató a un aldeano! (${PL1.villagersRescued}/${TOTAL_VILLAGERS_TO_RESCUE})`);
        broadcastNetMessage(msg, fromPeerId);
      } else if (msg.type === 'init:state') {
        for (const [key, val] of msg.modifiedBlocks) {
          const [sx, sy, sz] = key.split(',').map(Number);
          sB(world, sx, sy, sz, val);
        }
        for (const vid of msg.rescuedVillagerIds) {
          const v = ENT.find((e) => e.id === vid && e.type === 'villager');
          if (v) {
            v.inBoat = false;
            v.rescued = true;
            if (v.beacon) v.beacon.visible = false;
            v.pos.x = VX + 8;
            v.pos.y = SEA + 3;
            v.pos.z = VZ + 8;
            v.home = { x: v.pos.x, z: v.pos.z };
          }
        }
        PL1.villagersRescued = Math.max(PL1.villagersRescued, msg.rescuedCount);
        setVillagersRescued(PL1.villagersRescued);
        rebuildMeshes(PL1.pos.x, PL1.pos.z);
      }
    }

    function wireDataConnection(conn: DataConnection) {
      conn.on('open', () => {
        activeConnections.set(conn.peer, conn);
        setConnectedPeersCount(activeConnections.size);
        setNetStatus(`Conectado (${activeConnections.size} jugador${activeConnections.size === 1 ? '' : 'es'})`);
        createRemotePlayerAvatar(conn.peer);
        showToast('🌐 ¡Jugador conectado a la sala multijugador!', 3000);

        // Enviar estado actual del mundo de forma idempotente
        const rescuedIds = ENT.filter((e) => e.type === 'villager' && e.rescued).map((e) => e.id);
        const initMsg: NetMessage = {
          type: 'init:state',
          modifiedBlocks: Array.from(world.modified.entries()),
          rescuedVillagerIds: rescuedIds,
          rescuedCount: PL1.villagersRescued,
        };
        conn.send(initMsg);
      });

      conn.on('data', (raw) => {
        handleIncomingNetMessage(raw as NetMessage, conn.peer);
      });

      conn.on('close', () => {
        activeConnections.delete(conn.peer);
        removeRemotePlayerAvatar(conn.peer);
        setConnectedPeersCount(activeConnections.size);
        setNetStatus(
          activeConnections.size > 0
            ? `Conectado (${activeConnections.size})`
            : 'Sala activa (esperando jugadores)'
        );
      });

      conn.on('error', () => {
        activeConnections.delete(conn.peer);
        removeRemotePlayerAvatar(conn.peer);
        setConnectedPeersCount(activeConnections.size);
      });
    }

    const createMultiplayerRoom = (): string => {
      if (peerInstance) {
        peerInstance.destroy();
        peerInstance = null;
      }
      const code = generateRoomCode();
      setRoomCode(code);
      setRoomMode('created');
      setNetStatus('Creando sala P2P...');

      try {
        const peer = new Peer(`${PEER_PREFIX}${code}`);
        peerInstance = peer;

        peer.on('open', () => {
          setNetStatus(`Sala ${code} lista (Esperando amigo)`);
          showToast(`📡 Sala creada: Código ${code} — Compártelo para jugar juntos`, 3500);
        });

        peer.on('connection', (conn) => {
          wireDataConnection(conn);
        });

        peer.on('error', (err) => {
          setNetStatus(`Sala local ${code} (${err.type || 'P2P'})`);
        });
      } catch {
        setNetStatus(`Sala ${code} preparada`);
      }
      return code;
    };

    const joinMultiplayerRoom = (rawCode: string) => {
      const code = normalizeRoomCode(rawCode);
      if (code.length < 4) {
        showToast('⚠️ Escribe un código de sala válido de 4 o 5 letras/números', 2600);
        return;
      }
      if (peerInstance) {
        peerInstance.destroy();
        peerInstance = null;
      }
      setRoomCode(code);
      setRoomMode('connected');
      setNetStatus(`Conectando a sala ${code}...`);

      try {
        const peer = new Peer();
        peerInstance = peer;

        peer.on('open', () => {
          const conn = peer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
          wireDataConnection(conn);
        });

        peer.on('connection', (conn) => {
          wireDataConnection(conn);
        });

        peer.on('error', () => {
          setNetStatus(`No se encontró la sala ${code} o sin red P2P`);
          showToast(`⚠️ No se pudo conectar a la sala ${code}. Verifica el código.`, 3000);
        });
      } catch {
        setNetStatus(`Error al conectar a ${code}`);
      }
    };

    // 9. CONTROLS: POINTER LOCK, CRAFTING, BOATS, VILLAGER RESCUE & TOUCH
    const keys: Record<string, boolean> = {};
    let jumpJustPressed = false;
    let jumpJustReleased = false;

    const selectHotbarSlot = (idx: number) => {
      PL1.si = ((idx % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE;
      setSelectedSlot(PL1.si);
    };

    const craftPlanks = () => {
      const res = craftWoodToPlanksLogic(PL1);
      if (res.crafted) {
        soundEngine.playCraft();
        syncInventoryUI(PL1);
        showToast('🔨 ¡Crafteado! +4 Tablones de madera listos para construir o hacer un Bote', 2600);
      } else {
        showToast('🌲 Necesitas al menos 1 bloque de Madera (tala un árbol cercano)', 2600);
      }
    };

    const craftDoor = () => {
      const res = craftPlanksToDoorLogic(PL1);
      if (res.crafted) {
        soundEngine.playCraft();
        syncInventoryUI(PL1);
        showToast('🚪 ¡Crafteado! +1 Puerta lista en tu inventario', 2400);
      } else {
        showToast('🪵 Necesitas al menos 2 Tablones para fabricar una Puerta', 2400);
      }
    };

    const craftBoat = () => {
      const res = craftPlanksToBoatLogic(PL1);
      if (res.crafted) {
        soundEngine.playCraft();
        syncInventoryUI(PL1);
        showToast('⛵ ¡Bote fabricado! Acércate al mar y haz clic derecho en el agua para colocarlo', 3200);
      } else {
        showToast(
          `🪵 Necesitas 5 Tablones para fabricar un Bote (tienes ${res.planksRemaining}/5)`,
          2800
        );
      }
    };

    const getActiveBoat = (): ThreeBoat | null => {
      if (!PL1.inBoat || PL1.activeBoatId === null) return null;
      return BOATS.find((b) => b.id === PL1.activeBoatId) || null;
    };

    const rescueInteract = (): boolean => {
      const activeBoat = getActiveBoat();
      const res = interactVillagerRescueLogic(PL1, activeBoat, ENT);
      if (res.action === 'boarded' && res.villager && activeBoat) {
        const vEnt = ENT.find((e) => e.id === res.villager!.id);
        if (vEnt) {
          vEnt.mesh.visible = false; // El aldeano ahora va sentado dentro del bote
        }
        activeBoat.passengerMesh.visible = true;
        soundEngine.playTame();
        syncInventoryUI(PL1);
        showToast(
          '🛟 ¡Aldeano a bordo del bote! Navega hasta la Aldea Lejana (SE) y haz clic para rescatarlo.',
          4000
        );
        return true;
      }
      if (res.action === 'rescued' && activeBoat) {
        activeBoat.passengerMesh.visible = false;
        if (res.villager) {
          const vEnt = ENT.find((e) => e.id === res.villager!.id);
          if (vEnt) {
            vEnt.mesh.visible = true;
            vEnt.mesh.position.set(vEnt.pos.x, vEnt.pos.y, vEnt.pos.z);
            vEnt.home = { x: vEnt.pos.x, z: vEnt.pos.z };
            if (vEnt.beacon) vEnt.beacon.visible = false;
            spawnParts(vEnt.pos.x, vEnt.pos.y + 1, vEnt.pos.z, 0x4ade80, 22);
          }
          broadcastNetMessage({
            type: 'villager:rescued',
            villagerId: res.villager.id,
            rescuedCount: PL1.villagersRescued,
          });
        }
        soundEngine.playTame();
        syncInventoryUI(PL1);
        showToast(
          `🎉 ¡Aldeano rescatado en la Aldea! (${PL1.villagersRescued}/${TOTAL_VILLAGERS_TO_RESCUE})`,
          4200
        );
        return true;
      }
      return false;
    };

    const useOrMountBoat = (): boolean => {
      // 1. Si ya estamos en el bote, primero comprobar si podemos rescatar/entregar un aldeano
      if (PL1.inBoat) {
        if (rescueInteract()) return true;
        // Si no hay rescate inmediato, bajarse del bote
        dismountBoatLogic(world, PL1);
        syncInventoryUI(PL1);
        showToast('⚓ Has bajado del bote.', 2000);
        return true;
      }

      // 2. Si hay un bote colocado cerca, subirse a él
      let closestBoat: ThreeBoat | null = null;
      let bestDist = 5.5;
      for (const b of BOATS) {
        const d = Math.hypot(b.pos.x - PL1.pos.x, b.pos.z - PL1.pos.z);
        if (d < bestDist) {
          bestDist = d;
          closestBoat = b;
        }
      }
      if (closestBoat && mountBoatLogic(PL1, closestBoat)) {
        soundEngine.playPlace();
        syncInventoryUI(PL1);
        showToast('⛵ ¡Subiste al Bote! Usa WASD o el Joystick para navegar rápido por el mar.', 3200);
        return true;
      }

      // 3. Si tenemos un Bote en el inventario, colocarlo en el agua y subir
      if (countItemInInventory(PL1, BT.BOAT) > 0) {
        const look = getLookDir();
        const targetX = PL1.pos.x + look.x * 3.0;
        const targetZ = PL1.pos.z + look.z * 3.0;
        const res = placeBoatInWaterLogic(world, PL1, [], targetX, targetZ, nextBoatId++);
        if (res.placed && res.boat) {
          const tb = spawnBoatMesh(res.boat);
          mountBoatLogic(PL1, tb);
          soundEngine.playPlace();
          syncInventoryUI(PL1);
          showToast('⛵ ¡Bote colocado en el mar! Navega hacia las islas para rescatar aldeanos.', 3500);
          return true;
        } else {
          showToast('💧 Acércate a la orilla del mar y apunta al agua para colocar tu Bote.', 2800);
          return true;
        }
      }

      return false;
    };

    const swapSlots = (idxA: number, idxB: number) => {
      swapInventorySlots(PL1, idxA, idxB);
      syncInventoryUI(PL1);
    };

    const requestPointerLock = () => {
      soundEngine.unlock();
      setInventoryOpen(false);
      setGameState('playing');
      if (!isTouchDeviceRef.current) {
        try {
          renderer.domElement.requestPointerLock();
        } catch {
          // Ignore pointer lock rejection in headless/mobile
        }
      }
    };

    const respawnPlayer = () => {
      const sy = surfY(world, 0, 0) + 1;
      PL1.pos = { x: SPAWN_X, y: sy, z: SPAWN_Z };
      PL1.vel = { x: 0, y: 0, z: 0 };
      PL1.hp = 20;
      PL1.inBoat = false;
      PL1.activeBoatId = null;
      setHp(20);
      syncInventoryUI(PL1);
      requestPointerLock();
    };

    let dayTime = 0.28;

    const toggleTimeOfDay = () => {
      if (isNightTime(dayTime)) {
        dayTime = 0.3;
        showToast('☀️ Amanecer: Zombies, Arañas y Endermans desaparecen con la luz del sol', 2600);
      } else {
        dayTime = 0.85;
        showToast('🌙 Noche cerrada: ¡Cuidado con los Zombies y las nuevas Arañas saltadoras!', 2800);
      }
      setDayPhase(getDayPhaseLabel(dayTime));
      setIsNightUI(isNightTime(dayTime));
    };

    function getLookDir() {
      return new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ).normalize();
    }

    function hurtPlayer(p: PlayerState, dmg: number) {
      if (p.invul > 0) return;
      p.hp = Math.max(0, p.hp - dmg);
      p.invul = 0.6;
      soundEngine.playHurt();
      setHp(p.hp);
      if (p.hp <= 0) {
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock();
        }
        setGameState('gameover');
      }
    }

    function attackCheck(p: PlayerState) {
      // Si el jugador hace clic sobre un aldeano perdido o en la aldea estando en bote, priorizar rescate
      if (p.inBoat && rescueInteract()) {
        return true;
      }

      const eye = new THREE.Vector3(p.pos.x, p.pos.y + p.eyeH, p.pos.z);
      const dir = getLookDir();
      for (let i = ENT.length - 1; i >= 0; i--) {
        const e = ENT[i];
        if (e.type === 'villager') {
          const ec = new THREE.Vector3(e.pos.x, e.pos.y + 0.9, e.pos.z);
          const toE = ec.clone().sub(eye);
          if (toE.length() < 5.5 && toE.normalize().dot(dir) > 0.65) {
            if (p.inBoat) {
              rescueInteract();
            } else if (!e.rescued) {
              showToast('🛟 ¡Aldeano encontrado! Trae un Bote (5 Tablones) por el agua y haz clic para subirlo.', 3200);
            }
            return true;
          }
          continue;
        }

        const ec = new THREE.Vector3(
          e.pos.x,
          e.pos.y + (e.type === 'enderman' ? 1.4 : e.type === 'spider' ? 0.35 : 0.7),
          e.pos.z
        );
        const toE = ec.clone().sub(eye);
        const dist = toE.length();
        if (dist < 4.2 && toE.normalize().dot(dir) > 0.72) {
          if (
            !hasLineOfSight(
              world,
              p.pos,
              e.pos,
              p.eyeH,
              e.type === 'enderman' ? 1.4 : e.type === 'spider' ? 0.35 : 0.7
            )
          ) {
            continue;
          }
          e.hp -= 5;
          e.vel.x = dir.x * 7;
          e.vel.z = dir.z * 7;
          e.vel.y = 4;
          if (e.type === 'wolf') {
            e.angry = true;
            e.tamed = false;
            if (e.collar) e.collar.visible = false;
            if (e.eyeMat) e.eyeMat.color.setHex(0xff2222);
          }
          if (e.type === 'enderman') e.angry = true;
          spawnParts(e.pos.x - 0.5, e.pos.y + 0.5, e.pos.z - 0.5, 0xff3333, 12);
          soundEngine.playHit();
          if (e.hp <= 0) {
            e.alive = false;
            scene.remove(e.mesh);
            ENT.splice(i, 1);
            spawnParts(e.pos.x - 0.5, e.pos.y + 0.5, e.pos.z - 0.5, 0xffffff, 18);
          }
          return true;
        }
      }
      return false;
    }

    function breakBlock(p: PlayerState) {
      soundEngine.playSwing();
      if (attackCheck(p)) return;
      const hit = raycastBlock(world, p.pos, p.eyeH, yaw, pitch);
      if (hit) {
        const res = breakBlockLogic(world, p, hit.bx, hit.by, hit.bz);
        if (res.broken && res.oldType) {
          const def = BD[res.oldType];
          spawnParts(hit.bx, hit.by, hit.bz, def ? def.c : 0xaaaaaa, 12);
          soundEngine.playBreak();
          syncInventoryUI(p);
          rebuildMeshes(p.pos.x, p.pos.z);

          // Sincronizar con otros jugadores vía PeerJS
          broadcastNetMessage({
            type: 'block:set',
            x: hit.bx,
            y: hit.by,
            z: hit.bz,
            t: BT.AIR,
          });

          if (res.collected && def) {
            if (res.oldType === BT.WOOD) {
              showToast(
                '🪵 +1 Madera — Pulsa [C] para hacer 4 Tablones (con 5 Tablones fabricas un Bote [B])',
                3000
              );
            } else {
              showToast(`🎒 +1 ${def.n} guardado en tu inventario`, 1800);
            }
          }
        }
      }
    }

    function placeBlock(p: PlayerState) {
      // 1. Si estamos en bote y hacemos clic derecho, comprobar rescate de aldeano primero
      if (p.inBoat && rescueInteract()) {
        return;
      }

      // 2. Comprobar si estamos mirando un bote cercano para subirnos
      const eye = new THREE.Vector3(p.pos.x, p.pos.y + p.eyeH, p.pos.z);
      const dir = getLookDir();
      if (!p.inBoat) {
        for (const b of BOATS) {
          const bc = new THREE.Vector3(b.pos.x, b.pos.y + 0.2, b.pos.z);
          const toB = bc.sub(eye);
          if (toB.length() < 5.0 && toB.normalize().dot(dir) > 0.65) {
            if (mountBoatLogic(p, b)) {
              soundEngine.playPlace();
              syncInventoryUI(p);
              showToast('⛵ ¡Subiste al Bote! Navega hacia las islas para rescatar aldeanos.', 3000);
              return;
            }
          }
        }
      }

      // 3. Domesticar lobo si miramos a un lobo
      for (const e of ENT) {
        if (e.type === 'wolf' && !e.tamed) {
          const ec = new THREE.Vector3(e.pos.x, e.pos.y + 0.5, e.pos.z);
          const toE = ec.sub(eye);
          if (toE.length() < 3.8 && toE.normalize().dot(dir) > 0.75) {
            e.tamed = true;
            e.angry = false;
            e.owner = p;
            if (e.collar) e.collar.visible = true;
            if (e.eyeMat) e.eyeMat.color.setHex(0x222222);
            spawnParts(e.pos.x - 0.5, e.pos.y + 0.6, e.pos.z - 0.5, 0xff3366, 15);
            soundEngine.playTame();
            showToast('🐺 ¡Lobo domesticado! Ahora te acompañará y defenderá.');
            return;
          }
        }
      }

      // 4. Si el ítem seleccionado en la mano es un Bote (BT.BOAT), colocarlo en el agua
      const currentSlot = p.inventory[p.si];
      if (currentSlot && currentSlot.type === BT.BOAT && currentSlot.count > 0) {
        useOrMountBoat();
        return;
      }

      const hit = raycastBlock(world, p.pos, p.eyeH, yaw, pitch);
      if (!hit) return;

      const b = gB(world, hit.bx, hit.by, hit.bz);
      if (b === BT.TABLE) {
        craftPlanks();
        return;
      }
      if (b === BT.BED) {
        dayTime = 0.28;
        p.hp = 20;
        setHp(20);
        spawnParts(hit.bx, hit.by + 1, hit.bz, 0x55ff88, 20);
        showToast('🛏️ ¡Has dormido! Es de día y tu vida está al máximo.');
        return;
      }

      if (!currentSlot || currentSlot.count <= 0) {
        showToast('⛏️ Ranura vacía: Rompe bloques (clic izq.) o craftea tablones [C] / bote [B]', 2500);
        return;
      }

      const res = placeBlockLogic(world, p, hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz);
      if (res.placed) {
        soundEngine.playPlace();
        syncInventoryUI(p);
        rebuildMeshes(p.pos.x, p.pos.z);

        broadcastNetMessage({
          type: 'block:set',
          x: res.tx,
          y: res.ty,
          z: res.tz,
          t: res.blockType,
        });
      }
    }

    actionsRef.current = {
      requestPointerLock,
      respawnPlayer,
      selectHotbarSlot,
      craftPlanks,
      craftDoor,
      craftBoat,
      useOrMountBoat,
      rescueInteract,
      swapSlots,
      toggleTimeOfDay,
      createMultiplayerRoom,
      joinMultiplayerRoom,
      triggerAttackOrBreak: () => breakBlock(PL1),
      triggerPlaceOrInteract: () => placeBlock(PL1),
      triggerJump: () => {
        jumpJustPressed = true;
      },
      rotateCameraBy: (dYaw: number, dPitch: number) => {
        yaw -= dYaw;
        pitch = Math.max(-1.48, Math.min(1.48, pitch - dPitch));
      },
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      setPointerLocked(locked);
      if (locked) {
        setGameState('playing');
        setInventoryOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // No interceptar teclas si el jugador está escribiendo el código de sala en el input
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.code === 'Space' && !keys['Space']) {
        jumpJustPressed = true;
      }
      keys[e.code] = true;
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code[5], 10) - 1;
        if (n >= 0 && n < HOTBAR_SIZE) {
          selectHotbarSlot(n);
        }
      }
      if (e.code === 'KeyC' && gameStateRef.current === 'playing') {
        craftPlanks();
      }
      if (e.code === 'KeyV' && gameStateRef.current === 'playing') {
        craftDoor();
      }
      if (e.code === 'KeyB' && gameStateRef.current === 'playing') {
        craftBoat();
      }
      if (e.code === 'KeyF' && gameStateRef.current === 'playing') {
        useOrMountBoat();
      }
      if (e.code === 'KeyR' && gameStateRef.current === 'playing') {
        rescueInteract();
      }
      if (e.code === 'KeyN' && gameStateRef.current === 'playing') {
        toggleTimeOfDay();
      }
      if (e.code === 'KeyI' || e.code === 'KeyE') {
        if (gameStateRef.current === 'playing' || inventoryOpenRef.current) {
          const nextOpen = !inventoryOpenRef.current;
          setInventoryOpen(nextOpen);
          if (nextOpen && document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock();
          }
        }
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        jumpJustReleased = true;
      }
      keys[e.code] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        yaw -= e.movementX * 0.0024;
        pitch = Math.max(-1.48, Math.min(1.48, pitch - e.movementY * 0.0024));
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing' || inventoryOpenRef.current || showCodeModalRef.current) return;
      if (isTouchDeviceRef.current) return;
      if (document.pointerLockElement !== renderer.domElement) {
        requestPointerLock();
        return;
      }
      if (e.button === 0) breakBlock(PL1);
      if (e.button === 2) placeBlock(PL1);
    };

    const onWheel = (e: WheelEvent) => {
      if (gameStateRef.current !== 'playing' || inventoryOpenRef.current) return;
      selectHotbarSlot(PL1.si + (e.deltaY > 0 ? 1 : -1));
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('wheel', onWheel);
    window.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // 10. PHYSICS & AI LOOP (Spiders, Zombies, Ultra-rare Endermans, Lost Villagers)
    let zSpawnTmr = 2;
    let sSpawnTmr = 2.5;
    let enderSpawnTmr = 60;

    function updateCameraAndHighlight(p: PlayerState) {
      cam1.position.set(p.pos.x, p.pos.y + p.eyeH, p.pos.z);
      const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
      cam1.quaternion.setFromEuler(euler);

      const hit = raycastBlock(world, p.pos, p.eyeH, yaw, pitch);
      if (hit) {
        hlBox.position.set(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
        hlBox.visible = true;
      } else {
        hlBox.visible = false;
      }
    }

    function aiEnts(dt: number, t: number) {
      const night = isNightTime(dayTime);

      // 1) Regla del Día y la Noche: Al hacerse de día, Zombies, Arañas y Endermans desaparecen inmediatamente
      const despawned = despawnDaytimeMonsters(ENT, dayTime);
      if (despawned.length > 0) {
        for (let i = ENT.length - 1; i >= 0; i--) {
          if (!ENT[i].alive) {
            const m = ENT[i];
            scene.remove(m.mesh);
            spawnParts(m.pos.x - 0.5, m.pos.y + 0.6, m.pos.z - 0.5, 0xffaa33, 12);
            ENT.splice(i, 1);
          }
        }
      }

      // 2) Spawn constante nocturno de Zombies y Arañas, y probabilidad mínima de Enderman
      if (night) {
        zSpawnTmr -= dt;
        const zCnt = ENT.filter((e) => e.type === 'zombie').length;
        if (zSpawnTmr <= 0 && zCnt < MAX_ZOMBIES) {
          zSpawnTmr = 4.2 + Math.random() * 3.2;
          const ang = Math.random() * 6.28;
          const dist = 15 + Math.random() * 14;
          addZombie(PL1.pos.x + Math.cos(ang) * dist, PL1.pos.z + Math.sin(ang) * dist);
        }

        sSpawnTmr -= dt;
        const sCnt = ENT.filter((e) => e.type === 'spider').length;
        if (sSpawnTmr <= 0 && sCnt < MAX_SPIDERS) {
          sSpawnTmr = 4.5 + Math.random() * 3.5;
          const ang = Math.random() * 6.28;
          const dist = 14 + Math.random() * 14;
          addSpider(PL1.pos.x + Math.cos(ang) * dist, PL1.pos.z + Math.sin(ang) * dist);
        }

        enderSpawnTmr -= dt;
        const enderCnt = ENT.filter((e) => e.type === 'enderman').length;
        if (enderSpawnTmr <= 0 && enderCnt < MAX_ENDERMEN) {
          enderSpawnTmr = 65 + Math.random() * 45;
          if (Math.random() < ENDERMAN_SPAWN_CHANCE) {
            const ang = Math.random() * 6.28;
            const dist = 24 + Math.random() * 16;
            addEnderman(PL1.pos.x + Math.cos(ang) * dist, PL1.pos.z + Math.sin(ang) * dist);
          }
        }
      }

      // 3) IA de Entidades y Línea de Visión
      for (const e of ENT) {
        if (e.inBoat) continue;

        e.tmr -= dt;
        if (e.atkCd > 0) e.atkCd -= dt;
        if (e.tpCd !== undefined && e.tpCd > 0) e.tpCd -= dt;
        if (e.jumpCd !== undefined && e.jumpCd > 0) e.jumpCd -= dt;

        const { pl: targetPlayer } = nearestPlayer(e.pos, PL1);
        const dxP = targetPlayer.pos.x - e.pos.x;
        const dzP = targetPlayer.pos.z - e.pos.z;
        const distP = Math.hypot(dxP, dzP);

        // Aldeanos perdidos esperan quietos hasta ser rescatados
        if (e.type === 'villager' && !e.rescued) {
          e.vel.x = 0;
          e.vel.z = 0;
          // Mirar hacia el jugador cuando se acerca y hacer flotar su marcador dorado
          if (distP < 18) {
            e.dir = Math.atan2(dxP, dzP);
            e.mesh.rotation.y = e.dir;
          }
          if (e.beacon) {
            e.beacon.position.y = 2.2 + Math.sin(t * 4 + e.id) * 0.18;
            e.beacon.rotation.y = t * 2.2;
          }
          stepEntityMovementWithCollision(world, e, dt);
          e.mesh.position.set(e.pos.x, e.pos.y, e.pos.z);
          continue;
        }

        if (e.type === 'shark') {
          if (distP < 18 && targetPlayer.pos.y <= SEA + 1.5 && !targetPlayer.inBoat) {
            e.dir = Math.atan2(dxP, dzP);
            e.vel.x = Math.sin(e.dir) * e.spd * 1.35;
            e.vel.z = Math.cos(e.dir) * e.spd * 1.35;
            if (
              distP < 1.8 &&
              e.atkCd <= 0 &&
              hasLineOfSight(world, e.pos, targetPlayer.pos, 0.2, PH * 0.5)
            ) {
              hurtPlayer(targetPlayer, 4);
              e.atkCd = 1.1;
            }
          } else if (e.tmr <= 0) {
            e.tmr = 2 + Math.random() * 3;
            e.dir += (Math.random() - 0.5) * 2.2;
            e.vel.x = Math.sin(e.dir) * e.spd * 0.6;
            e.vel.z = Math.cos(e.dir) * e.spd * 0.6;
          }
          const nx = e.pos.x + e.vel.x * dt;
          const nz = e.pos.z + e.vel.z * dt;
          const sy = surfY(world, nx | 0, nz | 0);
          if (sy <= SEA - 1) {
            e.pos.x = nx;
            e.pos.z = nz;
          } else {
            e.dir += Math.PI * 0.8;
            e.vel.x = Math.sin(e.dir) * e.spd;
            e.vel.z = Math.cos(e.dir) * e.spd;
          }
          e.pos.y = SEA - 0.35 + Math.sin(t * 3 + e.dir) * 0.08;
          e.mesh.rotation.y = e.dir;
          if (e.legs[0]) e.legs[0].rotation.y = Math.sin(t * 10) * 0.35;
          continue;
        }

        if (e.type === 'spider') {
          // Nueva Araña: rápida, salta hacia el jugador y respeta estrictamente la Línea de Visión
          const canSee = hasLineOfSight(world, e.pos, targetPlayer.pos, 0.45, PH * 0.7);
          if (distP < 25 && canSee) {
            e.dir = Math.atan2(dxP, dzP);
            e.vel.x = Math.sin(e.dir) * e.spd;
            e.vel.z = Math.cos(e.dir) * e.spd;

            // Pequeños saltos ágiles al acercarse
            if (distP > 2.0 && distP < 10.0 && (e.jumpCd ?? 0) <= 0 && e.vel.y === 0) {
              e.vel.y = 5.2;
              e.jumpCd = 1.6 + Math.random() * 1.2;
            }

            if (distP < 1.65 && Math.abs(targetPlayer.pos.y - e.pos.y) < 1.6 && e.atkCd <= 0) {
              hurtPlayer(targetPlayer, 2);
              e.atkCd = 0.85;
            }
          } else if (e.tmr <= 0) {
            e.tmr = 1.2 + Math.random() * 1.8;
            e.dir = Math.random() * 6.28;
            e.vel.x = Math.sin(e.dir) * e.spd * 0.45;
            e.vel.z = Math.cos(e.dir) * e.spd * 0.45;
          }
        } else if (e.type === 'zombie') {
          const canSee = hasLineOfSight(world, e.pos, targetPlayer.pos, 1.2, PH * 0.75);
          if (distP < 24 && canSee) {
            e.dir = Math.atan2(dxP, dzP);
            e.vel.x = Math.sin(e.dir) * e.spd;
            e.vel.z = Math.cos(e.dir) * e.spd;
            if (distP < 1.55 && Math.abs(targetPlayer.pos.y - e.pos.y) < 1.8 && e.atkCd <= 0) {
              hurtPlayer(targetPlayer, 3);
              e.atkCd = 1.0;
            }
          } else if (e.tmr <= 0) {
            e.tmr = 1.5 + Math.random() * 2;
            e.dir = Math.random() * 6.28;
            e.vel.x = Math.sin(e.dir) * e.spd * 0.4;
            e.vel.z = Math.cos(e.dir) * e.spd * 0.4;
          }
        } else if (e.type === 'enderman') {
          const look = getLookDir();
          const toE = new THREE.Vector3(
            e.pos.x - targetPlayer.pos.x,
            e.pos.y + 1.8 - (targetPlayer.pos.y + 1.4),
            e.pos.z - targetPlayer.pos.z
          ).normalize();
          const canSee = hasLineOfSight(world, e.pos, targetPlayer.pos, 1.8, PH * 0.8);
          if (distP < 22 && look.dot(toE) > 0.92 && canSee) e.angry = true;

          if (e.angry) {
            if (canSee) {
              e.dir = Math.atan2(dxP, dzP);
              e.vel.x = Math.sin(e.dir) * 3.8;
              e.vel.z = Math.cos(e.dir) * 3.8;
              if (distP < 1.75 && Math.abs(targetPlayer.pos.y - e.pos.y) < 2.2 && e.atkCd <= 0) {
                hurtPlayer(targetPlayer, 5);
                e.atkCd = 1.0;
              }
            } else {
              e.vel.x *= 0.5;
              e.vel.z *= 0.5;
            }
          } else if (e.tmr <= 0) {
            e.tmr = 2 + Math.random() * 3;
            e.dir = Math.random() * 6.28;
            e.vel.x = Math.sin(e.dir) * e.spd * 0.5;
            e.vel.z = Math.cos(e.dir) * e.spd * 0.5;
          }
        } else if (e.type === 'wolf') {
          if (e.angry) {
            const canSee = hasLineOfSight(world, e.pos, targetPlayer.pos, 0.5, PH * 0.6);
            if (canSee) {
              e.dir = Math.atan2(dxP, dzP);
              e.vel.x = Math.sin(e.dir) * e.spd * 1.4;
              e.vel.z = Math.cos(e.dir) * e.spd * 1.4;
              if (distP < 1.5 && Math.abs(targetPlayer.pos.y - e.pos.y) < 1.5 && e.atkCd <= 0) {
                hurtPlayer(targetPlayer, 3);
                e.atkCd = 0.9;
              }
            } else {
              e.vel.x = 0;
              e.vel.z = 0;
            }
          } else if (e.tamed && e.owner) {
            let zTarget: ThreeEntity | null = null;
            let zBest = 12;
            for (const o of ENT) {
              if (o.type === 'zombie' || o.type === 'spider' || (o.type === 'enderman' && o.angry)) {
                const d = Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z);
                if (d < zBest) {
                  zBest = d;
                  zTarget = o;
                }
              }
            }
            if (zTarget) {
              e.dir = Math.atan2(zTarget.pos.x - e.pos.x, zTarget.pos.z - e.pos.z);
              e.vel.x = Math.sin(e.dir) * e.spd * 1.4;
              e.vel.z = Math.cos(e.dir) * e.spd * 1.4;
              if (zBest < 1.5 && e.atkCd <= 0) {
                zTarget.hp -= 4;
                e.atkCd = 0.8;
                spawnParts(zTarget.pos.x - 0.5, zTarget.pos.y + 0.6, zTarget.pos.z - 0.5, 0xff3333, 8);
                if (zTarget.hp <= 0) {
                  zTarget.alive = false;
                  scene.remove(zTarget.mesh);
                  ENT.splice(ENT.indexOf(zTarget), 1);
                }
              }
            } else {
              const odx = e.owner.pos.x - e.pos.x;
              const odz = e.owner.pos.z - e.pos.z;
              const od = Math.hypot(odx, odz);
              if (od > 3.2) {
                e.dir = Math.atan2(odx, odz);
                e.vel.x = Math.sin(e.dir) * e.spd * 1.3;
                e.vel.z = Math.cos(e.dir) * e.spd * 1.3;
              } else {
                e.vel.x = 0;
                e.vel.z = 0;
              }
            }
            if (e.tail) e.tail.rotation.y = Math.sin(t * 10) * 0.4;
          } else if (e.tmr <= 0) {
            e.tmr = 2 + Math.random() * 4;
            if (Math.random() < 0.35) {
              e.vel.x = 0;
              e.vel.z = 0;
            } else {
              e.dir = Math.random() * 6.28;
              e.vel.x = Math.sin(e.dir) * e.spd * 0.6;
              e.vel.z = Math.cos(e.dir) * e.spd * 0.6;
            }
          }
        } else if (e.tmr <= 0) {
          e.tmr = 1.5 + Math.random() * 3.5;
          if (Math.random() < 0.4) {
            e.vel.x = 0;
            e.vel.z = 0;
          } else {
            e.dir = Math.random() * 6.28;
            if (e.home) {
              const dh = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z);
              if (dh > VILLAGE_SIZE) e.dir = Math.atan2(e.home.x - e.pos.x, e.home.z - e.pos.z);
            }
            e.vel.x = Math.sin(e.dir) * e.spd;
            e.vel.z = Math.cos(e.dir) * e.spd;
          }
        }

        stepEntityMovementWithCollision(world, e, dt);
        e.mesh.position.set(e.pos.x, e.pos.y, e.pos.z);
        e.mesh.rotation.y = e.dir;

        const moving = Math.hypot(e.vel.x, e.vel.z) > 0.1;
        for (let i = 0; i < e.legs.length; i++) {
          if (e.type === 'spider') {
            e.legs[i].rotation.y = moving ? Math.sin(t * 14 + i * 0.9) * 0.35 : 0;
          } else {
            e.legs[i].rotation.x = moving ? Math.sin(t * 8 + i * Math.PI) * 0.6 : 0;
          }
        }
      }
    }

    function updBoatsAndRemotePeers(dt: number, t: number) {
      for (const b of BOATS) {
        const bob = Math.sin(t * 2.8 + b.id) * 0.04;
        b.mesh.position.set(b.pos.x, b.pos.y + bob, b.pos.z);
        b.mesh.rotation.y = b.yaw;
      }

      for (const rp of remotePeers.values()) {
        rp.mesh.position.lerp(rp.targetPos, Math.min(1, dt * 12));
        rp.mesh.rotation.y = rp.yaw;
        rp.head.rotation.x = rp.pitch;
        const moving = rp.mesh.position.distanceTo(rp.targetPos) > 0.05;
        rp.legs[0].rotation.x = moving && !rp.inBoat ? Math.sin(t * 9) * 0.6 : 0;
        rp.legs[1].rotation.x = moving && !rp.inBoat ? -Math.sin(t * 9) * 0.6 : 0;
      }
    }

    function updParts(dt: number) {
      for (let i = PARTS.length - 1; i >= 0; i--) {
        const p = PARTS[i];
        p.life -= dt;
        p.vel.y -= 14 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.01, p.life));
        if (p.life <= 0) {
          scene.remove(p.mesh);
          PARTS.splice(i, 1);
        }
      }
    }

    // 11. DAY/NIGHT GLOBAL ILLUMINATION, SKY, MOON & STARS
    const daySkyColor = new THREE.Color(0x7ec8e3);
    const duskSkyColor = new THREE.Color(0xd97757);
    const nightSkyColor = new THREE.Color(0x060916);
    const curSkyColor = new THREE.Color();

    let hudTick = 0;
    let netSyncTick = 0;

    function updDayNightAndSky(dt: number) {
      dayTime = (dayTime + dt * 0.0065) % 1;
      const sunAngle = (dayTime - 0.25) * Math.PI * 2;
      const sunElev = Math.sin(sunAngle);
      const sunHoriz = Math.cos(sunAngle);

      const nightFactor = Math.max(0, Math.min(1, (-sunElev + 0.15) / 0.45));
      const twilightFactor = Math.max(0, 1 - Math.abs(sunElev) * 3.2);

      const daylightFactor = 1 - nightFactor;
      sunLight.intensity = 0.08 + daylightFactor * 0.88;
      ambLight.intensity = 0.16 + daylightFactor * 0.46;
      hemiLight.intensity = 0.1 + daylightFactor * 0.26;

      curSkyColor.copy(daySkyColor).lerp(nightSkyColor, nightFactor);
      if (twilightFactor > 0) {
        curSkyColor.lerp(duskSkyColor, twilightFactor * 0.45);
      }
      (scene.background as THREE.Color).copy(curSkyColor);
      (scene.fog as THREE.Fog).color.copy(curSkyColor);

      skyGroup.position.set(PL1.pos.x, 0, PL1.pos.z);
      const orbitR = 88;
      sunMesh.position.set(sunHoriz * orbitR, sunElev * orbitR + 12, -22);
      sunMesh.visible = sunElev > -0.18;

      moonGroup.position.set(-sunHoriz * orbitR, -sunElev * orbitR + 12, 22);
      moonGroup.visible = -sunElev > -0.18;
      moonGroup.lookAt(PL1.pos.x, PL1.pos.y, PL1.pos.z);

      starMat.opacity = Math.max(0, Math.min(0.95, (nightFactor - 0.2) * 1.25));
      starField.rotation.y += dt * 0.008;

      sunLight.position.set(
        PL1.pos.x + (sunElev >= 0 ? sunHoriz : -sunHoriz) * 55,
        Math.max(25, Math.abs(sunElev) * 85 + 20),
        PL1.pos.z + 30
      );

      soundEngine.tickAmbientMusic(dt, isNightTime(dayTime), gameStateRef.current === 'playing');

      netSyncTick += dt;
      if (netSyncTick >= 0.05 && activeConnections.size > 0 && peerInstance) {
        netSyncTick = 0;
        broadcastNetMessage({
          type: 'player:move',
          peerId: peerInstance.id,
          x: PL1.pos.x,
          y: PL1.pos.y,
          z: PL1.pos.z,
          yaw,
          pitch,
          inBoat: PL1.inBoat,
        });
      }

      hudTick += dt;
      if (hudTick > 0.25) {
        hudTick = 0;
        setCoords({
          x: PL1.pos.x | 0,
          y: PL1.pos.y | 0,
          z: PL1.pos.z | 0,
        });
        const distV = getDistanceToVillage(PL1.pos);
        setVillageDist(distV);
        setVillageDir(getCompassDirectionToVillage(PL1.pos));

        // Calcular el aldeano perdido más cercano para guiar el rescate
        let nearestV: ThreeEntity | null = null;
        let bestVD = Infinity;
        for (const e of ENT) {
          if (e.type === 'villager' && !e.rescued && !e.inBoat) {
            const d = Math.hypot(e.pos.x - PL1.pos.x, e.pos.z - PL1.pos.z);
            if (d < bestVD) {
              bestVD = d;
              nearestV = e;
            }
          }
        }
        if (nearestV) {
          setNearestLostVillagerDist(Math.round(bestVD));
          const dx = nearestV.pos.x - PL1.pos.x;
          const dz = nearestV.pos.z - PL1.pos.z;
          const ns = dz < -8 ? 'N' : dz > 8 ? 'S' : '';
          const ew = dx > 8 ? 'E' : dx < -8 ? 'O' : '';
          setNearestLostVillagerDir(ns + ew || 'Aquí');
        } else {
          setNearestLostVillagerDist(null);
        }

        if (PL1.villageDiscovered) {
          setVillageDiscovered((prev) => {
            if (!prev) {
              showToast('🏘️ ¡Has llegado a la Aldea vacía! Rescata a los aldeanos en bote y tráelos aquí.', 5000);
            }
            return true;
          });
        }
        setDayPhase(getDayPhaseLabel(dayTime));
        setIsNightUI(isNightTime(dayTime));
      }
    }

    // 12. RESIZE & ANIMATION LOOP
    const onResize = () => {
      cam1.aspect = window.innerWidth / window.innerHeight;
      cam1.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    let lastT = performance.now();
    let animFrameId = 0;

    function animate(now: number) {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const t = now * 0.001;

      if (gameStateRef.current === 'playing') {
        const activeBoat = getActiveBoat();
        const physRes = stepPlayerPhysics(
          world,
          PL1,
          {
            fwd: !!(keys['KeyW'] || keys['ArrowUp']),
            back: !!(keys['KeyS'] || keys['ArrowDown']),
            left: !!(keys['KeyA'] || keys['ArrowLeft']),
            right: !!(keys['KeyD'] || keys['ArrowRight']),
            jumpHeld: !!keys['Space'],
            jumpJustPressed,
            jumpJustReleased,
            yaw,
            joyX: joyVecRef.current.x,
            joyY: joyVecRef.current.y,
          },
          dt,
          activeBoat
        );
        jumpJustPressed = false;
        jumpJustReleased = false;

        if (physRes.jumped) {
          soundEngine.playJump();
        }
        if (physRes.footstepTriggered) {
          soundEngine.playFootstep(physRes.inWater);
        }

        const curCx = Math.floor(PL1.pos.x / 16);
        const curCz = Math.floor(PL1.pos.z / 16);
        if (curCx !== lastBuiltCenterCx || curCz !== lastBuiltCenterCz) {
          rebuildMeshes(PL1.pos.x, PL1.pos.z);
        }

        aiEnts(dt, t);
        updBoatsAndRemotePeers(dt, t);
        updParts(dt);
        updDayNightAndSky(dt);
      }

      updateCameraAndHighlight(PL1);
      renderer.render(scene, cam1);
    }

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (toastTimer) window.clearTimeout(toastTimer);
      if (peerInstance) peerInstance.destroy();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(STANDALONE_HTML_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2200);
    } catch {
      setCopiedRoomCode(false);
    }
  };

  const woodCount = countItemInInventory({ inventory } as PlayerState, BT.WOOD);
  const plankCount = countItemInInventory({ inventory } as PlayerState, BT.PLANK);
  const boatCount = countItemInInventory({ inventory } as PlayerState, BT.BOAT);
  const activeSlotItem = inventory[selectedSlot];
  const activeItemDef = activeSlotItem ? BD[activeSlotItem.type] : null;

  const handleInventorySlotClick = (idx: number) => {
    if (swapSourceIdx === null) {
      if (idx < HOTBAR_SIZE) {
        actionsRef.current?.selectHotbarSlot(idx);
      }
      setSwapSourceIdx(idx);
    } else if (swapSourceIdx === idx) {
      setSwapSourceIdx(null);
    } else {
      actionsRef.current?.swapSlots(swapSourceIdx, idx);
      if (idx < HOTBAR_SIZE) {
        actionsRef.current?.selectHotbarSlot(idx);
      }
      setSwapSourceIdx(null);
    }
  };

  // Virtual Joystick Touch Handlers
  const updateJoystickFromPoint = (clientX: number, clientY: number, rect: DOMRect) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 0 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 0 ? Math.sin(angle) * clamped : 0;
    setJoyKnob({ x: kx, y: ky });
    joyVecRef.current = { x: kx / maxR, y: ky / maxR };
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070b] select-none font-sans">
      {/* FULLSCREEN WEBGL CANVAS MOUNT */}
      <div
        ref={mountRef}
        className="w-screen h-screen block"
        onTouchStart={(e) => {
          if (gameState !== 'playing' || inventoryOpen) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.clientX > window.innerWidth * 0.35 && !lookTouchRef.current) {
              lookTouchRef.current = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
            }
          }
        }}
        onTouchMove={(e) => {
          if (!lookTouchRef.current) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookTouchRef.current.id) {
              const dx = t.clientX - lookTouchRef.current.lastX;
              const dy = t.clientY - lookTouchRef.current.lastY;
              lookTouchRef.current.lastX = t.clientX;
              lookTouchRef.current.lastY = t.clientY;
              actionsRef.current?.rotateCameraBy(dx * 0.0055, dy * 0.0055);
            }
          }
        }}
        onTouchEnd={(e) => {
          const curLook = lookTouchRef.current;
          if (!curLook) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === curLook.id) {
              lookTouchRef.current = null;
            }
          }
        }}
      />

      {/* TITLE / MULTIPLAYER ROOMS / PAUSE / GAME OVER OVERLAY */}
      {gameState !== 'playing' && (
        <div
          id="overlay"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-4 py-6 text-slate-100 bg-[radial-gradient(circle_at_50%_35%,rgba(16,36,28,0.86),rgba(6,10,15,0.95))] backdrop-blur-md overflow-y-auto"
        >
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-cyan-400 mb-1.5 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] text-center">
            Multijugador Online P2P • El Rescate de la Aldea • Supervivencia
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-wider text-emerald-400 drop-shadow-[0_0_24px_rgba(74,222,128,0.55)] mb-1.5 text-center">
            {gameState === 'gameover' ? 'HAS MUERTO' : 'VOXELWORLD'}
          </h1>

          <p className="text-xs md:text-sm tracking-[0.16em] uppercase text-cyan-300/90 mb-5 text-center max-w-xl drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
            {gameState === 'gameover'
              ? 'Los peligros de la noche te han derrotado'
              : 'La aldea está vacía: fabrica un Bote (5 Tablones), navega por las islas lejanas y rescata a los aldeanos'}
          </p>

          {/* MULTIPLAYER ROOM BUTTONS: CREAR SALA / UNIRSE A SALA / JUGAR */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <button
              id="btnCreateRoom"
              type="button"
              onClick={() => {
                actionsRef.current?.createMultiplayerRoom();
              }}
              className="px-7 py-3.5 rounded-xl font-black text-sm md:text-base tracking-wider uppercase text-emerald-50 bg-emerald-500/25 border border-emerald-400/75 shadow-[0_0_24px_rgba(74,222,128,0.35),inset_0_0_12px_rgba(34,211,238,0.2)] hover:bg-emerald-500/40 hover:scale-105 transition-all cursor-pointer"
            >
              📡 Crear Sala
            </button>

            <button
              id="btnJoinRoomToggle"
              type="button"
              onClick={() => {
                setRoomMode((prev) => (prev === 'join-input' ? 'none' : 'join-input'));
              }}
              className="px-7 py-3.5 rounded-xl font-black text-sm md:text-base tracking-wider uppercase text-cyan-50 bg-cyan-500/25 border border-cyan-400/75 shadow-[0_0_24px_rgba(34,211,238,0.32)] hover:bg-cyan-500/40 hover:scale-105 transition-all cursor-pointer"
            >
              🔗 Unirse a Sala
            </button>

            <button
              id="btnPlay"
              type="button"
              onClick={() => {
                if (gameState === 'gameover') {
                  actionsRef.current?.respawnPlayer();
                } else {
                  actionsRef.current?.requestPointerLock();
                }
              }}
              className="px-7 py-3.5 rounded-xl font-black text-sm md:text-base tracking-wider uppercase text-slate-100 bg-white/10 border border-white/25 hover:bg-white/20 transition-all cursor-pointer"
            >
              {gameState === 'gameover' ? '▶ Reaparecer' : '▶ Jugar Ya'}
            </button>
          </div>

          {/* PANEL DE SALA CREADA (CÓDIGO CORTO DE 5 CARACTERES) */}
          {roomMode === 'created' && roomCode && (
            <div
              id="createdRoomPanel"
              className="mb-5 px-6 py-4 rounded-2xl bg-[#0a0a0f]/80 border border-emerald-400/50 shadow-[0_0_30px_rgba(74,222,128,0.25)] flex flex-col items-center gap-2.5 max-w-md w-full"
            >
              <div className="text-[11px] uppercase tracking-widest text-emerald-300 font-bold">
                Código de tu Sala Multijugador (PeerJS P2P)
              </div>
              <div className="flex items-center gap-3">
                <span
                  id="roomCodeDisplay"
                  className="px-5 py-2 rounded-xl bg-black/60 border border-cyan-400/50 font-mono text-2xl font-black tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                >
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/35 cursor-pointer"
                >
                  {copiedRoomCode ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 text-center">
                Estado: <span className="text-emerald-300 font-semibold">{netStatus}</span>
              </div>
              <button
                id="btnEnterCreatedRoom"
                type="button"
                onClick={() => actionsRef.current?.requestPointerLock()}
                className="w-full mt-1 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-emerald-500/30 text-emerald-100 border border-emerald-400/70 hover:bg-emerald-500/45 cursor-pointer"
              >
                ▶ Entrar al Mundo (Sala {roomCode})
              </button>
            </div>
          )}

          {/* PANEL PARA UNIRSE A SALA (INPUT DE CÓDIGO) */}
          {(roomMode === 'join-input' || roomMode === 'connected') && (
            <div
              id="joinRoomPanel"
              className="mb-5 px-6 py-4 rounded-2xl bg-[#0a0a0f]/80 border border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.22)] flex flex-col items-center gap-3 max-w-md w-full"
            >
              <div className="text-[11px] uppercase tracking-widest text-cyan-300 font-bold">
                Escribe el Código de Sala de tu Amigo
              </div>
              <div className="flex items-center gap-2 w-full">
                <input
                  id="inputRoomCode"
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="EJ: VX7K2"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/65 border border-cyan-400/50 font-mono text-lg font-extrabold tracking-[0.2em] text-center text-cyan-200 uppercase focus:outline-none focus:border-emerald-400"
                />
                <button
                  id="btnConnectRoom"
                  type="button"
                  onClick={() => {
                    actionsRef.current?.joinMultiplayerRoom(joinCodeInput);
                    actionsRef.current?.requestPointerLock();
                  }}
                  className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-cyan-500/30 text-cyan-100 border border-cyan-400/70 hover:bg-cyan-500/45 cursor-pointer"
                >
                  Conectar y Jugar
                </button>
              </div>
              {roomCode && (
                <div className="text-[11px] text-slate-400">
                  Estado: <span className="text-cyan-300 font-semibold">{netStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* CONTROLS & RESCUE STORY CARD (Dark Glassmorphism) */}
          <div className="cg grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-300 bg-[#0a0a0f]/75 backdrop-blur-md px-6 py-4 rounded-2xl border border-emerald-400/30 shadow-[0_12px_36px_rgba(0,0,0,0.65)] max-w-xl w-full mb-3">
            <div className="col-span-full text-center text-[11px] font-bold tracking-[0.22em] uppercase text-cyan-400 pb-1.5 mb-1 border-b border-cyan-400/20">
              Historia de Rescate, Botes y Controles
            </div>
            <div>
              <b className="text-emerald-400">WASD / Joystick</b> — Mover y Navegar en Bote
            </div>
            <div>
              <b className="text-emerald-400">Tecla C (1 Madera)</b> — Craftear 4 Tablones
            </div>
            <div>
              <b className="text-emerald-400">Tecla B (5 Tablones)</b> — Craftear 1 Bote (⛵)
            </div>
            <div>
              <b className="text-emerald-400">Clic Der. en Agua / [F]</b> — Colocar / Subir al Bote
            </div>
            <div>
              <b className="text-emerald-400">Clic en Aldeano (en Bote)</b> — Subir pasajero al Bote
            </div>
            <div>
              <b className="text-emerald-400">Clic en la Aldea (en Bote)</b> — Desembarcar y Rescatar
            </div>
            <div className="col-span-full text-center text-[11px] text-cyan-300/90 pt-1.5 border-t border-white/10">
              🕷️ De noche aparecen Zombies y Arañas saltadoras • 🛡️ Los bloques sólidos bloquean ataques
            </div>
          </div>

          <button
            id="btnViewCode"
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="px-4 py-2 rounded-lg font-bold text-[11px] tracking-wider uppercase text-cyan-200/80 bg-[#0a0a0f]/60 border border-cyan-400/30 hover:bg-cyan-500/20 cursor-pointer"
          >
            {'</>'} Ver Código HTML
          </button>
        </div>
      )}

      {/* 1-PLAYER / MULTIPLAYER FULLSCREEN HUD (DARK GLASSMORPHISM) */}
      <div
        id="phud1"
        className={`phud absolute inset-0 pointer-events-none z-20 ${
          gameState === 'playing' ? 'block' : 'hidden'
        }`}
      >
        {/* Crosshair */}
        <div className="xh absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-[18px]">
          <span className="absolute left-[8px] top-0 w-[2px] h-[18px] bg-emerald-400 rounded-[1px] shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
          <span className="absolute top-[8px] left-0 w-[18px] h-[2px] bg-emerald-400 rounded-[1px] shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
        </div>

        {/* Top-left Info Badge (.inf) + Village Rescue Mission Tracker */}
        <div
          id="inf1"
          className="inf absolute top-4 left-4 bg-[#0a0a0f]/65 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-400/30 shadow-[0_4px_20px_rgba(0,0,0,0.55),0_0_14px_rgba(74,222,128,0.12)] text-xs leading-relaxed text-slate-100 max-w-xs"
        >
          <div className="flex items-center justify-between gap-2 font-bold text-emerald-400">
            <span>🌲 SUPERVIVENCIA</span>
            <span className="text-cyan-300">{dayPhase}</span>
          </div>

          {roomCode && (
            <div className="mt-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-[11px] flex items-center justify-between gap-2">
              <span className="text-cyan-300 font-mono font-bold">📡 Sala: {roomCode}</span>
              <span className="text-[10px] text-emerald-300">
                {connectedPeersCount > 0 ? `🟢 ${connectedPeersCount + 1} Jugadores` : 'Esperando amigo'}
              </span>
            </div>
          )}

          <div className="text-slate-300 font-mono text-[11px] mt-1">
            XYZ: <span className="text-cyan-300">{coords.x}</span>,{' '}
            <span className="text-cyan-300">{coords.y}</span>,{' '}
            <span className="text-cyan-300">{coords.z}</span>
            {inBoatUI && <span className="ml-2 text-amber-300 font-bold">⛵ Navegando</span>}
          </div>

          {/* Misión Principal: El Rescate de la Aldea */}
          <div
            id="missionTracker"
            className="mt-1.5 pt-1.5 border-t border-white/10 text-[11px] space-y-0.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-amber-300 font-bold">🛟 Rescate Aldea:</span>
              <span id="rescuedCountBadge" className="text-emerald-400 font-extrabold font-mono">
                {villagersRescued} / {TOTAL_VILLAGERS_TO_RESCUE} Aldeanos
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
              <span>🏘️ Aldea Destino:</span>
              <span className="text-cyan-200 font-mono">
                {villageDist}m al <b className="text-emerald-300">{villageDir}</b>
              </span>
            </div>
            {hasBoatPassengerUI ? (
              <div className="text-[10px] text-amber-300 font-bold animate-pulse">
                ✨ ¡Pasajero a bordo! Navega a la Aldea ({villageDist}m al {villageDir}) y haz clic
              </div>
            ) : nearestLostVillagerDist !== null ? (
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
                <span>🧍 Aldeano perdido:</span>
                <span className="text-amber-200 font-mono">
                  {nearestLostVillagerDist}m al <b>{nearestLostVillagerDir}</b>
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-emerald-300 font-bold">
                🏆 ¡Todos los aldeanos han sido rescatados!
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-300/90 mt-1 pt-1 border-t border-white/10">
            En mano:{' '}
            {activeItemDef ? (
              <span className="text-emerald-300 font-semibold">
                {activeItemDef.ic} {activeItemDef.n} (x{activeSlotItem?.count})
              </span>
            ) : (
              <span className="text-slate-400 italic">Mano vacía (Rompe bloques)</span>
            )}
          </div>
        </div>

        {/* Top-right Health Bar (.hpbar) + Quick Survival & Multiplayer Actions */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div
            id="hp1"
            className="hpbar flex items-center gap-1 bg-[#0a0a0f]/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-400/30 shadow-[0_4px_20px_rgba(0,0,0,0.55),0_0_14px_rgba(74,222,128,0.12)]"
          >
            {Array.from({ length: 10 }).map((_, i) => {
              const full = hp >= (i + 1) * 2;
              const half = !full && hp >= i * 2 + 1;
              return (
                <span
                  key={i}
                  className={`text-sm leading-none transition-opacity ${
                    full
                      ? 'opacity-100 drop-shadow-[0_0_6px_rgba(239,68,68,0.65)]'
                      : half
                        ? 'opacity-65'
                        : 'opacity-20 grayscale'
                  }`}
                >
                  ❤️
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
            <button
              id="btnOpenRoomMenu"
              type="button"
              onClick={() => {
                if (document.pointerLockElement) document.exitPointerLock();
                setGameState('paused');
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0a0a0f]/60 backdrop-blur-md border border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              📡 Salas Online {roomCode ? `(${roomCode})` : ''}
            </button>

            <button
              id="btnToggleDayNight"
              type="button"
              onClick={() => actionsRef.current?.toggleTimeOfDay()}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0a0a0f]/60 backdrop-blur-md border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/20 transition cursor-pointer"
            >
              {isNightUI ? '☀️ Pasar a Día [N]' : '🌙 Pasar a Noche [N]'}
            </button>

            <button
              id="btnInventory"
              type="button"
              onClick={() => {
                const next = !inventoryOpen;
                setInventoryOpen(next);
                if (next && document.pointerLockElement) {
                  document.exitPointerLock();
                }
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0a0a0f]/60 backdrop-blur-md border border-emerald-400/35 text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              🎒 Inventario ({blocksCollectedCount}) [I]
            </button>

            <button
              id="btnToggleTouch"
              type="button"
              onClick={() => setIsTouchDevice((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold backdrop-blur-md border transition cursor-pointer ${
                isTouchDevice
                  ? 'bg-cyan-950/75 border-cyan-400/60 text-cyan-200'
                  : 'bg-[#0a0a0f]/60 border-white/15 text-slate-300'
              }`}
            >
              📱 Táctil {isTouchDevice ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !soundMuted;
                setSoundMuted(next);
                soundEngine.setMuted(next);
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0a0a0f]/60 backdrop-blur-md border border-white/15 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
            >
              {soundMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div
            id="toast"
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#0a0a0f]/85 backdrop-blur-md text-emerald-300 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm border border-cyan-400/45 shadow-[0_8px_28px_rgba(0,0,0,0.65),0_0_16px_rgba(74,222,128,0.28)] z-30 text-center max-w-lg"
          >
            {toastMsg}
          </div>
        )}

        {/* Glassmorphism Survival Crafting & Boat Rescue Bar (Above Hotbar) */}
        <div className="absolute bottom-[82px] left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 pointer-events-auto w-max max-w-[96vw]">
          <button
            id="btnCraftPlanks"
            type="button"
            onClick={() => actionsRef.current?.craftPlanks()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 cursor-pointer ${
              woodCount > 0
                ? 'bg-emerald-950/80 border-emerald-400/70 text-emerald-200 shadow-[0_0_18px_rgba(74,222,128,0.35)] hover:bg-emerald-900/80'
                : 'bg-[#0a0a0f]/65 border-white/15 text-slate-300 hover:border-cyan-400/40'
            }`}
          >
            <span>🔨 1 Madera → 4 Tablones [C]</span>
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-cyan-300">
              {woodCount}
            </span>
          </button>

          <button
            id="btnCraftBoat"
            type="button"
            onClick={() => actionsRef.current?.craftBoat()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 cursor-pointer ${
              plankCount >= 5
                ? 'bg-amber-950/80 border-amber-400/75 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.35)] hover:bg-amber-900/80'
                : 'bg-[#0a0a0f]/65 border-white/15 text-slate-300 hover:border-amber-400/40'
            }`}
          >
            <span>⛵ Craftear Bote: 5 Tablones [B]</span>
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-amber-300">
              {plankCount}/5
            </span>
          </button>

          {(boatCount > 0 || inBoatUI) && (
            <button
              id="btnBoatAction"
              type="button"
              onClick={() => actionsRef.current?.useOrMountBoat()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-950/85 backdrop-blur-md border border-cyan-400/70 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.35)] hover:bg-cyan-900/80 transition-all cursor-pointer"
            >
              {inBoatUI
                ? hasBoatPassengerUI
                  ? '🛟 Entregar Aldeano / Bajar [F]'
                  : '🛟 Rescatar Aldeano / Bajar [F]'
                : `⛵ Usar Bote en Agua (${boatCount}) [F]`}
            </button>
          )}
        </div>

        {/* Centered Bottom Hotbar (.hb) with Dark Glassmorphism */}
        <div
          id="hb1"
          className="hb absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-[#0a0a0f]/60 backdrop-blur-md p-1.5 rounded-xl border border-emerald-400/35 shadow-[0_8px_32px_rgba(0,0,0,0.65),0_0_18px_rgba(34,211,238,0.15)] pointer-events-auto"
        >
          {Array.from({ length: HOTBAR_SIZE }).map((_, i) => {
            const slot = inventory[i];
            const def = slot ? BD[slot.type] : null;
            const active = selectedSlot === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => actionsRef.current?.selectHotbarSlot(i)}
                className={`sl w-[52px] h-[52px] md:w-[54px] md:h-[54px] rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                  active
                    ? 'on border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_16px_rgba(34,211,238,0.5),inset_0_0_10px_rgba(74,222,128,0.25)] -translate-y-1'
                    : 'border border-white/15 bg-[#0f141c]/55 hover:border-emerald-400/40'
                }`}
              >
                <span className="kn absolute top-0.5 left-1.5 text-[8px] font-bold text-cyan-400">
                  {i + 1}
                </span>
                {slot && def ? (
                  <>
                    <span className="ic text-lg leading-none">{def.ic}</span>
                    <span className="lb text-[7px] font-bold mt-0.5 text-slate-200 truncate max-w-[46px]">
                      {def.n}
                    </span>
                    <span className="qty absolute bottom-0.5 right-1 text-[9px] font-extrabold font-mono text-emerald-300">
                      {slot.count}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-slate-500/70 font-medium">Vacío</span>
                )}
              </button>
            );
          })}
        </div>

        {/* MOBILE TOUCH CONTROLS (VIRTUAL JOYSTICK & ACTION PAD) */}
        {isTouchDevice && (
          <div id="mobileTouchControls" className=" pointer-events-none">
            {/* Virtual Joystick (Bottom Left) */}
            <div
              id="virtualJoystick"
              className="pointer-events-auto absolute bottom-24 left-6 w-28 h-28 rounded-full bg-[#0a0a0f]/65 backdrop-blur-md border-2 border-emerald-400/45 shadow-[0_0_24px_rgba(0,0,0,0.6)] flex items-center justify-center touch-none"
              onTouchStart={(e) => {
                const t = e.changedTouches[0];
                joyTouchIdRef.current = t.identifier;
                updateJoystickFromPoint(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect());
              }}
              onTouchMove={(e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                  const t = e.changedTouches[i];
                  if (t.identifier === joyTouchIdRef.current) {
                    updateJoystickFromPoint(
                      t.clientX,
                      t.clientY,
                      e.currentTarget.getBoundingClientRect()
                    );
                  }
                }
              }}
              onTouchEnd={() => {
                joyTouchIdRef.current = null;
                setJoyKnob({ x: 0, y: 0 });
                joyVecRef.current = { x: 0, y: 0 };
              }}
            >
              <div
                className="w-11 h-11 rounded-full bg-emerald-400/45 border-2 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)] transition-transform duration-75"
                style={{
                  transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
                }}
              />
            </div>

            {/* Mobile Action Buttons (Bottom Right) */}
            <div className="pointer-events-auto absolute bottom-24 right-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  actionsRef.current?.triggerAttackOrBreak();
                }}
                onClick={() => actionsRef.current?.triggerAttackOrBreak()}
                className="w-14 h-14 rounded-2xl bg-rose-950/75 border border-rose-400/60 text-rose-200 font-bold text-xs flex flex-col items-center justify-center shadow-lg"
              >
                <span className="text-base">⛏️</span>
                <span className="text-[9px]">Romper</span>
              </button>

              <button
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  actionsRef.current?.triggerPlaceOrInteract();
                }}
                onClick={() => actionsRef.current?.triggerPlaceOrInteract()}
                className="w-14 h-14 rounded-2xl bg-cyan-950/75 border border-cyan-400/60 text-cyan-200 font-bold text-xs flex flex-col items-center justify-center shadow-lg"
              >
                <span className="text-base">🧱</span>
                <span className="text-[9px]">Usar/Poner</span>
              </button>

              <button
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  actionsRef.current?.triggerJump();
                }}
                onClick={() => actionsRef.current?.triggerJump()}
                className="w-14 h-14 rounded-2xl bg-emerald-950/75 border border-emerald-400/60 text-emerald-200 font-bold text-xs flex flex-col items-center justify-center shadow-lg"
              >
                <span className="text-base">⬆️</span>
                <span className="text-[9px]">Saltar</span>
              </button>

              <button
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  actionsRef.current?.useOrMountBoat();
                }}
                onClick={() => actionsRef.current?.useOrMountBoat()}
                className="w-14 h-14 rounded-2xl bg-amber-950/75 border border-amber-400/60 text-amber-200 font-bold text-xs flex flex-col items-center justify-center shadow-lg"
              >
                <span className="text-base">⛵</span>
                <span className="text-[9px]">Bote/Resc.</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SURVIVAL INVENTORY & BOAT CRAFTING MODAL ([I] / [E]) */}
      {inventoryOpen && (
        <div
          id="inventoryModal"
          className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#0a0a0f]/90 border border-emerald-400/40 shadow-[0_0_42px_rgba(0,0,0,0.85)] p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-extrabold text-emerald-400 tracking-wide">
                  🎒 INVENTARIO Y CRAFTEO ({TOTAL_INV_SLOTS} Ranuras)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Haz clic en dos ranuras para organizar tus ítems o fabrica un Bote para el rescate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInventoryOpen(false);
                  actionsRef.current?.requestPointerLock();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/35 cursor-pointer"
              >
                Volver al Juego [I]
              </button>
            </div>

            {/* Crafting Section inside Inventory */}
            <div className="mb-4 p-3 rounded-xl bg-slate-900/80 border border-cyan-400/25 flex flex-col gap-2">
              <div className="text-xs font-bold text-cyan-300">
                🔨 Mesa de Crafteo de Supervivencia y Navegación
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => actionsRef.current?.craftPlanks()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 hover:bg-emerald-500/40 cursor-pointer"
                >
                  🪵 1 Madera → 4 Tablones (Tienes: {woodCount})
                </button>
                <button
                  type="button"
                  onClick={() => actionsRef.current?.craftBoat()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/25 text-amber-200 border border-amber-400/50 hover:bg-amber-500/40 cursor-pointer"
                >
                  ⛵ 5 Tablones → 1 Bote (Tablones: {plankCount}/5)
                </button>
                <button
                  type="button"
                  onClick={() => actionsRef.current?.craftDoor()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/35 cursor-pointer"
                >
                  🚪 2 Tablones → 1 Puerta
                </button>
              </div>
            </div>

            {/* Backpack Slots (9..17) */}
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Mochila ({BACKPACK_SIZE} ranuras)
            </div>
            <div className="grid grid-cols-9 gap-1.5 mb-4">
              {Array.from({ length: BACKPACK_SIZE }).map((_, idx) => {
                const slotIdx = HOTBAR_SIZE + idx;
                const slot = inventory[slotIdx];
                const def = slot ? BD[slot.type] : null;
                const isSelectedSwap = swapSourceIdx === slotIdx;
                return (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => handleInventorySlotClick(slotIdx)}
                    className={`h-14 rounded-lg border flex flex-col items-center justify-center relative transition cursor-pointer ${
                      isSelectedSwap
                        ? 'border-2 border-amber-400 bg-amber-400/20'
                        : 'border-white/15 bg-slate-900/70 hover:border-cyan-400/50'
                    }`}
                  >
                    {slot && def ? (
                      <>
                        <span className="text-lg leading-none">{def.ic}</span>
                        <span className="text-[7px] text-slate-300 mt-0.5 truncate max-w-[44px]">
                          {def.n}
                        </span>
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold font-mono text-emerald-300">
                          {slot.count}
                        </span>
                      </>
                    ) : (
                      <span className="text-[8px] text-slate-600">Vacío</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hotbar Slots (0..8) */}
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2">
              Barra de Acceso Rápido (Teclas 1–9)
            </div>
            <div className="grid grid-cols-9 gap-1.5">
              {Array.from({ length: HOTBAR_SIZE }).map((_, slotIdx) => {
                const slot = inventory[slotIdx];
                const def = slot ? BD[slot.type] : null;
                const isSelectedSwap = swapSourceIdx === slotIdx;
                const isEquipped = selectedSlot === slotIdx;
                return (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => handleInventorySlotClick(slotIdx)}
                    className={`h-14 rounded-lg border flex flex-col items-center justify-center relative transition cursor-pointer ${
                      isSelectedSwap
                        ? 'border-2 border-amber-400 bg-amber-400/20'
                        : isEquipped
                          ? 'border-2 border-cyan-400 bg-cyan-400/20'
                          : 'border-white/15 bg-slate-900/70 hover:border-emerald-400/50'
                    }`}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] font-bold text-cyan-400">
                      {slotIdx + 1}
                    </span>
                    {slot && def ? (
                      <>
                        <span className="text-lg leading-none">{def.ic}</span>
                        <span className="text-[7px] text-slate-200 mt-0.5 truncate max-w-[44px]">
                          {def.n}
                        </span>
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold font-mono text-emerald-300">
                          {slot.count}
                        </span>
                      </>
                    ) : (
                      <span className="text-[8px] text-slate-600">Vacío</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STANDALONE HTML SOURCE MODAL */}
      {showCodeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0a0d14] border border-emerald-400/40 shadow-[0_0_48px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0f141e]">
              <div>
                <h2 className="text-sm font-bold text-emerald-400 tracking-wider uppercase">
                  Código HTML — VoxelWorld Multijugador Online & Rescate de la Aldea
                </h2>
                <p className="text-xs text-slate-400">
                  Incluye salas PeerJS P2P, Arañas nocturnas, Botes (5 Tablones), rescate de aldeanos y controles móviles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/40 transition cursor-pointer"
                >
                  {copiedCode ? '✓ ¡Copiado!' : 'Copiar HTML'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-auto flex-1 select-all leading-relaxed">
              {STANDALONE_HTML_CODE}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
