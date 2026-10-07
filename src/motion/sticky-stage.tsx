"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { loadMotion, motionAllowed } from "./gsap";
import "./sticky-stage.css";

/**
 * Sticky scrollytelling scaffold (decision D4/D5). A tall track holds a sticky stage; while the
 * track scrolls past, ScrollTrigger writes the progress into CSS: `--p` (0..1 over the whole
 * scene) and `data-step` (0..steps-1) on the stage. Scenes draw themselves from those two values
 * in CSS, so motion stays declarative and the DOM is real, readable content at every step.
 *
 * - CSS position: sticky, never GSAP pin: no pin-spacer, anchors and scroll-margin stay true.
 * - The track is tall from the first paint (CSS), so loading the runtime never shifts layout.
 *   Before it loads, and without JS, the stage shows its final step (`data-step` = last, `--p` 1).
 * - Reduced motion: CSS drops the sticky track (normal flow, every step shown), nothing moves.
 * - `onProgress` lets a scene drive extra JS (counters, canvas) from the same progress.
 */
export function StickyStage({
  steps,
  vh = 100,
  className,
  stageClassName,
  label,
  children,
  onProgress,
}: {
  steps: number;
  /** Scroll length per step, in viewport heights. */
  vh?: number;
  className?: string;
  stageClassName?: string;
  /** Accessible name of the scene region. */
  label?: string;
  children: ReactNode;
  onProgress?: (p: number, step: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const t = track.current;
    const s = stage.current;
    if (!t || !s) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let kill: (() => void) | null = null;
    let cancelled = false;

    const setStatic = () => {
      s.style.setProperty("--p", "1");
      s.dataset.step = String(steps - 1);
      cb.current?.(1, steps - 1);
    };

    const start = async () => {
      if (!motionAllowed()) return setStatic();
      const { ScrollTrigger } = await loadMotion();
      if (cancelled) return;
      const st = ScrollTrigger.create({
        trigger: t,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          const step = Math.min(steps - 1, Math.floor(p * steps));
          s.style.setProperty("--p", p.toFixed(4));
          if (s.dataset.step !== String(step)) s.dataset.step = String(step);
          cb.current?.(p, step);
        },
      });
      // First paint of the right step when the page loads mid-scene (Back, hash link).
      const p0 = st.progress;
      const step0 = Math.min(steps - 1, Math.floor(p0 * steps));
      s.style.setProperty("--p", p0.toFixed(4));
      s.dataset.step = String(step0);
      // Scenes that drive JS from progress get their starting state too, not only after a scroll.
      cb.current?.(p0, step0);
      kill = () => st.kill();
    };

    void start();
    const onChange = () => {
      kill?.();
      kill = null;
      void start();
    };
    reduce.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      reduce.removeEventListener("change", onChange);
      kill?.();
    };
  }, [steps]);

  return (
    <div
      ref={track}
      className={["sticky-track", className].filter(Boolean).join(" ")}
      style={{ "--steps": steps, "--vh": vh } as CSSProperties}
    >
      <div
        ref={stage}
        className={["sticky-stage", stageClassName].filter(Boolean).join(" ")}
        data-step={steps - 1}
        style={{ "--p": 1 } as CSSProperties}
        role={label ? "group" : undefined}
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
