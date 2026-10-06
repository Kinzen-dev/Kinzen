/**
 * Adaptive quality governor (stardust's, with the two fixes research 07 asks for):
 * 1. fps comes from raw performance.now() deltas between rendered frames, never from the
 *    sim's clamped dt (the old governors could not see below 20 fps);
 * 2. a start-up probe kills the field on software or hopeless GPUs: any frame over 250 ms,
 *    or a median over 34 ms across the first 30 measured frames.
 * It trades resolution scale first (down to 0.5), particle rows second, both ways, with
 * cooldowns and a two-good-windows rule before upgrading (a realloc is a visible hitch).
 */
export type Level = { scale: number; shift: number };
export type Verdict = { kill: true; reason: string } | { level: Level } | null;

export type GovernorOptions = { maxShift: number; minScale?: number; step?: number };

const WINDOW_MS = 500;
const PROBE_SKIP = 3; // first frames include shader warm-up and texture uploads
const PROBE_FRAMES = 30;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export class Governor {
  locked = true;
  level: Level = { scale: 1, shift: 0 };
  fps = 0;
  probe: "pending" | "ok" = "pending";

  private seen = 0;
  private stalls = 0;
  private samples: number[] = [];
  private winFrames = 0;
  private winMs = 0;
  private ref = 0;
  private good = 0;
  private lastChange = -Infinity;
  private readonly maxShift: number;
  private readonly minScale: number;
  private readonly step: number;

  constructor(opts: GovernorOptions) {
    this.maxShift = opts.maxShift;
    this.minScale = opts.minScale ?? 0.5;
    this.step = opts.step ?? 0.08;
  }

  /**
   * Start a fresh measurement window: call when the frame cap changes on purpose (the idle 30 fps
   * drift), so a deliberately slow window is never read as a slow GPU.
   */
  rewindow(): void {
    this.winFrames = 0;
    this.winMs = 0;
    this.good = 0;
  }

  /** Feed one rendered frame. `raw` = ms since the previous rendered frame. */
  sample(raw: number, now: number): Verdict {
    if (raw <= 0) return null;
    this.seen++;
    if (this.probe === "pending" && this.seen > PROBE_SKIP) {
      // One stall can be someone else's long task; two in the probe window is the GPU.
      if (raw > 250 && ++this.stalls >= 2) return { kill: true, reason: `frames over 250 ms` };
      this.samples.push(raw);
      if (this.samples.length >= PROBE_FRAMES) {
        const sorted = [...this.samples].sort((a, b) => a - b);
        const med = sorted[sorted.length >> 1];
        if (med > 34) return { kill: true, reason: `median ${med.toFixed(1)} ms` };
        this.probe = "ok";
        this.samples = [];
      }
    }
    // Pauses (hidden tab, off-screen) produce one long delta; do not count it as slowness.
    if (raw > 200) return null;
    this.winFrames++;
    this.winMs += raw;
    if (this.winMs < WINDOW_MS) return null;
    this.fps = (1000 * this.winFrames) / this.winMs;
    this.winFrames = 0;
    this.winMs = 0;
    this.ref = Math.max(this.ref, this.fps);
    if (this.locked) return null;
    return this.decide(now);
  }

  private decide(now: number): Verdict {
    const lo = clamp(this.ref * 0.75, 40, 84);
    const vlo = clamp(this.ref * 0.3, 24, 40);
    const hi = clamp(this.ref * 0.88, 54, 110);
    const { scale, shift } = this.level;
    if (this.fps < lo) {
      this.good = 0;
      if (now - this.lastChange < 1200) return null;
      const steps = this.fps < vlo ? 2 : 1;
      if (scale > this.minScale + 1e-6) {
        this.level = { scale: Math.max(this.minScale, +(scale - this.step * steps).toFixed(3)), shift };
      } else if (shift < this.maxShift) {
        if (now - this.lastChange < 2500) return null;
        this.level = { scale, shift: shift + 1 };
      } else return null;
      this.lastChange = now;
      return { level: this.level };
    }
    if (this.fps >= hi) {
      this.good++;
      if (this.good < 2 || now - this.lastChange < 2500) return null;
      this.good = 0;
      if (shift > 0) this.level = { scale, shift: shift - 1 };
      else if (scale < 1) this.level = { scale: Math.min(1, +(scale + this.step).toFixed(3)), shift };
      else return null;
      this.lastChange = now;
      return { level: this.level };
    }
    this.good = 0;
    return null;
  }
}
