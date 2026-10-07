import type { Bitmap } from "../kit/glyphs";

export type Pt = [number, number];
export type Glyph = { outer: Pt[]; holes: Pt[][] };

/**
 * Vector outlines of a glyph bitmap: marching squares on pixel centres, segments linked into
 * closed loops, simplified with Ramer-Douglas-Peucker. Loops are grouped into outer contours
 * with their holes (by containment). Coordinates are bitmap px, y down.
 */
export function traceGlyphs(b: Bitmap, eps = 1): Glyph[] {
  const { w, h, bits } = b;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x]);
  // Points live on a half-pixel lattice; key them as integers.
  const W2 = 2 * (w + 3);
  const key = (x: number, y: number) => Math.round((y + 1) * 2) * W2 + Math.round((x + 1) * 2);
  const pts = new Map<number, Pt>();
  const adj = new Map<number, number[]>();
  const link = (a: Pt, b: Pt) => {
    const ka = key(a[0], a[1]);
    const kb = key(b[0], b[1]);
    pts.set(ka, a);
    pts.set(kb, b);
    (adj.get(ka) ?? adj.set(ka, []).get(ka)!).push(kb);
    (adj.get(kb) ?? adj.set(kb, []).get(kb)!).push(ka);
  };
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);
      const c = tl * 8 + tr * 4 + br * 2 + bl;
      if (c === 0 || c === 15) continue;
      const T: Pt = [x + 0.5, y];
      const R: Pt = [x + 1, y + 0.5];
      const B: Pt = [x + 0.5, y + 1];
      const L: Pt = [x, y + 0.5];
      switch (c) {
        case 1:
        case 14:
          link(L, B);
          break;
        case 2:
        case 13:
          link(B, R);
          break;
        case 3:
        case 12:
          link(L, R);
          break;
        case 4:
        case 11:
          link(T, R);
          break;
        case 6:
        case 9:
          link(T, B);
          break;
        case 7:
        case 8:
          link(L, T);
          break;
        case 5:
          link(T, R);
          link(B, L);
          break;
        case 10:
          link(L, T);
          link(R, B);
          break;
      }
    }
  }
  const seen = new Set<number>();
  const loops: Pt[][] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: Pt[] = [];
    let prev = -1;
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(pts.get(cur)!);
      const next = (adj.get(cur) ?? []).find((k) => k !== prev && !seen.has(k));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 8) loops.push(simplifyClosed(loop, eps));
  }
  // Outer loops are the ones not inside any other loop; holes are attached to their container.
  const area = (p: Pt[]) => {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  const inside = (pt: Pt, poly: Pt[]) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const sorted = loops.filter((l) => l.length >= 3).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const glyphs: Glyph[] = [];
  for (const l of sorted) {
    const host = glyphs.find((g) => inside(l[0], g.outer) && !g.holes.some((hole) => inside(l[0], hole)));
    if (host) host.holes.push(l);
    else glyphs.push({ outer: l, holes: [] });
  }
  return glyphs.sort((a, b) => minX(a.outer) - minX(b.outer));
}

const minX = (p: Pt[]) => p.reduce((m, q) => Math.min(m, q[0]), Infinity);

function simplifyClosed(p: Pt[], eps: number): Pt[] {
  // Split at the point farthest from p[0], simplify both halves.
  let far = 0;
  let best = -1;
  for (let i = 1; i < p.length; i++) {
    const d = (p[i][0] - p[0][0]) ** 2 + (p[i][1] - p[0][1]) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const a = rdp(p.slice(0, far + 1), eps);
  const b = rdp([...p.slice(far), p[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function rdp(p: Pt[], eps: number): Pt[] {
  if (p.length < 3) return p;
  const [x1, y1] = p[0];
  const [x2, y2] = p[p.length - 1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  let idx = 0;
  let max = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs(dy * p[i][0] - dx * p[i][1] + x2 * y1 - y2 * x1) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [p[0], p[p.length - 1]];
  const left = rdp(p.slice(0, idx + 1), eps);
  const right = rdp(p.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}
