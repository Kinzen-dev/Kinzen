/**
 * Hand-drawn ink for canvas: seeded randomness and strokes that look inked by hand. A straight
 * edge becomes a gently bowed curve whose ends overshoot a little at the corners; a circle is
 * drawn as one wobbly loop that overlaps its own start. Everything is seeded, so a layer drawn
 * twice is the same drawing.
 */

export type Rng = () => number;

/** mulberry32: small, fast, good enough for scenery. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: Rng, a: number, b: number) => a + (b - a) * r();
export const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

type Pen = Path2D | CanvasRenderingContext2D;

/** One hand-drawn segment a -> b into `p` (its own sub-path). */
export function seg(p: Pen, ax: number, ay: number, bx: number, by: number, r: Rng, wob = 1) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Overshoot past the corners, a touch of jitter at the ends, a gentle bow in the middle.
  const o0 = Math.min(2.2, len * 0.05) * wob * r();
  const o1 = Math.min(2.6, len * 0.05) * wob * r();
  const j = 0.5 * wob;
  const sx = ax - ux * o0 + (r() - 0.5) * j;
  const sy = ay - uy * o0 + (r() - 0.5) * j;
  const ex = bx + ux * o1 + (r() - 0.5) * j;
  const ey = by + uy * o1 + (r() - 0.5) * j;
  const bow = (r() - 0.5) * Math.min(3, len * 0.035) * wob;
  p.moveTo(sx, sy);
  if (len > 90) {
    // Long lines waver twice, the way a hand does.
    const bow2 = (r() - 0.5) * Math.min(3, len * 0.03) * wob;
    const mx = (sx + ex) / 2 - uy * (bow - bow2) * 0.3;
    const my = (sy + ey) / 2 + ux * (bow - bow2) * 0.3;
    p.quadraticCurveTo(sx + dx * 0.25 - uy * bow, sy + dy * 0.25 + ux * bow, mx, my);
    p.quadraticCurveTo(sx + dx * 0.75 - uy * bow2, sy + dy * 0.75 + ux * bow2, ex, ey);
  } else {
    p.quadraticCurveTo((sx + ex) / 2 - uy * bow, (sy + ey) / 2 + ux * bow, ex, ey);
  }
}

/** A polyline (flat x,y list) as hand-drawn segments. */
export function lines(p: Pen, pts: number[], r: Rng, wob = 1, closed = false) {
  const n = pts.length / 2;
  for (let i = 0; i < n - 1; i++) seg(p, pts[i * 2]!, pts[i * 2 + 1]!, pts[i * 2 + 2]!, pts[i * 2 + 3]!, r, wob);
  if (closed && n > 2) seg(p, pts[n * 2 - 2]!, pts[n * 2 - 1]!, pts[0]!, pts[1]!, r, wob);
}

/** A smooth hand-drawn curve through points (one stroke, slight wobble). */
export function curve(p: Pen, pts: number[], r: Rng, wob = 1) {
  const n = pts.length / 2;
  if (n < 2) return;
  const j = (v: number) => v + (r() - 0.5) * wob * 0.8;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push(j(pts[i * 2]!));
    ys.push(j(pts[i * 2 + 1]!));
  }
  p.moveTo(xs[0]!, ys[0]!);
  for (let i = 1; i < n - 1; i++)
    p.quadraticCurveTo(xs[i]!, ys[i]!, (xs[i]! + xs[i + 1]!) / 2, (ys[i]! + ys[i + 1]!) / 2);
  p.lineTo(xs[n - 1]!, ys[n - 1]!);
}

/** A hand-drawn ellipse: one loop, radius breathing a little, overlapping its own start. */
export function ring(p: Pen, cx: number, cy: number, rx: number, ry: number, r: Rng, wob = 1) {
  const steps = Math.max(10, Math.round((rx + ry) * 0.9));
  const a0 = r() * Math.PI * 2;
  const over = 0.12 + r() * 0.18;
  const k1 = (r() - 0.5) * 0.06 * wob;
  const k2 = r() * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + t * (Math.PI * 2 + over);
    const f = 1 + k1 * Math.sin(a * 2 + k2) + (t > 0.9 ? (t - 0.9) * 0.25 * wob : 0);
    const x = cx + Math.cos(a) * rx * f;
    const y = cy + Math.sin(a) * ry * f;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
}

/** Exact polygon path for fills (strokes come from `lines`). */
export function poly(p: Pen, pts: number[]) {
  p.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i]!, pts[i + 1]!);
  p.closePath();
}

/** Colours of the dark scene, read from the live tokens as rgb triples (0..255). */
export type Palette = {
  ink: [number, number, number];
  gold: [number, number, number];
  night: [number, number, number];
};

export function readColors(host: HTMLElement): Palette {
  const read = (name: string): [number, number, number] => {
    const el = document.createElement("span");
    el.style.cssText = `position:absolute;visibility:hidden;color:var(${name})`;
    host.appendChild(el);
    const css = getComputedStyle(el).color;
    el.remove();
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [200, 200, 200];
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0]!, d[1]!, d[2]!];
  };
  return { ink: read("--ink"), gold: read("--gold"), night: read("--night") };
}

export const rgba = (c: readonly number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const mix = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => [
  Math.round(a[0]! + (b[0]! - a[0]!) * t),
  Math.round(a[1]! + (b[1]! - a[1]!) * t),
  Math.round(a[2]! + (b[2]! - a[2]!) * t),
];

/** A soft round light (gold core falling off to nothing), drawn once and stamped additively. */
export function glowSprite(c: readonly number[], size = 128): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(c, 0.9));
  g.addColorStop(0.18, rgba(c, 0.45));
  g.addColorStop(0.45, rgba(c, 0.12));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}
