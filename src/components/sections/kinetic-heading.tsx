"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A heading whose words enter one after another (blur to sharp, a small rise) once it scrolls
 * into view; one unit carries the gold sweep. Units are whole words or phrases, never letters,
 * so Thai stays intact. The heading is real text the whole time; reduced motion: no entrance.
 */
export function KineticHeading({
  id,
  units,
  keyIndex,
  joiner,
  className,
}: {
  id: string;
  units: ReactNode[];
  keyIndex: number;
  joiner: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
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
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <h2 ref={ref} id={id} className={["kinetic", className].filter(Boolean).join(" ")}>
      {units.map((u, i) => (
        <span key={i}>
          {i > 0 && joiner ? joiner : null}
          <span className={i === keyIndex ? "kin-unit kin-key" : "kin-unit"} style={{ ["--i" as string]: i }}>
            {i === keyIndex ? <span className="sweep">{u}</span> : u}
          </span>
        </span>
      ))}
    </h2>
  );
}
