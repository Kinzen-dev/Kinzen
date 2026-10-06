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
 * reverts it if the setting changes mid-visit). Renders nothing.
 */
export function HeroScale() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero || !motionAllowed()) return;
    let revert: (() => void) | null = null;
    let cancelled = false;
    void loadMotion().then(({ gsap }) => {
      if (cancelled) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const target = () => {
          const shell = hero.querySelector<HTMLElement>(".shell");
          const g = (shell && parseFloat(getComputedStyle(shell).paddingLeft)) || 16;
          const w = hero.offsetWidth || window.innerWidth;
          return Math.min(0.95, Math.max(0.9, 1 - (2 * g) / w));
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
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);
  return null;
}
