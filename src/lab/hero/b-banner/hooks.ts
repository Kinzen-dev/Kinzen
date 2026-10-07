"use client";

import { useEffect, useState } from "react";

/** Live `prefers-reduced-motion: reduce` (null before the first client read). */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return reduced;
}

/**
 * Lab fps probe: counts rAF frames per second and publishes the last reading on
 * `window.__labFps` (read by the headless measurement script). No render cost beyond one rAF.
 */
export function useFpsProbe(label: string) {
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let start = performance.now();
    const w = window as unknown as { __labFps?: Record<string, number[]> };
    w.__labFps ??= {};
    const list: number[] = (w.__labFps[label] = []);
    const tick = (now: number) => {
      frames++;
      if (now - start >= 1000) {
        list.push(Math.round((frames * 1000) / (now - start)));
        if (list.length > 30) list.shift();
        frames = 0;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [label]);
}

/** True while `el` is on screen and the tab is visible: loops pause otherwise. */
export function watchVisible(el: Element, onChange: (visible: boolean) => void): () => void {
  let inView = true;
  const emit = () => onChange(inView && document.visibilityState === "visible");
  const io = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? true;
    emit();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", emit);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", emit);
  };
}
