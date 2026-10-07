"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { nobr } from "@/lib/thai-nodes";
import "./frame.css";

/**
 * One section-sized block as it would sit on the page: eyebrow, heading, a one-line instruction,
 * the toy on a navy scene card, and an honesty note under it. Shared by the lab-play-a toys.
 */
export function PlayFrame({
  eyebrow,
  title,
  instruction,
  note,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  instruction: string;
  note: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pa-section shell ${className}`} aria-label={title}>
      <header className="pa-head">
        <p className="pa-eyebrow">
          <span className="pa-eyebrow-dot" aria-hidden="true" />
          {nobr(eyebrow)}
        </p>
        <h2 className="pa-title">{nobr(title)}</h2>
        <p className="pa-instruction">{nobr(instruction)}</p>
      </header>
      <div data-scene="dark" className="scene-card pa-stage pastel-ai">
        {children}
      </div>
      <p className="pa-note">{nobr(note)}</p>
    </section>
  );
}

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Live `prefers-reduced-motion: reduce` (false on the server). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

/** True while at least `ratio` of the element is on screen (and the tab is visible). */
export function useInView(ref: RefObject<Element | null>, ratio = 0.35): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    let tab = document.visibilityState === "visible";
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting && e.intersectionRatio >= ratio;
        setInView(visible && tab);
      },
      { threshold: [0, ratio, 1] },
    );
    const onVis = () => {
      tab = document.visibilityState === "visible";
      setInView(visible && tab);
    };
    io.observe(el);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref, ratio]);
  return inView;
}
