/*
 * The timers the voices use for slow, wall-clock events (gusts, staged generation). A seam so the
 * offline renders can drive them from the render's own timeline instead of the page's clock.
 */
export const clock = {
  set(fn: () => void, ms: number): number {
    return window.setTimeout(fn, ms);
  },
  clear(id: number) {
    window.clearTimeout(id);
  },
};
