import type { MaskIndex } from "./mask";
import type { Burst, BurstJob, Rgb, TargetJob, Targets } from "./types";

// Pure samplers. They run in the worker (targets/worker.ts) and, as a fallback, on the main thread.

let spare: number | null = null;
function gauss(): number {
  if (spare !== null) {
    const v = spare;
    spare = null;
    return v;
  }
  let u = 0,
    v = 0,
    s = 0;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const m = Math.sqrt((-2 * Math.log(s)) / s);
  spare = v * m;
  return u * m;
}

const mix = (a: Rgb, b: Rgb, t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** The hot end of the gold: champagne, never white (laong-thong rule). */
const CHAMPAGNE: Rgb = [250, 232, 178];

/**
 * Sample the wordmark: glyph particles from ink pixels (a share from edge pixels so strokes
 * stay crisp), dust particles in a soft band around the ink box. Role goes in pos.w.
 */
export function sampleWordmark(mask: MaskIndex, job: TargetJob): Targets {
  const { N, cw, ch, ink, k, gold, dustShare, edgeShare } = job;
  const pos = new Float32Array(N * 4);
  const col = new Uint8Array(N * 4);
  const sx = ink.w / mask.w;
  const sy = ink.h / mask.h;
  const hot = mix(gold, CHAMPAGNE, 0.6);
  const cx = cw / 2;
  const cy = ch / 2;
  const inkCy = ink.y + ink.h / 2;
  const edgeP = mask.edge.length > 0 ? edgeShare : 0;
  // Dust z spread and glyph depth are in world units; small so letters stay registered with the DOM.
  const depth = 0.12;
  let glyphs = 0;

  for (let i = 0; i < N; i++) {
    const o = i * 4;
    let px: number, py: number, role: number, c: [number, number, number];
    if (Math.random() >= dustShare) {
      const list = Math.random() < edgeP ? mask.edge : mask.ink;
      const m = list[(Math.random() * list.length) | 0];
      const mx = m % mask.w;
      const my = (m - mx) / mask.w;
      px = ink.x + (mx + Math.random()) * sx;
      py = ink.y + (my + Math.random()) * sy;
      role = 1;
      glyphs++;
      c = Math.random() < 0.16 ? hot : mix([gold[0] * 0.72, gold[1] * 0.72, gold[2] * 0.72], gold, Math.random());
      pos[o + 2] = (Math.random() - 0.5) * depth;
    } else {
      px = ink.x + ink.w * (-0.03 + 1.06 * Math.random());
      py = inkCy + gauss() * ink.h * 0.3;
      role = 0;
      const t = 0.32 + 0.3 * Math.random();
      c = [gold[0] * t, gold[1] * t, gold[2] * t];
      pos[o + 2] = gauss() * 0.5;
    }
    pos[o] = (px - cx) * k;
    pos[o + 1] = -(py - cy) * k;
    pos[o + 3] = role;
    col[o] = c[0];
    col[o + 1] = c[1];
    col[o + 2] = c[2];
    col[o + 3] = 255;
  }
  return { pos, col, glyphs, glyphArea: mask.ink.length * sx * sy };
}

/** A point burst: everything starts near the origin and flies out on random directions. */
export function burstSeed(job: BurstJob): Burst {
  const { N, origin, speed } = job;
  const pos = new Float32Array(N * 4);
  const vel = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(1 - z * z);
    // Flatten the sphere so the burst reads as a planar bloom across the wordmark band.
    const d0 = rr * Math.cos(a),
      d1 = z * 0.55,
      d2 = rr * Math.sin(a) * 0.4;
    const r = Math.random() * 0.25;
    const s = speed * (0.35 + Math.random());
    pos[o] = origin[0] + d0 * r;
    pos[o + 1] = origin[1] + d1 * r;
    pos[o + 2] = d2 * r;
    pos[o + 3] = Math.random();
    vel[o] = d0 * s;
    vel[o + 1] = d1 * s;
    vel[o + 2] = d2 * s;
  }
  return { pos, vel };
}

/** Positions already at the target (reduced motion): seed slot gets a random value. */
export function settledSeed(t: Targets): Burst {
  const pos = new Float32Array(t.pos.length);
  for (let o = 0; o < pos.length; o += 4) {
    pos[o] = t.pos[o];
    pos[o + 1] = t.pos[o + 1];
    pos[o + 2] = t.pos[o + 2];
    pos[o + 3] = Math.random();
  }
  return { pos, vel: new Float32Array(t.pos.length) };
}
