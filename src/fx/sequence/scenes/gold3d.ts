import * as THREE from "three";
import { WORDMARK } from "@/fx/baked/wordmark";
import { breathe } from "../kit/gl";
import { wordmarkBitmap } from "../kit/glyphs";
import type { FrameCtx, Geom, Gpu, GpuScene, SceneId } from "../types";
import { traceGlyphs } from "./contours";
import { ensureRenderer, srgb, VNOISE_GLSL } from "./three-kit";

/*
 * Scene 2, gold metal (lab #2). KINZEN as extruded brushed-gold letters, traced from the baked
 * wordmark mask, so the 3D name has the site's letterforms and sits exactly on the slot where the
 * dust formed it. Lighting is a generated studio environment (navy room, warm strip softboxes)
 * prefiltered with PMREM; the environment turns slowly so reflections sweep across the faces, and
 * a warm key light glides across for a travelling glint. The name tilts toward the pointer through
 * a damped spring (a slow sway when the pointer is away).
 * In the sequence: the letters condense out of the dust (a noise dissolve whose edge glows hot,
 * the whole name cooling from glowing gold to metal), then melt: the faces sag and drip downward
 * and vanish from the top as the gold ink runs out of them into the water.
 */

/** One world unit = one em of the wordmark (bake px / bakePx). */
const EM = WORDMARK.bakePx;
const FOV = 28;

function brushedTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    // Each row is one streak value with a little drift along x: brushed along the letters.
    const base = 196 + Math.random() * 26;
    let v = base;
    for (let x = 0; x < c.width; x++) {
      v += (Math.random() - 0.5) * 3;
      v += (base - v) * 0.02;
      const i = (y * c.width + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.6, 14);
  return t;
}

function studio(renderer: THREE.WebGLRenderer, ground: [number, number, number]): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene();
  const navy = srgb(ground);
  // The room: a big sphere, navy below fading to a lighter navy overhead.
  const roomGeo = new THREE.SphereGeometry(20, 32, 16);
  const pos = roomGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = navy.clone().lerp(new THREE.Color(0.3, 0.33, 0.45), 0.6);
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.smoothstep(pos.getY(i) / 20, -0.3, 1);
    const c = navy.clone().multiplyScalar(0.6).lerp(top, k);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  roomGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // Softboxes: long warm strips and one cool fill; these are what the gold reflects.
  const strip = (w: number, h: number, x: number, y: number, z: number, color: THREE.Color, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  const warm = new THREE.Color(1, 0.86, 0.66);
  strip(14, 1.4, 0, 7, 6, warm, 5);
  strip(1.2, 9, -9, 1, 4, warm, 3.2);
  strip(1.2, 9, 9, 1, -4, warm, 2.4);
  strip(10, 0.6, 0, -4, 9, new THREE.Color(0.7, 0.78, 1), 1.4);
  strip(6, 6, 0, 2, -12, warm, 1.2);
  // A broad frontal softbox (behind the camera): the faces read as lit gold, not bronze.
  strip(16, 5, 0, 2.5, 14, warm, 1.6);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return rt;
}

const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);

export async function createGold3d(gpu: Gpu, geom0: Geom): Promise<GpuScene> {
  const renderer = ensureRenderer(gpu, geom0);
  const { gold, ground } = gpu.colors;
  const scene = new THREE.Scene();
  renderer.resetState();
  const env = studio(renderer, ground);
  scene.environment = env.texture;
  await breathe();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

  // Geometry: one extruded mesh per letter, centred on the wordmark.
  const glyphs = traceGlyphs(wordmarkBitmap(), 1.1);
  await breathe();
  const bw = WORDMARK.w / EM;
  const bh = WORDMARK.h / EM;
  const depth = 0.24;
  const brushed = brushedTexture();
  const goldColor = srgb(gold);
  const uniforms = {
    uReveal: { value: 1 },
    uDissolve: { value: 0 },
    uMelt: { value: 0 },
    uGlow: { value: 0 },
    uHot: { value: goldColor.clone().lerp(new THREE.Color(1, 0.72, 0.3), 0.3) },
  };
  const material = new THREE.MeshPhysicalMaterial({
    color: goldColor.clone().lerp(new THREE.Color(1, 0.8, 0.45), 0.25),
    metalness: 1,
    roughness: 0.3,
    roughnessMap: brushed,
    anisotropy: 0.75,
    anisotropyRotation: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.35,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uMelt;\nvarying vec3 vKz;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vKz = transformed;
// Melt: the faces sag toward the baseline, the tops most, in uneven drips; the depth thins.
float kzTop = smoothstep(-0.4, 0.4, transformed.y);
float kzDrip = 0.55 + 0.45 * sin(transformed.x * 23.0 + 1.7) * sin(transformed.x * 7.3 + 0.4);
transformed.y -= uMelt * uMelt * (0.04 + 0.22 * kzTop) * (0.5 + kzDrip);
transformed.z *= 1.0 - 0.7 * uMelt;
transformed.x += uMelt * 0.03 * sin(transformed.y * 21.0);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform float uReveal, uDissolve, uMelt, uGlow;\nuniform vec3 uHot;\nvarying vec3 vKz;\n${VNOISE_GLSL}`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
float kzN = kzNoise(vKz * vec3(9.0, 9.0, 4.0)) * 0.7 + kzNoise(vKz * 31.0) * 0.3;
// Condensing: a left-to-right sweep (the order the dust arrived in) broken up by fine grain.
float kzG = kzNoise(vKz * 46.0) * 0.6 + kzNoise(vKz * 13.0) * 0.4;
float kzS = clamp((vKz.x + 1.6) / 3.2, 0.0, 1.0) * 0.6 + kzG * 0.4;
float kzIn = uReveal * 1.3 - 0.15;
if (kzS > kzIn) discard;
float kzOut = uDissolve * 1.3 - 0.15;
if (kzN < kzOut) discard;
// Melting runs out from the top: what has run off is gone.
float kzLine = 0.42 - uMelt * 1.05 + kzN * 0.14;
if (uMelt > 0.0 && vKz.y > kzLine) discard;
float kzRim = (1.0 - smoothstep(0.0, 0.06, kzIn - kzS)) * step(kzIn, 1.1);
kzRim = max(kzRim, (1.0 - smoothstep(0.0, 0.07, kzN - kzOut)) * step(-0.1, kzOut));
kzRim = max(kzRim, (1.0 - smoothstep(0.0, 0.05, kzLine - vKz.y)) * step(0.001, uMelt));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uHot * (kzRim * 1.5 + uGlow);",
      );
  };
  const group = new THREE.Group();
  const letters: THREE.Mesh[] = [];
  for (const g of glyphs) {
    const toV = ([x, y]: [number, number]) => new THREE.Vector2(x / EM - bw / 2, -(y / EM - bh / 2));
    const shape = new THREE.Shape(g.outer.map(toV));
    shape.holes = g.holes.map((h) => new THREE.Path(h.map(toV)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.02,
      bevelSegments: geom0.phone ? 2 : 4,
      curveSegments: 1,
    });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    letters.push(mesh);
    group.add(mesh);
  }
  const tilt = new THREE.Group();
  tilt.add(group);
  scene.add(tilt);

  // A warm key light that glides across the faces for a travelling glint.
  const key = new THREE.DirectionalLight(0xffe2b0, 2.2);
  scene.add(key);
  scene.add(key.target);

  let geom = geom0;
  let base = { dist: 10, gx: 0, gy: 0 };
  const layout = (g: Geom) => {
    geom = g;
    camera.aspect = g.cssW / g.cssH;
    const s = g.slot;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // The name spans the slot exactly (the dust it condenses from fills the same ink box).
    const visibleW = (bw * g.cssW) / s.w;
    const dist = visibleW / (2 * tan * camera.aspect);
    const pxPerWorld = g.cssW / visibleW;
    base = {
      dist,
      gx: (s.x + s.w / 2 - g.cssW / 2) / pxPerWorld,
      gy: -(s.y + s.h / 2 - g.cssH / 2) / pxPerWorld,
    };
    tilt.position.set(base.gx, base.gy, 0);
    // Measured to the front faces (half the depth plus the bevel), so the face the dust condenses
    // into spans the slot exactly; the sides recede behind it.
    camera.position.set(0, 0, dist + depth / 2 + 0.035);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  layout(geom0);
  await breathe();
  // Compile off the main thread where the browser allows it (KHR_parallel_shader_compile).
  renderer.resetState();
  await renderer.compileAsync(scene, camera);

  const rot = { x: 0, y: 0, vx: 0, vy: 0 };
  const enter = () => {
    rot.x = rot.y = rot.vx = rot.vy = 0;
  };

  const frame = ({ t, dt, role, ptr }: FrameCtx) => {
    const into = role.mode === "in" ? role.p : 1;
    const out = role.mode === "out" ? role.p : 0;
    const to: SceneId | null = role.mode === "out" ? role.to : null;
    uniforms.uReveal.value = role.mode === "in" ? smooth(ramp(into, 0.04, 0.88)) : 1;
    // Fresh from the dust the metal glows, then cools.
    uniforms.uGlow.value = 0.45 * (1 - smooth(ramp(t, 0.8, 2.6)));
    uniforms.uMelt.value = to === "fluid" ? smooth(ramp(out, 0, 0.92)) : 0;
    uniforms.uDissolve.value = to && to !== "fluid" ? smooth(out) : 0;

    // Pointer tilt (or a slow idle sway), through a damped spring: it leans, overshoots a hair,
    // settles. The sway eases in after the condense, so the name forms exactly where the dust was.
    const settle = smooth(ramp(t, 1.6, 4));
    const nx = ptr.on > 0.01 ? (ptr.x / geom.cssW - 0.5) * 2 : Math.sin(t * 0.35) * 0.35 * settle;
    const ny = ptr.on > 0.01 ? (ptr.y / geom.cssH - 0.35) * 2 : Math.sin(t * 0.27 + 1) * 0.2 * settle;
    const lean = Math.max(ptr.on, 0.6) * (1 - out);
    const wantY = nx * 0.2 * lean;
    const wantX = ny * 0.13 * lean;
    rot.vy += ((wantY - rot.y) * 22 - rot.vy * 7.5) * dt;
    rot.vx += ((wantX - rot.x) * 22 - rot.vx * 7.5) * dt;
    rot.y += rot.vy * dt;
    rot.x += rot.vx * dt;
    tilt.rotation.set(rot.x, rot.y, 0);

    // Light sweep: the room turns slowly (reflections slide over the faces); the key light glides.
    scene.environmentRotation.set(0, Math.sin(t * 0.22) * 0.7 + rot.y * 0.8, 0);
    key.position.set(base.gx + Math.sin(t * 0.4) * 6, base.gy + 3, 4);
    key.target.position.set(base.gx, base.gy, 0);
    renderer.toneMappingExposure = 1.15;
    renderer.resetState();
    renderer.clearDepth();
    renderer.render(scene, camera);
  };

  const dispose = () => {
    letters.forEach((l) => l.geometry.dispose());
    material.dispose();
    brushed.dispose();
    env.dispose();
  };

  return { id: "gold3d", layout, enter, frame, dispose };
}
