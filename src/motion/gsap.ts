"use client";

import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type Motion = { gsap: typeof GsapType; ScrollTrigger: typeof ScrollTriggerType };

let loading: Promise<Motion> | null = null;

/**
 * GSAP + ScrollTrigger, loaded once and only on the client, after the page is interactive
 * (dynamic import keeps them out of the first-load bundle). Plugins are registered here, once.
 */
export function loadMotion(): Promise<Motion> {
  loading ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, st]) => {
    const gsap = g.gsap;
    const ScrollTrigger = st.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    // Phones: the address bar showing/hiding resizes the viewport; do not re-measure every scene
    // for that (it jitters sticky stages). Real resizes and orientation changes still refresh.
    ScrollTrigger.config({ ignoreMobileResize: true });
    // Fonts change line heights: measure again once they are in, so pinned/scrubbed scenes
    // start and end where the visitor sees them.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    return { gsap, ScrollTrigger };
  });
  return loading;
}

/** True when the visitor allows motion (re-read each call; the setting can change live). */
export function motionAllowed(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}
