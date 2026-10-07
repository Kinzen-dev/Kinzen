"use client";

import { useEffect, useState, type ReactNode } from "react";
import "./primitives.css";

/**
 * Kinetic phrase cycler: one phrase at a time, blur-to-sharp in, rise out. Whole phrases only
 * (never split into letters), so Thai graphemes stay intact. Screen readers get every phrase once
 * as a list; the moving copy is aria-hidden. Reduced motion: the first phrase, still.
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
  useEffect(() => {
    if (phrases.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const tick = () => {
      if (!document.hidden) setI((n) => (n + 1) % phrases.length);
    };
    id = window.setInterval(tick, ms);
    return () => window.clearInterval(id);
  }, [phrases.length, ms]);

  return (
    <span className={["cycler", className].filter(Boolean).join(" ")}>
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
