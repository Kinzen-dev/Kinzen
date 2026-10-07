"use client";

import { useEffect, useRef } from "react";
import "./primitives.css";

/**
 * A hand-drawn stroke that draws itself once it scrolls into view (stroke-dash animation).
 * Decorative only. Reduced motion: drawn from the start.
 */
export function DrawPath({
  d,
  viewBox,
  className,
  strokeWidth = 4,
  ms = 900,
  delay = 0,
}: {
  d: string;
  viewBox: string;
  className?: string;
  strokeWidth?: number;
  ms?: number;
  delay?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.on = "";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.dataset.on = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      className={["draw-path", className].filter(Boolean).join(" ")}
      style={{ ["--draw-ms" as string]: `${ms}ms`, ["--draw-delay" as string]: `${delay}ms` }}
      fill="none"
    >
      <path
        d={d}
        pathLength={1}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
