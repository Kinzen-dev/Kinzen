/**
 * Cadence-preserving frame cap (stardust): skip rAF callbacks that arrive early and carry the
 * remainder so a 120 cap stays even on 144/240 Hz displays. `accept` returns the raw wall-clock
 * ms since the previous rendered frame (0 for the first), or -1 to skip this callback.
 */
export class FrameCap {
  private anchor = -1;
  private prev = -1;

  constructor(public fps: number) {}

  accept(now: number): number {
    if (this.anchor < 0) {
      this.anchor = now;
      this.prev = now;
      return 0;
    }
    const min = 1000 / this.fps;
    const since = now - this.anchor;
    if (since < min - 0.5) return -1;
    // Advance the anchor by whole intervals (the remainder carries cadence). A plain
    // `since % min` breaks when a frame lands a hair under `min`: the anchor would not move.
    this.anchor = since > min * 4 ? now : this.anchor + min * Math.max(1, Math.floor((since + 0.5) / min));
    const raw = now - this.prev;
    this.prev = now;
    return raw;
  }

  reset(): void {
    this.anchor = -1;
    this.prev = -1;
  }
}
