"use client";

import { useEffect } from "react";

/**
 * After an in-page jump (#work, a palette "Go to", the skip link), move keyboard focus to
 * the target section so the next Tab continues from there instead of from the header.
 * Renders nothing.
 */
export function AnchorFocus() {
  useEffect(() => {
    const focusTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);
  return null;
}
