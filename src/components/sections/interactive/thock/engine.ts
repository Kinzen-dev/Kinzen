import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DRIFT, type Loop } from "@/motion/frame-governor";
import { readProfile, runLoop, softwareGl } from "../kit/loop";
import { qualitySteps, studio, tokenColor } from "../kit/three-kit";
import type { ThockSound } from "./sound";

/*
 * Thock. A wide, low-angle field of matte navy and cream keycaps; at its heart a real ANSI layout,
 * so the visitor's own keyboard presses the matching caps. Every cap sinks on its own spring the
 * instant it is pressed (state set in the input handler, sound fired there too: no frame of lag),
 * bottoms out with a synthesized thock and springs back with a hair of overshoot. Under the caps
 * runs a damped wave equation (one cell per key unit), so a drag rolls a wave through the field.
 * Holding space sends gold rings out from the bar; typing "ship" flips four caps to gold S H I P.
 * One InstancedMesh per key width; legends come from a canvas atlas and are shaded as brushed gold
 * metal inside a patched standard material (per-instance colour, legend, glow and gold).
 */

type Key = {
  /** KeyboardEvent.code for real keys; "" for the field. */
  code: string;
  label: string;
  x0: number;
  z: number;
  w: number;
  cls: number;
  idx: number;
  color: THREE.Color;
  legend: number;
  gold: number;
  /** Thock pitch: cream caps ring a touch higher, the gold bar lower. */
  pitch: number;
  y: number;
  vy: number;
  down: number;
  hover: boolean;
  glow: number;
  flip: { t: number; dur: number; swapped: boolean; to: "ship" | "home" } | null;
  ship: number;
};

type Row = { z: number; keys: Key[] };

const ROWS: [string, string, number][][] = [
  [
    ["Backquote", "`", 1],
    ["Digit1", "1", 1],
    ["Digit2", "2", 1],
    ["Digit3", "3", 1],
    ["Digit4", "4", 1],
    ["Digit5", "5", 1],
    ["Digit6", "6", 1],
    ["Digit7", "7", 1],
    ["Digit8", "8", 1],
    ["Digit9", "9", 1],
    ["Digit0", "0", 1],
    ["Minus", "-", 1],
    ["Equal", "=", 1],
    ["Backspace", "back", 2],
  ],
  [
    ["Tab", "tab", 1.5],
    ...[..."QWERTYUIOP"].map((c): [string, string, number] => [`Key${c}`, c, 1]),
    ["BracketLeft", "[", 1],
    ["BracketRight", "]", 1],
    ["Backslash", "\\", 1.5],
  ],
  [
    ["CapsLock", "caps", 1.75],
    ...[..."ASDFGHJKL"].map((c): [string, string, number] => [`Key${c}`, c, 1]),
    ["Semicolon", ";", 1],
    ["Quote", "'", 1],
    ["Enter", "enter", 2.25],
  ],
  [
    ["ShiftLeft", "shift", 2.25],
    ...[..."ZXCVBNM"].map((c): [string, string, number] => [`Key${c}`, c, 1]),
    ["Comma", ",", 1],
    ["Period", ".", 1],
    ["Slash", "/", 1],
    ["ShiftRight", "shift", 2.75],
  ],
  [
    ["ControlLeft", "ctrl", 1.25],
    ["MetaLeft", "⌘", 1.25],
    ["AltLeft", "alt", 1.25],
    ["Space", "", 6.25],
    ["AltRight", "alt", 1.25],
    ["MetaRight", "⌘", 1.25],
    ["ContextMenu", "≡", 1.25],
    ["ControlRight", "ctrl", 1.25],
  ],
];
const MODS = new Set([
  "Backquote",
  "Backspace",
  "Tab",
  "Backslash",
  "CapsLock",
  "Enter",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "MetaLeft",
  "AltLeft",
  "AltRight",
  "MetaRight",
  "ContextMenu",
  "ControlRight",
]);
const FIELD_GLYPHS = ["", "", "", "◆", "✦", "•", "∥", "+", "×", "~", "○", "^", "/", "=", "△", "*"];
const SHIP_CODES = ["KeyT", "KeyY", "KeyU", "KeyI"];
const TRAVEL = 0.2;
const CAP_H = 0.56;

/** A seeded generator: the field is the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A sculpted cap: a rounded box whose top is narrower than its base (the keycap's draft). */
function capGeometry(w: number, seg: number): THREE.BufferGeometry {
  const geo = new RoundedBoxGeometry(w - 0.1, CAP_H, 0.9, seg, 0.075);
  geo.translate(0, CAP_H / 2, 0);
  const pos = geo.attributes.position;
  const hw = (w - 0.1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = THREE.MathUtils.clamp(y / CAP_H, 0, 1);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Draft: the walls lean in by ~0.07u; the back wall leans a little more (a sculpted row).
    pos.setX(i, x - Math.sign(x) * 0.07 * k * Math.min(1, Math.abs(x) / hw));
    pos.setZ(i, z - Math.sign(z) * (z < 0 ? 0.1 : 0.05) * k * Math.min(1, Math.abs(z) / 0.45));
    // A shallow cylindrical dish across the top.
    if (k > 0.97) pos.setY(i, y - 0.022 * (1 - Math.min(1, (x / hw) ** 2)));
  }
  geo.computeVertexNormals();
  return geo;
}

/** Legend atlas: 16 x 8 cells; returns the cell index for a label (drawn on first use). */
function makeAtlas(font: string) {
  const C = 16;
  const R = 8;
  const S = 96;
  const c = document.createElement("canvas");
  c.width = C * S;
  c.height = R * S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const map = new Map<string, number>();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.flipY = false;
  const get = (label: string) => {
    if (!label) return -1;
    const hit = map.get(label);
    if (hit !== undefined) return hit;
    const i = map.size;
    if (i >= C * R) return -1;
    map.set(label, i);
    const cx = (i % C) * S + S / 2;
    const cy = Math.floor(i / C) * S + S / 2;
    const size = label.length > 3 ? S * 0.21 : label.length > 1 ? S * 0.28 : S * 0.5;
    ctx.font = `600 ${size}px ${font}`;
    ctx.fillText(label, cx, cy + S * 0.02);
    tex.needsUpdate = true;
    return i;
  };
  return { tex, get };
}

export type Thock = {
  stop: () => void;
  /** Why nothing runs: no WebGL, or only a software renderer (the section shows a picture). */
  failed?: "none" | "software";
};

export function startThock(
  stage: HTMLElement,
  sound: ThockSound,
  onShip: (on: boolean) => void,
  onPlay: () => void,
): Thock {
  const prof = readProfile(2);
  const lite = prof.phone;
  const gold = tokenColor(stage, "--gold", "#d6b062");
  const deep = new THREE.Color().setRGB(0.008, 0.011, 0.024);
  const navy = new THREE.Color().setRGB(0.016, 0.03, 0.072);
  const cream = new THREE.Color().setRGB(0.62, 0.56, 0.45);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    return { stop: () => {}, failed: "none" };
  }
  if (softwareGl(renderer.getContext())) {
    renderer.dispose();
    renderer.forceContextLoss();
    return { stop: () => {}, failed: "software" };
  }
  // Compile errors are not polled per program (a synchronous stall); shaders are fixed and tested.
  renderer.debug.checkShaderErrors = false;
  const dpr0 = Math.min(prof.dpr, lite ? 1.5 : 2);
  renderer.setPixelRatio(dpr0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(deep, 1);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(deep, 10, 30);
  const env = studio(renderer, new THREE.Color().setRGB(0.075, 0.062, 0.05), 1.1, 1.6);
  scene.environment = env.texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 120);

  // Light: a warm key raking in low from the back left, so every cap throws a long soft shadow
  // toward the viewer; a cool rim and a little sky fill.
  const key = new THREE.DirectionalLight(0xffdcb0, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8fa6ff, 0.7);
  rim.position.set(9, 5, -10);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x5a6890, 0x05070d, 0.45));

  // Layout: the ANSI block (15u wide) centred on the origin, the field around it.
  const R = rng(7);
  const FL = lite ? 3 : 10;
  const FR = lite ? 3 : 10;
  const RA = lite ? 7 : 7;
  const RB = lite ? 6 : 3;
  const keys: Key[] = [];
  const rows = new Map<number, Row>();
  const byCode = new Map<string, Key>();
  const widths: number[] = [];
  const add = (code: string, label: string, x0: number, z: number, w: number, color: THREE.Color, gold = 0) => {
    let cls = widths.indexOf(w);
    if (cls < 0) cls = widths.push(w) - 1;
    const k: Key = {
      code,
      label,
      x0: x0 - 7.5,
      z: z - 2,
      w,
      cls,
      idx: 0,
      color: color.clone(),
      legend: -1,
      gold,
      pitch: gold ? 0.92 : color === cream ? 1.08 : 1,
      y: 0,
      vy: 0,
      down: 0,
      hover: false,
      glow: 0,
      flip: null,
      ship: 0,
    };
    keys.push(k);
    const row = rows.get(k.z) ?? rows.set(k.z, { z: k.z, keys: [] }).get(k.z)!;
    row.keys.push(k);
    if (code) byCode.set(code, k);
    return k;
  };
  const fieldCap = (x: number, z: number) => {
    const c = R() < 0.1 ? cream : navy;
    const k = add("", FIELD_GLYPHS[Math.floor(R() * FIELD_GLYPHS.length)], x, z, 1, c);
    k.color.offsetHSL(0, 0, (R() - 0.5) * 0.012);
  };
  for (let z = -RA; z < 5 + RB; z++) {
    if (z >= 0 && z < 5) {
      let x = 0;
      for (const [code, label, w] of ROWS[z]) {
        add(code, label, x, z, w, code === "Space" ? gold : MODS.has(code) ? cream : navy, code === "Space" ? 1 : 0);
        x += w;
      }
      for (let i = 1; i <= FL; i++) fieldCap(-i, z);
      for (let i = 0; i < FR; i++) fieldCap(15 + i, z);
    } else {
      for (let x = -FL; x < 15 + FR; x++) fieldCap(x, z);
    }
  }
  for (const r of rows.values()) r.keys.sort((a, b) => a.x0 - b.x0);
  const space = byCode.get("Space")!;

  // Materials and meshes.
  const fontFamily =
    getComputedStyle(document.body).getPropertyValue("--font-geist").trim() ||
    getComputedStyle(document.body).fontFamily ||
    "sans-serif";
  const atlas = makeAtlas(fontFamily);
  for (const k of keys) k.legend = atlas.get(k.label);
  const SHIP = [..."SHIP"].map((c) => atlas.get(c));
  const uGold = { value: gold.clone().lerp(new THREE.Color(1, 0.76, 0.36), 0.4) };
  const uAtlas = { value: atlas.tex };
  const material = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, envMapIntensity: 0.55 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGold = uGold;
    shader.uniforms.uAtlas = uAtlas;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 aColor;
attribute float aLegend, aGlow, aGold;
varying vec3 vCap, vLocal;
varying float vLegend, vGlow, vGoldCap, vTop;
varying vec2 vLegUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vCap = aColor; vLegend = aLegend; vGlow = aGlow; vGoldCap = aGold; vLocal = position;
vTop = smoothstep(0.75, 0.95, normal.y);
vLegUv = vec2(position.x / 0.66 + 0.5, position.z / 0.66 + 0.5 + 0.04);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uGold;
uniform sampler2D uAtlas;
varying vec3 vCap, vLocal;
varying float vLegend, vGlow, vGoldCap, vTop;
varying vec2 vLegUv;
float gLegend;
float gMetal;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
gLegend = 0.0;
if (vLegend >= 0.0 && vTop > 0.0) {
  vec2 inside = step(vec2(0.0), vLegUv) * step(vLegUv, vec2(1.0));
  vec2 cell = vec2(mod(vLegend, 16.0), floor(vLegend / 16.0));
  gLegend = texture2D(uAtlas, (cell + clamp(vLegUv, 0.0, 1.0)) / vec2(16.0, 8.0)).a * inside.x * inside.y * vTop;
}
// Gold: legends on dark caps; on a gold cap the legend is cut back to dark.
gMetal = mix(gLegend, 1.0 - gLegend, step(0.5, vGoldCap));
// A passing gold ripple turns the cap tops to gold for a moment.
float sheen = vTop * smoothstep(0.25, 1.1, vGlow) * (1.0 - step(0.5, vGoldCap));
gMetal = max(gMetal, sheen * 0.9);
vec3 legendInk = mix(uGold, vec3(0.02, 0.025, 0.05), step(0.5, vGoldCap));
diffuseColor.rgb = mix(vCap, uGold, gMetal);
diffuseColor.rgb = mix(diffuseColor.rgb, legendInk, gLegend * step(0.5, vGoldCap));`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
// Brushed: fine streaks along x.
float streak = fract(sin(floor(vLocal.z * 260.0) * 12.9898 + floor(vLocal.x * 3.0) * 78.233) * 43758.5453);
roughnessFactor = mix(roughnessFactor, 0.26 + streak * 0.14, gMetal);`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 1.0, gMetal);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += uGold * vec3(1.0, 0.78, 0.42) * vGlow * (0.04 + vTop * (0.16 + 1.4 * gLegend) + 0.25 * vGoldCap * vTop);
totalEmissiveRadiance += uGold * gLegend * 0.07;
// The ripple is light, not paint: tops under it glow warm.
totalEmissiveRadiance += uGold * vec3(1.0, 0.8, 0.45) * vTop * smoothstep(0.25, 1.1, vGlow) * (1.0 - step(0.5, vGoldCap)) * 0.55;`,
      );
  };

  const meshes: THREE.InstancedMesh[] = [];
  const attrs: {
    color: THREE.InstancedBufferAttribute;
    legend: THREE.InstancedBufferAttribute;
    glow: THREE.InstancedBufferAttribute;
    gold: THREE.InstancedBufferAttribute;
  }[] = [];
  const geos: THREE.BufferGeometry[] = [];
  widths.forEach((w, cls) => {
    const list = keys.filter((k) => k.cls === cls);
    const geo = capGeometry(w, lite ? 1 : 2);
    const n = list.length;
    const a = {
      color: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3),
      legend: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
      glow: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
      gold: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
    };
    a.glow.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aColor", a.color);
    geo.setAttribute("aLegend", a.legend);
    geo.setAttribute("aGlow", a.glow);
    geo.setAttribute("aGold", a.gold);
    const mesh = new THREE.InstancedMesh(geo, material, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    list.forEach((k, i) => {
      k.idx = i;
      a.color.setXYZ(i, k.color.r, k.color.g, k.color.b);
      a.legend.setX(i, k.legend);
      a.gold.setX(i, k.gold);
    });
    scene.add(mesh);
    meshes.push(mesh);
    attrs.push(a);
    geos.push(geo);
  });

  // The plate the caps sit on: dark, catching their shadows.
  const plateGeo = new THREE.PlaneGeometry(200, 200);
  plateGeo.rotateX(-Math.PI / 2);
  const plateMat = new THREE.MeshStandardMaterial({ color: deep.clone().multiplyScalar(1.6), roughness: 0.85 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -0.06;
  plate.receiveShadow = true;
  scene.add(plate);

  // Wave grid: one cell per key unit over the whole field.
  const gx0 = -7.5 - FL - 1;
  const gz0 = -2 - RA - 1;
  const GW = 15 + FL + FR + 2;
  const GH = 5 + RA + RB + 2;
  const wh = new Float32Array(GW * GH);
  const wv = new Float32Array(GW * GH);
  const cellOf = (x: number, z: number) => {
    const i = Math.round(x - gx0);
    const j = Math.round(z - gz0);
    return i < 0 || j < 0 || i >= GW || j >= GH ? -1 : j * GW + i;
  };
  const sampleH = (x: number, z: number) => {
    const fx = x - gx0;
    const fz = z - gz0;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= GW - 1 || j >= GH - 1) return 0;
    const tx = fx - i;
    const tz = fz - j;
    const a = wh[j * GW + i] * (1 - tx) + wh[j * GW + i + 1] * tx;
    const b = wh[(j + 1) * GW + i] * (1 - tx) + wh[(j + 1) * GW + i + 1] * tx;
    return a * (1 - tz) + b * tz;
  };
  const poke = (x: number, z: number, amount: number, radius = 1.2) => {
    const R2 = Math.ceil(radius);
    for (let dz = -R2; dz <= R2; dz++) {
      for (let dx = -R2; dx <= R2; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > radius) continue;
        const c = cellOf(x + dx, z + dz);
        if (c >= 0) wv[c] -= amount * Math.cos((d / radius) * Math.PI * 0.5);
      }
    }
  };

  // Gold rings from the space bar.
  type Ring = { t: number; x: number; z: number; k: number };
  const ringsList: Ring[] = [];

  // Camera framing.
  const look = new THREE.Vector3();
  const camBase = new THREE.Vector3();
  const layout = () => {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = camera.aspect < 1;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // The ANSI block spans about 70% of the width on a laptop; a phone shows S..P and the space bar.
    const span = portrait ? 8.4 : 14.5;
    const dist = span / (2 * tan * camera.aspect);
    const elev = THREE.MathUtils.degToRad(portrait ? 52 : 24);
    const yaw = THREE.MathUtils.degToRad(portrait ? -6 : -12);
    look.set(portrait ? -0.4 : 0.4, 0, portrait ? -0.2 : -1.1);
    camBase.set(
      look.x + Math.sin(yaw) * Math.cos(elev) * dist,
      look.y + Math.sin(elev) * dist,
      look.z + Math.cos(yaw) * Math.cos(elev) * dist,
    );
    camera.updateProjectionMatrix();
    scene.fog = new THREE.Fog(deep, dist * 0.85, dist * 1.9);
    key.position.set(look.x - 9, 7, look.z - 9);
    key.target.position.copy(look);
    const sc = key.shadow.camera;
    const ext = portrait ? 9 : 17;
    sc.left = -ext;
    sc.right = ext;
    sc.top = ext;
    sc.bottom = -ext;
    sc.near = 1;
    sc.far = 40;
    sc.updateProjectionMatrix();
  };
  layout();

  // Input.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const topPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CAP_H);
  const hitPoint = new THREE.Vector3();
  const keyAt = (cx: number, cy: number): Key | null => {
    const r = stage.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(topPlane, hitPoint)) return null;
    const row = rows.get(Math.round(hitPoint.z));
    if (!row) return null;
    return row.keys.find((k) => hitPoint.x >= k.x0 && hitPoint.x < k.x0 + k.w) ?? null;
  };
  const cx = (k: Key) => k.x0 + k.w / 2;

  let played = false;
  let typed = "";
  let shipOn = false;
  let shipAt = 0;
  let lastSound = 0;
  let spaceHeld = 0;
  let nextRing = 0;
  let dirty = true;
  let loop: Loop | null = null;
  /** Something changed: draw it (and react at full pace, the loop may be resting). */
  const touch = () => {
    dirty = true;
    loop?.wake();
  };

  const press = (k: Key, strength = 1, by: "ptr" | "kbd" = "ptr") => {
    if (!played) {
      played = true;
      onPlay();
    }
    k.down++;
    if (!prof.still) {
      k.vy = Math.min(k.vy, -5 * strength);
      poke(cx(k), k.z, 22 * strength, k.w > 2 ? 2.2 : 1.4);
    }
    k.glow = Math.max(k.glow, prof.still ? 0.9 : 0.35);
    const now = performance.now();
    if (now - lastSound > 22 || by === "kbd") {
      lastSound = now;
      sound.press(k.code || "Field", strength);
    }
    if (k.label.length === 1 && /[a-z]/i.test(k.label)) {
      typed = (typed + k.label.toLowerCase()).slice(-4);
      if (typed === "ship") setShip(!shipOn);
    }
    if (k === space) {
      spaceHeld = performance.now();
      nextRing = 0.22;
    }
    touch();
  };
  const release = (k: Key) => {
    k.down = Math.max(0, k.down - 1);
    if (!k.down) sound.release(k.code || "Field");
    if (k === space && !k.down) spaceHeld = 0;
    touch();
  };

  const shipKeys = SHIP_CODES.map((c) => byCode.get(c)!);
  const setShip = (on: boolean) => {
    shipOn = on;
    shipAt = performance.now();
    shipKeys.forEach((k, i) => {
      k.flip = { t: -i * 0.09, dur: 0.62, swapped: false, to: on ? "ship" : "home" };
      if (prof.still) k.flip.t = k.flip.dur;
    });
    onShip(on);
    if (on) window.setTimeout(() => sound.chime(), 420);
    touch();
  };
  const applyLook = (k: Key, to: "ship" | "home") => {
    const i = shipKeys.indexOf(k);
    const a = attrs[k.cls];
    if (to === "ship") {
      a.legend.setX(k.idx, SHIP[i]);
      a.gold.setX(k.idx, 1);
    } else {
      a.legend.setX(k.idx, k.legend);
      a.gold.setX(k.idx, k.gold);
    }
    a.legend.needsUpdate = true;
    a.gold.needsUpdate = true;
  };

  // Pointer: press on down, roll on drag (each newly entered cap presses, the last one lets go).
  let ptrKey: Key | null = null;
  let ptrId = -1;
  let hoverKey: Key | null = null;
  let lastMove = { x: 0, y: 0, t: 0 };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const k = keyAt(e.clientX, e.clientY);
    if (!k) return;
    ptrId = e.pointerId;
    ptrKey = k;
    lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
    press(k);
    if (e.pointerType === "mouse") e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    const k = keyAt(e.clientX, e.clientY);
    if (e.pointerId === ptrId && ptrKey) {
      const now = performance.now();
      const speed = Math.hypot(e.clientX - lastMove.x, e.clientY - lastMove.y) / Math.max(8, now - lastMove.t);
      lastMove = { x: e.clientX, y: e.clientY, t: now };
      if (k && k !== ptrKey) {
        release(ptrKey);
        ptrKey = k;
        press(k, THREE.MathUtils.clamp(0.45 + speed * 0.25, 0.45, 1));
      }
    } else if (e.pointerType === "mouse") {
      if (hoverKey !== k) {
        if (hoverKey) hoverKey.hover = false;
        if (k) k.hover = true;
        hoverKey = k;
        touch();
      }
      stage.style.cursor = k ? "pointer" : "";
    }
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== ptrId) return;
    if (ptrKey) release(ptrKey);
    ptrKey = null;
    ptrId = -1;
  };
  const onLeave = () => {
    if (hoverKey) hoverKey.hover = false;
    hoverKey = null;
    touch();
  };

  // Real keyboard: while the toy is on screen (or focused), keys press their caps.
  let onScreen = false;
  const io = new IntersectionObserver(
    ([e]) => {
      onScreen = !!e && e.intersectionRatio > 0.45;
    },
    { threshold: [0, 0.45, 0.6] },
  );
  io.observe(stage);
  const typingElsewhere = (t: EventTarget | null) =>
    t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const held = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    // Focus on the field: every key is a cap. On screen with nothing focused: caps echo the
    // keyboard, but the page keeps Space, Tab and every key a control owns.
    const focused = document.activeElement === stage;
    const free = !document.activeElement || document.activeElement === document.body;
    if (!focused && !(onScreen && free)) return;
    if (typingElsewhere(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.code === "Tab") return;
    const k = byCode.get(e.code);
    if (!k) return;
    if (focused && (e.code === "Space" || e.code === "Quote" || e.code === "Slash")) e.preventDefault();
    if (e.repeat || held.has(e.code)) return;
    held.add(e.code);
    press(k, 1, "kbd");
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!held.delete(e.code)) return;
    const k = byCode.get(e.code);
    if (k) release(k);
  };
  const onBlur = () => {
    for (const c of held) {
      const k = byCode.get(c);
      if (k) release(k);
    }
    held.clear();
  };
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointerleave", onLeave);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // Adaptive quality (the governor's resolution scale): a lower pixel ratio first; at the floor,
  // no shadows for the rest of the visit.
  const onScale = qualitySteps((level) => {
    if (level === 2) renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(level === 0 ? dpr0 : level === 1 ? Math.min(dpr0, 1.25) : 1);
    layout();
  });

  // The loop.
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e3 = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  let time = 0;

  const step = (dt: number) => {
    time += dt;
    // Space held: the first ring after a beat, then one every 0.85 s while it stays down.
    if (space.down && spaceHeld) {
      const heldFor = (performance.now() - spaceHeld) / 1000;
      if (heldFor >= nextRing) {
        nextRing = heldFor + 0.85;
        ringsList.push({ t: 0, x: cx(space), z: space.z, k: 1 });
        if (ringsList.length > 5) ringsList.shift();
        sound.spaceRipple();
      }
    }
    for (const r of ringsList) r.t += dt;
    while (ringsList.length && ringsList[0].t > 3.2) ringsList.shift();

    // SHIP flips back on its own after a while.
    if (shipOn && performance.now() - shipAt > 7000) setShip(false);

    // Wave equation (two substeps) with a spring back to rest.
    if (!prof.still) {
      const c2 = 34;
      const damp = 3.2;
      const spring = 9;
      const sub = 2;
      const sdt = Math.min(dt, 1 / 30) / sub;
      for (let s = 0; s < sub; s++) {
        for (let j = 1; j < GH - 1; j++) {
          for (let i = 1; i < GW - 1; i++) {
            const c = j * GW + i;
            const lap = wh[c - 1] + wh[c + 1] + wh[c - GW] + wh[c + GW] - 4 * wh[c];
            wv[c] += (c2 * lap - damp * wv[c] - spring * wh[c]) * sdt;
          }
        }
        for (let c = 0; c < wh.length; c++) wh[c] += wv[c] * sdt;
      }
    }

    let moving = false;
    for (const k of keys) {
      // Press spring: underdamped, so a released cap pops up with a hair of overshoot.
      const target = k.down ? -TRAVEL : k.hover ? -0.035 : 0;
      if (!prof.still) {
        const K = 1500;
        const C = 30;
        const sdt = Math.min(dt, 1 / 30) / 2;
        for (let s = 0; s < 2; s++) {
          k.vy += (K * (target - k.y) - C * k.vy) * sdt;
          k.y += k.vy * sdt;
          if (k.y < -TRAVEL) {
            k.y = -TRAVEL;
            k.vy = 0;
          }
        }
      }
      const kx = cx(k);
      let lift = 0;
      let ringGlow = 0;
      for (const r of ringsList) {
        const d = Math.hypot(kx - r.x, (k.z - r.z) * 1.15);
        // Reduced motion: no travelling ring, the glow just blooms around the bar and fades.
        const front = prof.still ? 0 : r.t * 9.5;
        const band = prof.still ? Math.exp(-d / 3) : Math.exp(-(((d - front) / 1.1) ** 2));
        const fade = Math.exp(-r.t * 0.55) * (d < 0.8 ? 0 : 1);
        lift += band * fade * 0.3;
        ringGlow += band * fade;
      }
      const wave = prof.still ? 0 : THREE.MathUtils.clamp(sampleH(kx, k.z) * 0.055, -0.18, 0.24);
      // SHIP caps stand proud while they spell the word.
      const y = prof.still ? 0 : k.y + wave + lift + k.ship * 0.16;
      // Flip (SHIP): an arc up, half a turn about x, the new face swapped in while edge-on.
      let rot = 0;
      let flipLift = 0;
      if (k.flip) {
        k.flip.t += dt;
        const p = THREE.MathUtils.clamp(k.flip.t / k.flip.dur, 0, 1);
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        if (!k.flip.swapped && e >= 0.5) {
          k.flip.swapped = true;
          applyLook(k, k.flip.to);
        }
        rot = prof.still ? 0 : e < 0.5 ? Math.PI * e : Math.PI * e - Math.PI;
        flipLift = prof.still ? 0 : Math.sin(Math.PI * p) * 0.75;
        k.ship = k.flip.to === "ship" ? Math.min(1, k.ship + dt * 3) : Math.max(0, k.ship - dt * 3);
        if (p >= 1) {
          k.flip = null;
          if (shipOn) sound.press(k.code, 0.8);
        }
        moving = true;
      }
      k.glow = Math.max(0, k.glow - dt * (prof.still ? 1.6 : 2.4));
      const shipGlow = shipOn && shipKeys.includes(k) ? 0.75 + 0.15 * Math.sin(time * 3 + k.x0) : 0;
      const g = Math.min(1.4, k.glow + ringGlow * 0.9 + (k.hover ? 0.12 : 0) + shipGlow + Math.max(0, -wave) * 0.6);
      attrs[k.cls].glow.setX(k.idx, g);
      e3.set(rot, 0, 0);
      q.setFromEuler(e3);
      // Rotate about the cap's centre, not its base.
      pos.set(kx, y + flipLift + (rot ? CAP_H / 2 : 0), k.z);
      m4.compose(pos, q, one);
      if (rot) m4.multiply(new THREE.Matrix4().makeTranslation(0, -CAP_H / 2, 0));
      meshes[k.cls].setMatrixAt(k.idx, m4);
      if (Math.abs(k.vy) > 0.01 || Math.abs(k.y - target) > 0.002 || g > 0.01) moving = true;
    }
    for (let c = 0; c < meshes.length; c++) {
      meshes[c].instanceMatrix.needsUpdate = true;
      attrs[c].glow.needsUpdate = true;
    }
    return moving || ringsList.length > 0;
  };

  // The camera breathes a little, so the light slides over the legends.
  const render = () => {
    camera.position.set(camBase.x + Math.sin(time * 0.17) * 0.25, camBase.y, camBase.z + Math.cos(time * 0.13) * 0.15);
    camera.lookAt(look);
    scene.environmentRotation.set(0, Math.sin(time * 0.15) * 0.4, 0);
    renderer.render(scene, camera);
  };

  /** The water under the caps still carries a wave. */
  const waving = () => {
    for (let c = 0; c < wh.length; c++) if (Math.abs(wh[c]) > 2e-3 || Math.abs(wv[c]) > 2e-2) return true;
    return false;
  };
  const frame = (_t: number, dt: number) => {
    if (prof.still) {
      // Reduced motion: nothing travels; caps glow when pressed and the frame redraws only then.
      const busy = step(dt);
      if (busy || dirty) render();
      dirty = busy;
      return busy;
    }
    const busy = step(dt);
    render();
    dirty = false;
    // Caps still, no SHIP glow, water calm: only the camera's slow breath is left (sub-pixel per
    // frame), drawn at the rest rate until the next key or pointer.
    return busy || shipOn || waving() ? undefined : DRIFT;
  };
  // Shaders compile in parallel first (KHR_parallel_shader_compile): no long task on the first frame.
  let dead = false;
  let stopLoop = () => {};
  renderer.compileAsync(scene, camera).then(begin, begin);
  function begin() {
    if (dead) return;
    step(1 / 60);
    render();
    loop = runLoop(stage, frame, { name: "play/thock", adaptive: { onScale } });
    stopLoop = loop.stop;
  }
  const ro = new ResizeObserver(() => {
    layout();
    touch();
  });
  ro.observe(stage);

  // QA hook (lab only): screen position of a key by code.
  const w = window as unknown as { __thock?: (code: string) => { x: number; y: number } | null };
  w.__thock = (code: string) => {
    const k = byCode.get(code);
    if (!k) return null;
    const v = new THREE.Vector3(cx(k), CAP_H, k.z).project(camera);
    const r = stage.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };

  return {
    stop: () => {
      dead = true;
      delete w.__thock;
      stopLoop();
      ro.disconnect();
      io.disconnect();
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      meshes.forEach((m) => m.dispose());
      geos.forEach((g) => g.dispose());
      material.dispose();
      atlas.tex.dispose();
      plateGeo.dispose();
      plateMat.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
