import type { TierConfig } from "@/fx/engine/capability";
import { hasFloatTargets, isSoftwareRenderer, rendererOf } from "@/fx/engine/capability";
import { ParticleEngine, worldPerPx, type Params } from "@/fx/engine/engine";
import { readPalette } from "@/fx/engine/palette";
import { scatterSeed } from "@/fx/targets/sample-mask";
import type { Targets } from "@/fx/targets/types";

/**
 * Gold numerals stage (numbers view 4). The hero's own particle engine (read-only import: GPGPU
 * spring + curl sim, gaussian points, bloom, hue-preserving composite) drawing the four stats as
 * gold dust, on the section's single WebGL context (the caller holds the lease, see ../gl-lease). Targets come from the figures rendered in the site face on a 2D canvas;
 * every figure's glyph targets are sorted left to right, so particle i always takes rank i and a
 * change of figure reads as one coherent stream of dust, not a criss-cross swap.
 */

/** Per-device budget: phones and small machines get fewer particles and one bloom level. */
const TIERS: Record<"full" | "lite", TierConfig> = {
  full: {
    side: 448,
    maxDpr: 2,
    pxBudget: 2_600_000,
    fps: 60,
    bloomLevels: 2,
    aberration: 0,
    pointer: true,
    maxShift: 0,
  },
  lite: {
    side: 256,
    maxDpr: 2,
    pxBudget: 1_300_000,
    fps: 60,
    bloomLevels: 1,
    aberration: 0,
    pointer: false,
    maxShift: 0,
  },
};

/** While dust is in flight: loose spring, curl turbulence, so it streams. Then it settles. */
const FLOW: Partial<Params> = { spring: 7, damp: 0.92, turb: 1.5, tscale: 0.32, tspeed: 0.35, gain: 1, mouseF: 26 };
const CALM: Partial<Params> = { spring: 30, damp: 0.86, turb: 0.06, tscale: 0.9, tspeed: 0.12, gain: 1, mouseF: 26 };
const FLOW_MS = 1100;
const DUST = 0.1;
const EDGE = 0.3;
const CHAMPAGNE = [250, 232, 178];

export type Layout = {
  /** Where the figures sit, as fractions of the canvas box. */
  zone: { x0: number; y0: number; x1: number; y1: number };
};

type Sampled = { pos: Float32Array; glyphArea: number; fs: number };

export type NumeralStage = {
  setIndex(i: number): void;
  destroy(): void;
  readonly tier: "full" | "lite";
  readonly count: number;
};

/** Ink pixels (and the edge subset) of `text` drawn at `fs` px, centred in `zone` (canvas px). */
function inkOf(text: string, font: string, fs: number, cx: number, cy: number, cw: number, ch: number) {
  // Sample at most ~0.5 Mpx: big figures on a big screen are sampled at a lower resolution (the
  // dust jitters inside each sampled pixel, so the figure stays smooth).
  const s = Math.min(1, Math.sqrt(500_000 / Math.max(1, cw * ch)));
  const w = Math.max(1, Math.round(cw * s));
  const h = Math.max(1, Math.round(ch * s));
  const off = new OffscreenCanvas(w, h);
  const c = off.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D & {
    letterSpacing?: string;
  };
  c.font = `600 ${fs * s}px ${font}`;
  if ("letterSpacing" in c) c.letterSpacing = `${-0.04 * fs * s}px`;
  const m = c.measureText(text);
  // Centre the INK box, not the advance box.
  const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const x = cx * s - iw / 2 + m.actualBoundingBoxLeft;
  const y = cy * s - ih / 2 + m.actualBoundingBoxAscent;
  c.fillStyle = "#fff";
  c.fillText(text, x, y);
  const data = c.getImageData(0, 0, w, h).data;
  const ink: number[] = [];
  const edge: number[] = [];
  const on = (px: number, py: number) => px >= 0 && py >= 0 && px < w && py < h && data[(py * w + px) * 4 + 3] > 120;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (!on(px, py)) continue;
      if (!on(px - 1, py) || !on(px + 1, py) || !on(px, py - 1) || !on(px, py + 1)) edge.push(ink.length);
      ink.push(py * w + px);
    }
  }
  return { ink, edge, w, s, box: { x: x - m.actualBoundingBoxLeft, y: y - m.actualBoundingBoxAscent, w: iw, h: ih } };
}

/**
 * Indices 0..n-1 ordered by key, by counting sort on 4096 buckets: linear time, so re-sampling a
 * figure never blocks the main thread on a phone (a comparator sort of ~90k entries did).
 */
function orderBy(key: Float32Array, n: number): Uint32Array {
  const B = 4096;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    if (key[i] < lo) lo = key[i];
    if (key[i] > hi) hi = key[i];
  }
  const k = (B - 1) / Math.max(1e-6, hi - lo);
  const bucket = new Uint16Array(n);
  const count = new Uint32Array(B + 1);
  for (let i = 0; i < n; i++) {
    const b = ((key[i] - lo) * k) | 0;
    bucket[i] = b;
    count[b + 1]++;
  }
  for (let b = 0; b < B; b++) count[b + 1] += count[b];
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) out[count[bucket[i]]++] = i;
  return out;
}

let spare: number | null = null;
function gauss(): number {
  if (spare !== null) {
    const v = spare;
    spare = null;
    return v;
  }
  let u = 0,
    v = 0,
    q = 0;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    q = u * u + v * v;
  } while (q >= 1 || q === 0);
  const m = Math.sqrt((-2 * Math.log(q)) / q);
  spare = v * m;
  return u * m;
}

export function createNumeralStage(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  opts: {
    figures: string[];
    font: string;
    coarse: boolean;
    layout: (cw: number, ch: number) => Layout;
    /** Called once the shaders are built (true) or failed (false: the caller shows the still). */
    onReady?: (ok: boolean) => void;
  },
): NumeralStage | null {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl || !hasFloatTargets(gl) || isSoftwareRenderer(rendererOf(gl))) {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  const small = (navigator.hardwareConcurrency ?? 8) <= 4;
  const tier: "full" | "lite" = opts.coarse || small ? "lite" : "full";
  const cfg = TIERS[tier];
  const engine = new ParticleEngine(gl, canvas, cfg);
  const N = engine.N;
  const G = Math.round(N * (1 - DUST));

  // Per-particle colour, fixed for the particle's life (the targets move, the grain keeps its tone).
  const palette = readPalette(host);
  const gold = palette.glow;
  const col = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    let c: number[];
    if (i < G) {
      const t = Math.random();
      c =
        Math.random() < 0.16
          ? gold.map((g, k) => g + (CHAMPAGNE[k] - g) * 0.6)
          : gold.map((g) => g * (0.72 + 0.28 * t));
    } else {
      const t = 0.32 + 0.3 * Math.random();
      c = gold.map((g) => g * t);
    }
    col[o] = c[0];
    col[o + 1] = c[1];
    col[o + 2] = c[2];
    col[o + 3] = 255;
  }

  let cw = 0;
  let ch = 0;
  let cache: (Sampled | null)[] = [];
  let index = -1;
  let flowTimer = 0;
  let dead = false;
  let readyOk = false;
  let visible = false;
  let opened = false;

  /**
   * Font size for figure `i`: the largest that fits the zone, but never more than 3x the size
   * that fits every figure (narrow figures grow, the stream breathes; the set still reads as one).
   */
  function fitSize(zone: Layout["zone"], i: number): number {
    const c = new OffscreenCanvas(1, 1).getContext("2d") as OffscreenCanvasRenderingContext2D & {
      letterSpacing?: string;
    };
    c.font = `600 100px ${opts.font}`;
    if ("letterSpacing" in c) c.letterSpacing = "-4px";
    const zw = (zone.x1 - zone.x0) * cw;
    const zh = (zone.y1 - zone.y0) * ch;
    const fit = opts.figures.map((f) => {
      const m = c.measureText(f);
      const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      return Math.min((100 * zw) / Math.max(1, iw), (100 * zh) / Math.max(1, ih));
    });
    return Math.min(fit[i], Math.min(...fit) * 3);
  }

  function sample(i: number): Sampled {
    const { zone } = opts.layout(cw, ch);
    const fs = fitSize(zone, i);
    const cx = ((zone.x0 + zone.x1) / 2) * cw;
    const cy = ((zone.y0 + zone.y1) / 2) * ch;
    const ink = inkOf(opts.figures[i], opts.font, fs, cx, cy, cw, ch);
    const k = worldPerPx(ch);
    const inv = 1 / ink.s;
    // Glyph targets: random ink pixels (a share from edges, so strokes stay crisp), then sorted by x.
    const gx = new Float32Array(G);
    const gy = new Float32Array(G);
    const gk = new Float32Array(G);
    for (let j = 0; j < G; j++) {
      const useEdge = ink.edge.length > 0 && Math.random() < EDGE;
      const p = useEdge
        ? ink.ink[ink.edge[(Math.random() * ink.edge.length) | 0]]
        : ink.ink[(Math.random() * ink.ink.length) | 0];
      const px = p % ink.w;
      gx[j] = (px + Math.random()) * inv;
      gy[j] = ((p - px) / ink.w + Math.random()) * inv;
      gk[j] = gx[j] + gy[j] * 0.18;
    }
    const order = orderBy(gk, G);
    const pos = new Float32Array(N * 4);
    for (let j = 0; j < G; j++) {
      const s = order[j];
      const o = j * 4;
      pos[o] = (gx[s] - cw / 2) * k;
      pos[o + 1] = -(gy[s] - ch / 2) * k;
      pos[o + 2] = (Math.random() - 0.5) * 0.12;
      pos[o + 3] = 1;
    }
    // Dust: a soft halo around the figure plus a thin layer over the whole stage, also by x.
    const box = { x: ink.box.x * inv, y: ink.box.y * inv, w: ink.box.w * inv, h: ink.box.h * inv };
    const dx: number[] = [];
    const dk = new Float32Array(N - G);
    for (let j = G; j < N; j++) {
      const wide = Math.random() < 0.3;
      const x = wide ? Math.random() * cw : box.x + box.w * (-0.15 + 1.3 * Math.random());
      const y = wide ? ch * (0.5 + gauss() * 0.28) : box.y + box.h / 2 + gauss() * box.h * 0.38;
      dx.push(x, y);
      dk[j - G] = x;
    }
    const dOrder = orderBy(dk, N - G);
    for (let j = G; j < N; j++) {
      const s = dOrder[j - G];
      const o = j * 4;
      pos[o] = (dx[s * 2] - cw / 2) * k;
      pos[o + 1] = -(dx[s * 2 + 1] - ch / 2) * k;
      pos[o + 2] = gauss() * 0.5;
      pos[o + 3] = 0;
    }
    return { pos, glyphArea: ink.ink.length * inv * inv || 1, fs };
  }

  const pointCss = (fs: number) => Math.min(2.3, Math.max(1.2, fs * 0.0052));

  function apply(i: number, flow: boolean, span = 0.45, ms = FLOW_MS) {
    cache[i] ??= sample(i);
    const s = cache[i]!;
    const t: Targets = { pos: s.pos, col, glyphs: G, glyphArea: s.glyphArea };
    engine.setTargets(t, pointCss(s.fs));
    if (!flow) return;
    window.clearTimeout(flowTimer);
    engine.setParams(FLOW);
    engine.gate0 = 0;
    engine.gateSpan = span;
    engine.beginGate();
    flowTimer = window.setTimeout(() => {
      engine.endGate();
      engine.setParams(CALM);
    }, ms);
  }

  function measure(): boolean {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    if (Math.abs(w - cw) < 1 && Math.abs(h - ch) < 1) return false;
    cw = w;
    ch = h;
    cache = opts.figures.map(() => null);
    return true;
  }

  function open() {
    if (opened) return;
    opened = true;
    // A wide, even dust field over the stage that condenses into the first figure.
    const k = worldPerPx(ch);
    const hw = (cw / 2) * k * 1.05;
    const hh = (ch / 2) * k * 1.05;
    engine.seed(scatterSeed({ N, box: { x0: -hw, y0: -hh, x1: hw, y1: hh } }));
    engine.setParams(FLOW, true);
    apply(Math.max(0, index), true, 1.1, 1900);
  }

  const sync = () => {
    if (dead) return;
    // Never before the shaders are up: the opening seed needs the sim, or every grain starts at
    // the centre (it did when the view mounted already on screen).
    if (visible && !document.hidden && readyOk) {
      open();
      engine.start();
    } else engine.stop();
  };

  // Pointer: a fine pointer stirs the dust; a click or tap sends a pulse through it.
  const norm = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)] as const;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const [nx, ny] = norm(e);
    engine.pointer(nx, ny, true);
  };
  const onLeave = () => engine.pointer(0, 0, false);
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest("a, button")) return;
    const [nx, ny] = norm(e);
    engine.pulse(nx, ny, e.pointerType === "mouse" ? 22 : 30, 9, 0.8);
  };
  host.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointerdown", onDown);

  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (dead || !measure() || !opened) return;
      apply(Math.max(0, index), true);
    }, 160);
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      sync();
    },
    { threshold: 0.15 },
  );
  io.observe(canvas);
  document.addEventListener("visibilitychange", sync);

  measure();
  engine.setPalette(palette);
  engine.setParams({ ...CALM, glyphPointer: 0.5, mouseR: 1.6, dustSpring: 0.5, dustTurb: 2.2 }, true);
  void engine.ready().then((ok) => {
    if (dead) return;
    opts.onReady?.(ok);
    if (!ok) return;
    readyOk = true;
    // Targets must exist before start(): the figure the view is on.
    apply(Math.max(0, index), false);
    sync();
  });

  return {
    tier,
    count: N,
    setIndex(i: number) {
      if (i === index) return;
      index = i;
      if (readyOk && opened) apply(i, true);
      // The next figure is sampled while the browser is idle, ahead of its turn.
      const nextI = (i + 1) % opts.figures.length;
      if (readyOk && !cache[nextI] && "requestIdleCallback" in window)
        requestIdleCallback(() => {
          if (!dead && cw > 0) cache[nextI] ??= sample(nextI);
        });
    },
    destroy() {
      dead = true;
      window.clearTimeout(flowTimer);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      engine.destroy();
    },
  };
}
