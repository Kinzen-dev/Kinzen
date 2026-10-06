"use client";

import { useEffect } from "react";

/**
 * After an in-page jump (#work, a palette "Go to", the skip link), move keyboard focus to
 * the target section so the next Tab continues from there instead of from the header.
 * Renders nothing.
 */
export function AnchorFocus() {
  useEffect(() => {
    const focusTarget = (hash: string = window.location.hash) => {
      const id = decodeURIComponent(hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    // next/link moves between hashes with pushState, which fires no hashchange: catch
    // same-page anchor clicks too and focus once the scroll has happened.
    const onClick = (e: MouseEvent) => {
      // next/link has already called preventDefault on its own clicks, so do not bail on that.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      // Use the link's own hash: next/link updates the URL after this handler runs.
      window.setTimeout(() => focusTarget(url.hash), 60);
    };
    const onHash = () => focusTarget();
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
