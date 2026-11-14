import * as THREE from 'three';
import { BT, BD, WH, gB, surfY, type InfiniteWorld } from './voxelWorldLogic';

interface CamVertex {
  vx: number;
  vy: number;
  vz: number;
  u: number;
  v: number;
}

interface ScreenVertex {
  sx: number;
  sy: number;
  u: number;
  v: number;
}

interface ProjectedFace {
  depthSq: number;
  pts: ScreenVertex[];
  texCanvas: HTMLCanvasElement | null;
  baseR: number;
  baseG: number;
  baseB: number;
  alpha: number;
  shade: number;
  torchWarmth: number;
  fogFactor: number;
  isEmissive: boolean;
}

// 6 caras de un cubo unitario [0,1]^3 con orden de vértices (Top-Left, Bottom-Left, Bottom-Right, Top-Right)
const UNIT_FACES: ReadonlyArray<{
  nx: number;
  ny: number;
  nz: number;
  baseShade: number;
  corners: ReadonlyArray<readonly [number, number, number]>;
}> = [
  // Top (+Y)
  {
    nx: 0,
    ny: 1,
    nz: 0,
    baseShade: 1.0,
    corners: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
  },
  // Bottom (-Y)
  {
    nx: 0,
    ny: -1,
    nz: 0,
    baseShade: 0.46,
    corners: [
      [0, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ],
  },
  // South (+Z)
  {
    nx: 0,
    ny: 0,
    nz: 1,
    baseShade: 0.86,
    corners: [
      [0, 1, 1],
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
  },
  // North (-Z)
  {
    nx: 0,
    ny: 0,
    nz: -1,
    baseShade: 0.66,
    corners: [
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
    ],
  },
  // East (+X)
  {
    nx: 1,
    ny: 0,
    nz: 0,
    baseShade: 0.76,
    corners: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
    ],
  },
  // West (-X)
  {
    nx: -1,
    ny: 0,
    nz: 0,
    baseShade: 0.6,
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
  },
];

const NEAR_CLIP_Z = -0.11;

function clipPolygonNearPlane(inVerts: CamVertex[]): CamVertex[] {
  const out: CamVertex[] = [];
  const n = inVerts.length;
  for (let i = 0; i < n; i++) {
    const cur = inVerts[i];
    const prev = inVerts[(i + n - 1) % n];
    const curIn = cur.vz <= NEAR_CLIP_Z;
    const prevIn = prev.vz <= NEAR_CLIP_Z;

    if (curIn !== prevIn) {
      const t = (NEAR_CLIP_Z - prev.vz) / (cur.vz - prev.vz);
      out.push({
        vx: prev.vx + (cur.vx - prev.vx) * t,
        vy: prev.vy + (cur.vy - prev.vy) * t,
        vz: NEAR_CLIP_Z,
        u: prev.u + (cur.u - prev.u) * t,
        v: prev.v + (cur.v - prev.v) * t,
      });
    }
    if (curIn) {
      out.push(cur);
    }
  }
  return out;
}

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  tex: HTMLCanvasElement,
  x0: number,
  y0: number,
  u0: number,
  v0: number,
  x1: number,
  y1: number,
  u1: number,
  v1: number,
  x2: number,
  y2: number,
  u2: number,
  v2: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const du1 = u1 - u0;
  const dv1 = v1 - v0;
  const du2 = u2 - u0;
  const dv2 = v2 - v0;
  const det = du1 * dv2 - du2 * dv1;
  if (Math.abs(det) > 1e-4) {
    const invDet = 1 / det;
    const dx1 = x1 - x0;
    const dy1 = y1 - y0;
    const dx2 = x2 - x0;
    const dy2 = y2 - y0;

    const a = (dx1 * dv2 - dx2 * dv1) * invDet;
    const b = (dy1 * dv2 - dy2 * dv1) * invDet;
    const c = (dx2 * du1 - dx1 * du2) * invDet;
    const d = (dy2 * du1 - dy1 * du2) * invDet;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;

    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(tex, 0, 0);
  }
  ctx.restore();
}

export interface True3DRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: THREE.PerspectiveCamera;
  world: InfiniteWorld;
  bmat: Record<number, THREE.MeshStandardMaterial>;
  skyColor: THREE.Color;
  sunPos: THREE.Vector3;
  moonPos: THREE.Vector3;
  dayTime: number;
  selBox: THREE.Object3D;
  entityGroups: THREE.Object3D[];
  torchLights: THREE.PointLight[];
}

export function renderTrue3DScene(params: True3DRenderParams): void {
  const {
    ctx,
    width: w,
    height: h,
    camera,
    world,
    bmat,
    skyColor,
    sunPos,
    moonPos,
    dayTime,
    selBox,
    entityGroups,
    torchLights,
  } = params;

  if (w <= 0 || h <= 0) return;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // 1. Cielo con gradiente atmosférico 3D
  const sr = Math.round(skyColor.r * 255);
  const sg = Math.round(skyColor.g * 255);
  const sb = Math.round(skyColor.b * 255);
  const horizonR = Math.min(255, Math.round(sr * 0.85 + 28));
  const horizonG = Math.min(255, Math.round(sg * 0.88 + 32));
  const horizonB = Math.min(255, Math.round(sb * 0.92 + 38));

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, `rgb(${sr},${sg},${sb})`);
  skyGrad.addColorStop(0.65, `rgb(${horizonR},${horizonG},${horizonB})`);
  skyGrad.addColorStop(1, `rgb(${Math.round(sr * 0.55)},${Math.round(sg * 0.6)},${Math.round(sb * 0.65)})`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  const viewEl = camera.matrixWorldInverse.elements;
  const projEl = camera.projectionMatrix.elements;
  const focalX = projEl[0] * (w * 0.5);
  const focalY = projEl[5] * (h * 0.5);
  const halfW = w * 0.5;
  const halfH = h * 0.5;

  const projectWorldPoint = (wx: number, wy: number, wz: number) => {
    const vx = viewEl[0] * wx + viewEl[4] * wy + viewEl[8] * wz + viewEl[12];
    const vy = viewEl[1] * wx + viewEl[5] * wy + viewEl[9] * wz + viewEl[13];
    const vz = viewEl[2] * wx + viewEl[6] * wy + viewEl[10] * wz + viewEl[14];
    if (vz >= NEAR_CLIP_Z) return null;
    const invZ = -1 / vz;
    return {
      sx: halfW + vx * focalX * invZ,
      sy: halfH - vy * focalY * invZ,
      vz,
    };
  };

  // 2. Sol y Luna con efecto Bloom suave
  const sunP = projectWorldPoint(sunPos.x, sunPos.y, sunPos.z);
  if (sunP && sunP.sx > -120 && sunP.sx < w + 120 && sunP.sy > -120 && sunP.sy < h + 120) {
    const glow = ctx.createRadialGradient(sunP.sx, sunP.sy, 8, sunP.sx, sunP.sy, 76);
    glow.addColorStop(0, 'rgba(255, 248, 165, 0.96)');
    glow.addColorStop(0.35, 'rgba(253, 200, 70, 0.42)');
    glow.addColorStop(1, 'rgba(253, 180, 40, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunP.sx, sunP.sy, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7a8';
    ctx.fillRect(sunP.sx - 16, sunP.sy - 16, 32, 32);
  }

  const moonP = projectWorldPoint(moonPos.x, moonPos.y, moonPos.z);
  if (moonP && moonP.sx > -100 && moonP.sx < w + 100 && moonP.sy > -100 && moonP.sy < h + 100) {
    const mGlow = ctx.createRadialGradient(moonP.sx, moonP.sy, 5, moonP.sx, moonP.sy, 48);
    mGlow.addColorStop(0, 'rgba(220, 238, 255, 0.9)');
    mGlow.addColorStop(1, 'rgba(148, 190, 255, 0)');
    ctx.fillStyle = mGlow;
    ctx.beginPath();
    ctx.arc(moonP.sx, moonP.sy, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2f1ff';
    ctx.fillRect(moonP.sx - 12, moonP.sy - 12, 24, 24);
  }

  const camX = camera.position.x;
  const camY = camera.position.y;
  const camZ = camera.position.z;
  const sunFactor = Math.max(0.28, Math.min(1.0, (Math.sin(dayTime * Math.PI * 2) + 0.25) / 0.7));

  const faces: ProjectedFace[] = [];
  const RENDER_RADIUS = 15;
  const maxDistSq = (RENDER_RADIUS + 1.5) * (RENDER_RADIUS + 1.5);

  const pushBoxFaces = (
    bx: number,
    by: number,
    bz: number,
    sxScale: number,
    syScale: number,
    szScale: number,
    blockType: number,
    checkNeighbors: boolean
  ) => {
    const def = BD[blockType];
    if (!def) return;
    const mat = bmat[blockType];
    const texCanvas = (mat?.map?.image as HTMLCanvasElement | undefined) ?? null;
    const hex = def.c;
    const baseR = (hex >> 16) & 255;
    const baseG = (hex >> 8) & 255;
    const baseB = hex & 255;
    const alpha = def.tr ? (def.op ?? 0.72) : 1.0;
    const isEmissive = !!def.em;

    const centerX = bx + sxScale * 0.5;
    const centerY = by + syScale * 0.5;
    const centerZ = bz + szScale * 0.5;
    const dcx = centerX - camX;
    const dcy = centerY - camY;
    const dcz = centerZ - camZ;
    const blockDistSq = dcx * dcx + dcy * dcy + dcz * dcz;
    if (blockDistSq > maxDistSq) return;

    // Iluminación puntual cálida de antorchas cercanas
    let torchWarmth = isEmissive ? 0.55 : 0;
    for (let t = 0; t < torchLights.length; t++) {
      const tl = torchLights[t].position;
      const tdx = centerX - tl.x;
      const tdy = centerY - tl.y;
      const tdz = centerZ - tl.z;
      const tdSq = tdx * tdx + tdy * tdy + tdz * tdz;
      if (tdSq < 36) {
        torchWarmth = Math.min(0.65, torchWarmth + (1 - tdSq / 36) * 0.5);
      }
    }

    const fogFactor = Math.max(0, Math.min(0.68, (blockDistSq - 90) / (maxDistSq - 90)));

    for (let f = 0; f < 6; f++) {
      const face = UNIT_FACES[f];
      if (checkNeighbors) {
        const nb = gB(
          world,
          Math.floor(bx) + face.nx,
          Math.floor(by) + face.ny,
          Math.floor(bz) + face.nz
        );
        if (nb !== BT.AIR && (!BD[nb]?.tr || nb === blockType)) continue;
      }

      // Backface culling en espacio mundo
      const fcx = bx + (face.nx > 0 ? sxScale : face.nx < 0 ? 0 : sxScale * 0.5);
      const fcy = by + (face.ny > 0 ? syScale : face.ny < 0 ? 0 : syScale * 0.5);
      const fcz = bz + (face.nz > 0 ? szScale : face.nz < 0 ? 0 : szScale * 0.5);
      const toCamX = camX - fcx;
      const toCamY = camY - fcy;
      const toCamZ = camZ - fcz;
      if (toCamX * face.nx + toCamY * face.ny + toCamZ * face.nz <= 0) continue;

      const uvs: ReadonlyArray<readonly [number, number]> = [
        [0, 0],
        [0, 16],
        [16, 16],
        [16, 0],
      ];

      const camVerts: CamVertex[] = [];
      let allBehind = true;
      for (let c = 0; c < 4; c++) {
        const corner = face.corners[c];
        const wx = bx + corner[0] * sxScale;
        const wy = by + corner[1] * syScale;
        const wz = bz + corner[2] * szScale;
        const vx = viewEl[0] * wx + viewEl[4] * wy + viewEl[8] * wz + viewEl[12];
        const vy = viewEl[1] * wx + viewEl[5] * wy + viewEl[9] * wz + viewEl[13];
        const vz = viewEl[2] * wx + viewEl[6] * wy + viewEl[10] * wz + viewEl[14];
        if (vz <= NEAR_CLIP_Z) allBehind = false;
        camVerts.push({ vx, vy, vz, u: uvs[c][0], v: uvs[c][1] });
      }
      if (allBehind) continue;

      const clipped =
        camVerts[0].vz <= NEAR_CLIP_Z &&
        camVerts[1].vz <= NEAR_CLIP_Z &&
        camVerts[2].vz <= NEAR_CLIP_Z &&
        camVerts[3].vz <= NEAR_CLIP_Z
          ? camVerts
          : clipPolygonNearPlane(camVerts);
      if (clipped.length < 3) continue;

      const screenPts: ScreenVertex[] = [];
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let sumVx = 0;
      let sumVy = 0;
      let sumVz = 0;

      for (let i = 0; i < clipped.length; i++) {
        const cv = clipped[i];
        const invZ = -1 / cv.vz;
        const sx = halfW + cv.vx * focalX * invZ;
        const sy = halfH - cv.vy * focalY * invZ;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
        sumVx += cv.vx;
        sumVy += cv.vy;
        sumVz += cv.vz;
        screenPts.push({ sx, sy, u: cv.u, v: cv.v });
      }

      if (maxX < 0 || minX > w || maxY < 0 || minY > h) continue;

      const invN = 1 / clipped.length;
      const avgVx = sumVx * invN;
      const avgVy = sumVy * invN;
      const avgVz = sumVz * invN;
      const depthSq = avgVx * avgVx + avgVy * avgVy + avgVz * avgVz;

      const effectiveShade = isEmissive
        ? 1.0
        : Math.min(1.0, face.baseShade * sunFactor + torchWarmth * 0.65);

      faces.push({
        depthSq,
        pts: screenPts,
        texCanvas,
        baseR,
        baseG,
        baseB,
        alpha,
        shade: effectiveShade,
        torchWarmth,
        fogFactor,
        isEmissive,
      });
    }
  };

  // 3. Recolectar cubos 3D del mundo alrededor de la cámara
  const cx = Math.floor(camX);
  const cz = Math.floor(camZ);
  const minYScan = Math.max(1, Math.floor(camY - 12));
  const maxYScan = Math.min(WH - 2, Math.ceil(camY + 12));

  for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
    for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
      if (dx * dx + dz * dz > (RENDER_RADIUS + 1) * (RENDER_RADIUS + 1)) continue;
      const wx = cx + dx;
      const wz = cz + dz;
      const syTop = Math.min(maxYScan, Math.max(minYScan, surfY(world, wx, wz) + 4));
      const syBot = Math.max(1, Math.min(minYScan, syTop - 7));

      for (let wy = syBot; wy <= syTop; wy++) {
        const b = gB(world, wx, wy, wz);
        if (b === BT.AIR || BD[b]?.isItemOnly) continue;

        if (b === BT.TORCH) {
          pushBoxFaces(wx + 0.4, wy, wz + 0.4, 0.2, 0.72, 0.2, b, false);
        } else if (b === BT.DOOR_OPEN) {
          pushBoxFaces(wx, wy, wz + 0.02, 0.18, 1.0, 0.96, b, false);
        } else if (b === BT.PUDDLE) {
          pushBoxFaces(wx + 0.04, wy, wz + 0.04, 0.92, 0.06, 0.92, b, false);
        } else if (b === BT.CHAIR) {
          pushBoxFaces(wx + 0.12, wy, wz + 0.12, 0.76, 0.65, 0.76, b, false);
        } else {
          pushBoxFaces(wx, wy, wz, 1.0, 1.0, 1.0, b, true);
        }
      }
    }
  }

  // 4. Recolectar mallas 3D de entidades (Vacas, Ovejas, Pollos, Caballos, Lobos, Zombies, Arañas, Aldeanos, Jugadores)
  const pushMeshBox3D = (mesh: THREE.Mesh) => {
    const geo = mesh.geometry as THREE.BoxGeometry;
    const params = geo?.parameters;
    if (!params) return;
    const bw = params.width ?? 0.5;
    const bh = params.height ?? 0.5;
    const bd = params.depth ?? 0.5;
    const hw = bw * 0.5;
    const hh = bh * 0.5;
    const hd = bd * 0.5;

    const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
    const colHex = mat?.color ? mat.color.getHex() : 0xcccccc;
    const baseR = (colHex >> 16) & 255;
    const baseG = (colHex >> 8) & 255;
    const baseB = colHex & 255;

    const mw = mesh.matrixWorld.elements;
    const centerW = {
      x: mw[12],
      y: mw[13],
      z: mw[14],
    };
    const dcx = centerW.x - camX;
    const dcy = centerW.y - camY;
    const dcz = centerW.z - camZ;
    const distSq = dcx * dcx + dcy * dcy + dcz * dcz;
    if (distSq > maxDistSq) return;

    const fogFactor = Math.max(0, Math.min(0.6, (distSq - 90) / (maxDistSq - 90)));

    for (let f = 0; f < 6; f++) {
      const face = UNIT_FACES[f];
      // Transformar normal local por matrixWorld
      const wnx = mw[0] * face.nx + mw[4] * face.ny + mw[8] * face.nz;
      const wny = mw[1] * face.nx + mw[5] * face.ny + mw[9] * face.nz;
      const wnz = mw[2] * face.nx + mw[6] * face.ny + mw[10] * face.nz;

      const lcx = face.nx * hw;
      const lcy = face.ny * hh;
      const lcz = face.nz * hd;
      const fcx = mw[0] * lcx + mw[4] * lcy + mw[8] * lcz + mw[12];
      const fcy = mw[1] * lcx + mw[5] * lcy + mw[9] * lcz + mw[13];
      const fcz = mw[2] * lcx + mw[6] * lcy + mw[10] * lcz + mw[14];

      if ((camX - fcx) * wnx + (camY - fcy) * wny + (camZ - fcz) * wnz <= 0) continue;

      const camVerts: CamVertex[] = [];
      let allBehind = true;
      for (let c = 0; c < 4; c++) {
        const corner = face.corners[c];
        const lx = (corner[0] - 0.5) * bw;
        const ly = (corner[1] - 0.5) * bh;
        const lz = (corner[2] - 0.5) * bd;
        const wx = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
        const wy = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
        const wz = mw[2] * lx + mw[6] * lx * 0 + mw[6] * ly + mw[10] * lz + mw[14];

        const vx = viewEl[0] * wx + viewEl[4] * wy + viewEl[8] * wz + viewEl[12];
        const vy = viewEl[1] * wx + viewEl[5] * wy + viewEl[9] * wz + viewEl[13];
        const vz = viewEl[2] * wx + viewEl[6] * wy + viewEl[10] * wz + viewEl[14];
        if (vz <= NEAR_CLIP_Z) allBehind = false;
        camVerts.push({ vx, vy, vz, u: 0, v: 0 });
      }
      if (allBehind) continue;

      const clipped = clipPolygonNearPlane(camVerts);
      if (clipped.length < 3) continue;

      const screenPts: ScreenVertex[] = [];
      let sumVx = 0;
      let sumVy = 0;
      let sumVz = 0;
      for (let i = 0; i < clipped.length; i++) {
        const cv = clipped[i];
        const invZ = -1 / cv.vz;
        screenPts.push({
          sx: halfW + cv.vx * focalX * invZ,
          sy: halfH - cv.vy * focalY * invZ,
          u: 0,
          v: 0,
        });
        sumVx += cv.vx;
        sumVy += cv.vy;
        sumVz += cv.vz;
      }
      const invN = 1 / clipped.length;
      const avgVx = sumVx * invN;
      const avgVy = sumVy * invN;
      const avgVz = sumVz * invN;

      faces.push({
        depthSq: avgVx * avgVx + avgVy * avgVy + avgVz * avgVz,
        pts: screenPts,
        texCanvas: null,
        baseR,
        baseG,
        baseB,
        alpha: 1.0,
        shade: Math.min(1.0, face.baseShade * sunFactor + 0.08),
        torchWarmth: 0,
        fogFactor,
        isEmissive: mat instanceof THREE.MeshBasicMaterial,
      });
    }
  };

  for (let gIdx = 0; gIdx < entityGroups.length; gIdx++) {
    const grp = entityGroups[gIdx];
    if (!grp || !grp.visible) continue;
    grp.updateMatrixWorld(true);
    grp.traverse((child) => {
      if (!child.visible) return;
      if ((child as THREE.Mesh).isMesh) {
        pushMeshBox3D(child as THREE.Mesh);
      }
    });
  }

  // 5. Ordenar caras de atrás hacia adelante (algoritmo del pintor en 3D)
  faces.sort((a, b) => b.depthSq - a.depthSq);

  // 6. Dibujar todas las caras 3D con texturas 16x16 de mkTex, sombreado direccional y niebla
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const pts = f.pts;
    const n = pts.length;

    const rLit = Math.round(
      (f.baseR * f.shade + f.torchWarmth * 65) * (1 - f.fogFactor) + sr * f.fogFactor
    );
    const gLit = Math.round(
      (f.baseG * f.shade + f.torchWarmth * 35) * (1 - f.fogFactor) + sg * f.fogFactor
    );
    const bLit = Math.round(
      f.baseB * f.shade * (1 - f.fogFactor) + sb * f.fogFactor
    );

    const clampR = Math.max(0, Math.min(255, rLit));
    const clampG = Math.max(0, Math.min(255, gLit));
    const clampB = Math.max(0, Math.min(255, bLit));

    if (f.texCanvas && n === 4 && f.depthSq < 185 && f.alpha >= 0.95) {
      // Mapear la textura 16x16 de mkTex en perspectiva sobre los 2 triángulos de la cara 3D
      drawTexturedTriangle(
        ctx,
        f.texCanvas,
        pts[0].sx,
        pts[0].sy,
        pts[0].u,
        pts[0].v,
        pts[1].sx,
        pts[1].sy,
        pts[1].u,
        pts[1].v,
        pts[2].sx,
        pts[2].sy,
        pts[2].u,
        pts[2].v
      );
      drawTexturedTriangle(
        ctx,
        f.texCanvas,
        pts[0].sx,
        pts[0].sy,
        pts[0].u,
        pts[0].v,
        pts[2].sx,
        pts[2].sy,
        pts[2].u,
        pts[2].v,
        pts[3].sx,
        pts[3].sy,
        pts[3].u,
        pts[3].v
      );

      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      ctx.lineTo(pts[1].sx, pts[1].sy);
      ctx.lineTo(pts[2].sx, pts[2].sy);
      ctx.lineTo(pts[3].sx, pts[3].sy);
      ctx.closePath();

      // Sombreado 3D direccional por cara (Top vs Lados vs Sombra)
      const darkOverlay = Math.max(0, 1 - f.shade);
      if (darkOverlay > 0.03) {
        ctx.fillStyle = `rgba(0,0,0,${darkOverlay.toFixed(2)})`;
        ctx.fill();
      }
      if (f.torchWarmth > 0.05) {
        ctx.fillStyle = `rgba(255,170,50,${(f.torchWarmth * 0.35).toFixed(2)})`;
        ctx.fill();
      }
      if (f.fogFactor > 0.04) {
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${f.fogFactor.toFixed(2)})`;
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(15,23,42,0.24)';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let k = 1; k < n; k++) {
        ctx.lineTo(pts[k].sx, pts[k].sy);
      }
      ctx.closePath();
      ctx.fillStyle =
        f.alpha < 1
          ? `rgba(${clampR},${clampG},${clampB},${f.alpha})`
          : `rgb(${clampR},${clampG},${clampB})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.22)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  // 7. Wireframe 3D de selección del bloque apuntado (selBox)
  if (selBox.visible) {
    const sbx = selBox.position.x - 0.505;
    const sby = selBox.position.y - 0.505;
    const sbz = selBox.position.z - 0.505;
    const s = 1.01;
    const corners = [
      projectWorldPoint(sbx, sby, sbz),
      projectWorldPoint(sbx + s, sby, sbz),
      projectWorldPoint(sbx + s, sby, sbz + s),
      projectWorldPoint(sbx, sby, sbz + s),
      projectWorldPoint(sbx, sby + s, sbz),
      projectWorldPoint(sbx + s, sby + s, sbz),
      projectWorldPoint(sbx + s, sby + s, sbz + s),
      projectWorldPoint(sbx, sby + s, sbz + s),
    ];
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const [i0, i1] of edges) {
      const p0 = corners[i0];
      const p1 = corners[i1];
      if (p0 && p1) {
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
      }
    }
    ctx.stroke();
  }
}
