import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { WORDMARK } from "@/fx/baked/wordmark";
import { wordmarkBitmap } from "../../hero/a-kit/glyphs";
import { readProfile, runLoop } from "../../hero/a-kit/loop";
import { traceGlyphs, type Glyph } from "../../hero/gold-3d/contours";
import { createFluid } from "./fluid";
import { brushedTexture, fpsGuard, studio, tokenColor } from "./kit";
import type { Sound } from "./sound";

/*
 * Gold toss. The brushed-gold KINZEN letters (outlines traced off the shipped wordmark mask, as in
 * the lab hero's gold-3d) stand on a dark stone ledge as heavy rigid bodies (cannon-es; each
 * letter is a compound of boxes cut from its own ink, so K's arm and Z's diagonal really collide).
 * Grab one and it hangs from the grab point on a damped spring (it swings, it lags a touch: it is
 * heavy); let go and it keeps the hand's momentum. Contacts clink, pitched by the letter's size and
 * as loud as the impact. Whatever reaches the water splashes: a crown of gold droplets, rings on
 * the mirror surface, and the letter melts into a bloom of gold ink (the hero's fluid, on the
 * water plane). Then the choreography that keeps the word whole: the ink drifts back to a point
 * under the letter's slot, the letter rises out of it, drinking the ink, and arcs home a little
 * rotated. A letter left toppled on the ledge lifts itself upright and back. Nothing stays broken.
 */

const EM = WORDMARK.bakePx;
const BW = WORDMARK.w / EM;
const BH = WORDMARK.h / EM;
const DEPTH = 0.26;
const WATER = -0.24;
const G = 15;
const LEDGE = { w: BW + 0.8, d: 0.95, h: 1.6 };
const DOMAIN = { x0: -4.8, z0: -1.4, w: 9.6, d: 5.2 };
const FRONT_Z = LEDGE.d / 2;

type Box = { cx: number; cy: number; hx: number; hy: number };
type State = "intro" | "free" | "held" | "sunk" | "rise" | "lift";
type Path = { p: THREE.Vector3[]; q0: THREE.Quaternion; q1: THREE.Quaternion; dur: number; t: number };

type Letter = {
  i: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  body: CANNON.Body;
  slot: THREE.Vector3;
  yaw: number;
  size: number;
  halfW: number;
  state: State;
  t: number;
  inWorld: boolean;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  hitAt: THREE.Vector3;
  path: Path | null;
  rested: number;
  away: number;
  glint: number;
  lastSound: number;
  emerged: boolean;
};

export type GoldToss = {
  throwLetter: (index?: number) => void;
  stop: () => void;
};

/** Boxes covering a glyph's ink: the outline is rasterised small, cut into bands, runs merged down. */
function glyphBoxes(g: Glyph): Box[] {
  const s = 0.25;
  const xs = g.outer.map((p) => p[0]);
  const ys = g.outer.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const W = Math.ceil((Math.max(...xs) - x0) * s) + 2;
  const H = Math.ceil((Math.max(...ys) - y0) * s) + 2;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const path = new Path2D();
  for (const loop of [g.outer, ...g.holes]) {
    loop.forEach(([x, y], i) => {
      const px = (x - x0) * s + 1;
      const py = (y - y0) * s + 1;
      if (i) path.lineTo(px, py);
      else path.moveTo(px, py);
    });
    path.closePath();
  }
  ctx.fill(path, "evenodd");
  const a = ctx.getImageData(0, 0, W, H).data;
  const NB = 9;
  type Run = { xa: number; xb: number; ya: number; yb: number };
  const boxes: Run[] = [];
  let open: Run[] = [];
  for (let b = 0; b < NB; b++) {
    const ya = Math.floor((b * H) / NB);
    const yb = Math.floor(((b + 1) * H) / NB);
    const runs: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= W; x++) {
      let n = 0;
      if (x < W) for (let y = ya; y < yb; y++) n += a[(y * W + x) * 4 + 3] > 127 ? 1 : 0;
      const on = x < W && n > (yb - ya) * 0.5;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs.push([start, x]);
        start = -1;
      }
    }
    const next: Run[] = [];
    for (const [ra, rb] of runs) {
      const m = open.find((o) => Math.abs(o.xa - ra) <= 1 && Math.abs(o.xb - rb) <= 1);
      if (m) {
        m.yb = yb;
        next.push(m);
      } else {
        const o = { xa: ra, xb: rb, ya, yb };
        boxes.push(o);
        next.push(o);
      }
    }
    open = next;
  }
  const pad = 0.016;
  return boxes.map((o) => ({
    cx: (((o.xa + o.xb) / 2 - 1) / s + x0) / EM - BW / 2,
    cy: -((((o.ya + o.yb) / 2 - 1) / s + y0) / EM - BH / 2),
    hx: (o.xb - o.xa) / 2 / s / EM + pad - 0.006,
    hy: (o.yb - o.ya) / 2 / s / EM + pad,
  }));
}

function noiseTexture(size: number, k: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (Math.random() - 0.5) * k + (Math.random() < 0.02 ? 60 : 0);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const WATER_SHADER = {
  name: "GoldTossWater",
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uDye: { value: null },
    uVel: { value: null },
    uDomain: { value: new THREE.Vector4() },
    uDyeTexel: { value: new THREE.Vector2() },
    uGold: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color() },
    uCam: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uRings: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
  },
  vertexShader: `
uniform mat4 textureMatrix;
varying vec4 vRefl;
varying vec3 vWorld;
void main(){
  vRefl = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
  fragmentShader: `
uniform vec3 color;
uniform sampler2D tDiffuse, uDye, uVel;
uniform vec4 uDomain;
uniform vec2 uDyeTexel;
uniform vec3 uGold, uDeep, uCam;
uniform float uTime;
uniform vec4 uRings[12];
varying vec4 vRefl;
varying vec3 vWorld;
void main(){
  vec2 uv = (vWorld.xz - uDomain.xy) * uDomain.zw;
  vec2 e = min(uv, 1.0 - uv);
  float inside = smoothstep(0.0, 0.06, min(e.x, e.y));
  vec2 slope = vec2(0.0);
  // Rings: a damped travelling wave packet per splash or drip (xz centre, age, amplitude).
  for (int i = 0; i < 12; i++) {
    vec4 r = uRings[i];
    if (r.w <= 0.0) continue;
    vec2 d = vWorld.xz - r.xy;
    float dist = length(d) + 1e-4;
    float x = dist - r.z * 1.25;
    float env = r.w * exp(-r.z * 1.4) * exp(-x * x * 7.0) / (1.0 + dist * 1.5);
    slope += (d / dist) * env * cos(x * 22.0) * 0.16;
  }
  // A slow swell so the mirror is never dead glass.
  slope += vec2(sin(vWorld.x * 2.3 + uTime * 0.8 + sin(vWorld.z * 1.7 + uTime * 0.3)),
                cos(vWorld.z * 3.1 - uTime * 1.05 + vWorld.x * 0.6)) * 0.009
         + vec2(0.0, sin(vWorld.z * 8.0 - uTime * 1.5 + sin(vWorld.x * 3.0))) * 0.004;
  float d = 0.0;
  vec2 dg = vec2(0.0);
  if (inside > 0.0) {
    d = texture2D(uDye, uv).x * inside;
    float L = texture2D(uDye, uv - vec2(uDyeTexel.x, 0.0)).x;
    float R = texture2D(uDye, uv + vec2(uDyeTexel.x, 0.0)).x;
    float T = texture2D(uDye, uv + vec2(0.0, uDyeTexel.y)).x;
    float B = texture2D(uDye, uv - vec2(0.0, uDyeTexel.y)).x;
    dg = vec2(R - L, T - B) * inside;
    slope += texture2D(uVel, uv).xy * 0.00005 * inside;
  }
  slope += dg * 0.05;
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 V = normalize(uCam - vWorld);
  float cosT = clamp(dot(N, V), 0.0, 1.0);
  float F = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);
  vec4 rc = vRefl;
  rc.xy += slope * 1.6 * rc.w;
  // Vertical streaks: a few taps down the reflection, the way light smears on moving water.
  vec3 refl = vec3(0.0);
  for (int k = 0; k < 5; k++) {
    vec4 q = rc;
    q.y += (float(k) - 1.0) * 0.006 * rc.w;
    q.x += sin(vWorld.z * 14.0 + float(k) * 1.7 + uTime * 1.3) * 0.0012 * rc.w;
    refl += texture2DProj(tDiffuse, q).rgb;
  }
  refl /= 5.0;
  vec3 col = uDeep * 0.6 + refl * mix(0.1, 0.62, F);
  // Gold ink in the water: thin wisps an amber veil, thick ink lit liquid gold.
  float a = (1.0 - exp(-pow(d, 1.2) * 1.9)) * 0.92;
  vec3 Ld = normalize(vec3(-0.35, 0.85, 0.4));
  vec3 inkN = normalize(vec3(-dg.x * 2.2, 1.0, -dg.y * 2.2));
  float diff = clamp(dot(inkN, Ld), 0.0, 1.0);
  float spec = pow(clamp(dot(inkN, normalize(Ld + V)), 0.0, 1.0), 70.0);
  // Veins: where the ink folds (steep gradient) it reads darker and richer, the way dye in water
  // shows its layers; flat thick ink is bright.
  float fold = smoothstep(0.02, 0.25, length(dg));
  vec3 ink = mix(uGold * vec3(0.8, 0.6, 0.3) * 0.62, uGold * vec3(1.15, 1.02, 0.78) * 1.05, smoothstep(0.08, 1.1, d));
  ink *= (0.5 + 0.6 * diff) * (1.0 - fold * 0.35);
  col = mix(col, ink, a * 0.9) + vec3(1.0, 0.9, 0.7) * spec * a * 1.1 + refl * F * a * 0.25;
  float far = smoothstep(4.0, 11.5, length(vWorld.xz));
  col = mix(col, uDeep * 0.95, far);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
};

export function startGoldToss(
  stage: HTMLElement,
  sound: Sound,
  onPlay: () => void,
): GoldToss {
  const prof = readProfile(2);
  const lite = prof.phone;
  const gold = tokenColor(stage, "--gold", "#d6b062");
  const deep = new THREE.Color().setRGB(0.008, 0.011, 0.024);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    return { throwLetter: () => {}, stop: () => {} };
  }
  const dpr0 = Math.min(prof.dpr, lite ? 1.5 : 2);
  renderer.setPixelRatio(dpr0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(deep, 1);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const env = studio(renderer, new THREE.Color().setRGB(0.075, 0.062, 0.05), 1.15, 2.2);
  scene.environment = env.texture;
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 80);

  // Lights: a warm key from the upper left that casts the letters' shadows on the stone, a cool rim.
  const key = new THREE.DirectionalLight(0xffe0b4, 2.6);
  key.position.set(-2.6, 5, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.015;
  key.shadow.radius = 5;
  const sc = key.shadow.camera;
  sc.left = -3.2;
  sc.right = 3.2;
  sc.top = 2.6;
  sc.bottom = -2.2;
  sc.near = 1;
  sc.far = 14;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.9);
  rim.position.set(2.5, 2.2, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x4a5878, 0x05070d, 0.35));

  // The far wall: navy, with a warm haze behind the word that the water mirrors.
  const backGeo = new THREE.PlaneGeometry(90, 26);
  const backMat = new THREE.ShaderMaterial({
    uniforms: { uGold: { value: gold }, uDeep: { value: deep } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uGold, uDeep; varying vec3 vW;
void main(){
  float y = vW.y;
  vec3 col = mix(uDeep * 0.95, uDeep * 0.6, smoothstep(-0.3, 6.0, y));
  float glow = exp(-pow(vW.x / 4.5, 2.0) - pow((y - 0.4) / 1.6, 2.0));
  col += uGold * 0.012 * glow;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    depthWrite: false,
  });
  const back = new THREE.Mesh(backGeo, backMat);
  back.position.set(0, WATER + 13, -12);
  scene.add(back);

  // The ledge: rough black stone that catches the letters' shadows.
  const stoneBump = noiseTexture(256, 120);
  stoneBump.repeat.set(3, 1.4);
  const ledgeGeo = new RoundedBoxGeometry(LEDGE.w, LEDGE.h, LEDGE.d, 3, 0.04);
  const ledgeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.007, 0.008, 0.012),
    roughness: 0.78,
    roughnessMap: stoneBump,
    bumpMap: stoneBump,
    bumpScale: 0.9,
    envMapIntensity: 0.2,
  });
  const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
  ledge.position.set(0, -LEDGE.h / 2, 0);
  ledge.receiveShadow = true;
  ledge.castShadow = true;
  scene.add(ledge);

  // Water: a mirror (reflection rendered from below the plane) that also carries the ink.
  let reflScale = lite ? 0.5 : 0.6;
  const water = new Reflector(new THREE.PlaneGeometry(70, 70), {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.002,
    multisample: lite ? 0 : 4,
    shader: WATER_SHADER,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER;
  scene.add(water);
  const wu = (water.material as THREE.ShaderMaterial).uniforms;
  wu.uDomain.value.set(DOMAIN.x0, DOMAIN.z0, 1 / DOMAIN.w, 1 / DOMAIN.d);
  wu.uGold.value.copy(gold);
  wu.uDeep.value.copy(deep);

  const simW = lite ? 96 : 192;
  const simH = Math.round((simW * DOMAIN.d) / DOMAIN.w);
  const dyeW = lite ? 448 : 1024;
  const dyeH = Math.round((dyeW * DOMAIN.d) / DOMAIN.w);
  const fluid = createFluid(renderer, simW, simH, dyeW, dyeH, lite ? 10 : 18);
  wu.uDyeTexel.value.set(1 / dyeW, 1 / dyeH);
  const toUV = (x: number, z: number) => [(x - DOMAIN.x0) / DOMAIN.w, (z - DOMAIN.z0) / DOMAIN.d] as const;
  const inDomain = (u: number, v: number) => u > 0.02 && u < 0.98 && v > 0.02 && v < 0.98;
  // World units per second to sim texels per second (x and z).
  const kx = simW / DOMAIN.w;
  const kz = simH / DOMAIN.d;

  const rings = wu.uRings.value as THREE.Vector4[];
  let ringNext = 0;
  const ring = (x: number, z: number, amp: number) => {
    rings[ringNext].set(x, z, 0, amp);
    ringNext = (ringNext + 1) % rings.length;
  };

  // Physics.
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = lite ? 8 : 14;
  const metal = new CANNON.Material("metal");
  const stone = new CANNON.Material("stone");
  world.addContactMaterial(new CANNON.ContactMaterial(metal, metal, { friction: 0.32, restitution: 0.2 }));
  world.addContactMaterial(new CANNON.ContactMaterial(metal, stone, { friction: 0.62, restitution: 0.08 }));
  const ledgeBody = new CANNON.Body({ mass: 0, material: stone });
  ledgeBody.addShape(new CANNON.Box(new CANNON.Vec3(LEDGE.w / 2, LEDGE.h / 2, LEDGE.d / 2)));
  ledgeBody.position.set(0, -LEDGE.h / 2, 0);
  world.addBody(ledgeBody);

  // Letters.
  const brushed = brushedTexture();
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: gold.clone().lerp(new THREE.Color(1, 0.74, 0.32), 0.5),
    metalness: 1,
    roughness: 0.24,
    roughnessMap: brushed,
    anisotropy: 0.75,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.7,
    emissive: gold.clone(),
    emissiveIntensity: 0,
  });
  const glyphs = traceGlyphs(wordmarkBitmap(), 1.1);
  const letters: Letter[] = glyphs.map((g, i) => {
    const boxes = glyphBoxes(g);
    let area = 0;
    let mx = 0;
    let my = 0;
    for (const b of boxes) {
      const A = b.hx * b.hy * 4;
      area += A;
      mx += b.cx * A;
      my += b.cy * A;
    }
    mx /= area || 1;
    my /= area || 1;
    const toV = ([x, y]: [number, number]) => new THREE.Vector2(x / EM - BW / 2, -(y / EM - BH / 2));
    const shape = new THREE.Shape(g.outer.map(toV));
    shape.holes = g.holes.map((h) => new THREE.Path(h.map(toV)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.016,
      bevelSegments: lite ? 2 : 4,
      curveSegments: 1,
    });
    geo.translate(-mx, -my, -DEPTH / 2);
    geo.computeVertexNormals();
    const mat = baseMat.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.i = i;
    scene.add(mesh);
    const body = new CANNON.Body({
      mass: Math.max(0.4, area * 7),
      material: metal,
      linearDamping: 0.04,
      angularDamping: 0.12,
      sleepSpeedLimit: 0.06,
      sleepTimeLimit: 0.5,
    });
    let x0 = Infinity;
    let x1 = -Infinity;
    for (const b of boxes) {
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(b.hx, b.hy, DEPTH / 2 + 0.03)),
        new CANNON.Vec3(b.cx - mx, b.cy - my, 0),
      );
      x0 = Math.min(x0, b.cx - b.hx);
      x1 = Math.max(x1, b.cx + b.hx);
    }
    const slot = new THREE.Vector3(mx, my + BH / 2 + 0.017, 0);
    const L: Letter = {
      i,
      mesh,
      mat,
      body,
      slot,
      yaw: 0,
      size: Math.sqrt(area / 0.12),
      halfW: (x1 - x0) / 2,
      state: prof.still ? "free" : "intro",
      t: 0,
      inWorld: false,
      vel: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      hitAt: new THREE.Vector3(),
      path: null,
      rested: 0,
      away: 0,
      glint: 0,
      lastSound: 0,
      emerged: false,
    };
    body.addEventListener("collide", (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      const vn = Math.abs(e.contact.getImpactVelocityAlongNormal());
      const now = performance.now();
      if (vn < 0.35 || now - L.lastSound < 55) return;
      L.lastSound = now;
      if (e.body === ledgeBody) {
        sound.thud(vn / 5.5);
        sound.clink(vn / 12, L.size);
      } else {
        sound.clink(vn / 4.5, L.size);
        if (vn > 2.2) sparks(e, vn);
      }
    });
    return L;
  });
  const meshes = letters.map((l) => l.mesh);

  const placeAtSlot = (L: Letter, lift = 0) => {
    L.body.position.set(L.slot.x, L.slot.y + lift, L.slot.z);
    L.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), L.yaw);
    L.body.velocity.setZero();
    L.body.angularVelocity.setZero();
  };
  const enter = (L: Letter) => {
    if (!L.inWorld) {
      world.addBody(L.body);
      L.inWorld = true;
    }
    L.body.wakeUp();
  };
  const leave = (L: Letter) => {
    if (L.inWorld) {
      world.removeBody(L.body);
      L.inWorld = false;
    }
  };
  const syncMesh = (L: Letter) => {
    const p = L.body.position;
    const q = L.body.quaternion;
    L.mesh.position.set(p.x, p.y, p.z);
    L.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  };
  for (const L of letters) {
    placeAtSlot(L, L.state === "intro" ? 1.1 : 0);
    syncMesh(L);
    if (L.state === "free") {
      enter(L);
      L.body.sleep();
    }
  }

  // Droplets: a pool of small gold beads, stretched along their velocity.
  const DROPS = lite ? 90 : 200;
  const dropGeo = new THREE.IcosahedronGeometry(1, 1);
  const dropMat = new THREE.MeshStandardMaterial({
    color: gold.clone().lerp(new THREE.Color(1, 0.85, 0.5), 0.3),
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 1.6,
    emissive: gold.clone(),
    emissiveIntensity: 0.12,
  });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, DROPS);
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  drops.frustumCulled = false;
  scene.add(drops);
  const dp = new Float32Array(DROPS * 3);
  const dv = new Float32Array(DROPS * 3);
  const ds = new Float32Array(DROPS);
  const dl = new Float32Array(DROPS);
  let dropNext = 0;
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < DROPS; i++) drops.setMatrixAt(i, zeroM);
  const spawnDrop = (x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number) => {
    const i = dropNext;
    dropNext = (dropNext + 1) % DROPS;
    dp.set([x, y, z], i * 3);
    dv.set([vx, vy, vz], i * 3);
    ds[i] = size;
    dl[i] = 1;
  };
  function sparks(e: { contact: CANNON.ContactEquation }, vn: number) {
    const c = e.contact;
    const p = new THREE.Vector3(
      c.bi.position.x + c.ri.x,
      c.bi.position.y + c.ri.y,
      c.bi.position.z + c.ri.z,
    );
    const n = Math.min(10, Math.round(vn * 1.5));
    for (let k = 0; k < n; k++) {
      spawnDrop(
        p.x,
        p.y,
        p.z,
        (Math.random() - 0.5) * 3,
        1 + Math.random() * 2.5,
        (Math.random() - 0.2) * 2,
        0.006 + Math.random() * 0.008,
      );
    }
  }

  // Splash: a crown of droplets, a ring, a burst in the fluid and a swell of ink.
  const splash = (L: Letter) => {
    const p = L.body.position;
    const v = L.body.velocity;
    const speed = Math.min(12, Math.hypot(v.x, v.y, v.z));
    const k = 0.4 + Math.min(1, speed / 8) * 0.6;
    L.hitAt.set(p.x, WATER, p.z);
    sound.splash(k);
    ring(p.x, p.z, 0.8 + k);
    const n = Math.round((lite ? 26 : 56) * k);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.05 + Math.random() * 0.22;
      const up = 2.2 + Math.random() * 4.2 * k;
      const out = 0.6 + Math.random() * 2.2 * k;
      spawnDrop(
        p.x + Math.cos(a) * r,
        WATER + 0.02,
        p.z + Math.sin(a) * r,
        Math.cos(a) * out + v.x * 0.15,
        up,
        Math.sin(a) * out + v.z * 0.15,
        0.012 + Math.random() * 0.028 * k,
      );
    }
    const [u, w] = toUV(p.x, p.z);
    if (inDomain(u, w)) {
      const spokes = 10;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const s = (240 + 260 * k) * 0.5;
        fluid.splat(
          u + (Math.cos(a) * 0.012) / (DOMAIN.w / DOMAIN.d),
          w + Math.sin(a) * 0.012,
          Math.cos(a + 0.6) * s,
          Math.sin(a + 0.6) * s,
          0.0018,
        );
      }
      fluid.splat(u, w, v.x * kx * 0.6, v.z * kz * 0.6, 0.005, 1.15 * k);
    }
    L.vel.set(v.x, v.y, v.z);
    const av = L.body.angularVelocity;
    L.spin.set(av.x, av.y, av.z);
    if (held?.L === L) held = null;
    leave(L);
    L.state = "sunk";
    L.t = 0;
    L.emerged = false;
  };

  // The gold drifts home: a gather point in the water just in front of the letter's slot.
  const homeWater = (L: Letter) => new THREE.Vector3(L.slot.x, WATER, FRONT_Z + 0.42);

  const bezier = (p: THREE.Vector3[], t: number, out: THREE.Vector3) => {
    const u = 1 - t;
    return out
      .copy(p[0])
      .multiplyScalar(u * u * u)
      .addScaledVector(p[1], 3 * u * u * t)
      .addScaledVector(p[2], 3 * u * t * t)
      .addScaledVector(p[3], t * t * t);
  };
  const finalQuat = (L: Letter) => {
    L.yaw = (Math.random() - 0.5) * 0.12;
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), L.yaw);
  };

  const startRise = (L: Letter) => {
    const h = homeWater(L);
    const top = L.slot.y + 0.62;
    L.path = {
      p: [
        new THREE.Vector3(h.x, WATER - 0.75, h.z),
        new THREE.Vector3(h.x, top + 0.1, h.z + 0.05),
        new THREE.Vector3(L.slot.x, top, 0.12),
        new THREE.Vector3(L.slot.x, L.slot.y + 0.035, 0),
      ],
      q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.9, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4)),
      q1: finalQuat(L),
      dur: 1.35,
      t: 0,
    };
    L.state = "rise";
    L.t = 0;
    L.mesh.visible = true;
  };

  const startLift = (L: Letter) => {
    leave(L);
    const p0 = L.mesh.position.clone();
    const hop = Math.max(p0.y, L.slot.y) + 0.5;
    L.path = {
      p: [
        p0,
        new THREE.Vector3(p0.x, hop, p0.z),
        new THREE.Vector3(L.slot.x, hop, 0),
        new THREE.Vector3(L.slot.x, L.slot.y + 0.03, 0),
      ],
      q0: L.mesh.quaternion.clone(),
      q1: finalQuat(L),
      dur: 1.0,
      t: 0,
    };
    L.state = "lift";
    L.t = 0;
    L.emerged = false;
  };

  const blocked = (L: Letter) =>
    letters.some(
      (o) =>
        o !== L &&
        o.inWorld &&
        o.body.position.y < L.slot.y + 0.6 &&
        Math.abs(o.body.position.x - L.slot.x) < (o.halfW + L.halfW) * 0.8 &&
        Math.abs(o.body.position.z) < FRONT_Z + 0.2,
    );

  const land = (L: Letter) => {
    const end = L.path!.p[3];
    L.body.position.set(end.x, end.y, end.z);
    const q = L.path!.q1;
    L.body.quaternion.set(q.x, q.y, q.z, q.w);
    L.body.velocity.set(0, -0.5, 0);
    L.body.angularVelocity.setZero();
    L.path = null;
    L.state = "free";
    L.t = 0;
    L.rested = 0;
    L.away = 0;
    enter(L);
  };

  // Throws from code (keyboard, the idle invitation).
  const throwLetter = (index?: number) => {
    const free = letters.filter((l) => l.state === "free");
    const L = index === undefined ? free[Math.floor(Math.random() * free.length)] : letters[index];
    if (!L || L.state !== "free") return;
    played();
    enter(L);
    const side = L.slot.x < 0 ? -1 : 1;
    L.body.velocity.set(side * (0.5 + Math.random() * 1.1), 4.4 + Math.random() * 1.0, 2.3 + Math.random() * 0.9);
    L.body.angularVelocity.set((Math.random() - 0.3) * 7, (Math.random() - 0.5) * 6, side * -(2 + Math.random() * 4));
  };
  const hop = (L: Letter, k = 1) => {
    enter(L);
    L.body.velocity.set((Math.random() - 0.5) * 0.4 * k, 3.1 * k, 0.35 * k);
    L.body.angularVelocity.set((Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * 3 * k, (Math.random() - 0.5) * 1.5 * k);
  };

  let hasPlayed = false;
  const played = () => {
    if (hasPlayed) return;
    hasPlayed = true;
    onPlay();
  };

  // Layout: the camera frames the word with room for the water in front.
  let dist = 5;
  const look = new THREE.Vector3();
  const camBase = new THREE.Vector3();
  const layout = () => {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const portrait = camera.aspect < 1;
    const needW = BW * (portrait ? 1.42 : 2.0);
    dist = Math.max(portrait ? 6 : 5, needW / (2 * tan * camera.aspect));
    const elev = THREE.MathUtils.degToRad(portrait ? 21 : 9.5);
    look.set(0, portrait ? 0.22 : 0.16, portrait ? 0.8 : 0.5);
    camBase.set(0, look.y + Math.sin(elev) * dist, look.z + Math.cos(elev) * dist);
    camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    water.getRenderTarget().setSize(Math.round(w * pr * reflScale), Math.round(h * pr * reflScale));
  };
  layout();

  // Input: grab with a damped spring at the grab point, fling with the hand's momentum.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  type Held = {
    L: Letter;
    local: CANNON.Vec3;
    plane: THREE.Plane;
    target: THREE.Vector3;
    hist: { x: number; y: number; t: number }[];
    downAt: number;
    moved: number;
    id: number;
  };
  let held: Held | null = null;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const setNdc = (cx: number, cy: number) => {
    const r = stage.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return r;
  };
  const pick = (cx: number, cy: number): { L: Letter; point: THREE.Vector3 } | null => {
    const r = setNdc(cx, cy);
    const hits = ray.intersectObjects(meshes.filter((m) => letters[m.userData.i as number].state === "free"), false);
    if (hits[0]) return { L: letters[hits[0].object.userData.i as number], point: hits[0].point };
    // Touch forgiveness: the nearest letter centre within 34 px.
    let best: Letter | null = null;
    let bd = 34;
    const v = new THREE.Vector3();
    for (const L of letters) {
      if (L.state !== "free") continue;
      v.copy(L.mesh.position).project(camera);
      const d = Math.hypot(((v.x + 1) / 2) * r.width - (cx - r.left), ((1 - v.y) / 2) * r.height - (cy - r.top));
      if (d < bd) {
        bd = d;
        best = L;
      }
    }
    return best ? { L: best, point: best.mesh.position.clone() } : null;
  };

  // One grab path for mouse/pen (pointer events) and touch (touch events: a touch that starts on a
  // letter cancels the page scroll, which pointer events cannot do once pan-y is allowed).
  const grab = (cx: number, cy: number, id: number): boolean => {
    const hit = pick(cx, cy);
    if (!hit) return false;
    if (prof.still) {
      hit.L.glint = 1;
      sound.clink(0.5, hit.L.size);
      kick();
      return true;
    }
    const { L, point } = hit;
    enter(L);
    const local = L.body.pointToLocalFrame(new CANNON.Vec3(point.x, point.y, point.z));
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -point.z);
    held = {
      L,
      local,
      plane,
      target: point.clone(),
      hist: [{ x: cx, y: cy, t: performance.now() }],
      downAt: performance.now(),
      moved: 0,
      id,
    };
    L.state = "held";
    L.body.angularDamping = 0.55;
    stage.style.cursor = "grabbing";
    played();
    return true;
  };
  const drag = (cx: number, cy: number, id: number) => {
    if (!held || id !== held.id) return;
    setNdc(cx, cy);
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(held.plane, p)) {
      p.y = Math.max(p.y, WATER - 0.4);
      held.target.copy(p);
    }
    const last = held.hist[held.hist.length - 1];
    held.moved += Math.hypot(cx - last.x, cy - last.y);
    held.hist.push({ x: cx, y: cy, t: performance.now() });
    if (held.hist.length > 8) held.hist.shift();
  };
  const release = (id: number) => {
    if (!held || id !== held.id) return;
    const { L, downAt, moved } = held;
    held = null;
    stage.style.cursor = "";
    if (L.state !== "held") return;
    L.state = "free";
    L.body.angularDamping = 0.12;
    L.rested = 0;
    if (performance.now() - downAt < 220 && moved < 8) {
      hop(L);
      return;
    }
    // Fling: the spring already carries the hand's speed. Capped so a hard flick still lands in
    // view; sideways speed turns partly into a throw toward the viewer (it lands in the water in
    // front), and the tumble grows with the throw.
    const v = L.body.velocity;
    const s0 = Math.hypot(v.x, v.y);
    if (s0 > 6) v.scale(6 / s0, v);
    const sx = Math.abs(v.x);
    const portrait = camera.aspect < 1;
    const xCap = portrait ? 0.6 : 2;
    if (sx > xCap) v.x = Math.sign(v.x) * (xCap + (sx - xCap) * 0.2);
    // Narrow screens: the end letters arc a little inward so their splash stays in view.
    if (portrait) v.x -= L.slot.x * 0.7;
    const s = Math.hypot(v.x, v.y);
    v.y += Math.min(0.8, s * 0.15);
    v.z += portrait ? Math.min(2.8, 1.1 + s * 0.4) : Math.min(2.2, 0.6 + s * 0.26);
    const tumble = Math.min(1, s / 7);
    L.body.angularVelocity.vadd(
      new CANNON.Vec3((Math.random() - 0.5) * 6 * tumble, (Math.random() - 0.5) * 5 * tumble, -Math.sign(v.x || 1) * 3 * tumble),
      L.body.angularVelocity,
    );
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    if (grab(e.clientX, e.clientY, e.pointerId)) {
      e.preventDefault();
      stage.setPointerCapture?.(e.pointerId);
    }
  };
  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    parallax.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    parallax.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (e.pointerType === "touch") return;
    if (held) drag(e.clientX, e.clientY, e.pointerId);
    else if (e.pointerType === "mouse") stage.style.cursor = pick(e.clientX, e.clientY) && !prof.still ? "grab" : "";
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerType !== "touch") release(e.pointerId);
  };
  const touchId = (t: Touch) => -1 - t.identifier;
  const onTouchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (!held && t && grab(t.clientX, t.clientY, touchId(t))) e.preventDefault();
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!held) return;
    for (const t of Array.from(e.changedTouches)) {
      if (touchId(t) === held.id) {
        e.preventDefault();
        drag(t.clientX, t.clientY, touchId(t));
      }
    }
  };
  const onTouchEnd = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) release(touchId(t));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toUpperCase();
    const word = "KINZEN";
    if (k === "ENTER" || k === " ") {
      e.preventDefault();
      if (prof.still) return;
      throwLetter();
      return;
    }
    if (!word.includes(k)) return;
    e.preventDefault();
    const idx = [...word].map((c, i) => (c === k ? i : -1)).filter((i) => i >= 0);
    const pickIdx = idx.find((i) => letters[i]?.state === "free");
    if (pickIdx === undefined) return;
    if (prof.still) {
      letters[pickIdx].glint = 1;
      sound.clink(0.5, letters[pickIdx].size);
      kick();
    } else throwLetter(pickIdx);
  };
  stage.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  stage.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);
  stage.addEventListener("keydown", onKey);

  const guard = fpsGuard((level) => {
    if (level === 1) {
      renderer.setPixelRatio(Math.min(dpr0, 1.25));
      reflScale *= 0.6;
      layout();
    } else {
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
      fluid.setIterations(8);
      layout();
    }
  });

  // The loop.
  const STEP = lite ? 1 / 60 : 1 / 120;
  let acc = 0;
  let time = 0;
  let nextInvite = 6;
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const dq = new THREE.Quaternion();
  const sc3 = new THREE.Vector3();

  const physics = (dt: number) => {
    acc = Math.min(acc + dt, STEP * 6);
    while (acc >= STEP) {
      acc -= STEP;
      if (held && held.L.state === "held") {
        const b = held.L.body;
        b.wakeUp();
        const r = b.quaternion.vmult(held.local);
        const wp = b.position.vadd(r);
        const pv = b.velocity.vadd(b.angularVelocity.cross(r));
        const w0 = 17;
        const z = 0.85;
        const t = held.target;
        const f = new CANNON.Vec3(
          b.mass * (w0 * w0 * (t.x - wp.x) - 2 * z * w0 * pv.x),
          b.mass * (w0 * w0 * (t.y - wp.y) - 2 * z * w0 * pv.y),
          b.mass * (w0 * w0 * (t.z - wp.z) - 2 * z * w0 * pv.z),
        );
        b.applyForce(f, r);
      }
      world.step(STEP);
    }
  };

  const updateLetters = (dt: number) => {
    for (const L of letters) {
      L.t += dt;
      if (L.glint > 0) {
        L.glint = Math.max(0, L.glint - dt * 1.8);
        L.mat.emissiveIntensity = L.glint * 0.5;
      }
      switch (L.state) {
        case "intro": {
          if (time > 0.35 + L.i * 0.13) {
            L.state = "free";
            enter(L);
          }
          break;
        }
        case "free":
        case "held": {
          syncMesh(L);
          const p = L.body.position;
          if (p.y < WATER + 0.12) {
            splash(L);
            break;
          }
          if (L.state === "held") break;
          // Displaced on the ledge: once it has come to rest, it lifts itself home.
          tmpQ.set(L.body.quaternion.x, L.body.quaternion.y, L.body.quaternion.z, L.body.quaternion.w);
          tmpV.copy(up).applyQuaternion(tmpQ);
          const tilt = Math.acos(THREE.MathUtils.clamp(tmpV.y, -1, 1));
          const off = Math.hypot(p.x - L.slot.x, p.z - L.slot.z, p.y - L.slot.y);
          const displaced = tilt > 0.2 || off > 0.12;
          const slow = L.body.velocity.length() < 0.3 && L.body.angularVelocity.length() < 0.7;
          L.rested = displaced && slow ? L.rested + dt : 0;
          L.away = displaced ? L.away + dt : 0;
          if (L.rested > 1.1 || L.away > 8) startLift(L);
          break;
        }
        case "sunk": {
          // Under the surface: the water drags it to a stop and it sinks while the ink blooms.
          L.vel.multiplyScalar(Math.exp(-dt * 5));
          L.vel.y -= 2.2 * dt;
          L.spin.multiplyScalar(Math.exp(-dt * 3));
          L.mesh.position.addScaledVector(L.vel, dt);
          dq.setFromEuler(new THREE.Euler(L.spin.x * dt, L.spin.y * dt, L.spin.z * dt));
          L.mesh.quaternion.premultiply(dq);
          if (L.mesh.position.y < WATER - 1.2) L.mesh.visible = false;
          const [u, w] = toUV(L.mesh.position.x, L.mesh.position.z);
          if (L.t < 1.0 && inDomain(u, w)) {
            const k = 1 - L.t;
            fluid.splat(u, w, L.vel.x * kx * 0.5, L.vel.z * kz * 0.5, 0.003, 0.1 * k * Math.min(1, dt * 60));
          }
          const h = homeWater(L);
          const [gu, gv] = toUV(h.x, h.z);
          const g = fluid.gathers[L.i];
          const pull = THREE.MathUtils.smoothstep(L.t, 1.4, 2.0);
          g.set(gu, gv, 0.32 * pull, 0.22);
          if (L.t > 2.9) startRise(L);
          break;
        }
        case "rise":
        case "lift": {
          const P = L.path!;
          P.t = Math.min(1, P.t + dt / P.dur);
          const e = P.t < 0.5 ? 4 * P.t ** 3 : 1 - (-2 * P.t + 2) ** 3 / 2;
          bezier(P.p, e, L.mesh.position);
          L.mesh.quaternion.slerpQuaternions(P.q0, P.q1, THREE.MathUtils.smoothstep(e, 0.05, 0.85));
          if (L.state === "rise") {
            const h = homeWater(L);
            const [gu, gv] = toUV(h.x, h.z);
            fluid.gathers[L.i].set(gu, gv, 0.32 * (1 - THREE.MathUtils.smoothstep(P.t, 0.15, 0.4)), 0.22);
            fluid.absorbs[L.i].set(gu, gv, 5 * (1 - THREE.MathUtils.smoothstep(P.t, 0.55, 0.8)), 0.06);
            L.mat.emissiveIntensity = Math.max(L.glint * 0.5, 0.12 * Math.sin(Math.PI * Math.min(1, P.t * 1.3)));
            const y = L.mesh.position.y;
            if (!L.emerged && y > WATER - 0.3) {
              L.emerged = true;
              ring(h.x, h.z, 1.1);
              sound.splash(0.25);
              for (let k = 0; k < (lite ? 10 : 22); k++) {
                const a = Math.random() * Math.PI * 2;
                spawnDrop(h.x, WATER + 0.02, h.z, Math.cos(a) * 0.8, 1.2 + Math.random() * 1.6, Math.sin(a) * 0.8, 0.01 + Math.random() * 0.016);
              }
            }
            // Drips while it climbs out.
            if (L.emerged && P.t < 0.7 && Math.random() < dt * 30) {
              spawnDrop(
                L.mesh.position.x + (Math.random() - 0.5) * L.halfW * 1.6,
                L.mesh.position.y - 0.3,
                L.mesh.position.z,
                0,
                -0.2,
                0,
                0.008 + Math.random() * 0.014,
              );
            }
          }
          if (P.t >= 1) {
            if (blocked(L)) {
              P.t = 0.995;
              break;
            }
            fluid.gathers[L.i].set(0, 0, 0, 0);
            fluid.absorbs[L.i].set(0, 0, 0, 0);
            L.mat.emissiveIntensity = 0;
            land(L);
          }
          break;
        }
      }
    }
  };

  const updateDrops = (dt: number) => {
    let inks = 0;
    for (let i = 0; i < DROPS; i++) {
      if (dl[i] <= 0) continue;
      const o = i * 3;
      dv[o + 1] -= G * dt;
      dp[o] += dv[o] * dt;
      dp[o + 1] += dv[o + 1] * dt;
      dp[o + 2] += dv[o + 2] * dt;
      if (dp[o + 1] < WATER) {
        dl[i] = 0;
        drops.setMatrixAt(i, zeroM);
        if (ds[i] > 0.016 && inks < 6) {
          inks++;
          ring(dp[o], dp[o + 2], 0.18 + ds[i] * 6);
          const [u, w] = toUV(dp[o], dp[o + 2]);
          if (inDomain(u, w)) fluid.splat(u, w, dv[o] * kx * 0.2, dv[o + 2] * kz * 0.2, 0.0009, 0.1);
        }
        continue;
      }
      tmpV.set(dv[o], dv[o + 1], dv[o + 2]);
      const sp = tmpV.length();
      tmpQ.setFromUnitVectors(up, tmpV.normalize());
      const s = ds[i];
      sc3.set(s, s * (1 + Math.min(2.5, sp * 0.18)), s);
      m4.compose(new THREE.Vector3(dp[o], dp[o + 1], dp[o + 2]), tmpQ, sc3);
      drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
  };

  const render = (dt: number) => {
    for (const r of rings) if (r.w > 0) r.z += dt;
    parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 2.5);
    parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 2.5);
    camera.position.set(camBase.x + parallax.x * 0.18, camBase.y - parallax.y * 0.06, camBase.z);
    camera.lookAt(look);
    scene.environmentRotation.set(0, Math.sin(time * 0.21) * 0.45 + parallax.x * 0.15, 0);
    wu.uCam.value.copy(camera.position);
    wu.uTime.value = time;
    wu.uDye.value = fluid.dye();
    wu.uVel.value = fluid.vel();
    renderer.render(scene, camera);
  };

  const frame = (_t: number, dt: number) => {
    time += dt;
    guard(dt);
    physics(dt);
    updateLetters(dt);
    updateDrops(dt);
    // Once a letter is drinking its ink back, the rest of the gold thins out of the water.
    const clearing = letters.some((l) => (l.state === "rise" && l.path!.t > 0.3) || (l.state === "free" && l.t < 1.5 && l.emerged));
    fluid.setDecay(clearing ? 0.85 : 0.06);
    fluid.step(dt);
    // An invitation until the first touch: now and then a letter shifts its weight.
    if (!hasPlayed && time > nextInvite) {
      nextInvite = time + 5 + Math.random() * 3;
      const free = letters.filter((l) => l.state === "free");
      const L = free[Math.floor(Math.random() * free.length)];
      if (L) hop(L, 0.55);
    }
    render(dt);
  };

  // Reduced motion: a composed still (the word home, last throw's gold blooming in the water);
  // taps make a letter glint, nothing travels.
  let stopLoop = () => {};
  let kickUntil = 0;
  let kickRaf = 0;
  const kick = () => {
    kickUntil = performance.now() + 700;
    if (kickRaf) return;
    const tick = () => {
      kickRaf = performance.now() < kickUntil ? requestAnimationFrame(tick) : 0;
      updateLetters(1 / 60);
      render(0);
    };
    kickRaf = requestAnimationFrame(tick);
  };
  if (prof.still) {
    const [u, w] = toUV(-1.2, FRONT_Z + 1.1);
    fluid.splat(u, w, -150, 60, 0.004, 1.4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fluid.splat(u, w, Math.cos(a + 0.6) * 260, Math.sin(a + 0.6) * 260, 0.001);
    }
    for (let i = 0; i < 70; i++) fluid.step(1 / 60);
    ring(-1.2, FRONT_Z + 1.1, 0.6);
    rings[0].z = 0.6;
    render(0);
  } else {
    stopLoop = runLoop(stage, frame);
  }

  const ro = new ResizeObserver(() => {
    layout();
    if (prof.still) render(0);
  });
  ro.observe(stage);

  // QA hook (lab only): where each letter is on screen, and what it is doing.
  const w = window as unknown as { __goldToss?: () => unknown };
  w.__goldToss = () => {
    const r = stage.getBoundingClientRect();
    const v = new THREE.Vector3();
    return letters.map((L) => {
      v.copy(L.mesh.position).project(camera);
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, state: L.state };
    });
  };

  return {
    throwLetter,
    stop: () => {
      delete w.__goldToss;
      stopLoop();
      cancelAnimationFrame(kickRaf);
      ro.disconnect();
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      stage.removeEventListener("keydown", onKey);
      fluid.dispose();
      water.dispose();
      (water.geometry as THREE.BufferGeometry).dispose();
      letters.forEach((l) => {
        l.mesh.geometry.dispose();
        l.mat.dispose();
      });
      baseMat.dispose();
      brushed.dispose();
      stoneBump.dispose();
      ledgeGeo.dispose();
      ledgeMat.dispose();
      backGeo.dispose();
      backMat.dispose();
      dropGeo.dispose();
      dropMat.dispose();
      drops.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
