import * as THREE from 'three';
import { BD } from './voxelWorldLogic';

function hexToRgb(hex: number) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

function vary(v: number, a = 30) {
  return Math.max(0, Math.min(255, v + (Math.random() - 0.5) * a));
}

export function mkTex(baseColor: number, noiseAmt = 25, pattern = ''): THREE.CanvasTexture {
  const W = 16;
  const H = 16;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const { r, g, b } = hexToRgb(baseColor);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let pr = vary(r, noiseAmt);
      let pg = vary(g, noiseAmt);
      let pb = vary(b, noiseAmt);
      if (pattern === 'grass_top' && (x + y) % 3 === 0) {
        pr = Math.max(0, pr - 20);
        pg = Math.min(255, pg + 15);
      }
      if (pattern === 'stone' && (x * y) % 5 === 0) {
        pr = pg = pb = vary(120, 20);
      }
      if (pattern === 'wood_side' && x % 4 < 1) {
        pr = Math.max(0, pr - 15);
        pg = Math.max(0, pg - 10);
      }
      if (pattern === 'grass_side' && y < 3) {
        pr = vary(80, 15);
        pg = vary(140, 15);
        pb = vary(50, 15);
      }
      if (pattern === 'sand' && (x + y * 2) % 7 < 2) {
        pr = Math.min(255, pr + 20);
        pg = Math.min(255, pg + 15);
      }
      if (pattern === 'water') {
        const w = Math.sin(x * 0.8 + y * 0.4) * 0.5 + 0.5;
        pr = vary(26 + w * 30, 8);
        pg = vary(85 + w * 20, 8);
        pb = vary(200 + w * 30, 8);
      }
      if (pattern === 'lava') {
        const l = Math.sin(x * 0.7 - y * 0.5) * 0.5 + 0.5;
        pr = 200 + l * 55;
        pg = vary(60 + l * 80, 20);
        pb = 0;
      }
      if (pattern === 'leaves' && Math.random() > 0.75) {
        pr = Math.max(0, pr - 30);
        pg = Math.min(255, pg + 20);
      }
      if (pattern === 'snow' && Math.random() > 0.85) {
        pr = pg = pb = Math.min(255, 235 + Math.random() * 20);
      }
      ctx.fillStyle = `rgb(${Math.round(pr)},${Math.round(pg)},${Math.round(pb)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

const TEX_CACHE: Record<number, THREE.CanvasTexture> = {};
export function getTex(type: number): THREE.CanvasTexture {
  if (!TEX_CACHE[type]) {
    const patterns: Record<number, THREE.CanvasTexture> = {
      1: mkTex(0x5dbb40, 28, 'grass_top'),
      2: mkTex(0x9b6b3a, 20, ''),
      3: mkTex(0x7a7a7a, 22, 'stone'),
      4: mkTex(0xe8d68a, 18, 'sand'),
      5: mkTex(0x7a5230, 20, 'wood_side'),
      6: mkTex(0x2e7020, 22, 'leaves'),
      7: mkTex(0xf0f0f8, 12, 'snow'),
      8: mkTex(0x1a55cc, 15, 'water'),
      9: mkTex(0xaaddff, 8, ''),
      10: mkTex(0xff4400, 25, 'lava'),
      11: mkTex(0x333333, 10, 'stone'),
      12: mkTex(0xcc9955, 18, 'wood_side'),
      13: mkTex(0x888888, 22, 'stone'),
      14: mkTex(0xcc5533, 18, ''),
      15: mkTex(0xdd3333, 15, ''),
      16: mkTex(0xbb8833, 18, ''),
      17: mkTex(0xaaddff, 8, ''),
      18: mkTex(0x996633, 18, 'wood_side'),
    };
    TEX_CACHE[type] = patterns[type] || mkTex(0x888888, 20, '');
  }
  return TEX_CACHE[type];
}

const MAT_CACHE: Record<number, THREE.MeshStandardMaterial> = {};
export function getBlockMat(t: number): THREE.MeshStandardMaterial {
  if (!MAT_CACHE[t]) {
    const d = BD[t] || { c: 0x888888, op: 1 };
    const tex = getTex(t);
    const isGlossy = t === 8 || t === 9 || t === 17;
    MAT_CACHE[t] = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: isGlossy ? 0.2 : 0.82,
      metalness: isGlossy ? 0.15 : 0.05,
      transparent: !!d.tr,
      opacity: d.tr ? d.op : 1,
      depthWrite: t !== 8 && t !== 9,
      emissive: new THREE.Color(d.em || 0x000000),
      emissiveIntensity: d.em ? 0.75 : 0,
    });
  }
  return MAT_CACHE[t];
}

const COLOR_MAT_CACHE = new Map<string, THREE.MeshStandardMaterial>();
export function mkM(color: number, roughness = 0.75, metalness = 0.08): THREE.MeshStandardMaterial {
  const key = `${color}_${roughness}_${metalness}`;
  let m = COLOR_MAT_CACHE.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    COLOR_MAT_CACHE.set(key, m);
  }
  return m;
}

let shadowDiscGeo: THREE.CircleGeometry | null = null;
let shadowDiscMat: THREE.MeshBasicMaterial | null = null;

function addContactShadow(g: THREE.Group, radius = 0.42, yOffset = 0.02): void {
  if (!shadowDiscGeo) {
    shadowDiscGeo = new THREE.CircleGeometry(1, 16);
    shadowDiscGeo.rotateX(-Math.PI / 2);
  }
  if (!shadowDiscMat) {
    shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
  }
  const disc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
  disc.scale.set(radius, 1, radius);
  disc.position.y = yOffset;
  g.add(disc);
}

export function mkArm(skinColor = 0xf5c89a, shirtColor = 0x3a8830) {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.22), mkM(shirtColor, 0.7));
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.08, 0.23), mkM(0x22d3ee, 0.4, 0.25));
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.2), mkM(skinColor, 0.65));
  arm.position.set(0.23, -0.26, -0.36);
  cuff.position.set(0.24, -0.4, -0.375);
  hand.position.set(0.25, -0.5, -0.39);
  arm.rotation.x = 0.18;
  cuff.rotation.x = 0.18;
  hand.rotation.x = 0.18;
  g.add(arm, cuff, hand);
  return { g, arm, hand };
}

export function mkWolfMesh(tamed: boolean): THREE.Group {
  const g = new THREE.Group();
  const fur = mkM(tamed ? 0x9b8468 : 0x8b7355, 0.8);
  const lightFur = mkM(0xc8b89a, 0.65);
  const dark = mkM(0x5a4a30, 0.9);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 1.0), fur);
  body.position.set(0, 0.48, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.45), fur);
  head.position.set(0, 0.82, 0.38);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), lightFur);
  snout.position.set(0, 0.72, 0.58);
  g.add(snout);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), dark);
  earL.position.set(-0.15, 0.99, 0.32);
  g.add(earL);
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), dark);
  earR.position.set(0.15, 0.99, 0.32);
  g.add(earR);
  [
    [-0.22, 0.17, -0.28],
    [0.22, 0.17, -0.28],
    [-0.22, 0.17, 0.28],
    [0.22, 0.17, 0.28],
  ].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.18), fur);
    l.position.set(x, y, z);
    g.add(l);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), dark);
  tail.position.set(0, 0.72, -0.52);
  tail.rotation.x = -0.4;
  g.add(tail);
  if (tamed) {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), mkM(0x22d3ee, 0.3, 0.4));
    collar.position.set(0, 0.75, 0.36);
    g.add(collar);
  }
  addContactShadow(g, 0.46);
  return g;
}

export function mkVillagerMesh(): THREE.Group {
  const g = new THREE.Group();
  const skin = mkM(0xbd9876, 0.7);
  const robe = mkM(0x6b4c3a, 0.85);
  const robeLight = mkM(0x8b6a52, 0.75);
  const noseMat = mkM(0xa07850, 0.65);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
  head.position.set(0, 1.58, 0);
  g.add(head);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.25), noseMat);
  nose.position.set(0, 1.52, 0.28);
  g.add(nose);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 0.54), robe);
  hood.position.set(0, 1.86, 0);
  g.add(hood);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.75, 0.32), robe);
  body.position.set(0, 0.9, 0);
  g.add(body);
  const aL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), robeLight);
  aL.position.set(-0.42, 0.9, 0);
  g.add(aL);
  const aR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), robeLight);
  aR.position.set(0.42, 0.9, 0);
  g.add(aR);
  const lL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.24), robe);
  lL.position.set(-0.14, 0.27, 0);
  g.add(lL);
  const lR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.24), robe);
  lR.position.set(0.14, 0.27, 0);
  g.add(lR);
  const eyeMat = mkM(0x1a8a1a, 0.2, 0.3);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), eyeMat);
  eyeL.position.set(-0.13, 1.62, 0.27);
  g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), eyeMat);
  eyeR.position.set(0.13, 1.62, 0.27);
  g.add(eyeR);
  addContactShadow(g, 0.38);
  return g;
}

export function mkCow(): THREE.Group {
  const g = new THREE.Group();
  const brown = mkM(0x5c3a1e, 0.85);
  const white = mkM(0xeeeeee, 0.7);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 1.1), brown);
  body.position.set(0, 0.58, 0);
  g.add(body);
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.5), white);
  patch.position.set(0.2, 0.75, 0.2);
  g.add(patch);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.42), brown);
  head.position.set(0, 0.88, 0.52);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.18), mkM(0xe8b8b8, 0.5));
  snout.position.set(0, 0.8, 0.72);
  g.add(snout);
  const hornMat = mkM(0x888888, 0.35, 0.4);
  const hL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), hornMat);
  hL.position.set(-0.16, 1.05, 0.42);
  g.add(hL);
  const hR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), hornMat);
  hR.position.set(0.16, 1.05, 0.42);
  g.add(hR);
  [
    [-0.22, 0.18, -0.25],
    [0.22, 0.18, -0.25],
    [-0.22, 0.18, 0.25],
    [0.22, 0.18, 0.25],
  ].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), brown);
    l.position.set(x, y, z);
    g.add(l);
  });
  addContactShadow(g, 0.55);
  return g;
}

export function mkSheep(): THREE.Group {
  const g = new THREE.Group();
  const wool = mkM(0xeeeeee, 0.92);
  const skin = mkM(0xc8a880, 0.65);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.95), wool);
  body.position.set(0, 0.62, 0);
  g.add(body);
  [
    [-0.2, 0.9, 0],
    [0.2, 0.9, 0],
    [0, 0.95, 0.2],
    [0, 0.95, -0.2],
  ].forEach(([x, y, z]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), wool);
    b.position.set(x, y, z);
    g.add(b);
  });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.38), skin);
  head.position.set(0, 0.88, 0.46);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.14), mkM(0xd8a888, 0.5));
  snout.position.set(0, 0.82, 0.6);
  g.add(snout);
  [
    [-0.2, 0.15, -0.2],
    [0.2, 0.15, -0.2],
    [-0.2, 0.15, 0.2],
    [0.2, 0.15, 0.2],
  ].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), skin);
    l.position.set(x, y, z);
    g.add(l);
  });
  addContactShadow(g, 0.5);
  return g;
}

export function mkChicken(): THREE.Group {
  const g = new THREE.Group();
  const white = mkM(0xeeeeee, 0.75);
  const beak = mkM(0xeec900, 0.45);
  const red = mkM(0xcc2222, 0.55);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), white);
  body.position.set(0, 0.52, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.28), white);
  head.position.set(0, 0.95, 0.18);
  g.add(head);
  const beakM = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.22), beak);
  beakM.position.set(0, 0.9, 0.35);
  g.add(beakM);
  const wattle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), red);
  wattle.position.set(0, 0.82, 0.3);
  g.add(wattle);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), red);
  comb.position.set(0, 1.12, 0.14);
  g.add(comb);
  const wingMat = mkM(0xcccccc, 0.8);
  const wL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.4), wingMat);
  wL.position.set(-0.32, 0.52, 0);
  g.add(wL);
  const wR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.4), wingMat);
  wR.position.set(0.32, 0.52, 0);
  g.add(wR);
  [-0.12, 0.12].forEach((x) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), beak);
    l.position.set(x, 0.18, 0);
    g.add(l);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.18), beak);
    f.position.set(x, 0.06, 0.06);
    g.add(f);
  });
  addContactShadow(g, 0.32);
  return g;
}

export function mkRabbit(): THREE.Group {
  const g = new THREE.Group();
  const brown = mkM(0x8b6340, 0.82);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.5), brown);
  body.position.set(0, 0.32, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), brown);
  head.position.set(0, 0.68, 0.16);
  g.add(head);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.08), brown);
  earL.position.set(-0.1, 0.96, 0.1);
  g.add(earL);
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.08), brown);
  earR.position.set(0.1, 0.96, 0.1);
  g.add(earR);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), mkM(0xdda0a0, 0.5));
  nose.position.set(0, 0.64, 0.3);
  g.add(nose);
  [
    [-0.1, 0.05, -0.08],
    [0.1, 0.05, -0.08],
    [-0.08, 0.05, 0.12],
    [0.08, 0.05, 0.12],
  ].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), brown);
    l.position.set(x, y, z);
    g.add(l);
  });
  addContactShadow(g, 0.28);
  return g;
}

export function mkHorse(): THREE.Group {
  const g = new THREE.Group();
  const brown = mkM(0x7a4a18, 0.72);
  const dark = mkM(0x4a2a0a, 0.9);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 1.4), brown);
  body.position.set(0, 0.72, 0);
  g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.6, 0.38), brown);
  neck.position.set(0, 1.18, 0.45);
  neck.rotation.x = -0.3;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.5), brown);
  head.position.set(0, 1.5, 0.72);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mkM(0xc8a880, 0.55));
  snout.position.set(0, 1.34, 0.92);
  g.add(snout);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.5), dark);
  mane.position.set(0, 1.42, 0.48);
  g.add(mane);
  [
    [-0.22, 0.16, -0.4],
    [0.22, 0.16, -0.4],
    [-0.22, 0.16, 0.3],
    [0.22, 0.16, 0.3],
  ].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), brown);
    l.position.set(x, y, z);
    g.add(l);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), dark);
  tail.position.set(0, 0.88, -0.72);
  g.add(tail);
  addContactShadow(g, 0.62);
  return g;
}

export function mkCapybara(): THREE.Group {
  const g = new THREE.Group();
  const tan = mkM(0xc8922a, 0.82);
  const dark = mkM(0x8b5e1a, 0.6);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.05), tan);
  body.position.set(0, 0.48, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.52), tan);
  head.position.set(0, 0.82, 0.44);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.32), dark);
  snout.position.set(0, 0.72, 0.64);
  g.add(snout);
  [
    [-0.2, 0.12, -0.24],
    [0.2, 0.12, -0.24],
    [-0.2, 0.12, 0.24],
    [0.2, 0.12, 0.24],
  ].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), tan);
    l.position.set(x, y, z);
    g.add(l);
  });
  const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.1), tan);
  ear.position.set(-0.22, 1.04, 0.38);
  g.add(ear);
  const ear2 = ear.clone();
  ear2.position.x = 0.22;
  g.add(ear2);
  addContactShadow(g, 0.48);
  return g;
}

export function mkParrot(color = 0xcc2222): THREE.Group {
  const g = new THREE.Group();
  const c = mkM(color, 0.65);
  const green = mkM(0x228b22, 0.8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), c);
  body.position.set(0, 0.44, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), c);
  head.position.set(0, 0.78, 0);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.18), mkM(0x554422, 0.35));
  beak.position.set(0, 0.74, 0.18);
  g.add(beak);
  const wL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.28), green);
  wL.position.set(-0.22, 0.44, 0);
  g.add(wL);
  const wR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.28), green);
  wR.position.set(0.22, 0.44, 0);
  g.add(wR);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.1), mkM(0x4444cc, 0.55));
  tail.position.set(0, 0.3, -0.2);
  tail.rotation.x = 0.5;
  g.add(tail);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), c);
  crest.position.set(0, 1.04, 0);
  g.add(crest);
  [-0.14, 0.14].forEach((x) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.08), mkM(0x8b4513, 0.7));
    l.position.set(x, 0.04, 0);
    g.add(l);
  });
  return g;
}

export function mkTurtle(): THREE.Group {
  const g = new THREE.Group();
  const green = mkM(0x2e8b2e, 0.75);
  const darkGreen = mkM(0x1a5c1a, 0.45, 0.15);
  const tan = mkM(0xc8a85c, 0.8);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.85), darkGreen);
  shell.position.set(0, 0.32, 0);
  g.add(shell);
  const shellTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.72), green);
  shellTop.position.set(0, 0.48, 0);
  g.add(shellTop);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), green);
  head.position.set(0, 0.3, 0.44);
  g.add(head);
  [
    [-0.45, 0.18, -0.15],
    [-0.45, 0.18, 0.15],
    [0.45, 0.18, -0.15],
    [0.45, 0.18, 0.15],
  ].forEach(([x, y, z]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.22), tan);
    f.position.set(x, y, z);
    g.add(f);
  });
  addContactShadow(g, 0.44);
  return g;
}

export function mkEnderman(): THREE.Group {
  const g = new THREE.Group();
  const black = mkM(0x16161c, 0.85, 0.2);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.2, 0.28), black);
  body.position.set(0, 1.2, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), black);
  head.position.set(0, 2.0, 0);
  g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.05), eyeMat);
  eyeL.position.set(-0.12, 2.02, 0.23);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  g.add(eyeR);
  const aL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), black);
  aL.position.set(-0.32, 1.15, 0);
  g.add(aL);
  const aR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), black);
  aR.position.set(0.32, 1.15, 0);
  g.add(aR);
  const lL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), black);
  lL.position.set(-0.12, 0.38, 0);
  g.add(lL);
  const lR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), black);
  lR.position.set(0.12, 0.38, 0);
  g.add(lR);
  addContactShadow(g, 0.38);
  return g;
}

export function mkZombie(): THREE.Group {
  const g = new THREE.Group();
  const green = mkM(0x44aa44, 0.8);
  const dark = mkM(0x226622, 0.65);
  const pants = mkM(0x334455, 0.9);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), green);
  head.position.set(0, 1.58, 0);
  g.add(head);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.28), dark);
  body.position.set(0, 0.9, 0);
  g.add(body);
  const aL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), green);
  aL.position.set(-0.42, 0.9, 0);
  g.add(aL);
  const aR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), green);
  aR.position.set(0.42, 0.9, 0);
  g.add(aR);
  const lL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 0.25), pants);
  lL.position.set(-0.14, 0.27, 0);
  g.add(lL);
  const lR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 0.25), pants);
  lR.position.set(0.14, 0.27, 0);
  g.add(lR);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), eyeMat);
  eyeL.position.set(-0.12, 1.6, 0.26);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  g.add(eyeR);
  addContactShadow(g, 0.4);
  return g;
}

export function mkFishSimple(): THREE.Group {
  const g = new THREE.Group();
  const col = Math.random() > 0.5 ? 0xff8833 : 0x3388ff;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.5), mkM(col, 0.35, 0.2));
  g.add(body);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.08), mkM(0xffffff, 0.6));
  fin.position.set(0, 0, 0.28);
  g.add(fin);
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), mkM(col, 0.5));
  dorsal.position.set(0, 0.11, 0);
  g.add(dorsal);
  return g;
}

export function mkSharkSimple(): THREE.Group {
  const g = new THREE.Group();
  const col = 0x557788;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 1.15), mkM(col, 0.4, 0.2));
  g.add(body);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.95), mkM(0xddeeff, 0.7));
  belly.position.set(0, -0.12, 0);
  g.add(belly);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.2), mkM(col, 0.5));
  fin.position.set(0, 0.28, 0);
  g.add(fin);
  return g;
}
