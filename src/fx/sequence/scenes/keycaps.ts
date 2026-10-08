import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { wordmarkBitmap } from "../kit/glyphs";
import type { FrameCtx, Geom, Gpu, GpuScene, SceneId } from "../types";
import { ensureRenderer, srgb } from "./three-kit";

/*
 * Scene 4, keycap field (lab #4). A field of navy keycaps under a low warm light. The keys inside
 * the wordmark stand raised with gold-lit tops, spelling KINZEN; which keys those are is decided by
 * projecting every key through the camera and sampling the baked wordmark mask where it lands in
 * the slot, so the name sits exactly where the other scenes draw it. The pointer presses keys as
 * it passes; that disturbance runs through a damped 2D wave equation (height field, one cell per
 * key), so a ripple spreads outward and the keys settle back. One InstancedMesh; per-key height in
 * the instance matrices, per-key glow in an instanced attribute read by a patched standard
 * material. Soft shadows from one directional light.
 * In the sequence: the field comes up out of the dark under the settling ink and the letter keys
 * rise in a sweep from the left where the ink was; leaving, the keys sink back in the same sweep
 * and the field goes dark while the desk is drawn again.
 */

const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);

export async function createKeycaps(gpu: Gpu, geom0: Geom): Promise<GpuScene> {
  const renderer = ensureRenderer(gpu, geom0);
  const phone = geom0.phone;
  const goldC = srgb(gpu.colors.gold);
  const navy = srgb(gpu.colors.ground);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.55, 0.6, 0.8), navy.clone().multiplyScalar(0.4), 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(new THREE.Color(1, 0.88, 0.7), 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  // The tray under the keys: catches their shadows in the gaps.
  const trayGeo = new THREE.PlaneGeometry(400, 400);
  trayGeo.rotateX(-Math.PI / 2);
  const trayMat = new THREE.MeshStandardMaterial({ color: navy.clone().multiplyScalar(0.55), roughness: 0.9 });
  const tray = new THREE.Mesh(trayGeo, trayMat);
  tray.position.y = -0.62;
  tray.receiveShadow = true;
  scene.add(tray);

  const keyGeo = new RoundedBoxGeometry(0.86, 0.6, 0.86, phone ? 1 : 2, 0.13);
  keyGeo.translate(0, -0.3, 0);
  const uGold = { value: goldC.clone().multiplyScalar(1.1) };
  const material = new THREE.MeshStandardMaterial({
    color: navy.clone().lerp(new THREE.Color(0.3, 0.34, 0.5), 0.35),
    roughness: 0.5,
    metalness: 0.15,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGold = uGold;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aGlow;\nvarying float vGlow;\nvarying float vTop;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvGlow = aGlow;\nvTop = smoothstep(0.6, 0.95, normal.y);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uGold;\nvarying float vGlow;\nvarying float vTop;")
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uGold * 0.75, vTop * clamp(vGlow, 0.0, 1.0));",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGold * vTop * vGlow * 0.32 + uGold * (1.0 - vTop) * vGlow * 0.08;",
      );
  };

  let geom = geom0;
  let mesh: THREE.InstancedMesh | null = null;
  let glow: THREE.InstancedBufferAttribute | null = null;
  let cols = 0;
  let rows = 0;
  let letter = new Float32Array(0);
  let order = new Float32Array(0);
  let h = new Float32Array(0);
  let v = new Float32Array(0);
  let originX = 0;
  let originZ = 0;
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ray = new THREE.Raycaster();

  const layout = (g: Geom) => {
    geom = g;
    camera.aspect = g.cssW / g.cssH;
    const s = g.slot;
    // Key pitch in px: ~58 keys across the wordmark on a laptop, 34 on a phone.
    const pitchPx = s.w / (g.phone ? 34 : 58);
    // Camera: tilted 24 degrees off vertical, distance chosen so one world unit = pitchPx at the centre.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = g.cssH / pitchPx / (2 * tan);
    const tiltA = THREE.MathUtils.degToRad(24);
    camera.position.set(0, Math.cos(tiltA) * dist, Math.sin(tiltA) * dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Grid big enough to fill the frame (the far edge needs extra rows).
    cols = Math.ceil((g.cssW / pitchPx) * 1.2) + 2;
    rows = Math.ceil((g.cssH / pitchPx) * 1.45) + 2;
    originX = -(cols - 1) / 2;
    originZ = -(rows - 1) / 2 - rows * 0.06;
    const n = cols * rows;
    if (mesh) {
      scene.remove(mesh);
      mesh.dispose();
    }
    mesh = new THREE.InstancedMesh(keyGeo, material, n);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    glow = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    glow.setUsage(THREE.DynamicDrawUsage);
    keyGeo.setAttribute("aGlow", glow);
    mesh.frustumCulled = false;
    scene.add(mesh);
    letter = new Float32Array(n);
    order = new Float32Array(n);
    h = new Float32Array(n);
    v = new Float32Array(n);

    // Which keys spell the name: project each key's footprint and sample the mask in the slot.
    const bm = wordmarkBitmap();
    const p = new THREE.Vector3();
    const m = new THREE.Matrix4();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const x = originX + i;
        const z = originZ + j;
        let on = 0;
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            p.set(x + a * 0.3, 0, z + b * 0.3).project(camera);
            const sx = (p.x * 0.5 + 0.5) * g.cssW;
            const sy = (-p.y * 0.5 + 0.5) * g.cssH;
            const u = Math.floor(((sx - s.x) / s.w) * bm.w);
            const w = Math.floor(((sy - s.y) / s.h) * bm.h);
            if (u >= 0 && w >= 0 && u < bm.w && w < bm.h) on += bm.bits[w * bm.w + u];
          }
        }
        letter[k] = on >= 4 ? 1 : 0;
        p.set(x, 0, z).project(camera);
        order[k] = p.x * 0.5 + 0.5;
        m.makeTranslation(x, 0, z);
        mesh.setMatrixAt(k, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Light from the upper left, its shadow box covering the grid.
    sun.position.set(-cols * 0.35, 18, -rows * 0.3 - 6);
    sun.target.position.set(0, 0, 0);
    const cam = sun.shadow.camera;
    const ext = Math.max(cols, rows) * 0.62;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 1;
    cam.far = 90;
    cam.updateProjectionMatrix();
  };
  layout(geom0);
  renderer.resetState();
  await renderer.compileAsync(scene, camera);

  const pressAt = (x: number, y: number, amount: number, radius: number) => {
    ray.setFromCamera(new THREE.Vector2((x / geom.cssW) * 2 - 1, -(y / geom.cssH) * 2 + 1), camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(floor, hit)) return;
    const ci = hit.x - originX;
    const cj = hit.z - originZ;
    const R = Math.ceil(radius);
    for (let j = Math.floor(cj) - R; j <= Math.ceil(cj) + R; j++) {
      for (let i = Math.floor(ci) - R; i <= Math.ceil(ci) + R; i++) {
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
        const d = Math.hypot(i - ci, j - cj);
        if (d > radius) continue;
        v[j * cols + i] -= amount * Math.cos((d / radius) * Math.PI * 0.5);
      }
    }
  };

  let nextDrop = 2.5;
  let last = { x: -1, y: -1 };
  let from: SceneId = "fluid";
  const enter = (f: SceneId) => {
    from = f;
    h.fill(0);
    v.fill(0);
    nextDrop = 3;
  };

  const frame = ({ t, dt, role, ptr }: FrameCtx) => {
    if (!mesh || !glow) return;
    const into = role.mode === "in" ? role.p : 1;
    const out = role.mode === "out" ? role.p : 0;

    // The pointer presses keys along its path (scaled by its speed).
    if (ptr.inside && out === 0 && (Math.abs(ptr.x - last.x) > 1 || Math.abs(ptr.y - last.y) > 1)) {
      const speed = Math.min(1.6, Math.hypot(ptr.vx, ptr.vy) / 900);
      pressAt(ptr.x, ptr.y, (12 + 40 * speed) * dt * 60, 2.2);
    }
    last = { x: ptr.x, y: ptr.y };
    // Idle rain: a soft drop now and then keeps the field alive.
    if (t > nextDrop && out === 0) {
      nextDrop = t + 2.2 + Math.random() * 2.5;
      pressAt(Math.random() * geom.cssW, Math.random() * geom.cssH * 0.7, 90, 1.6);
    }

    // Damped wave equation on the grid (two substeps), plus a spring back to rest.
    const c2 = 42;
    const damp = 2.2;
    const spring = 6;
    const sdt = dt / 2;
    for (let s = 0; s < 2; s++) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const hc = h[k];
          const lap =
            (i > 0 ? h[k - 1] : hc) +
            (i < cols - 1 ? h[k + 1] : hc) +
            (j > 0 ? h[k - cols] : hc) +
            (j < rows - 1 ? h[k + cols] : hc) -
            4 * hc;
          v[k] += (c2 * lap - damp * v[k] - spring * hc) * sdt;
        }
      }
      for (let k = 0; k < h.length; k++) h[k] += v[k] * sdt;
    }

    // Letters rise in a sweep from the left (after the ink has begun to settle); leaving, they
    // sink back in the same sweep. Each key's top glows with its lift.
    const delay = from === "fluid" ? 0.5 : 0.2;
    const arr = mesh.instanceMatrix.array as Float32Array;
    const g = glow.array as Float32Array;
    const sinkAll = smooth(ramp(out, 0.45, 1));
    for (let k = 0; k < h.length; k++) {
      let rise = letter[k] ? smooth(ramp(t - order[k] * 1.4, delay, delay + 0.9)) : 0;
      if (out > 0) rise *= 1 - smooth(ramp(out * 1.7 - order[k] * 0.7, 0, 0.6));
      const y = rise * 0.5 + Math.min(0.55, Math.max(-0.4, h[k] * 0.12)) - sinkAll * 0.5;
      arr[k * 16 + 13] = y;
      g[k] = rise * 0.95 + Math.max(0, h[k] * 0.12) * 1.8 + Math.min(0.6, Math.abs(v[k]) * 0.015);
    }
    mesh.instanceMatrix.needsUpdate = true;
    glow.needsUpdate = true;
    // The field comes up out of the dark, and goes back into it.
    renderer.toneMappingExposure = 1.1 * smooth(ramp(into, 0, 0.75)) * (1 - sinkAll);
    renderer.resetState();
    renderer.clearDepth();
    renderer.render(scene, camera);
  };

  const dispose = () => {
    if (mesh) {
      scene.remove(mesh);
      mesh.dispose();
    }
    keyGeo.dispose();
    material.dispose();
    trayGeo.dispose();
    trayMat.dispose();
    sun.shadow.map?.dispose();
  };

  return { id: "keycaps", layout, enter, frame, tap: (x, y) => pressAt(x, y, 200, 3.2), dispose };
}
