import { FrameCap } from "@/fx/engine/frame-cap";
import { isIdle, onIdleChange } from "./governor";

/*
 * The frame governor: one scheduler for every canvas, WebGL and rAF-driven view on the site.
 *  - Device class (phone, tablet, desktop) and its budget: the frame rate heavy scenes are paced
 *    to (60 on phones and tablets, every other vsync on a 120 Hz screen; 120 on desktops) and the
 *    device-pixel-ratio cap.
 *  - Visibility: a loop runs only while its host is on screen and the tab is visible.
 *  - Render on demand: a frame callback reports "settled" (return false) and the loop sleeps until
 *    wake() (input inside the host, or the scene's own event), or asks for its next frame after a
 *    delay (return a number of ms), for scenes whose only motion is a slow re-seed.
 *  - Idle: after 45 s without input (pointer, touch, key, wheel, scroll) every loop drops to light
 *    mode, half its frame rate; any input restores full mode on the next frame.
 *  - Adaptive resolution: a loop that opts in gets a resolution scale from its frame-time EMA,
 *    lowered while frames miss the pace and raised again once they hold it.
 * Debug: window.__kzFrames (device class, mode, cap, and each loop's state and frames drawn in the
 * last second), read by the ?perf HUD and the e2e checks.
 */

export type DeviceClass = "phone" | "tablet" | "desktop";
export type Mode = "full" | "light";

export type Device = {
  cls: DeviceClass;
  /** Frame rate heavy scenes are paced to in full mode. */
  heavyFps: number;
  /** Device-pixel-ratio cap for canvases. */
  dpr: number;
};

/** No input for this long: light mode. */
export { IDLE_MS } from "./governor";
/** Light mode runs a loop at this share of its full-mode rate. */
const LIGHT_SHARE = 0.5;
/** Display-rate loops (not heavy) in light mode. */
const LIGHT_DISPLAY_FPS = 30;

let device: Device | null = null;

/** The device class and its budget (measured once per page). */
export function deviceProfile(): Device {
  if (device) return device;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
  const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
  const short = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  const cls: DeviceClass = coarse ? (short >= 600 ? "tablet" : "phone") : "desktop";
  // A battery device, or a small machine: 60. A desktop: up to 120 (even on a 144/240 Hz screen).
  const small = cores <= 4 || memory <= 4;
  device = { cls, heavyFps: cls !== "desktop" || small ? 60 : 120, dpr: 2 };
  return device;
}

/** Canvas pixel ratio: the device's, capped for its class (and by the caller's own cap). */
export function canvasDpr(max = Infinity): number {
  return Math.min(devicePixelRatio || 1, deviceProfile().dpr, max);
}

/* ---------------------------------- idle ---------------------------------- */

let mode: Mode = "full";
let subscribed = false;
const modeSubs = new Set<(m: Mode) => void>();

function setMode(m: Mode) {
  if (m === mode) return;
  mode = m;
  publish();
  for (const cb of [...modeSubs]) cb(m);
}

// The idle signal is the motion governor's (src/motion/governor.ts), so CSS loops and canvas
// scenes go light, and come back, on the same input at the same moment.
function listen() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  mode = isIdle() ? "light" : "full";
  onIdleChange((idle) => setMode(idle ? "light" : "full"));
}

/** Full while the visitor is around; light after IDLE_MS without input. */
export function idleMode(): Mode {
  listen();
  return mode;
}

/** Called on every mode change. Returns the unsubscribe function. */
export function onModeChange(cb: (m: Mode) => void): () => void {
  listen();
  modeSubs.add(cb);
  return () => modeSubs.delete(cb);
}

/* -------------------------------- visibility -------------------------------- */

const watchers = new Map<Element, Set<(on: boolean) => void>>();
let io: IntersectionObserver | null = null;

function watch(el: Element, cb: (on: boolean) => void): () => void {
  io ??= new IntersectionObserver((entries) => {
    for (const e of entries) for (const fn of watchers.get(e.target) ?? []) fn(e.isIntersecting);
  });
  let set = watchers.get(el);
  if (!set) {
    set = new Set();
    watchers.set(el, set);
    io.observe(el);
  }
  set.add(cb);
  return () => {
    set.delete(cb);
    if (set.size === 0) {
      watchers.delete(el);
      io?.unobserve(el);
    }
  };
}

/* ---------------------------------- loops ---------------------------------- */

export type Tick = {
  /** rAF timestamp, ms. */
  now: number;
  /** Seconds since the previous drawn frame, clamped to 1/20 (a stall never explodes a simulation). */
  dt: number;
  /** Raw ms since the previous drawn frame (0 on the first frame after a start or a wake). */
  raw: number;
  mode: Mode;
  /** Resolution scale from the frame-time EMA (1 unless the loop opted into `adaptive`). */
  scale: number;
};

/**
 * What a frame returns: nothing (or true) keeps drawing at the pace; false = settled, the loop
 * sleeps until wake(); a number = sleep that many ms, then draw one frame (a slow re-seed);
 * `{ fps }` = only a slow ambient drift is left: keep drawing, at most at that rate, until a frame
 * returns anything else (light mode halves it too).
 */
export type After = void | boolean | number | { fps: number };

/** The rest rate for a slow ambient drift (the light still slides, nothing reacts). */
export const DRIFT = { fps: 30 } as const;

export type LoopOptions = {
  /** Debug name (window.__kzFrames). */
  name: string;
  /** The loop runs only while this element is on screen. */
  host: Element;
  /** Heavy scene: paced to the device's heavy rate (60 on phones). Otherwise display rate. */
  heavy?: boolean;
  /** An explicit cap (fps) in full mode, below the class pace. */
  fps?: number;
  /** Input inside this element wakes a settled loop (default: host; null: only explicit wake()). */
  wakeOn?: Element | null;
  /** Opt into adaptive resolution: called with the new scale (min..1) when it changes. */
  adaptive?: { onScale: (scale: number) => void; min?: number };
};

export type Loop = {
  /** Draw again (a settled scene that changed). Safe to call any time, any number of times. */
  wake: () => void;
  stop: () => void;
  readonly scale: number;
};

type Entry = { state: "running" | "settled" | "paused"; fps: number; drawn: number; cap: number; scale: number };
type Debug = { cls: DeviceClass; mode: Mode; cap: number; loops: Record<string, Entry> };
/** The ?perf HUD's view (perf-lab): the global mode, class, cap, lowest scale, loops drawing. */
type HudView = {
  mode: Mode;
  deviceClass: DeviceClass;
  fpsCap: number;
  scale: number;
  active: number;
};
declare global {
  interface Window {
    __kzFrames?: Debug;
    __kzGovernor?: HudView;
  }
}
const entries = new Map<string, () => Entry>();

function publish() {
  if (typeof window === "undefined") return;
  const d = deviceProfile();
  const dbg: Debug = window.__kzFrames ?? { cls: d.cls, mode, cap: d.heavyFps, loops: {} };
  dbg.cls = d.cls;
  dbg.mode = mode;
  dbg.cap = mode === "light" ? Math.round(d.heavyFps * LIGHT_SHARE) : d.heavyFps;
  window.__kzFrames = dbg;
  if (!window.__kzGovernor) {
    const loops = () => Object.values(window.__kzFrames?.loops ?? {});
    window.__kzGovernor = {
      get mode() {
        return mode;
      },
      get deviceClass() {
        return deviceProfile().cls;
      },
      get fpsCap() {
        return window.__kzFrames?.cap ?? 0;
      },
      get scale() {
        return loops().reduce((m, l) => (l.state === "running" ? Math.min(m, l.scale) : m), 1);
      },
      get active() {
        return loops().filter((l) => l.state === "running").length;
      },
    };
  }
}

/** Live loop entries, computed on read (nobody pays for the debug surface unless it is read). */
function register(name: string, read: () => Entry) {
  publish();
  entries.set(name, read);
  const loops = window.__kzFrames!.loops;
  Object.defineProperty(loops, name, { get: read, enumerable: true, configurable: true });
  return () => {
    if (entries.get(name) !== read) return;
    entries.delete(name);
    delete loops[name];
  };
}

const AD_WINDOW = 30;
/** Every live loop by host (wakeWithin). */
const live = new Set<{ host: Element; wake: () => void }>();

/** Run `frame` on the governor's schedule. */
export function frameLoop(opts: LoopOptions, frame: (tick: Tick) => After): Loop {
  const dev = deviceProfile();
  const base = Math.min(opts.fps ?? Infinity, opts.heavy ? dev.heavyFps : Infinity);
  // A frame's own rest rate (a slow drift), until a frame asks for full pace again.
  let rest = Infinity;
  const capFor = (m: Mode) => {
    const b = Math.min(base, rest);
    return m === "full" ? b : Number.isFinite(b) ? Math.round(b * LIGHT_SHARE) : LIGHT_DISPLAY_FPS;
  };
  const cap = new FrameCap(capFor(idleMode()));
  let raf = 0;
  let timer = 0;
  let inView = true;
  let asleep = false;
  let stopped = false;
  let last = 0;
  // Debug: draw times of the last second.
  const times: number[] = [];
  let drawn = 0;
  // Adaptive resolution.
  const minScale = opts.adaptive?.min ?? 0.6;
  let scale = 1;
  let ema = 0;
  let winN = 0;
  let good = 0;
  let cool = 0;
  // The display's frame period: the shortest gap between rAF callbacks lately (a 60 Hz screen
  // never shows a 120 cap's pace, and that is not a slow GPU).
  const gaps = new Float32Array(120);
  let gapI = 0;
  let prevCb = 0;

  const active = () => !stopped && inView && !asleep && !document.hidden;

  const adapt = (raw: number, now: number) => {
    if (!opts.adaptive || raw <= 0 || raw > 120) return;
    const c = capFor(mode);
    if (!Number.isFinite(c)) return;
    ema = ema ? ema * 0.9 + raw * 0.1 : raw;
    if (++winN < AD_WINDOW || now < cool) return;
    winN = 0;
    let vsync = Infinity;
    for (const g of gaps) if (g > 2 && g < vsync) vsync = g;
    // The pace a frame must hold: the cap, but never faster than the display, and only ever
    // defended down to 60 fps (resolution is not traded to chase 120).
    const target = Math.max(1000 / c, Number.isFinite(vsync) ? vsync : 0, 1000 / 60);
    if (ema > target * 1.3 && scale > minScale + 1e-3) {
      scale = Math.max(minScale, +(scale - 0.1).toFixed(2));
      good = 0;
      cool = now + 1000;
      ema = 0;
      opts.adaptive.onScale(scale);
    } else if (ema < target * 1.1) {
      if (++good >= 4 && scale < 1) {
        scale = Math.min(1, +(scale + 0.1).toFixed(2));
        good = 0;
        cool = now + 2500;
        ema = 0;
        opts.adaptive.onScale(scale);
      }
    } else good = 0;
  };

  const tick = (now: number) => {
    raf = 0;
    if (!active()) return;
    raf = requestAnimationFrame(tick);
    if (prevCb) gaps[gapI++ % gaps.length] = now - prevCb;
    prevCb = now;
    const raw = cap.accept(now);
    if (raw < 0) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    adapt(raw, now);
    const after = frame({ now, dt, raw, mode, scale });
    drawn++;
    times.push(now);
    while (times.length && now - times[0] > 1000) times.shift();
    const want = typeof after === "object" ? after.fps : Infinity;
    if (want !== rest) {
      rest = want;
      cap.fps = capFor(mode);
    }
    if (after === false) sleep(-1);
    else if (typeof after === "number") sleep(after);
  };

  const sleep = (ms: number) => {
    asleep = true;
    cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(timer);
    timer = 0;
    if (ms >= 0) {
      timer = window.setTimeout(() => {
        timer = 0;
        if (!asleep) return;
        asleep = false;
        sync(false);
      }, ms);
    } else last = 0;
  };

  const sync = (fresh: boolean) => {
    if (active()) {
      if (raf) return;
      if (fresh) {
        last = 0;
        prevCb = 0;
        cap.reset();
      }
      raf = requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const wake = (force = false) => {
    if (stopped) return;
    // Forced: the coming frame draws whatever the pace (a read-back needs this frame's drawing).
    if (force) cap.reset();
    if (rest !== Infinity) {
      // Input: react at full pace from the next frame (the scene asks for its rest rate again).
      rest = Infinity;
      cap.fps = capFor(mode);
    }
    if (asleep) {
      asleep = false;
      clearTimeout(timer);
      timer = 0;
      // The first frame after a wake is drawn at once, whatever the pace.
      cap.reset();
    }
    sync(false);
  };

  const unwatch = watch(opts.host, (on) => {
    if (on === inView) return;
    inView = on;
    sync(true);
  });
  const onVis = () => sync(true);
  document.addEventListener("visibilitychange", onVis);
  const unmode = onModeChange((m) => {
    cap.fps = capFor(m);
    ema = 0;
    winN = 0;
    good = 0;
  });
  const wakeEl = opts.wakeOn === undefined ? opts.host : opts.wakeOn;
  const WAKE = ["pointerdown", "pointermove", "touchstart", "keydown", "wheel"] as const;
  const onWake = () => wake();
  if (wakeEl) for (const t of WAKE) wakeEl.addEventListener(t, onWake, { passive: true });
  const unregister = register(opts.name, () => ({
    state: stopped || !inView || document.hidden ? "paused" : asleep ? "settled" : "running",
    fps: times.filter((t) => performance.now() - t <= 1000).length,
    drawn,
    cap: cap.fps,
    scale,
  }));

  const handle = { host: opts.host, wake: () => wake(true) };
  live.add(handle);
  sync(true);

  return {
    wake: () => wake(),
    stop: () => {
      if (stopped) return;
      stopped = true;
      live.delete(handle);
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(timer);
      unwatch();
      unmode();
      unregister();
      document.removeEventListener("visibilitychange", onVis);
      if (wakeEl) for (const t of WAKE) wakeEl.removeEventListener(t, onWake);
    },
    get scale() {
      return scale;
    },
  };
}

/**
 * Make every loop whose host is inside `root` draw in the coming frame, settled or between paced
 * frames (e.g. before reading a scene's canvas back: a WebGL drawing buffer is only intact in the
 * frame it was drawn in). Call it before requesting the frame that reads.
 */
export function wakeWithin(root: Element): void {
  for (const l of live) if (root.contains(l.host)) l.wake();
}
