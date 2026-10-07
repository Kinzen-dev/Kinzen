export type PointerState = {
  /** CSS px relative to the stage's top-left (layout px: the hero's scale-down is divided out). */
  x: number;
  y: number;
  /** Smoothed velocity, CSS px per second. */
  vx: number;
  vy: number;
  /** 0..1, eases in while the pointer is over the hero and out after it leaves or idles. */
  on: number;
  inside: boolean;
  lastMove: number;
};

export type Pointer = { state: PointerState; update: (dt: number) => void; stop: () => void };

/**
 * Tracks the pointer over the hero (mouse and touch; touch listeners are passive, so the page
 * still scrolls), in the stage's layout coordinates. `onTap` fires for a click or tap that did not
 * land on a link, button or other control.
 */
export function trackPointer(hero: HTMLElement, stage: HTMLElement, onTap?: (x: number, y: number) => void): Pointer {
  const s: PointerState = { x: -1e4, y: -1e4, vx: 0, vy: 0, on: 0, inside: false, lastMove: 0 };
  let px = 0;
  let py = 0;
  let pt = 0;
  const local = (cx: number, cy: number) => {
    const r = stage.getBoundingClientRect();
    const k = stage.offsetWidth ? r.width / stage.offsetWidth : 1;
    return { x: (cx - r.left) / k, y: (cy - r.top) / k, r: hero.getBoundingClientRect() };
  };
  const move = (cx: number, cy: number) => {
    const { x, y, r } = local(cx, cy);
    const now = performance.now();
    s.inside = cx >= r.left && cy >= r.top && cx <= r.right && cy <= r.bottom;
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
  const out = () => {
    s.inside = false;
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest("a, button, input, textarea, select, [role='button'], [tabindex]"))
      return;
    const { x, y } = local(e.clientX, e.clientY);
    onTap?.(x, y);
  };
  hero.addEventListener("pointermove", onMove);
  hero.addEventListener("pointerdown", onMove);
  hero.addEventListener("pointerleave", out);
  hero.addEventListener("touchstart", onTouch, { passive: true });
  hero.addEventListener("touchmove", onTouch, { passive: true });
  hero.addEventListener("touchend", out, { passive: true });
  hero.addEventListener("click", onClick);
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
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerdown", onMove);
    hero.removeEventListener("pointerleave", out);
    hero.removeEventListener("touchstart", onTouch);
    hero.removeEventListener("touchmove", onTouch);
    hero.removeEventListener("touchend", out);
    hero.removeEventListener("click", onClick);
  };
  return { state: s, update, stop };
}
