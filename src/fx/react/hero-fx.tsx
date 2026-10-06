"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "../fx.css";
import { MastheadSync } from "./masthead-sync";

// Everything heavy (engine, shaders, worker, baked mask) lives behind this dynamic import.
const HeroField = dynamic(() => import("./hero-field"), { ssr: false });

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** The theme the page shows: a pinned html[data-theme], otherwise the system scheme. */
function isDark(): boolean {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * The hero's FX slot. Server-renders an empty, aria-hidden stage box; the field chunk loads only
 * after the browser is idle (timeout 1200 ms), only while the hero is on screen, and only on the
 * dark ground: the gold dust is emissive light, so the light theme keeps the crisp DOM wordmark
 * and never loads the field (a switch to dark loads it then; once loaded, the stage itself fades
 * it out and back on later switches). `?fx=off`, Save-Data and prefers-reduced-motion never load
 * it. The server-rendered wordmark stays the LCP and the fallback.
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
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    // ?fx=still is a debugging tier that may run under reduced motion; nothing else does.
    if (fx === "off" || nav.connection?.saveData || (still.matches && fx !== "still")) {
      hero.dataset.fxTier = "off";
      return;
    }
    const w = window as IdleWindow;
    let idle = 0;
    let timer = 0;
    let io: IntersectionObserver | null = null;
    const arm = () => {
      if (io || !isDark()) return;
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
    const go = () => {
      idle = 0;
      timer = 0;
      arm();
    };
    // A switch to dark arms the field (once the idle wait is over); a switch to light before it
    // mounted simply leaves it unloaded.
    const onTheme = () => {
      if (!idle && !timer) arm();
    };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", onTheme);
    // Reduced motion switched on mid-visit: drop the field, the static wordmark is the design.
    const onMotion = () => {
      if (!still.matches || fx === "still") return;
      hero.dataset.fxTier = "off";
      setOff(true);
    };
    still.addEventListener("change", onMotion);
    if (w.requestIdleCallback) idle = w.requestIdleCallback(go, { timeout: 1200 });
    else timer = window.setTimeout(go, 200);
    return () => {
      if (idle) w.cancelIdleCallback?.(idle);
      clearTimeout(timer);
      io?.disconnect();
      mo.disconnect();
      scheme.removeEventListener("change", onTheme);
      still.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <div ref={ref} className="fx-stage" aria-hidden="true">
      {mount && !off && <HeroField onOff={() => setOff(true)} />}
      <MastheadSync />
    </div>
  );
}
