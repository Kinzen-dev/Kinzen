"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./doodle.css";

/* ------------------------------------------------------------------
   Line boil: one shared 8 fps ticker steps the turbulence seed of every
   doodle that is on screen, on a visible tab, with motion allowed. Three
   seeds per doodle, like three hand-jittered frames on a loop. Nothing
   on screen = no timer at all.

   Displacement is in viewBox units (art is ~300 wide), so the jitter
   scales with the doodle. Chrome samples the displacement to whole device
   pixels, so below ~5 the boil rounds away to nothing; 6 reads as about
   half a pixel of wobble at 64px and keeps the line crisp.
   ------------------------------------------------------------------ */
const FRAME_MS = 125;
const FRAMES = 3;
const live = new Map<SVGFETurbulenceElement, number>();
let timer: number | undefined;
let frame = 0;

function tick() {
  frame = (frame + 1) % FRAMES;
  for (const [el, base] of live) el.setAttribute("seed", String(base + frame));
}

function sync() {
  const run = live.size > 0 && document.visibilityState === "visible";
  if (run && timer === undefined) timer = window.setInterval(tick, FRAME_MS);
  if (!run && timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

if (typeof document !== "undefined") document.addEventListener("visibilitychange", sync);

export function DoodleFrame({
  w,
  h,
  className,
  children,
}: {
  w: number;
  h: number;
  className?: string;
  children: ReactNode;
}) {
  const filterId = `boil${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hostRef = useRef<HTMLSpanElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const [boiling, setBoiling] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const turb = turbRef.current;
    if (!host || !turb) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const base = 1 + Math.floor(Math.random() * 90) * FRAMES;
    let visible = false;

    const update = () => {
      const on = visible && motion.matches;
      setBoiling(on);
      if (on) live.set(turb, base);
      else live.delete(turb);
      sync();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    io.observe(host);
    motion.addEventListener("change", update);
    return () => {
      io.disconnect();
      motion.removeEventListener("change", update);
      live.delete(turb);
      sync();
    };
  }, []);

  return (
    <span
      ref={hostRef}
      className={`doodle ${className ?? ""}`}
      style={{ aspectRatio: `${w} / ${h}` }}
      aria-hidden="true"
      data-boil={boiling ? "on" : "off"}
    >
      <svg viewBox={`0 0 ${w} ${h}`} focusable="false">
        <filter
          id={filterId}
          x="-4%"
          y="-4%"
          width="108%"
          height="108%"
          colorInterpolationFilters="sRGB"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={1} />
          <feDisplacementMap in="SourceGraphic" scale={6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <g filter={boiling ? `url(#${filterId})` : undefined}>{children}</g>
      </svg>
    </span>
  );
}
