"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { observeInView } from "./governor";
import "./primitives.css";

/**
 * Kinetic phrase cycler: one phrase at a time, blur-to-sharp in, rise out. Whole phrases only
 * (never split into letters), so Thai graphemes stay intact. Screen readers get every phrase once
 * as a list; the moving copy is aria-hidden. Holds its phrase off screen and on a hidden tab.
 * Reduced motion: the first phrase, still.
 */
export function TextCycler({
  phrases,
  ms = 2600,
  className,
}: {
  phrases: ReactNode[];
  ms?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || phrases.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let inView = true;
    const stop = observeInView(el, (v) => (inView = v));
    const tick = () => {
      if (inView && !document.hidden) setI((n) => (n + 1) % phrases.length);
    };
    const id = window.setInterval(tick, ms);
    return () => {
      window.clearInterval(id);
      stop();
    };
  }, [phrases.length, ms]);

  return (
    <span ref={root} className={["cycler", className].filter(Boolean).join(" ")}>
      <span className="sr-only">
        {phrases.map((p, n) => (
          <span key={n}>
            {p}
            {n < phrases.length - 1 ? ", " : ""}
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="cycler-stack">
        {/* Every phrase stays in the grid cell so the box is as wide as the longest one: no reflow. */}
        {phrases.map((p, n) => (
          <span key={n} className="cycler-item" data-on={n === i || undefined}>
            {p}
          </span>
        ))}
      </span>
    </span>
  );
}
