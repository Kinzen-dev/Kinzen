import * as THREE from "three";

/*
 * Shared three.js pieces for the lab-ix-b toys. The studio room and the brushed streaks follow
 * the lab hero's gold-3d (src/lab/hero/gold-3d/engine.ts, module-private there, so copied here).
 */

/** Brushed metal: one streak value per row with a little drift along x. */
export function brushedTexture(repeatY = 14): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
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
  t.repeat.set(0.6, repeatY);
  return t;
}

/** A navy room with warm strip softboxes, prefiltered for reflections (what the gold mirrors). */
export function studio(
  renderer: THREE.WebGLRenderer,
  ground: THREE.Color,
  warmth = 1,
  front = 1,
): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene();
  const roomGeo = new THREE.SphereGeometry(20, 32, 16);
  const pos = roomGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = ground.clone().lerp(new THREE.Color(0.3, 0.33, 0.45), 0.6);
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.smoothstep(pos.getY(i) / 20, -0.3, 1);
    const c = ground.clone().multiplyScalar(0.6).lerp(top, k);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  roomGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const strip = (w: number, h: number, x: number, y: number, z: number, color: THREE.Color, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k * warmth), side: THREE.DoubleSide }),
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
  strip(16, 5, 0, 2.5, 14, warm, 1.6 * front);
  if (front > 1) strip(7, 2.2, -3, 5, 11, warm, 2.2 * front);
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

/** A CSS colour token resolved inside `host`, as a linear THREE.Color. */
export function tokenColor(host: HTMLElement, name: string, fallback: string): THREE.Color {
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;visibility:hidden;color:var(${name}, ${fallback})`;
  host.appendChild(el);
  const css = getComputedStyle(el).color;
  el.remove();
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new THREE.Color(fallback);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
}

/**
 * Frame-rate guard: after a warm-up, watches the rolling fps and calls `degrade(level)` (1, 2, ...)
 * when the device cannot hold the target, at most `max` times, with a cool-down between steps.
 */
export function fpsGuard(degrade: (level: number) => void, max = 2, floor = 48) {
  let level = 0;
  let frames = 0;
  let acc = 0;
  let wait = 1.5;
  return (dt: number) => {
    if (level >= max) return;
    if (wait > 0) {
      wait -= dt;
      return;
    }
    frames++;
    acc += dt;
    if (acc >= 2) {
      const fps = frames / acc;
      frames = 0;
      acc = 0;
      if (fps < floor) {
        level++;
        degrade(level);
        wait = 1.5;
      }
    }
  };
}
