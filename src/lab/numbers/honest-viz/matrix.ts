/**
 * The 500/37 card's canvas: 500 messages as a 25 x 20 dot matrix, 37 violations leaving raw drafts
 * as red sparks that turn gold as the guard line (the code checks) catches them, one tally tick
 * each, then the whole matrix settles as passed. A pure function of time: drawMatrix(canvas, t)
 * paints the frame at t ms and reports the counters for that instant, so the count-up numbers and
 * the picture can never drift apart. t >= MATRIX.duration is the final, composed still.
 */
const COLS = 25;
const ROWS = 20;
const N = COLS * ROWS;
const CAUGHT = 37;

const APPEAR_AT = 60;
const APPEAR_SPAN = 1300;
const APPEAR_RAMP = 260;
const GUARD_AT = 1450;
const GUARD_SPAN = 480;
const SPARK_AT = 1950;
const SPARK_GAP = 38;
const FLARE = 380;
const LIFT = 140;
const VERDICT_AT = 4600;
const VERDICT_SPAN = 650;

/** Canvas geometry in pitch units: matrix rows, the gap to the guard line, room under it. */
export const ASPECT = { w: COLS, h: ROWS + 1.45 + 0.75 };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which dots the 37 sparks leave from (illustrative, fixed seed), when each leaves and lands. */
const SPARKS = (() => {
  const rnd = mulberry32(37);
  const picked = new Set<number>();
  while (picked.size < CAUGHT) picked.add(Math.floor(rnd() * N));
  const list = [...picked].map((i, k) => {
    const r = Math.floor(i / COLS);
    const start = SPARK_AT + k * SPARK_GAP + rnd() * 30;
    // Falls farther from the top rows, so takes longer; lands on the guard line.
    const fall = 420 + ((ROWS - r) / ROWS) * 520;
    return { i, start, land: start + LIFT + fall, slot: 0 };
  });
  [...list].sort((a, b) => a.land - b.land).forEach((s, rank) => (s.slot = rank));
  return list;
})();
const SOURCE = new Map(SPARKS.map((s) => [s.i, s]));
const LAST_LAND = Math.max(...SPARKS.map((s) => s.land));

export const MATRIX = { duration: VERDICT_AT + VERDICT_SPAN + 300 };

const appearAt = (c: number, r: number) => APPEAR_AT + ((c + r) / (COLS + ROWS - 2)) * APPEAR_SPAN;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => x * x * (3 - 2 * x);

type Colors = { ink: string; gold: string; red: string };
const colorCache = new WeakMap<HTMLCanvasElement, Colors>();

/** Colours come from CSS (the canvas sets color, border-top-color and column-rule-color from tokens). */
function colors(canvas: HTMLCanvasElement): Colors {
  let c = colorCache.get(canvas);
  if (!c) {
    const cs = getComputedStyle(canvas);
    c = { ink: cs.color, gold: cs.borderTopColor, red: cs.columnRuleColor };
    colorCache.set(canvas, c);
  }
  return c;
}
export function invalidateColors(canvas: HTMLCanvasElement) {
  colorCache.delete(canvas);
}

export type MatrixFrame = { messages: number; caught: number; verdict: boolean };

export function drawMatrix(canvas: HTMLCanvasElement, t: number): MatrixFrame {
  canvas.dataset.t = String(t);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  const frame: MatrixFrame = { messages: 0, caught: 0, verdict: t >= VERDICT_AT };
  if (!ctx || w === 0) return frame;
  const { ink, gold, red } = colors(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const p = w / COLS;
  const rad = p * 0.17;
  const gy = (ROWS + 1.45) * p;
  const dotX = (c: number) => (c + 0.5) * p;
  const dotY = (r: number) => (r + 0.5) * p;
  const slotX = (s: number) => p * 0.5 + ((s + 0.5) / CAUGHT) * (w - p);
  const TAU = Math.PI * 2;

  // 1. Messages: a diagonal wave fills the matrix; later a second wave settles them as passed.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = clamp01((t - appearAt(c, r)) / APPEAR_RAMP);
      if (a <= 0) continue;
      if (t >= appearAt(c, r) + APPEAR_RAMP / 2) frame.messages++;
      const v = smooth(clamp01((t - VERDICT_AT - (r / ROWS) * (VERDICT_SPAN - 250)) / 250));
      const x = dotX(c);
      const y = dotY(r);
      const sz = rad * (0.6 + 0.4 * smooth(a));
      if (v < 1) {
        ctx.globalAlpha = a * 0.3 * (1 - v);
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, TAU);
        ctx.fill();
      }
      if (v > 0) {
        ctx.globalAlpha = v * 0.45;
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, TAU);
        ctx.fill();
      }
      // A raw draft with a violation: the dot flares red as its spark leaves.
      const s = SOURCE.get(r * COLS + c);
      if (s && t >= s.start && t < s.start + FLARE) {
        const k = (t - s.start) / FLARE;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = red;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, rad * (1 + 2.2 * k), 0, TAU);
        ctx.stroke();
        ctx.fillStyle = red;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, TAU);
        ctx.fill();
      }
    }
  }

  // 2. The guard line draws itself across, then holds.
  const g = smooth(clamp01((t - GUARD_AT) / GUARD_SPAN));
  if (g > 0) {
    const glow = t > LAST_LAND ? 1 - clamp01((t - LAST_LAND) / 900) : 0;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gold;
    ctx.lineCap = "round";
    ctx.lineWidth = 1.75;
    ctx.shadowColor = gold;
    ctx.shadowBlur = 6 + glow * 10;
    ctx.beginPath();
    ctx.moveTo(p * 0.25, gy);
    ctx.lineTo(p * 0.25 + g * (w - p * 0.5), gy);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 3. Sparks: lift, fall to their tally slot (red turning gold), caught on the line as a tick.
  for (const s of SPARKS) {
    if (t < s.start + LIFT * 0.5) continue;
    const sx = dotX(s.i % COLS);
    const sy = dotY(Math.floor(s.i / COLS));
    const tx = slotX(s.slot);
    if (t < s.land) {
      const u = clamp01((t - s.start - LIFT) / (s.land - s.start - LIFT));
      const pos = (q: number) => ({
        x: sx + (tx - sx) * smooth(q),
        y: q <= 0 ? sy - p * 0.35 * clamp01((t - s.start) / LIFT) : sy - p * 0.35 + (gy - sy + p * 0.35) * q * q,
      });
      const now = pos(u);
      const tail = pos(Math.max(0, u - 0.09));
      ctx.lineCap = "round";
      ctx.lineWidth = rad * 1.1;
      for (const [col, alpha] of [
        [red, 1 - u],
        [gold, u],
      ] as const) {
        ctx.globalAlpha = alpha * 0.45;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(now.x, now.y);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(now.x, now.y, rad * 1.05, 0, TAU);
        ctx.fill();
      }
    } else {
      frame.caught++;
      const k = clamp01((t - s.land) / 320);
      const th = p * 0.5;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = gold;
      ctx.lineWidth = Math.max(1.5, p * 0.09);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, gy);
      ctx.lineTo(tx, gy - th * smooth(Math.min(1, k * 1.6)));
      ctx.stroke();
      if (k < 1) {
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(tx, gy, rad * (1 + 3 * k), 0, TAU);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  return frame;
}
