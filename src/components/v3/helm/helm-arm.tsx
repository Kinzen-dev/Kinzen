"use client";

import { useEffect, useRef } from "react";

/**
 * Arms the Helm stage's transitions once the scroll runtime has taken over. The server paints the
 * last beat (no-JS and reduced motion keep it); when ScrollTrigger then sets the real beat, that
 * jump must be instant, not a half-second cross-fade a visitor (or an audit) catches mid-way.
 * Renders nothing; sets `data-armed` on the enclosing `.helm-stage`.
 */
export function HelmArm() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const stage = ref.current?.closest<HTMLElement>(".helm-stage");
    if (!stage) return;
    let raf = 0;
    const arm = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          stage.dataset.armed = "";
        });
      });
    };
    const observer = new MutationObserver(arm);
    observer.observe(stage, { attributes: true, attributeFilter: ["data-step"] });
    // The runtime may keep the server's beat (page loaded at the scene's end, reduced motion).
    const timer = window.setTimeout(arm, 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <span ref={ref} hidden />;
}
