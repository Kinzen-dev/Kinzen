"use client";

import { useEffect } from "react";

/**
 * Glass pill tone (v3): the pill turns dark glass over any dark scene (hero, clinic receptionist, contact)
 * and light glass over the page, like a camera exposure. One rAF-throttled check per scroll of
 * what sits under the pill; writes html[data-nav-tone]. Renders nothing.
 */
export function NavTone() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const check = () => {
      raf = 0;
      const pill = document.querySelector<HTMLElement>(".nav-pill");
      if (!pill) return;
      const r = pill.getBoundingClientRect();
      const y = r.top + r.height / 2;
      const dark = [r.left + 24, (r.left + r.right) / 2, r.right - 24].some((x) =>
        document
          .elementsFromPoint(x, y)
          .some((el) => !el.closest("[data-site-header]") && el.closest('[data-scene="dark"]')),
      );
      const tone = dark ? "dark" : "light";
      if (root.dataset.navTone !== tone) root.dataset.navTone = tone;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete root.dataset.navTone;
    };
  }, []);
  return null;
}
