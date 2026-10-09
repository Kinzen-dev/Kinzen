import * as THREE from "three";
import { Sound, loadClip, type KnockKind } from "./audio";
import { buildRoom, disposeRoom, type Built } from "./build";
import { bangkokHours, clockText, skyAt, type Phase } from "./clock";
import type { SpotId } from "./copy";
import { SHARED, inkPass } from "./ink";
import { DESK_Y, push, settled, step, type Prop } from "./physics";
import { canvasDpr, frameLoop, type Loop } from "@/motion/frame-governor";
import { softwareGl } from "../kit/loop";

/*
 * Night desk runtime: renderer + ink pass, a spring-driven camera (drag to orbit a few degrees
 * with inertia and soft limits, pointer parallax, smooth dolly onto a clicked object), picking,
 * the desk physics, the phone call, the lamp, the Bangkok clock at the window, the cat, plants
 * that sway when brushed, and the sound. Phones get a fixed camera; reduced motion renders
 * still frames on demand and swaps every camera move for an instant state change.
 */

export type CallState = { state: "idle" | "ringing" | "talking"; words: number };

export type EngineOpts = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  phone: boolean;
  still: boolean;
  font: string;
  clipUrl: string;
  /** Words in the greeting caption (the caption reveals in step with the waveform). */
  words: number;
  noteLabel: string;
  els: {
    clock: HTMLElement | null;
    phase: HTMLElement | null;
    ring: HTMLElement | null;
    spots: Partial<Record<SpotId, HTMLElement | null>>;
  };
  phaseLabel: (p: Phase) => string;
  onFocus: (spot: SpotId | null) => void;
  onSheet: () => void;
  onCall: (c: CallState) => void;
  onLapse: (running: boolean) => void;
  /** The ink has drawn in (the first composed frame is on screen). */
  onReady?: () => void;
};

/** Thrown when only a software renderer is available (the section shows the desk's picture). */
export class SoftwareRenderer extends Error {
  name = "SoftwareRenderer";
}

export type Engine = {
  activate: (spot: SpotId) => void;
  back: () => void;
  timeLapse: () => void;
  destroy: () => void;
};

type Pose = { target: THREE.Vector3; dir: THREE.Vector3; w: number; h: number };

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const OVERVIEW: Pose = { target: v3(0, 1.22, -0.22), dir: v3(0, 0.3, 1).normalize(), w: 2.5, h: 1.72 };
const OVERVIEW_PHONE: Pose = { target: v3(0.02, 1.2, -0.15), dir: v3(0, 0.36, 1).normalize(), w: 1.48, h: 1.1 };
const FOCUS: Partial<Record<SpotId, Pose>> = {
  monitor: { target: v3(0.02, 1.077, -0.26), dir: v3(0, 0.05, 1).normalize(), w: 1.1, h: 0.47 },
  phone: { target: v3(0.47, 0.81, 0.1), dir: v3(0.12, 0.5, 1).normalize(), w: 0.78, h: 0.44 },
  window: { target: v3(0.12, 1.58, -0.78), dir: v3(-0.06, -0.08, 1).normalize(), w: 1.45, h: 0.82 },
  cat: { target: v3(1.08, 1.3, -0.6), dir: v3(-0.3, 0.05, 1).normalize(), w: 0.48, h: 0.34 },
};

const YAW_MAX = 0.2;
const PITCH_MAX = 0.08;

export function createNightDesk(o: EngineOpts): Engine {
  const { canvas, host, phone, still } = o;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (softwareGl(renderer.getContext())) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw new SoftwareRenderer();
  }
  // Compile errors are not polled per program (a synchronous stall); shaders are fixed and tested.
  renderer.debug.checkShaderErrors = false;
  renderer.setClearColor(0x03040a, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const room: Built = buildRoom({ phone, font: o.font });
  const { scene } = room;
  const camera = new THREE.PerspectiveCamera(phone ? 36 : 30, 1, 0.2, 14);

  // Off-screen colour (+ id in alpha) and depth, mipmapped for the bloom taps.
  const dpr0 = canvasDpr(phone ? 1.75 : 2);
  let dpr = dpr0;
  const rt = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthTexture: new THREE.DepthTexture(4, 4, THREE.FloatType),
  });
  const ink = inkPass();
  ink.uniforms.tColor.value = rt.texture;
  ink.uniforms.tDepth.value = rt.depthTexture;
  ink.uniforms.uNear.value = camera.near;
  ink.uniforms.uFar.value = camera.far;
  const post = new THREE.Scene();
  const tri = new THREE.BufferGeometry();
  tri.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triMesh = new THREE.Mesh(tri, ink);
  triMesh.frustumCulled = false;
  post.add(triMesh);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let W = 1;
  let H = 1;
  const resize = () => {
    const r = host.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    rt.setSize(pw, ph);
    ink.uniforms.uRes.value.set(pw, ph);
    ink.uniforms.uScale.value = dpr;
    SHARED.uDpr.value = dpr;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    dirty = true;
  };

  /* ---------------- state ---------------- */
  const sound = new Sound();
  let clip: { buffer: AudioBuffer; env: number[] } | null = null;
  void loadClip(o.clipUrl)
    .then((c) => {
      clip = c;
      room.notepad.setWave(c.env, o.noteLabel);
    })
    .catch(() => undefined);

  let focus: SpotId | null = null;
  let dirty = true;
  let loop: Loop | null = null;
  /** Something changed: draw it (the reduced-motion loop sleeps between changes). */
  const touch = () => {
    dirty = true;
    loop?.wake();
  };
  let t = 0;
  let lampOn = true;
  let lamp = 1;
  let lampFlicker = 0;
  let headA = 0;
  let headV = 0;
  let noteA = 0;
  let noteV = 0;
  let lapse = -1;
  let stillHours: number | null = null;
  let call: CallState["state"] = "idle";
  let callT = 0;
  let lastWords = -1;
  let flash = 0;
  let nextFlash = 18 + Math.random() * 20;
  let nextTrain = 6;
  let train = -1;
  let nextPlane = 14;
  let plane = -1;
  let ambienceAcc = 1;
  let steamK = 1;
  // Entry: lines ink in, then the fill; the camera eases in from a step back.
  let reveal = still ? 1 : 0;

  // Camera springs.
  const cam = {
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    vp: new THREE.Vector3(),
    vt: new THREE.Vector3(),
  };
  let yaw = 0;
  let pitch = 0;
  let yawV = 0;
  let pitchV = 0;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  const poseOf = (p: Pose, out: { pos: THREE.Vector3; target: THREE.Vector3 }, k = 1) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const back = 1 + 0.16 * (1 - reveal) ** 2;
    const d = Math.max(p.h / 2 / tan, p.w / 2 / (tan * camera.aspect)) * 1.04 * back;
    const dir = p.dir.clone();
    const yw = (yaw + par.x * 0.05) * k;
    const pt = (pitch + par.y * 0.025) * k;
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yw);
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    dir.applyAxisAngle(right, -pt);
    out.target.copy(p.target);
    out.pos.copy(p.target).addScaledVector(dir, d);
  };
  const goal = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const currentPose = () =>
    focus && FOCUS[focus] && !phone && !still ? FOCUS[focus]! : phone ? OVERVIEW_PHONE : OVERVIEW;

  /* ---------------- hover + picking ---------------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ranges = Object.entries(room.ranges) as [SpotId, [number, number]][];
  const idOf = (obj: THREE.Object3D | null): number => {
    while (obj) {
      const m = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      const mat = Array.isArray(m) ? m[0] : m;
      const u = mat?.userData.uId as { value: number } | undefined;
      if (u) return Math.round(u.value * 255);
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uId) return Math.round(mat.uniforms.uId.value * 255);
      obj = obj.parent;
    }
    return 0;
  };
  type Hit = { spot?: SpotId; prop?: Prop; propIdx?: number; point: THREE.Vector3 } | null;
  const pick = (cx: number, cy: number): Hit => {
    ndc.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(scene.children, true);
    for (const h of hits) {
      if (!(h.object as THREE.Mesh).isMesh) continue;
      const id = idOf(h.object);
      const pi = room.propRanges.findIndex(([a, b]) => id >= a && id <= b);
      if (pi >= 0) return { prop: room.props[pi], propIdx: pi, point: h.point };
      const s = ranges.find(([, [a, b]]) => id >= a && id <= b);
      // The window spot is only the glass and frame, not the wall around it.
      if (s) return { spot: s[0], point: h.point };
      return { point: h.point };
    }
    return null;
  };
  let hoverRange: [number, number] | null = null;
  let hoverK = 0;

  /* ---------------- actions ---------------- */
  const setFocus = (s: SpotId | null) => {
    if (focus === s) return;
    focus = s;
    room.agents.speed = s === "monitor" ? 0.75 : 1;
    o.onFocus(s);
    touch();
  };

  const toggleLamp = () => {
    lampOn = !lampOn;
    lampFlicker = lampOn ? 0.35 : 0;
    headV += lampOn ? 2.4 : -2.4;
    sound.click(lampOn);
    touch();
  };

  const ring = () => {
    if (call !== "idle") return;
    call = "ringing";
    callT = 0;
    lastWords = -1;
    sound.ring();
    room.cat.kick(1.2);
    room.notepad.draw(0);
    o.onCall({ state: "ringing", words: 0 });
    if (still) {
      // No rattle, no drawing: straight to the answered call with the whole waveform inked.
      call = "talking";
      callT = 0;
      room.notepad.draw(1);
      if (clip) sound.playClip(clip.buffer);
      o.onCall({ state: "talking", words: o.words });
      window.setTimeout(
        () => {
          call = "idle";
          o.onCall({ state: "idle", words: o.words });
        },
        (clip?.buffer.duration ?? 8) * 1000 + 600,
      );
    }
    touch();
  };

  const activate = (s: SpotId) => {
    if (s === "lamp") return toggleLamp();
    if (s === "cat") {
      room.cat.kick(1);
      room.cat.stretch = 1;
      noteV += 3;
      sound.purr();
      if (!phone && !still) setFocus(focus === "cat" ? null : "cat");
      touch();
      return;
    }
    if (s === "monitor") {
      if (phone || still) return o.onSheet();
      return setFocus(focus === "monitor" ? null : "monitor");
    }
    if (s === "phone") {
      ring();
      if (!phone && !still) setFocus("phone");
      return;
    }
    if (s === "window") {
      if (still) {
        // Reduced motion: each tap shows the window at the next time of day (a still, no lapse).
        const marks = [6.3, 12, 18.3, 1];
        const h = stillHours ?? bangkokHours();
        stillHours = marks.find((m) => m > h + 0.5) ?? marks[0];
        if (stillHours === 1 && h >= 1 && h < 6.3) stillHours = 6.3;
        touch();
        return;
      }
      if (phone) return timeLapse();
      return setFocus(focus === "window" ? null : "window");
    }
  };

  const timeLapse = () => {
    if (still) {
      stillHours = null;
      touch();
      return;
    }
    lapse = lapse >= 0 ? -1 : 0;
    o.onLapse(lapse >= 0);
  };

  const impact = (p: Prop, speed: number, what: string) => {
    const self: KnockKind = p.kind === "mug" ? "mug" : p.kind === "pen" ? "pen" : "ball";
    sound.knock(self, speed);
    if (what === "phone") sound.knock("phone", speed);
    if (what === "lamp") {
      sound.knock("lamp", speed);
      headV += speed * 2;
    }
    if (what === "floor") sound.knock("floor", speed);
    if (what === "pot" || what === "books") brush(p.x < 0 ? 0 : 1, speed * 2);
    if (what === "phone") room.phone.dial.rotation.y += speed * 0.4;
  };

  /* ---------------- plants ---------------- */
  const brush = (plant: number, k: number) => {
    const c = room.plants[plant];
    for (const l of room.leaves) {
      if (l.pivot.position.distanceTo(c) < 0.4) l.v += (Math.random() - 0.3) * k;
    }
  };

  /* ---------------- pointer ---------------- */
  type Drag = {
    id: number;
    x: number;
    y: number;
    t: number;
    moved: boolean;
    prop?: Prop;
    orbit: boolean;
    touch: boolean;
  };
  let drag: Drag | null = null;
  let px = -1;
  let py = -1;
  let pvx = 0;
  let pvy = 0;
  let lastMove = 0;
  const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(DESK_Y + 0.02));
  const onDeskAt = (cx: number, cy: number) => {
    ndc.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(deskPlane, new THREE.Vector3());
  };
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const [x, y] = local(e);
    const touch = e.pointerType !== "mouse";
    const hit = still ? null : pick(x, y);
    drag = { id: e.pointerId, x, y, t: performance.now(), moved: false, orbit: !touch && !phone && !still, touch };
    if (hit?.prop && !touch) {
      drag.prop = hit.prop;
      drag.orbit = false;
      hit.prop.held = true;
      const at = onDeskAt(x, y);
      hit.prop.hx = at?.x ?? hit.prop.x;
      hit.prop.hz = at?.z ?? hit.prop.z;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    } else if (drag.orbit) {
      canvas.setPointerCapture(e.pointerId);
    }
  };
  const move = (e: PointerEvent) => {
    const [x, y] = local(e);
    const now = performance.now();
    if (px >= 0) {
      const dt = Math.max(1, now - lastMove) / 1000;
      pvx = pvx * 0.6 + ((x - px) / dt) * 0.4;
      pvy = pvy * 0.6 + ((y - py) / dt) * 0.4;
    }
    lastMove = now;
    if (drag && drag.id === e.pointerId) {
      if (Math.hypot(x - drag.x, y - drag.y) > 5) drag.moved = true;
      if (drag.prop) {
        const at = onDeskAt(x, y);
        if (at) {
          drag.prop.hx = THREE.MathUtils.clamp(at.x, -1.1, 1.1);
          drag.prop.hz = THREE.MathUtils.clamp(at.z, -0.42, 0.55);
        }
      } else if (drag.orbit && drag.moved) {
        yawV = -((x - px) / W) * 9;
        pitchV = ((y - py) / H) * 3;
        yaw += -((x - px) / W) * 0.9;
        pitch += ((y - py) / H) * 0.35;
      }
    }
    px = x;
    py = y;
    if (e.pointerType === "mouse") {
      par.tx = (x / W) * 2 - 1;
      par.ty = (y / H) * 2 - 1;
    }
    touch();
  };
  const up = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    const [x, y] = local(e);
    if (d.prop) {
      const p = d.prop;
      p.held = false;
      const s = Math.hypot(p.vx, p.vz);
      const cap = p.kind === "mug" ? 1.8 : 2.8;
      if (s > cap) {
        p.vx *= cap / s;
        p.vz *= cap / s;
      }
      canvas.style.cursor = "grab";
      if (d.moved) return;
    }
    if (d.moved) return;
    click(x, y);
  };
  const click = (x: number, y: number) => {
    const hit = pick(x, y);
    if (hit?.prop) {
      // A tap knocks it away from the viewer, a little sideways.
      if (still) return;
      const dir = hit.prop.mesh.position.clone().sub(camera.position).setY(0).normalize();
      const side = (Math.random() - 0.5) * 0.8;
      const sp = hit.prop.kind === "mug" ? 0.9 : 1.6;
      push(hit.prop, (dir.x + dir.z * side) * sp, (dir.z - dir.x * side) * sp, hit.point.x, hit.point.z);
      sound.knock(hit.prop.kind === "mug" ? "mug" : hit.prop.kind === "pen" ? "pen" : "ball", 1.2);
      return;
    }
    if (hit?.spot) return activate(hit.spot);
    if (focus) setFocus(null);
  };
  const leave = () => {
    par.tx = 0;
    par.ty = 0;
    px = -1;
    hoverRange = null;
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape" && focus) setFocus(null);
  };
  canvas.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", leave);
  window.addEventListener("keydown", key);

  /* ---------------- per-frame ---------------- */
  const proj = new THREE.Vector3();
  // What each element was last given: a still camera writes nothing (no style recalc per frame).
  const placed = new WeakMap<HTMLElement, { tf: string; hidden: string }>();
  const placeEl = (el: HTMLElement | null | undefined, p: THREE.Vector3, show = true) => {
    if (!el) return;
    proj.copy(p).project(camera);
    const vis = show && proj.z < 1 && Math.abs(proj.x) < 0.98 && Math.abs(proj.y) < 0.96;
    // Kept clear of the stage edges so a label never clips (phones label every dot).
    const x = THREE.MathUtils.clamp(((proj.x + 1) / 2) * W, 44, W - 44);
    const y = ((1 - proj.y) / 2) * H;
    const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    const hidden = vis ? "false" : "true";
    let last = placed.get(el);
    if (!last) placed.set(el, (last = { tf: "", hidden: "" }));
    if (tf !== last.tf) el.style.transform = last.tf = tf;
    if (hidden !== last.hidden) el.dataset.hidden = last.hidden = hidden;
  };
  let lastClock = "";
  let lastPhase = "";

  const sim = (dt: number) => {
    t += dt;
    if (reveal < 1) {
      reveal = Math.min(1, reveal + dt / 2.6);
      ink.uniforms.uReveal.value = reveal;
      if (reveal >= 0.85 && !host.dataset.ready) {
        host.dataset.ready = "true";
        o.onReady?.();
      }
    }
    // Sky and time.
    let hours = stillHours ?? bangkokHours();
    if (lapse >= 0) {
      lapse += dt / 9;
      const e = lapse < 0.5 ? 2 * lapse * lapse : 1 - (-2 * lapse + 2) ** 2 / 2;
      hours += e * 24;
      if (lapse >= 1) {
        lapse = -1;
        o.onLapse(false);
      }
    }
    const sky = skyAt(hours);
    const text = clockText(sky.hours);
    if (text !== lastClock && o.els.clock) {
      lastClock = text;
      o.els.clock.textContent = text;
    }
    if (sky.phase !== lastPhase && o.els.phase) {
      lastPhase = sky.phase;
      o.els.phase.textContent = o.phaseLabel(sky.phase);
      host.dataset.phase = sky.phase;
    }

    // Weather and the city's little events.
    if (!still) {
      if (sky.rain > 0.7) {
        nextFlash -= dt;
        if (nextFlash < 0) {
          flash = 1;
          nextFlash = 25 + Math.random() * 40;
          sound.thunder();
        }
      }
      flash = Math.max(0, flash - dt * 2.2);
      nextTrain -= dt;
      if (train < 0 && nextTrain < 0) train = 0;
      if (train >= 0) {
        train += dt / 9;
        if (train > 1) {
          train = -1;
          nextTrain = 18 + Math.random() * 14;
        }
      }
      nextPlane -= dt;
      if (plane < 0 && nextPlane < 0 && sky.day < 0.5) plane = 0;
      if (plane >= 0) {
        plane += dt / 24;
        if (plane > 1) {
          plane = -1;
          nextPlane = 30 + Math.random() * 30;
        }
      }
    }
    const flick = flash > 0 ? (Math.sin(flash * 40) > 0 ? flash : flash * 0.3) : 0;
    const g = room.glass.uniforms;
    g.uTime.value = still ? 40 : t;
    g.uDay.value = sky.day;
    g.uGlow.value = sky.glow;
    g.uRain.value = sky.rain;
    g.uFlash.value = flick;
    g.uTrain.value = train;
    g.uPlane.value = plane;

    // Lamp: warms up with a flicker, the head bobs on its spring.
    const target = lampOn ? 1 : 0;
    if (still) lamp = target;
    else if (lampOn && lampFlicker > 0) {
      lampFlicker -= dt;
      lamp = lampFlicker > 0.22 ? 0.5 : lampFlicker > 0.14 ? 0.15 : Math.min(1, lamp + dt * 8);
    } else lamp += (target - lamp) * Math.min(1, dt * (lampOn ? 10 : 16));
    headV += (-headA * 90 - headV * 6) * dt;
    headA += headV * dt;
    room.lamp.head.rotation.x = headA * 0.08;
    room.lamp.head.rotation.z = headA * 0.05;
    room.lamp.light.intensity = 2.6 * lamp;
    room.lamp.inner.uniforms.uGain.value = 0.12 + 1.6 * lamp;
    room.lamp.bulb.uniforms.uGain.value = 0.15 + 5 * lamp;

    // Room light follows the window.
    const day = sky.day;
    room.hemi.intensity = 0.85 + day * 2.4 + sky.glow * 0.5 + flick * 1.4;
    room.hemi.color
      .setRGB(0.23 + day * 0.5, 0.27 + day * 0.48, 0.4 + day * 0.4)
      .lerp(new THREE.Color(0.9, 0.55, 0.35), sky.glow * 0.4);
    room.sun.intensity = 0.3 + day * 2.4 + sky.glow * 0.8 + flick * 2;
    room.sun.color
      .setRGB(0.5 + day * 0.5, 0.58 + day * 0.37, 0.8 + day * 0.05)
      .lerp(new THREE.Color(1, 0.6, 0.3), sky.glow * 0.6);
    room.screenLight.intensity = 0.35 * (1 - day * 0.7);

    // Ambient sound tracks the window (a few times a second is plenty).
    ambienceAcc += dt;
    if (ambienceAcc > 0.5) {
      ambienceAcc = 0;
      sound.ambience(sky.rain, day);
    }

    // Monitor agents.
    room.agents.update(still ? 0 : dt, true);

    // Phone call.
    if (call !== "idle" && !still) {
      callT += dt;
      const hs = room.phone.handset;
      if (call === "ringing") {
        const on = callT < 1.1 || (callT > 1.5 && callT < 2.6);
        hs.rotation.z = on ? Math.sin(callT * 75) * 0.05 : hs.rotation.z * 0.8;
        hs.position.y = 0.122 + (on ? Math.abs(Math.sin(callT * 75)) * 0.004 : 0);
        room.phone.group.rotation.y = -0.38 + (on ? Math.sin(callT * 75 + 1) * 0.006 : 0);
        if (o.els.ring) o.els.ring.dataset.on = on ? "true" : "false";
        if (callT > 2.8) {
          call = "talking";
          callT = 0;
          if (clip) sound.playClip(clip.buffer);
          o.onCall({ state: "talking", words: 0 });
        }
      } else {
        const dur = clip?.buffer.duration ?? 8;
        const p = Math.min(1, callT / dur);
        // The handset lifts off the cradle and hangs there while the agent speaks.
        const lift = Math.min(1, callT * 3) * (callT > dur + 0.3 ? Math.max(0, 1 - (callT - dur - 0.3) * 4) : 1);
        hs.position.y = 0.122 + lift * (0.03 + Math.sin(callT * 2) * 0.004);
        hs.rotation.z = lift * 0.22;
        hs.rotation.x = -lift * 0.25;
        room.phone.rebuildCord();
        room.notepad.draw(p);
        const words = Math.round(p * o.words);
        if (words !== lastWords) {
          lastWords = words;
          o.onCall({ state: "talking", words });
        }
        if (o.els.ring) o.els.ring.dataset.on = "false";
        if (callT > dur + 0.55) {
          call = "idle";
          hs.position.y = 0.122;
          hs.rotation.set(0, 0, 0);
          room.phone.rebuildCord();
          sound.knock("phone", 1.4);
          o.onCall({ state: "idle", words: o.words });
        }
      }
    }

    // Props.
    if (!still) step(room.props, room.obstacles, dt, impact);
    // Steam rises from the mug while it sits still on the desk (a knock or a fall puts it out for a while).
    const mug = room.props[1];
    const calm =
      !mug.held && Math.hypot(mug.vx, mug.vz) < 0.02 && Math.abs(mug.tilt) < 0.03 && Math.abs(mug.y - DESK_Y) < 0.01;
    steamK += ((calm ? 1 : 0) - steamK) * Math.min(1, dt * (calm ? 0.4 : 6));
    const sm = room.steam.material as THREE.ShaderMaterial;
    sm.uniforms.uTime.value = t;
    sm.uniforms.uK.value = steamK;
    room.steam.visible = steamK > 0.01;
    room.steam.position.set(mug.x, mug.y + 0.18, mug.z);
    room.steam.rotation.y = Math.atan2(camera.position.x - mug.x, camera.position.z - mug.z);

    // Plants: brushed by a moving pointer nearby, plus a faint draught.
    const speed = Math.hypot(pvx, pvy);
    pvx *= 0.9;
    pvy *= 0.9;
    if (!still && px >= 0 && speed > 60) {
      for (let i = 0; i < room.plants.length; i++) {
        proj.copy(room.plants[i]).project(camera);
        const sx = ((proj.x + 1) / 2) * W;
        const sy = ((1 - proj.y) / 2) * H;
        const d = Math.hypot(sx - px, sy - py);
        if (d < W * 0.08) brush(i, Math.min(1.5, speed / 900) * (1 - d / (W * 0.08)) * 0.8);
      }
    }
    for (const l of room.leaves) {
      l.v += (-l.a * l.k - l.v * 3.2) * dt;
      l.a += l.v * dt;
      const breeze = still ? 0 : Math.sin(t * 0.9 + l.k) * 0.01;
      l.pivot.rotation.x = l.base.x + l.a * 0.6 + breeze;
      l.pivot.rotation.z = l.base.z + l.a * 0.35;
    }

    // Cat: eyes follow the pointer, glow when the room is dark.
    if (px >= 0) {
      proj.copy(room.anchors.cat).project(camera);
      const cx = ((proj.x + 1) / 2) * W;
      const cy = ((1 - proj.y) / 2) * H;
      room.cat.look.x += ((px - cx) / (W * 0.4) - room.cat.look.x) * Math.min(1, dt * 6);
      room.cat.look.y += ((py - cy) / (H * 0.4) - room.cat.look.y) * Math.min(1, dt * 6);
    }
    room.cat.glow = (1 - lamp) * (1 - day);
    room.cat.update(dt, still);
    noteV += (-noteA * 70 - noteV * 4) * dt;
    noteA += noteV * dt;
    room.catNote.rotation.z = noteA * 0.12;

    // Camera.
    par.x += (par.tx - par.x) * Math.min(1, dt * 3);
    par.y += (par.ty - par.y) * Math.min(1, dt * 3);
    if (!drag?.orbit || !drag.moved) {
      yaw += yawV * dt * 0.1;
      pitch += pitchV * dt * 0.1;
      yawV *= Math.exp(-dt * 3.5);
      pitchV *= Math.exp(-dt * 3.5);
      // Soft limits pull back like a rubber band.
      if (Math.abs(yaw) > YAW_MAX) yaw += (Math.sign(yaw) * YAW_MAX - yaw) * Math.min(1, dt * 6);
      if (Math.abs(pitch) > PITCH_MAX) pitch += (Math.sign(pitch) * PITCH_MAX - pitch) * Math.min(1, dt * 6);
      // A focused view drifts back toward straight-on.
      if (focus) {
        yaw *= Math.exp(-dt * 2);
        pitch *= Math.exp(-dt * 2);
      }
    } else {
      yaw = THREE.MathUtils.clamp(yaw, -YAW_MAX * 1.35, YAW_MAX * 1.35);
      pitch = THREE.MathUtils.clamp(pitch, -PITCH_MAX * 1.4, PITCH_MAX * 1.4);
    }
    poseOf(currentPose(), goal, phone || still ? 0 : focus ? 0.35 : 1);
    if (still || !inited || reveal < 1) {
      cam.pos.copy(goal.pos);
      cam.target.copy(goal.target);
      inited = true;
    } else {
      const k = 30;
      const c = 9.5;
      cam.vp.addScaledVector(goal.pos.clone().sub(cam.pos), k * dt).multiplyScalar(Math.exp(-c * dt));
      cam.vt.addScaledVector(goal.target.clone().sub(cam.target), k * dt).multiplyScalar(Math.exp(-c * dt));
      cam.pos.addScaledVector(cam.vp, dt);
      cam.target.addScaledVector(cam.vt, dt);
    }
    camera.position.copy(cam.pos);
    camera.lookAt(cam.target);
    camera.updateMatrixWorld();

    // Hover (desktop pointer only, not while dragging).
    if (!phone && px >= 0 && !drag) {
      const hit = pick(px, py);
      let r: [number, number] | null = null;
      let cursor = "";
      if (hit?.prop && !still) {
        r = room.propRanges[hit.propIdx!];
        cursor = "grab";
      } else if (hit?.spot) {
        r = room.ranges[hit.spot];
        cursor = "pointer";
      } else if (focus) cursor = "zoom-out";
      hoverRange = r;
      if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
    }
    if (hoverRange) ink.uniforms.uHover.value.set(hoverRange[0], hoverRange[1]);
    hoverK += ((hoverRange ? 1 : 0) - hoverK) * Math.min(1, dt * 10);
    ink.uniforms.uHoverK.value = hoverK;

    // Line boil: re-seed a few times a second.
    ink.uniforms.uSeed.value = still ? 0 : Math.floor(t * 5) % 97;

    // HTML hotspots and the ring marks follow their objects.
    for (const [id, el] of Object.entries(o.els.spots) as [SpotId, HTMLElement | null][]) {
      placeEl(el, room.anchors[id], !focus || focus === id);
    }
    placeEl(o.els.ring, room.anchors.phone);
  };
  let inited = false;

  const render = () => {
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(post, postCam);
  };

  /* ---------------- loop ---------------- */
  // The frame governor (src/motion/frame-governor): paced to 60 on phones, only on screen, light
  // when idle, and the pixel ratio follows its adaptive scale. The room is never still (boil,
  // steam, the window's traffic), so the live loop never settles; reduced motion draws on demand.
  let n = 0;
  let work = 0;
  let windowStart = 0;
  const w = window as unknown as { __labFps?: { fps: number; frameMs: number; frames: number; dpr: number } };
  const onScale = (q: number) => {
    dpr = Math.max(1, dpr0 * q);
    resize();
  };
  const frame = ({ now, dt, raw }: { now: number; dt: number; raw: number }) => {
    if (still) {
      // On demand: draw when something changed (and while a call or a physics settle is live).
      const busy = call !== "idle" || !settled(room.props);
      if (!dirty && !busy) return false;
      dirty = false;
      sim(dt);
      render();
      return;
    }
    if (raw === 0) {
      windowStart = 0;
      n = 0;
      work = 0;
    }
    const t0 = performance.now();
    sim(dt);
    render();
    work += performance.now() - t0;
    n++;
    if (!windowStart) windowStart = now;
    if (now - windowStart >= 1000) {
      w.__labFps = { fps: (n * 1000) / (now - windowStart), frameMs: work / n, frames: n, dpr };
      n = 0;
      work = 0;
      windowStart = now;
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  room.notepad.draw(0);
  // Shaders compile in parallel first (KHR_parallel_shader_compile): no long task on the first frame.
  let dead = false;
  const begin = () => {
    if (dead) return;
    dirty = true;
    loop = frameLoop(
      { name: "play/night-desk", host, heavy: true, adaptive: still ? undefined : { onScale } },
      frame,
    );
  };
  // The room draws into the ink pass's target (its programs differ from the screen's), the pass to the screen.
  renderer.setRenderTarget(rt);
  const room1 = renderer.compileAsync(scene, camera);
  renderer.setRenderTarget(null);
  Promise.all([room1, renderer.compileAsync(post, postCam)]).then(begin, begin);
  if (still) {
    host.dataset.ready = "true";
    requestAnimationFrame(() => o.onReady?.());
  }

  return {
    activate,
    back: () => setFocus(null),
    timeLapse,
    destroy: () => {
      dead = true;
      loop?.stop();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      window.removeEventListener("keydown", key);
      sound.dispose();
      disposeRoom(scene);
      rt.depthTexture?.dispose();
      rt.dispose();
      tri.dispose();
      ink.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      delete w.__labFps;
    },
  };
}
