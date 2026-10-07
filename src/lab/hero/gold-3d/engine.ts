import * as THREE from "three";
import { wordmarkBitmap } from "../a-kit/glyphs";
import { readProfile, relRect, runLoop, sceneColors, trackPointer } from "../a-kit/loop";
import { WORDMARK } from "@/fx/baked/wordmark";
import { traceGlyphs } from "./contours";

/*
 * KINZEN as extruded brushed-gold letters. The outlines are traced from the baked wordmark mask
 * (the shipped Geist 600 ink), so the 3D name has the same letterforms as the site. Lighting is
 * a generated studio environment (navy room, warm strip softboxes) prefiltered with PMREM; the
 * environment rotates slowly so reflections sweep across the faces, and a warm key light glides
 * across for a travelling glint. The group tilts toward the pointer through a damped spring.
 * Scrolling the tall track dollies the camera into the gap between N and Z while the letters
 * part, so the visitor flies through the name.
 */

/** One world unit = one em of the wordmark (bake px / bakePx). */
const EM = WORDMARK.bakePx;

function brushedTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
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
  const navy = new THREE.Color().setRGB(ground[0], ground[1], ground[2], THREE.SRGBColorSpace);
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
  const room = new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  scene.add(room);
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

export function startGold3d(
  section: HTMLElement,
  host: HTMLElement,
  slot: HTMLElement,
  track: HTMLElement,
): () => void {
  const prof = readProfile(2);
  const { gold, ground } = sceneColors(section);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(prof.dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const env = studio(renderer, ground);
  scene.environment = env.texture;

  const FOV = 28;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

  // Geometry: one extruded mesh per letter, centred on the wordmark.
  const glyphs = traceGlyphs(wordmarkBitmap(), 1.1);
  const bw = WORDMARK.w / EM;
  const bh = WORDMARK.h / EM;
  const depth = 0.24;
  const bevel = prof.phone ? 2 : 4;
  const brushed = brushedTexture();
  const goldColor = new THREE.Color().setRGB(gold[0], gold[1], gold[2], THREE.SRGBColorSpace);
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
  const group = new THREE.Group();
  const letters: { mesh: THREE.Mesh; cx: number }[] = [];
  for (const g of glyphs) {
    const toV = ([x, y]: [number, number]) => new THREE.Vector2(x / EM - bw / 2, -(y / EM - bh / 2));
    const shape = new THREE.Shape(g.outer.map(toV));
    shape.holes = g.holes.map((h) => new THREE.Path(h.map(toV)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.02,
      bevelSegments: bevel,
      curveSegments: 1,
    });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    const cx = g.outer.reduce((s, p) => s + p[0], 0) / g.outer.length / EM - bw / 2;
    letters.push({ mesh, cx });
    group.add(mesh);
  }
  const tilt = new THREE.Group();
  tilt.add(group);
  scene.add(tilt);

  // A warm key light that glides across the faces for a travelling glint.
  const key = new THREE.DirectionalLight(0xffe2b0, 2.2);
  scene.add(key);
  scene.add(key.target);

  // Layout: the camera distance makes the wordmark span the slot; the group sits at the slot centre.
  let base = { dist: 10, gx: 0, gy: 0 };
  const layout = () => {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    const s = relRect(slot, host);
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // 6% margin so the tilted ends never leave the slot.
    const visibleW = (bw * r.width) / (s.w * 0.94);
    const dist = visibleW / (2 * tan * camera.aspect);
    const pxPerWorld = r.width / visibleW;
    base = {
      dist,
      gx: (s.x + s.w / 2 - r.width / 2) / pxPerWorld,
      gy: -(s.y + s.h / 2 - r.height / 2) / pxPerWorld,
    };
    tilt.position.set(base.gx, base.gy, 0);
  };
  layout();
  const ro = new ResizeObserver(() => {
    layout();
    if (prof.still) frame(0, 1 / 60);
  });
  ro.observe(host);

  const ptr = trackPointer(section);
  const rot = { x: 0, y: 0, vx: 0, vy: 0 };
  let dolly = 0;
  let t0 = -1;

  const progress = () => {
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? THREE.MathUtils.clamp(-r.top / span, 0, 1) : 0;
  };

  const frame = (time: number, dt: number) => {
    if (t0 < 0) t0 = time;
    const t = prof.still ? 2 : time - t0;
    ptr.update(dt);
    const p = ptr.state;
    const r = host.getBoundingClientRect();
    // Pointer tilt (or a slow idle sway), through a damped spring: it leans, overshoots a hair, settles.
    const nx = p.on > 0.01 ? (p.x / r.width - 0.5) * 2 : Math.sin(t * 0.35) * 0.35;
    const ny = p.on > 0.01 ? (p.y / r.height - 0.35) * 2 : Math.sin(t * 0.27 + 1) * 0.2;
    const wantY = nx * 0.2 * Math.max(p.on, 0.6);
    const wantX = ny * 0.13 * Math.max(p.on, 0.6);
    const kS = 22;
    const kD = 7.5;
    rot.vy += ((wantY - rot.y) * kS - rot.vy * kD) * dt;
    rot.vx += ((wantX - rot.x) * kS - rot.vx * kD) * dt;
    rot.y += rot.vy * dt;
    rot.x += rot.vx * dt;
    tilt.rotation.set(rot.x, rot.y, 0);

    // Scroll dolly: ease the raw progress so the flight starts gently.
    const want = prof.still ? 0 : progress();
    dolly += (want - dolly) * Math.min(1, dt * 8);
    const e = dolly * dolly * (3 - 2 * dolly);
    // The N to Z gap is the wordmark's middle; letters part around it as the camera arrives.
    for (const l of letters) {
      const side = Math.sign(l.cx) || 1;
      l.mesh.position.set(side * e * 0.55 + l.cx * e * 0.3, 0, -Math.abs(l.cx) * e * 0.5);
      l.mesh.rotation.y = -side * e * 0.38;
    }
    // The flight ends at the doorway between N and Z, the lens widening as it closes in (a
    // dolly zoom), so the two letters stand as gold walls on either side.
    camera.fov = THREE.MathUtils.lerp(FOV, 56, e);
    camera.updateProjectionMatrix();
    camera.position.set(base.gx * e, base.gy * e, THREE.MathUtils.lerp(base.dist, 1.1, e));
    camera.lookAt(base.gx * e, base.gy * e, camera.position.z - 10);
    camera.rotation.z = e * 0.12;

    // Light sweep: the room turns slowly (reflections slide over the faces); the key light glides.
    scene.environmentRotation.set(0, Math.sin(t * 0.22) * 0.7 + rot.y * 0.8, 0);
    const sx = Math.sin(t * 0.4) * 6;
    key.position.set(base.gx + sx, base.gy + 3, 4);
    key.target.position.set(base.gx, base.gy, 0);
    renderer.render(scene, camera);
    section.style.setProperty("--dolly", e.toFixed(4));
  };

  let stopLoop = () => {};
  if (prof.still) frame(0, 1 / 60);
  else stopLoop = runLoop(host, frame);

  return () => {
    stopLoop();
    ptr.stop();
    ro.disconnect();
    letters.forEach((l) => l.mesh.geometry.dispose());
    material.dispose();
    brushed.dispose();
    env.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
