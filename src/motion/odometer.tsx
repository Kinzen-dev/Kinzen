"use client";

import { useEffect, useRef } from "react";
import "./primitives.css";

/**
 * Odometer counter: each digit is a column that rolls to its value once the number scrolls into
 * view (CSS transform transition, staggered right to left). The real number is the accessible
 * text; the columns are decorative. Reduced motion: the final number, no roll.
 */
export function Odometer({ value, className }: { value: number | string; className?: string }) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.rolled = "";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.dataset.rolled = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={["odometer tabular", className].filter(Boolean).join(" ")}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="odometer-digits">
        {[...text].map((ch, i) =>
          /\d/.test(ch) ? (
            <span
              key={i}
              className="odometer-col"
              style={{ ["--d" as string]: ch, ["--i" as string]: text.length - i }}
            >
              <span className="odometer-strip">0 1 2 3 4 5 6 7 8 9</span>
            </span>
          ) : (
            <span key={i}>{ch}</span>
          ),
        )}
      </span>
    </span>
  );
}
