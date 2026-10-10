"use client";

import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type Motion = { gsap: typeof GsapType; ScrollTrigger: typeof ScrollTriggerType };

let loading: Promise<Motion> | null = null;

// ScrollTrigger's enable() starts an empty requestAnimationFrame loop that runs for as long as it
// is enabled (its _rafBugFix, for uneven repaints in Firefox): a main-thread frame every vsync,
// forever, on every page, even with nothing moving. Register with that one loop left unscheduled
// (matched by its shape; anything else passes through); Firefox keeps it.
const KEEP_ALIVE = /^function\s*[\w$]*\s*\(\)\s*\{\s*return\s+[\w$]+\s*&&\s*requestAnimationFrame\(\s*[\w$]+\s*\)\s*;?\s*\}$/;

function register(gsap: Motion["gsap"], ScrollTrigger: Motion["ScrollTrigger"]) {
  if (/Firefox\//.test(navigator.userAgent)) {
    gsap.registerPlugin(ScrollTrigger);
    return;
  }
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => (KEEP_ALIVE.test(String(cb)) ? 0 : raf.call(window, cb));
  try {
    gsap.registerPlugin(ScrollTrigger);
  } finally {
    window.requestAnimationFrame = raf;
  }
}

/**
 * GSAP + ScrollTrigger, loaded once and only on the client, after the page is interactive
 * (dynamic import keeps them out of the first-load bundle). Plugins are registered here, once.
 */
export function loadMotion(): Promise<Motion> {
  loading ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, st]) => {
    const gsap = g.gsap;
    const ScrollTrigger = st.ScrollTrigger;
    register(gsap, ScrollTrigger);
    // Phones: the address bar showing/hiding resizes the viewport; do not re-measure every scene
    // for that (it jitters sticky stages). Real resizes and orientation changes still refresh.
    // Its scroll check (a safety net for scroll events a browser drops) also wakes a frame every
    // 250 ms while nothing moves; once a second is enough. This must be the only config() call:
    // config() overwrites its stored timer id (with the new length, or undefined when syncInterval
    // is absent), so only the first call can clear the 250 ms timer.
    ScrollTrigger.config({ ignoreMobileResize: true, syncInterval: 1000 });
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
