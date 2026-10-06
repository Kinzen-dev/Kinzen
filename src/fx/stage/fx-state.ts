/** Who draws the hero name: the field ("on"), or the DOM wordmark ("off"); see fx.css. */
export type FxState = "pending" | "on" | "off";

/**
 * Switch html[data-fx], the change cross-fading over `ms` (set on the hero, read by fx.css).
 * Leaving "pending" first pins the wordmark at the opacity the safety-net animation gives it right
 * now, as the equivalent static state: Chromium does not start a transition from an animated
 * value when the animation is removed, so without this the fade would be a jump.
 */
export function setFx(hero: HTMLElement, state: FxState, ms: number): void {
  const root = document.documentElement;
  const wm = hero.querySelector<HTMLElement>("[data-hero-wordmark]");
  if (root.dataset.fx === "pending" && state !== "pending" && wm) {
    const shown = parseFloat(getComputedStyle(wm).opacity) > 0.5;
    hero.style.setProperty("--fx-xfade", "0ms");
    root.dataset.fx = shown ? "off" : "on";
    void getComputedStyle(wm).opacity; // commit the pinned state before the real change
  }
  hero.style.setProperty("--fx-xfade", `${ms}ms`);
  root.dataset.fx = state;
}
