import { isSoftwareRenderer } from "@/fx/engine/capability";

/**
 * Runtime helpers shared by the lab-hero-a demos: an rAF loop that pauses off screen and in a
 * hidden tab and reports its own frame rate, the pointer as seen by the banner, and the
 * device profile each demo sizes itself by.
 */

export type Profile = {
  /** prefers-reduced-motion: draw one composed frame, no loop. */
  still: boolean;
  /** Coarse pointer or a narrow screen: the cheaper settings. */
  phone: boolean;
  dpr: number;
};

/**
 * A software renderer (SwiftShader, llvmpipe: no usable GPU) needs seconds to build a scene and
 * draws a few frames a second at best: a scene that finds one gives its context back at once and
 * the section shows that scene's picture instead (same rule as the hero, which turns off).
 */
export function softwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return isSoftwareRenderer(String(r ?? ""));
}

export function readProfile(maxDpr = 2): Profile {
  const phone = matchMedia("(pointer: coarse)").matches || innerWidth < 768;
  return {
    still: matchMedia("(prefers-reduced-motion: reduce)").matches,
    phone,
    dpr: Math.min(devicePixelRatio || 1, phone ? Math.min(maxDpr, 2) : maxDpr),
  };
}

type Probe = { fps: number; frameMs: number; frames: number };
declare global {
  interface Window {
    /** Rolling one-second frame stats of the running lab demo (read by the QA probe). */
    __labFps?: Probe;
  }
}

/**
 * Calls `frame(t, dt)` every animation frame while `host` is on screen and the tab is visible.
 * dt is in seconds, clamped to 1/20 so a stall never explodes a simulation. Returns a stop
 * function that cancels everything it started.
 */
export function runLoop(host: Element, frame: (t: number, dt: number) => void): () => void {
  let raf = 0;
  let visible = true;
  let last = 0;
  let acc = 0;
  let work = 0;
  let n = 0;
  let windowStart = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    const t0 = performance.now();
    frame(now / 1000, dt);
    work += performance.now() - t0;
    n++;
    if (!windowStart) windowStart = now;
    acc = now - windowStart;
    if (acc >= 1000) {
      window.__labFps = { fps: (n * 1000) / acc, frameMs: work / n, frames: n };
      n = 0;
      work = 0;
      windowStart = now;
    }
  };
  const sync = () => {
    const on = visible && !document.hidden;
    if (on && !raf) {
      last = 0;
      windowStart = 0;
      n = 0;
      work = 0;
      raf = requestAnimationFrame(tick);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    sync();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    cancelAnimationFrame(raf);
    raf = 0;
    delete window.__labFps;
  };
}

export type PointerState = {
  /** CSS px relative to the target element's top-left. */
  x: number;
  y: number;
  /** Smoothed velocity, CSS px per second. */
  vx: number;
  vy: number;
  /** 0..1, eases in while the pointer is over the element and out after it leaves or idles. */
  on: number;
  inside: boolean;
  lastMove: number;
};

/**
 * Tracks the pointer over `el` (mouse and touch; touch moves are passive, so the page still
 * scrolls). `onTap` fires for a click or tap that did not land on a link or button.
 */
export function trackPointer(
  el: HTMLElement,
  onTap?: (x: number, y: number) => void,
): { state: PointerState; update: (dt: number) => void; stop: () => void } {
  const s: PointerState = { x: -1e4, y: -1e4, vx: 0, vy: 0, on: 0, inside: false, lastMove: 0 };
  let px = 0;
  let py = 0;
  let pt = 0;
  const move = (cx: number, cy: number) => {
    const r = el.getBoundingClientRect();
    const x = cx - r.left;
    const y = cy - r.top;
    const now = performance.now();
    s.inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    if (pt && now - pt < 100) {
      const k = 1000 / Math.max(now - pt, 4);
      s.vx = s.vx * 0.6 + (x - px) * k * 0.4;
      s.vy = s.vy * 0.6 + (y - py) * k * 0.4;
    } else {
      s.vx = 0;
      s.vy = 0;
    }
    px = s.x = x;
    py = s.y = y;
    pt = s.lastMove = now;
  };
  const onMove = (e: PointerEvent) => move(e.clientX, e.clientY);
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) move(t.clientX, t.clientY);
  };
  const onLeave = () => {
    s.inside = false;
  };
  const onTouchEnd = () => {
    s.inside = false;
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest("a, button, input, textarea, select, [role='button']")) return;
    const r = el.getBoundingClientRect();
    onTap?.(e.clientX - r.left, e.clientY - r.top);
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerdown", onMove);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("touchstart", onTouch, { passive: true });
  el.addEventListener("touchmove", onTouch, { passive: true });
  el.addEventListener("touchend", onTouchEnd, { passive: true });
  el.addEventListener("click", onClick);
  const update = (dt: number) => {
    const idle = performance.now() - s.lastMove > 2500;
    const want = s.inside && !idle ? 1 : 0;
    s.on += (want - s.on) * Math.min(1, dt * (want ? 6 : 2.5));
    // Velocity decays when the pointer rests.
    if (performance.now() - pt > 60) {
      s.vx *= Math.exp(-dt * 10);
      s.vy *= Math.exp(-dt * 10);
    }
  };
  const stop = () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerdown", onMove);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("touchstart", onTouch);
    el.removeEventListener("touchmove", onTouch);
    el.removeEventListener("touchend", onTouchEnd);
    el.removeEventListener("click", onClick);
  };
  return { state: s, update, stop };
}

/** Rect of `inner` relative to `outer`, in CSS px. */
export function relRect(inner: Element, outer: Element) {
  const a = inner.getBoundingClientRect();
  const b = outer.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
}

/** The dark-scene gold and ground as linear 0..1 sRGB triples, read from the live tokens. */
export function sceneColors(host: HTMLElement): { gold: [number, number, number]; ground: [number, number, number] } {
  const read = (name: string): [number, number, number] => {
    const el = document.createElement("span");
    el.style.cssText = `position:absolute;visibility:hidden;color:var(${name})`;
    host.appendChild(el);
    const css = getComputedStyle(el).color;
    el.remove();
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [0, 0, 0];
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  };
  return { gold: read("--gold"), ground: read("--ground") };
}
