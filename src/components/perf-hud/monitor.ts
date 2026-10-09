/**
 * Field monitor behind the ?perf=1 HUD. Loaded only when the HUD is on: it runs its own rAF to time
 * frames, observes long tasks (or, where the browser has no long-task timing, counts frames over
 * 50 ms), counts page rAF requests, and notes which canvases drew recently by wrapping the WebGL and
 * 2D draw calls. `stop()` restores every patched method.
 */

export type DeviceClass = "phone" | "tablet" | "desktop";

/** What the frame governor (perf-gpu) publishes; every field optional. */
export type Governor = { mode?: string; deviceClass?: string; fpsCap?: number; scale?: number; active?: number };

export type Sample = {
  fps: number;
  p95: number | null;
  longPerMin: number;
  longKind: "tasks" | "frames";
  rafPerSec: number;
  animations: number;
  animationsOnScreen: number;
  canvasesDrawing: number;
  deviceClass: string;
  dpr: number;
  governor: Governor | null;
};

/** Nearest-rank percentile of an ascending array. */
export function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

/** Coarse pointer and a short side under 600 CSS px is a phone; coarse and larger, a tablet. */
export function deviceClass(coarse: boolean, shortSide: number): DeviceClass {
  if (!coarse) return "desktop";
  return shortSide < 600 ? "phone" : "tablet";
}

const FRAME_WINDOW = 5_000;
const LONG_WINDOW = 60_000;
const GL_DRAWS = [
  "drawArrays",
  "drawElements",
  "drawArraysInstanced",
  "drawElementsInstanced",
  "drawRangeElements",
  "clear",
];
const PAINTS_2D = ["clearRect", "fillRect", "strokeRect", "drawImage", "fill", "stroke", "fillText", "putImageData"];

type Patched = { proto: Record<string, unknown>; name: string; original: unknown };

export function startMonitor() {
  const frames: { t: number; d: number }[] = [];
  const longs: number[] = [];
  const drawnAt = new Map<HTMLCanvasElement, number>();
  const patched: Patched[] = [];
  let rafCalls = 0;
  let rafSince = performance.now();
  let last: number | null = null;
  let frameId = 0;
  let running = true;
  let observer: PerformanceObserver | null = null;
  const longTaskTiming =
    typeof PerformanceObserver !== "undefined" && !!PerformanceObserver.supportedEntryTypes?.includes("longtask");

  const nativeRaf = window.requestAnimationFrame;
  const tick = (ts: number) => {
    if (!running) return;
    if (last !== null) {
      const d = ts - last;
      // A hidden tab pauses rAF: the first frame back is a gap, not a slow frame.
      if (d < 1000) {
        frames.push({ t: ts, d });
        if (!longTaskTiming && d > 50) longs.push(ts);
      }
    }
    last = ts;
    while (frames.length && frames[0].t < ts - FRAME_WINDOW) frames.shift();
    frameId = nativeRaf.call(window, tick);
  };

  if (longTaskTiming) {
    observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longs.push(e.startTime);
    });
    observer.observe({ type: "longtask" });
  }

  const patch = (proto: object | undefined, names: string[], wrap: (f: (...a: unknown[]) => unknown) => unknown) => {
    if (!proto) return;
    const p = proto as Record<string, unknown>;
    for (const name of names) {
      const original = p[name];
      if (typeof original !== "function") continue;
      patched.push({ proto: p, name, original });
      p[name] = wrap(original as (...a: unknown[]) => unknown);
    }
  };
  const markDraw = (f: (...a: unknown[]) => unknown) =>
    function (this: { canvas?: unknown }, ...args: unknown[]) {
      if (this.canvas instanceof HTMLCanvasElement) drawnAt.set(this.canvas, performance.now());
      return f.apply(this, args);
    };
  patch(window.WebGLRenderingContext?.prototype, GL_DRAWS, markDraw);
  patch(window.WebGL2RenderingContext?.prototype, GL_DRAWS, markDraw);
  patch(window.CanvasRenderingContext2D?.prototype, PAINTS_2D, markDraw);
  patch(
    window,
    ["requestAnimationFrame"],
    (f) =>
      function (this: unknown, cb: FrameRequestCallback) {
        rafCalls++;
        return f.call(window, cb);
      },
  );

  frameId = nativeRaf.call(window, tick);
  const coarse = matchMedia("(pointer: coarse)").matches;

  return {
    sample(): Sample {
      const now = performance.now();
      const lastSecond = frames.filter((f) => f.t >= now - 1000).length;
      const sorted = frames.map((f) => f.d).sort((a, b) => a - b);
      while (longs.length && longs[0] < now - LONG_WINDOW) longs.shift();
      let drawing = 0;
      for (const [canvas, at] of drawnAt) {
        if (!canvas.isConnected) drawnAt.delete(canvas);
        else if (at >= now - 1000) drawing++;
      }
      const anims = document.getAnimations().filter((a) => a.playState === "running");
      const onScreen = anims.filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        if (!target?.isConnected) return false;
        const r = target.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      }).length;
      const rafPerSec = (rafCalls * 1000) / Math.max(1, now - rafSince);
      rafCalls = 0;
      rafSince = now;
      const governor = (window as Window & { __kzGovernor?: Governor }).__kzGovernor ?? null;
      return {
        fps: lastSecond,
        p95: percentile(sorted, 95),
        longPerMin: longs.length,
        longKind: longTaskTiming ? "tasks" : "frames",
        rafPerSec: Math.round(rafPerSec),
        animations: anims.length,
        animationsOnScreen: onScreen,
        canvasesDrawing: drawing,
        deviceClass: governor?.deviceClass ?? deviceClass(coarse, Math.min(screen.width, screen.height)),
        dpr: Math.round(devicePixelRatio * 100) / 100,
        governor: governor ? { ...governor } : null,
      };
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      for (const { proto, name, original } of patched.reverse()) proto[name] = original;
      patched.length = 0;
    },
  };
}
