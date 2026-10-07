import { WORDMARK_EM } from "@/fx/baked/geometry";
import { hasFloatTargets, isSoftwareRenderer, rendererOf } from "@/fx/engine/capability";
import { createDesk, DRAW_S, type Desk } from "./desk";
import { trackPointer } from "./kit/pointer";
import { stageStore } from "./store";
import type { Geom, Gpu, GpuScene, GpuSceneId, Rgb, Role, SceneFactory, SceneId } from "./types";

/*
 * The hero sequence: one stage, five scenes, forever.
 *   desk (ink, SVG) -> gold dust -> gold metal -> gold ink in water -> keycaps -> desk ...
 * Every hand-over is a metamorphosis through the gold KINZEN, never a cut: the ink strokes burst
 * into dust, the dust condenses into metal, the metal melts into ink, the ink settles into keys,
 * the keys sink while the desk is drawn again. During a hand-over both scenes run: the incoming
 * one draws first, the outgoing one over it.
 * One canvas and one WebGL2 context serve every GPU scene: the raw-GL scenes (dust, water) use it
 * directly, the three.js scenes (metal, keys) through one renderer wrapping it. Each scene is
 * loaded and built one step ahead and disposed when it is two steps behind.
 * The clock runs only while the hero is on screen, the tab is visible and the visitor has not
 * paused it; everything resumes exactly where it was. The first seconds of each GPU scene are
 * measured: below about 50 fps the canvas resolution steps down, and a heavy scene (water, keys)
 * that still cannot hold it is skipped from then on (remembered for the session).
 */

const DUR: Record<SceneId, number> = { desk: DRAW_S + 6, particles: 12, gold3d: 12, fluid: 12, keycaps: 12 };
const XF: Record<string, number> = {
  "desk>particles": 1.6,
  "particles>gold3d": 2.2,
  "gold3d>fluid": 2.6,
  "fluid>keycaps": 2.6,
  "keycaps>desk": 2.2,
};
const xf = (a: SceneId, b: SceneId) => XF[`${a}>${b}`] ?? 2;
const ORDER: SceneId[] = ["desk", "particles", "gold3d", "fluid", "keycaps"];
const HEAVY = new Set<SceneId>(["fluid", "keycaps"]);
const LOAD: Record<GpuSceneId, () => Promise<SceneFactory>> = {
  particles: () => import("./scenes/particles").then((m) => m.createParticles),
  gold3d: () => import("./scenes/gold3d").then((m) => m.createGold3d),
  fluid: () => import("./scenes/fluid").then((m) => m.createFluid),
  keycaps: () => import("./scenes/keycaps").then((m) => m.createKeycaps),
};

/** The frame rate a scene must hold (median frame time over its measuring window). */
const MIN_FPS = 50;
/** Measuring window, ms after a scene has the stage to itself. */
const MEASURE = [900, 3200] as const;
const MIN_QUALITY = 0.5;

const SKIP_KEY = "kz-hero-skip";
const QUALITY_KEY = "kz-hero-quality";
const isGpu = (s: SceneId | null): s is GpuSceneId => !!s && s !== "desk";
const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);

function session<T>(key: string, fallback: T): T {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: this visit still adapts, the next one measures again.
  }
}

/** A token of the dark scene as an sRGB 0..1 triple (whatever colour syntax the CSS uses). */
function token(host: HTMLElement, name: string): Rgb {
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;visibility:hidden;color:var(${name})`;
  host.appendChild(el);
  const css = getComputedStyle(el).color;
  el.remove();
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [0, 0, 0];
  g.fillStyle = css;
  g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

export type StageEls = {
  hero: HTMLElement;
  /** The positioned box the canvas fills (top of the hero, the wordmark band). */
  stage: HTMLElement;
  host: HTMLElement;
  svg: SVGSVGElement;
  wordmark: HTMLElement;
};

type Debug = {
  scene: SceneId;
  next: SceneId | null;
  t: number;
  order: SceneId[];
  history: SceneId[];
  /** Hand-over log: "ms begin|swap scene". */
  log: string[];
  quality: Partial<Record<GpuSceneId, number>>;
  fps: Partial<Record<string, number>>;
  skipped: string[];
  renderer: string;
  gpu: boolean;
  running: boolean;
  /** The wordmark ink box the GPU scenes draw into (stage layout px). */
  slot: { x: number; y: number; w: number; h: number };
};

export function startSequence(els: StageEls): () => void {
  const { hero, stage, host, svg, wordmark } = els;
  const params = new URLSearchParams(location.search);
  const fx = params.get("fx");
  // Debug clock speed (tests and filmstrips); 1 for everyone else.
  const speed = Math.min(20, Math.max(0.25, Number(params.get("fx-speed")) || 1));
  const phone = matchMedia("(pointer: coarse)").matches || innerWidth < 768;
  const skipped = new Set<string>(session<string[]>(SKIP_KEY, []));
  const quality = session<Partial<Record<GpuSceneId, number>>>(QUALITY_KEY, {});

  let dead = false;
  let desk: Desk | null = null;
  let gpu: Gpu | null = null;
  let order: SceneId[] = ["desk"];
  const live = new Map<GpuSceneId, { ready: Promise<GpuScene | null>; scene: GpuScene | null }>();

  let cur: SceneId = "desk";
  let t = 0;
  let next: SceneId | null = null;
  let nt = 0;
  let soloAt = 0;
  let samples: number[] = [];
  let judged = 0;
  let canvasOn = false;

  const debug: Debug = {
    scene: cur,
    next,
    t: 0,
    order,
    history: ["desk"],
    log: [],
    quality,
    fps: {},
    skipped: [...skipped],
    renderer: "",
    gpu: false,
    running: false,
    slot: { x: 0, y: 0, w: 0, h: 0 },
  };
  (window as Window & { __kzStage?: Debug }).__kzStage = debug;

  /** The scene after (or before) `s` in play order; works for a scene just dropped from it too. */
  const step = (s: SceneId, dir: 1 | -1) => {
    const i = ORDER.indexOf(s);
    for (let j = 1; j <= ORDER.length; j++) {
      const c = ORDER[(i + dir * j + ORDER.length * 2) % ORDER.length];
      if (order.includes(c)) return c;
    }
    return "desk";
  };
  const nextOf = (s: SceneId) => step(s, 1);
  const prevOf = (s: SceneId) => step(s, -1);
  const setOrder = (o: SceneId[]) => {
    order = o;
    debug.order = o;
    stageStore.set({ scenes: o });
  };

  // ---------- geometry ----------
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const geom: Geom = { cssW: 1, cssH: 1, pxW: 1, pxH: 1, k: 1, slot: { x: 0, y: 0, w: 1, h: 1 }, phone };
  const measure = () => {
    const cssW = stage.offsetWidth || 1;
    const cssH = stage.offsetHeight || 1;
    const sr = stage.getBoundingClientRect();
    const scale = sr.width / cssW || 1;
    const wr = wordmark.getBoundingClientRect();
    const cs = getComputedStyle(wordmark);
    const fs = parseFloat(cs.fontSize);
    const left = (wr.left - sr.left) / scale + parseFloat(cs.paddingLeft);
    const top = (wr.top - sr.top) / scale + parseFloat(cs.paddingTop);
    const slot = {
      x: left + WORDMARK_EM.x0 * fs,
      y: top + WORDMARK_EM.y0 * fs,
      w: WORDMARK_EM.w * fs,
      h: WORDMARK_EM.h * fs,
    };
    const changed =
      Math.abs(cssW - geom.cssW) > 0.5 ||
      Math.abs(cssH - geom.cssH) > 0.5 ||
      Math.abs(slot.x - geom.slot.x) > 0.5 ||
      Math.abs(slot.y - geom.slot.y) > 0.5 ||
      Math.abs(slot.w - geom.slot.w) > 0.5;
    Object.assign(geom, { cssW, cssH, slot });
    debug.slot = { ...slot };
    return changed;
  };
  /** Canvas pixels for the scenes on stage: the lower quality of the two during a hand-over. */
  const fitCanvas = () => {
    if (!gpu) return;
    const q = Math.min(isGpu(cur) ? (quality[cur] ?? 1) : 1, isGpu(next) ? (quality[next] ?? 1) : 1);
    let k = dpr * q;
    const budget = phone ? 1_600_000 : 4_200_000;
    if (geom.cssW * geom.cssH * k * k > budget) k = Math.sqrt(budget / (geom.cssW * geom.cssH));
    const pxW = Math.max(1, Math.floor(geom.cssW * k));
    const pxH = Math.max(1, Math.floor(geom.cssH * k));
    if (pxW === geom.pxW && pxH === geom.pxH && gpu.canvas.width === pxW) return;
    Object.assign(geom, { k, pxW, pxH });
    if (gpu.three) {
      gpu.three.setPixelRatio(k);
      gpu.three.setSize(geom.cssW, geom.cssH, false);
    }
    gpu.canvas.width = pxW;
    gpu.canvas.height = pxH;
  };
  measure();

  // ---------- scenes ----------
  const ensure = (id: SceneId) => {
    if (!isGpu(id) || !gpu || live.has(id)) return;
    const g = gpu;
    const entry: { ready: Promise<GpuScene | null>; scene: GpuScene | null } = {
      ready: Promise.resolve(null),
      scene: null,
    };
    entry.ready = LOAD[id]()
      .then((make) => make(g, geom))
      .then((s) => {
        if (dead || gpu !== g || live.get(id) !== entry) {
          s.dispose();
          return null;
        }
        entry.scene = s;
        return s;
      })
      .catch((err: unknown) => {
        // A scene that cannot load or build is dropped from the loop; the others carry on.
        console.warn(`hero: ${id} unavailable`, err);
        live.delete(id);
        skipped.add(id);
        setOrder(order.filter((s) => s !== id));
        return null;
      });
    live.set(id, entry);
  };
  const ready = (id: SceneId) => !isGpu(id) || !!live.get(id)?.scene;
  /** Keep the scene on stage and its neighbours; free the rest. */
  const prune = () => {
    const keep = new Set<SceneId>([cur, nextOf(cur), prevOf(cur)]);
    if (next) keep.add(next);
    for (const [id, entry] of live) {
      if (keep.has(id)) continue;
      entry.scene?.dispose();
      live.delete(id);
    }
  };

  const publish = () => {
    debug.scene = cur;
    debug.next = next;
    hero.dataset.stageScene = cur;
    if (next) hero.dataset.stageNext = next;
    else delete hero.dataset.stageNext;
    stageStore.set({ index: Math.max(0, order.indexOf(cur)) });
  };

  const note = (what: string) => {
    debug.log.push(`${Math.round(performance.now())} ${what}`);
    if (debug.log.length > 60) debug.log.shift();
  };
  const begin = (id: SceneId, from: SceneId) => {
    next = id;
    nt = 0;
    note(`begin ${id}`);
    if (id === "desk") {
      svg.style.opacity = "1";
    } else {
      live.get(id)?.scene?.enter(from);
    }
    fitCanvas();
    publish();
  };
  const swap = () => {
    if (!next) return;
    cur = next;
    t = nt;
    next = null;
    note(`swap ${cur}`);
    soloAt = performance.now();
    samples = [];
    judged = 0;
    primed = false;
    debug.history.push(cur);
    if (debug.history.length > 40) debug.history.shift();
    fitCanvas();
    ensure(nextOf(cur));
    prune();
    publish();
  };

  /** During the desk's hold, hand its ink to the next scene ahead of time (an idle task, not a frame). */
  let primed = false;
  const primeNext = () => {
    if (primed || cur !== "desk" || next || !desk || t < DRAW_S + 0.4) return;
    const s = live.get(nextOf(cur) as GpuSceneId)?.scene;
    if (!s?.prime) return;
    primed = true;
    const d = desk;
    // Two tasks: reading the drawing's ink, then sorting it for the hand-over.
    setTimeout(() => {
      if (dead || cur !== "desk") return;
      const pts = d.points(stage, 60_000);
      setTimeout(() => !dead && cur === "desk" && s.prime?.(pts), 0);
    }, 0);
  };

  /** Advance the clock by d seconds. */
  const advance = (d: number) => {
    t += d;
    primeNext();
    const nx = nextOf(cur);
    if (!next && nx !== cur) {
      const x = xf(cur, nx);
      if (t >= DUR[cur] - x) {
        if (ready(nx)) begin(nx, cur);
        else {
          if (!debug.log.at(-1)?.endsWith(`wait ${nx}`)) note(`wait ${nx}`);
          // Not built yet: hold this scene a little longer (it keeps living) and ask again.
          ensure(nx);
          t = Math.min(t, DUR[cur] - x);
        }
      }
    }
    if (next) {
      nt += d;
      if (nt >= xf(cur, next)) swap();
    }
  };

  // ---------- frame-rate watch ----------
  const judge = (raw: number) => {
    if (!isGpu(cur) || next || judged >= 3) return;
    const since = performance.now() - soloAt;
    if (since < MEASURE[0]) return;
    samples.push(raw);
    if (since < MEASURE[1]) return;
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1] ?? 16;
    const fps = 1000 / median;
    debug.fps[cur] = Math.round(fps);
    judged++;
    samples = [];
    soloAt = performance.now() - MEASURE[0];
    if (fps >= MIN_FPS - 2) {
      judged = 3;
      return;
    }
    const q = quality[cur] ?? 1;
    if (q > MIN_QUALITY + 0.01) {
      quality[cur] = Math.max(MIN_QUALITY, q * 0.72);
      remember(QUALITY_KEY, quality);
      fitCanvas();
      return;
    }
    judged = 3;
    if (HEAVY.has(cur)) {
      // Too slow even at the lowest resolution: leave now, and skip it from here on.
      skipped.add(cur);
      remember(SKIP_KEY, [...skipped]);
      debug.skipped = [...skipped];
      setOrder(order.filter((s) => s !== cur));
      const after = nextOf(cur);
      ensure(after);
      t = Math.max(t, DUR[cur] - xf(cur, after));
    }
  };

  // ---------- drawing ----------
  const showCanvas = (on: boolean) => {
    if (!gpu || on === canvasOn) return;
    canvasOn = on;
    if (on) stage.dataset.show = "";
    else delete stage.dataset.show;
  };
  const clear = () => {
    if (!gpu) return;
    const { gl } = gpu;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, geom.pxW, geom.pxH);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gpu.three?.resetState();
  };

  const draw = (dt: number) => {
    ptr.update(dt);
    // The desk: drawing, holding, bursting into dust, or being drawn again under the sinking keys.
    if (desk) {
      if (cur === "desk") {
        desk.set(t);
        svg.style.opacity = next ? String(1 - smooth(ramp(nt, 0.05, 0.32))) : "1";
      } else if (next === "desk") {
        desk.set(nt);
      } else {
        svg.style.opacity = "0";
      }
    }
    if (!gpu) return;
    const out = isGpu(cur) ? live.get(cur)?.scene : null;
    const inn = isGpu(next) ? live.get(next)?.scene : null;
    if (!out && !inn) {
      if (canvasOn) {
        clear();
        showCanvas(false);
      }
      return;
    }
    clear();
    const x = next ? xf(cur, next) : 1;
    const p = next ? Math.min(1, nt / x) : 0;
    if (inn && next) inn.frame({ t: nt, dt, role: { mode: "in", p, from: cur }, ptr: ptr.state, geom });
    if (out) {
      const role: Role = next ? { mode: "out", p, to: next } : { mode: "solo" };
      out.frame({ t, dt, role, ptr: ptr.state, geom });
    }
    gpu.gl.bindVertexArray(null);
    gpu.three?.resetState();
    showCanvas(true);
  };

  const ptr = trackPointer(hero, stage, (x, y) => {
    if (!running()) return;
    const s = isGpu(cur) ? live.get(cur)?.scene : null;
    s?.tap?.(x, y);
  });

  // ---------- loop ----------
  let raf = 0;
  let last = 0;
  let inView = true;
  const running = () => inView && !document.hidden && !stageStore.get().paused && !dead && !!desk;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const raw = last ? now - last : 1000 / 60;
    last = now;
    judge(raw);
    const d = Math.min(raw / 1000, 1 / 20) * speed;
    advance(d);
    debug.t = t;
    // Simulations step at most a twentieth of a second, whatever the debug clock speed.
    draw(Math.min(d, 1 / 20));
  };
  const sync = () => {
    const on = running();
    debug.running = on;
    if (on && !raf) {
      last = 0;
      soloAt = performance.now();
      samples = [];
      raf = requestAnimationFrame(tick);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([e]) => {
    inView = !!e?.isIntersecting;
    sync();
  });
  io.observe(stage);
  document.addEventListener("visibilitychange", sync);
  const unsub = stageStore.subscribe(sync);

  let pendingLayout = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pendingLayout);
    pendingLayout = requestAnimationFrame(() => {
      if (!measure()) return;
      fitCanvas();
      for (const entry of live.values()) entry.scene?.layout(geom);
    });
  });
  ro.observe(stage);
  ro.observe(wordmark);

  // ---------- GPU ----------
  const startGpu = () => {
    if (dead || fx === "desk") return;
    const canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
    });
    const renderer = gl ? rendererOf(gl) : "";
    debug.renderer = renderer;
    const forced = fx === "full";
    if (!gl || !hasFloatTargets(gl) || (isSoftwareRenderer(renderer) && !forced)) {
      // No GPU worth the name: the desk alone, drawn and held.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      return;
    }
    host.appendChild(canvas);
    gpu = {
      gl,
      canvas,
      float32: !!gl.getExtension("EXT_color_buffer_float"),
      three: null,
      colors: { gold: token(hero, "--gold"), ground: token(hero, "--ground"), ink: token(hero, "--ink") },
    };
    debug.gpu = true;
    canvas.addEventListener("webglcontextlost", onLost);
    setOrder(ORDER.filter((s) => !skipped.has(s)));
    fitCanvas();
    ensure(nextOf(cur));
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    // Lost GPU: back to the desk alone (the scenes' GL objects died with the context).
    live.clear();
    gpu?.canvas.remove();
    gpu = null;
    debug.gpu = false;
    setOrder(["desk"]);
    if (cur !== "desk" || next) {
      cur = "desk";
      next = null;
      t = DRAW_S;
      svg.style.opacity = "1";
      publish();
    }
  };

  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const w = window as IdleWindow;
  let idle = 0;
  let timer = 0;

  void createDesk(svg).then((d) => {
    if (dead) {
      d.dispose();
      return;
    }
    desk = d;
    // The safety net already showed the finished drawing (a slow load): start from the hold.
    if (d.shown) t = DRAW_S;
    svg.style.opacity = "1";
    stageStore.set({ running: true, scenes: order, index: 0 });
    publish();
    sync();
    // The GPU comes in once the drawing is under way (after first paint, when the browser is idle).
    timer = window.setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(startGpu, { timeout: 2000 });
      else startGpu();
    }, 1200);
  });

  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(pendingLayout);
    clearTimeout(timer);
    if (idle) w.cancelIdleCallback?.(idle);
    io.disconnect();
    ro.disconnect();
    unsub();
    document.removeEventListener("visibilitychange", sync);
    ptr.stop();
    for (const entry of live.values()) entry.scene?.dispose();
    live.clear();
    if (gpu) {
      gpu.canvas.removeEventListener("webglcontextlost", onLost);
      gpu.three?.dispose();
      gpu.gl.getExtension("WEBGL_lose_context")?.loseContext();
      gpu.canvas.remove();
      gpu = null;
    }
    desk?.dispose();
    svg.style.removeProperty("opacity");
    delete hero.dataset.stageScene;
    delete hero.dataset.stageNext;
    delete stage.dataset.show;
    stageStore.set({ running: false });
  };
}
