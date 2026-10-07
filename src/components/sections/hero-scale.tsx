"use client";

import { useEffect } from "react";
import { loadMotion, motionAllowed } from "@/motion/gsap";

/**
 * The hero's exit (v3 scale-down): as the hero scrolls away, the whole dark scene shrinks to the
 * width of the page's scene cards (edges on the gutter, so it lands as one of them) and rounds its
 * corners, scaling from its bottom edge so it stays attached to the light page rising under it.
 * Scrubbed by ScrollTrigger, transform and corner radius only. The scroll range is given in
 * numbers from layout boxes (offsetTop/offsetHeight ignore transforms), so animating the trigger
 * never feeds back into its own measurement. Reduced motion: nothing is registered (matchMedia
 * reverts it if the setting changes mid-visit). GSAP is fetched once the browser is idle or on the
 * first scroll, whichever comes first (at once when the page opens mid-scroll, as on Back), so it
 * never competes with the first paint and the field's boot. Renders nothing.
 */
export function HeroScale() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero || !motionAllowed()) return;
    let revert: (() => void) | null = null;
    let cancelled = false;
    let started = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idle = 0;
    const start = () => {
      if (started || cancelled) return;
      started = true;
      window.removeEventListener("scroll", start);
      if (idle) w.cancelIdleCallback?.(idle);
      void loadMotion().then(run);
    };
    const run = ({ gsap }: Awaited<ReturnType<typeof loadMotion>>) => {
      if (cancelled) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const target = () => {
          const shell = hero.querySelector<HTMLElement>(".shell");
          const g = (shell && parseFloat(getComputedStyle(shell).paddingLeft)) || 16;
          const width = hero.offsetWidth || window.innerWidth;
          return Math.min(0.95, Math.max(0.9, 1 - (2 * g) / width));
        };
        gsap.fromTo(
          hero,
          { scale: 1, "--hero-r": 0 },
          {
            scale: target,
            // Corner radius in pre-scale px: --radius-card / scale reads as exactly --radius-card.
            "--hero-r": () => 1 / target(),
            ease: "none",
            force3D: true,
            scrollTrigger: {
              start: () => hero.offsetTop,
              // Settled when the hero's bottom edge reaches 40% of the viewport.
              end: () => hero.offsetTop + hero.offsetHeight - 0.4 * window.innerHeight,
              scrub: 0.3,
              invalidateOnRefresh: true,
            },
          },
        );
      });
      revert = () => mm.revert();
    };
    if (window.scrollY > 0) start();
    else {
      window.addEventListener("scroll", start, { passive: true });
      if (w.requestIdleCallback) idle = w.requestIdleCallback(start, { timeout: 2500 });
      else idle = window.setTimeout(start, 1200);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", start);
      if (idle) (w.cancelIdleCallback ?? window.clearTimeout)(idle);
      revert?.();
    };
  }, []);
  return null;
}
