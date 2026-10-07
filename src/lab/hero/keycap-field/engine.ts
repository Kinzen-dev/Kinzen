import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { wordmarkBitmap } from "../a-kit/glyphs";
import { readProfile, relRect, runLoop, sceneColors, trackPointer } from "../a-kit/loop";

/*
 * A field of navy keycaps under a low warm light. The keys inside the wordmark stand raised with
 * gold-lit tops, spelling KINZEN; which keys those are is decided by projecting every key through
 * the camera and sampling the shipped wordmark mask where it lands in the slot, so the name sits
 * exactly where the home hero's wordmark does. The pointer presses keys as it passes; that
 * disturbance runs through a damped 2D wave equation (height field, one cell per key), so a
 * ripple spreads outward and the keys settle back. One InstancedMesh; per-key height goes into
 * the instance matrices and per-key glow into an instanced attribute read by a patched
 * standard material. Soft shadows from one directional light.
 */

export function startKeycaps(section: HTMLElement, host: HTMLElement, slot: HTMLElement): () => void {
  // Phones: DPR 1.5 (shadows + many instances are fill-heavy at 3x).
  const prof = readProfile(innerWidth < 768 || matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
  const { gold, ground } = sceneColors(section);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(prof.dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  const goldC = new THREE.Color().setRGB(gold[0], gold[1], gold[2], THREE.SRGBColorSpace);
  const navy = new THREE.Color().setRGB(ground[0], ground[1], ground[2], THREE.SRGBColorSpace);

  scene.add(new THREE.HemisphereLight(new THREE.Color(0.55, 0.6, 0.8), navy.clone().multiplyScalar(0.4), 0.55));
  const sun = new THREE.DirectionalLight(new THREE.Color(1, 0.88, 0.7), 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(prof.phone ? 1024 : 2048, prof.phone ? 1024 : 2048);
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

  const keyGeo = new RoundedBoxGeometry(0.86, 0.6, 0.86, prof.phone ? 1 : 2, 0.13);
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
      .replace("#include <common>", "#include <common>\nattribute float aGlow;\nvarying float vGlow;\nvarying float vTop;")
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

  let mesh: THREE.InstancedMesh | null = null;
  let glow: THREE.InstancedBufferAttribute | null = null;
  let cols = 0;
  let rows = 0;
  let rest = new Float32Array(0);
  let letter = new Float32Array(0);
  let order = new Float32Array(0);
  let h = new Float32Array(0);
  let v = new Float32Array(0);
  let originX = 0;
  let originZ = 0;
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ray = new THREE.Raycaster();

  const layout = () => {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    const s = relRect(slot, host);
    // Key pitch in px: ~58 keys across the wordmark on a laptop, 34 on a phone.
    const across = prof.phone ? 34 : 58;
    const pitchPx = s.w / across;
    // Camera: tilted 24 degrees off vertical, distance chosen so one world unit = pitchPx at the centre.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visibleH = r.height / pitchPx;
    const dist = visibleH / (2 * tan);
    const tilt = THREE.MathUtils.degToRad(24);
    camera.position.set(0, Math.cos(tilt) * dist, Math.sin(tilt) * dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Grid big enough to fill the frame (the far edge needs extra rows).
    cols = Math.ceil((r.width / pitchPx) * 1.2) + 2;
    rows = Math.ceil((r.height / pitchPx) * 1.45) + 2;
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
    rest = new Float32Array(n);
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
            const sx = (p.x * 0.5 + 0.5) * r.width;
            const sy = (-p.y * 0.5 + 0.5) * r.height;
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
  layout();

  const pressAt = (x: number, y: number, amount: number, radius: number) => {
    const r = host.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1), camera);
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
        const f = Math.cos((d / radius) * Math.PI * 0.5);
        v[j * cols + i] -= amount * f;
      }
    }
  };

  const ptr = trackPointer(section, (x, y) => pressAt(x, y, 200, 3.2));
  const ro = new ResizeObserver(() => {
    layout();
    if (prof.still) frame(10, 1 / 60);
  });
  ro.observe(host);

  let t0 = -1;
  let nextDrop = 2.5;
  let last = { x: -1, y: -1 };

  const frame = (time: number, dt: number) => {
    if (!mesh || !glow) return;
    if (t0 < 0) t0 = time;
    const t = prof.still ? 10 : time - t0;
    ptr.update(dt);
    const p = ptr.state;

    // The pointer presses keys along its path (scaled by its speed).
    if (p.inside && (Math.abs(p.x - last.x) > 1 || Math.abs(p.y - last.y) > 1)) {
      const speed = Math.min(1.6, Math.hypot(p.vx, p.vy) / 900);
      pressAt(p.x, p.y, (12 + 40 * speed) * dt * 60, 2.2);
    }
    last = { x: p.x, y: p.y };
    // Idle rain: a soft drop now and then keeps the field alive.
    if (!prof.still && t > nextDrop) {
      nextDrop = t + 2.2 + Math.random() * 2.5;
      const r = host.getBoundingClientRect();
      pressAt(Math.random() * r.width, Math.random() * r.height * 0.7, 90, 1.6);
    }

    // Damped wave equation on the grid (two substeps), plus a spring back to rest.
    const c2 = 42;
    const damp = 2.2;
    const spring = 6;
    const sub = 2;
    const sdt = dt / sub;
    for (let s = 0; s < sub; s++) {
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

    // Letters rise in a sweep from the left on load; each key's top glows with its lift.
    const arr = mesh.instanceMatrix.array as Float32Array;
    const g = glow.array as Float32Array;
    for (let k = 0; k < h.length; k++) {
      const rise = letter[k] ? THREE.MathUtils.smoothstep(t - order[k] * 1.4, 0.2, 1.1) : 0;
      rest[k] = rise * 0.5;
      // Pressed keys bottom out above the tray; lifted keys rise up to most of a key height.
      const y = rest[k] + Math.min(0.55, Math.max(-0.4, h[k] * 0.12));
      arr[k * 16 + 13] = y;
      g[k] = rise * 0.95 + Math.max(0, h[k] * 0.12) * 1.8 + Math.min(0.6, Math.abs(v[k]) * 0.015);
    }
    mesh.instanceMatrix.needsUpdate = true;
    glow.needsUpdate = true;
    renderer.render(scene, camera);
  };

  let stopLoop = () => {};
  if (prof.still) frame(10, 1 / 60);
  else stopLoop = runLoop(host, frame);

  return () => {
    stopLoop();
    ptr.stop();
    ro.disconnect();
    mesh?.dispose();
    keyGeo.dispose();
    material.dispose();
    trayGeo.dispose();
    trayMat.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
