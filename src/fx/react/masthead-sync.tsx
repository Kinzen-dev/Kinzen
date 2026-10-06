"use client";

import { useEffect } from "react";

/** Share of the wordmark still visible below the header under which the masthead takes over. */
const HANDOFF_RATIO = 0.35;

/**
 * Masthead state switch for the home page. One IntersectionObserver on the hero wordmark sets
 * html[data-hero-passed] once the wordmark has gone under the sticky header, and clears it when
 * the wordmark is back. fx.css turns that into a short opacity + translate transition of the
 * header mark and name (instant under reduced motion, but the same states, so the small mark never
 * sits next to the big wordmark at the top); there is no scroll scrubbing, so no half-faded
 * resting state exists.
 * Renders nothing. Removes the attribute on unmount (client navigation away from home).
 */
export function MastheadSync() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-hero-wordmark]");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const top = Math.round(header?.getBoundingClientRect().height ?? 56);
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en) return;
        const passed = !en.isIntersecting || en.intersectionRatio < HANDOFF_RATIO;
        if (passed) root.dataset.heroPassed = "";
        else delete root.dataset.heroPassed;
      },
      { rootMargin: `-${top}px 0px 0px 0px`, threshold: [0, HANDOFF_RATIO] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      delete root.dataset.heroPassed;
    };
  }, []);

  return null;
}
