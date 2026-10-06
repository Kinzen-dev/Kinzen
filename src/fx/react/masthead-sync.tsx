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
    const apply = (passed: boolean) => {
      if (passed) root.dataset.heroPassed = "";
      else delete root.dataset.heroPassed;
    };
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en) return;
        apply(!en.isIntersecting || en.intersectionRatio < HANDOFF_RATIO);
      },
      { rootMargin: `-${top}px 0px 0px 0px`, threshold: [0, HANDOFF_RATIO] },
    );
    io.observe(el);
    // Backstop: re-measure after scrolling settles. Under heavy load an observer callback can
    // arrive late or be coalesced; the state must still end up right.
    let settle = 0;
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, top));
        apply(r.height === 0 || visible / r.height < HANDOFF_RATIO);
      }, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settle);
      delete root.dataset.heroPassed;
    };
  }, []);

  return null;
}
