"use client";

import { useEffect } from "react";

/**
 * After an in-page jump (#work, a palette "Go to", the skip link), move keyboard focus to
 * the target section so the next Tab continues from there instead of from the header.
 * Also after Back/Forward: browsers replay the saved pixel offset, so if the page above changed
 * height since (a works row opened), the screen no longer shows the section the URL names. Then
 * jump to it. When it is on screen, the replayed position is kept.
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
    let settle = 0;
    const onPop = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const el = id ? document.getElementById(id) : null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const header = document.querySelector("[data-site-header]")?.getBoundingClientRect().height ?? 56;
        if (r.bottom > header + 48 && r.top < window.innerHeight - 48) return;
        el.scrollIntoView({ block: "start" });
        focusTarget();
      }, 350);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onPop);
      window.clearTimeout(settle);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
