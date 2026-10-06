"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import "./motion.css";

const SELECTOR = "[data-reveal]:not([data-revealed]), [data-reveal-group]:not([data-revealed])";

/**
 * Plays the proof-pull entrance once per element as it scrolls into view.
 * Renders nothing. Elements already on screen (or above it) when this runs are
 * marked revealed without animating, so nothing that was visible ever blinks.
 */
export function RevealLayer() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const pending = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.dataset.revealed = "";
        return false;
      }
      return true;
    });
    root.dataset.revealReady = "";
    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    pending.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      // Never leave content hidden if this layer goes away.
      pending.forEach((el) => (el.dataset.revealed = ""));
    };
  }, [pathname]);

  return null;
}
