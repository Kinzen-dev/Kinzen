"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "../fx.css";

// Everything heavy (engine, shaders, worker, baked mask) lives behind this dynamic import.
const HeroField = dynamic(() => import("./hero-field"), { ssr: false });

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * The hero's FX slot. Server-renders an empty, aria-hidden stage box; the field chunk loads only
 * after the browser is idle (timeout 1200 ms) and only while the hero is on screen. `?fx=off`
 * and Save-Data never load it. The server-rendered wordmark stays the LCP and the fallback.
 */
export function HeroFx() {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const stage = ref.current;
    const hero = stage?.closest<HTMLElement>("[data-hero]");
    if (!stage || !hero) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const fx = new URLSearchParams(location.search).get("fx");
    if (fx === "off" || nav.connection?.saveData) {
      hero.dataset.fxTier = "off";
      return;
    }
    const w = window as IdleWindow;
    let idle = 0;
    let timer = 0;
    let io: IntersectionObserver | null = null;
    const arm = () => {
      io = new IntersectionObserver(
        ([en]) => {
          if (!en?.isIntersecting) return;
          io?.disconnect();
          setMount(true);
        },
        { threshold: 0.02 },
      );
      io.observe(stage);
    };
    if (w.requestIdleCallback) idle = w.requestIdleCallback(arm, { timeout: 1200 });
    else timer = window.setTimeout(arm, 200);
    return () => {
      if (idle) w.cancelIdleCallback?.(idle);
      clearTimeout(timer);
      io?.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="fx-stage" aria-hidden="true">
      {mount && !off && <HeroField onOff={() => setOff(true)} />}
    </div>
  );
}
