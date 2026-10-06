"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

/**
 * Scroll container + draw-in trigger for a plate.
 *
 * Server HTML is the finished drawing (no JS, no motion: still complete). On the
 * client the lines are "armed" (hidden) before paint and drawn when the plate
 * first scrolls into view. A plate already on screen while the page hydrates is
 * left as is, so nothing that was painted ever disappears. Reduced motion: static.
 */
export function PlateDraw({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // false while hydrating server HTML, true for plates mounted by the client (an opened ledger row).
  // Captured on the first render only: the store flips to true right after hydration.
  const clientMounted = useRef(
    useSyncExternalStore(
      noop,
      () => true,
      () => false,
    ),
  );
  const [scrolls, setScrolls] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setScrolls(el.scrollWidth > el.clientWidth + 1);
      const svg = el.querySelector("svg");
      const units = svg?.viewBox.baseVal.width;
      if (svg && units && svg.clientWidth) el.style.setProperty("--plate-px", String(units / svg.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => ro.disconnect();
    const rect = el.getBoundingClientRect();
    const onScreen = rect.top < window.innerHeight && rect.bottom > 0;
    if (onScreen && !clientMounted.current) return () => ro.disconnect();

    el.dataset.state = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.state = "drawn";
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="plate-scroll"
      role="region"
      aria-label={label}
      tabIndex={scrolls ? 0 : undefined}
      data-scrolls={scrolls ? "" : undefined}
    >
      {children}
    </div>
  );
}
