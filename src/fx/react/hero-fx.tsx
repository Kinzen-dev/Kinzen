"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../fx.css";
import { setFx } from "../stage/fx-state";
import { MastheadSync } from "./masthead-sync";

// Everything heavy (engine, shaders, worker, baked mask) lives behind this dynamic import. A chunk
// that fails to load hands the name straight back to the DOM wordmark instead of throwing.
const HeroField = dynamic(
  () =>
    import("./hero-field").catch(() => ({
      default: function FieldUnavailable({ onOff }: { onOff: () => void }) {
        useEffect(() => onOff(), [onOff]);
        return null;
      },
    })),
  { ssr: false },
);

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
  /** Defined by the pre-paint theme script (components/theme-script.tsx). */
  __kzFxGate?: () => boolean;
};

/** The theme the page shows: a pinned html[data-theme], otherwise the system scheme. */
function isDark(): boolean {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

/** The first HeroFx of a document is the server-rendered one; later ones are client navigations. */
let documentHero = true;

/**
 * The hero's FX slot. Server-renders an empty, aria-hidden stage box. Whether the field runs is
 * decided before first paint by the theme script (html[data-fx="pending"], see fx.css): then the
 * DOM wordmark is never shown and the field mounts as soon as the hero is on screen, so the dust
 * condenses out of nothing. Otherwise the chunk loads only after the browser is idle (timeout
 * 1200 ms), and only on the dark ground: the gold dust is emissive light, so the light theme keeps
 * the crisp DOM wordmark and never loads the field (a switch to dark loads it then and it
 * cross-fades in settled). `?fx=off`, Save-Data and prefers-reduced-motion never load it.
 */
export function HeroFx() {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [off, setOff] = useState(false);

  // Before paint on a client navigation back home: the pre-paint gate ran on another page, so ask
  // it again here (the server-rendered visit already has its answer).
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!documentHero) {
      if ((window as IdleWindow).__kzFxGate?.()) root.dataset.fx = "pending";
      else delete root.dataset.fx;
    }
    documentHero = false;
    return () => {
      delete root.dataset.fx;
    };
  }, []);

  useEffect(() => {
    const stage = ref.current;
    const hero = stage?.closest<HTMLElement>("[data-hero]");
    if (!stage || !hero) return;
    const root = document.documentElement;
    const pending = () => root.dataset.fx === "pending";
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const fx = new URLSearchParams(location.search).get("fx");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    // ?fx=still is a debugging tier that may run under reduced motion; nothing else does.
    if (fx === "off" || nav.connection?.saveData || (still.matches && fx !== "still")) {
      hero.dataset.fxTier = "off";
      if (pending()) setFx(hero, "off", 0);
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
    // A switch to light while the field is still on its way hands the name to the DOM wordmark;
    // a switch to dark arms the field (once the idle wait is over). Once the field has mounted,
    // the stage handles switches itself.
    const onTheme = () => {
      if (!isDark() && pending()) setFx(hero, "off", 200);
      if (!idle && !timer) arm();
    };
    const mo = new MutationObserver(onTheme);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", onTheme);
    // Reduced motion switched on mid-visit: drop the field, the static wordmark is the design.
    const onMotion = () => {
      if (!still.matches || fx === "still") return;
      hero.dataset.fxTier = "off";
      setFx(hero, "off", 0);
      setOff(true);
    };
    still.addEventListener("change", onMotion);
    // The field is expected (decided before paint): no idle wait, the wordmark is waiting on it.
    if (pending()) go();
    else if (w.requestIdleCallback) idle = w.requestIdleCallback(go, { timeout: 1200 });
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
      {mount && !off && (
        <HeroField
          onOff={() => {
            const hero = ref.current?.closest<HTMLElement>("[data-hero]");
            if (hero) setFx(hero, "off", 200);
            setOff(true);
          }}
        />
      )}
      <MastheadSync />
    </div>
  );
}
