"use client";

import { useEffect, useRef, useState } from "react";
import "./timeline.css";

type Geometry = { d: string; nodes: { x: number; y: number }[] };

/**
 * The gold thread through the era list. Its path is measured from the era
 * nodes (DOM rects), re-measured on resize and after fonts settle. Drawing is
 * pure CSS: a scroll-driven clip-path reveal behind @supports. Without scroll
 * timelines (Firefox) or with reduced motion the thread is simply fully drawn.
 */
export function EraThread() {
  const ref = useRef<SVGSVGElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  useEffect(() => {
    const svg = ref.current;
    const root = svg?.parentElement;
    if (!svg || !root) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = svg.getBoundingClientRect();
        const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-era-node]")).map((node) => {
          const r = node.getBoundingClientRect();
          return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
        });
        if (nodes.length === 0 || box.height === 0) return;
        const x = nodes[0].x;
        const d = `M${x} 0 ${nodes.map((n) => `L${n.x} ${n.y}`).join(" ")} L${x} ${box.height}`;
        setGeometry((prev) => (prev?.d === d ? prev : { d, nodes }));
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(root);
    document.fonts?.ready.then(measure).catch(() => {});
    measure();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={ref} className="era-thread" aria-hidden="true" focusable="false">
      {geometry ? (
        <>
          <path d={geometry.d} className="era-thread-line" />
          {geometry.nodes.map((n) => (
            <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r={3.5} className="era-thread-node" />
          ))}
        </>
      ) : null}
    </svg>
  );
}
