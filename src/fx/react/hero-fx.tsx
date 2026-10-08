"use client";

import { useEffect, useRef } from "react";
import "../fx.css";
import { MastheadSync } from "./masthead-sync";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * The hero's stage slot. Server-renders an empty, aria-hidden box over the wordmark band; the
 * ink desk itself is server-rendered in the wordmark paragraph (fx/ink/ink-art.tsx), finished, so
 * it is the still picture without scripting and under reduced motion. With motion allowed, the
 * sequence (fx/sequence/director.ts: the desk draws itself, then dust, metal, ink in water and
 * keycaps, forever) is fetched once the page has painted, as a lazy chunk; its GPU scenes are lazy
 * chunks of their own, loaded one step ahead. `?fx=off` and Save-Data keep the still picture.
 * Reduced motion switched on mid-visit stops the sequence on the finished drawing.
 */
export function HeroFx() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    const hero = stage?.closest<HTMLElement>("[data-hero]");
    const host = stage?.querySelector<HTMLElement>(".fx-host");
    const svg = hero?.querySelector<SVGSVGElement>("[data-ink-desk]");
    const wordmark = hero?.querySelector<HTMLElement>("[data-hero-wordmark]");
    if (!stage || !hero || !host || !svg || !wordmark) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const fx = new URLSearchParams(location.search).get("fx");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const done = () => {
      svg.dataset.state = "done";
    };
    if (fx === "off" || nav.connection?.saveData) {
      done();
      return;
    }

    let stop: (() => void) | null = null;
    let dead = false;
    const w = window as IdleWindow;
    let idle = 0;
    const start = () => {
      idle = 0;
      if (dead || still.matches) return;
      void import("../sequence/director")
        .then(({ startSequence }) => {
          if (dead || still.matches) return;
          stop = startSequence({ hero, stage, host, svg, wordmark });
        })
        .catch(done);
    };
    const onMotion = () => {
      if (still.matches) {
        stop?.();
        stop = null;
        done();
      } else if (!stop) {
        delete svg.dataset.state;
        start();
      }
    };
    still.addEventListener("change", onMotion);
    if (still.matches) done();
    // The first stroke should follow the first paint closely: a short idle wait, not a long one.
    else if (w.requestIdleCallback) idle = w.requestIdleCallback(start, { timeout: 300 });
    else start();
    return () => {
      dead = true;
      if (idle) w.cancelIdleCallback?.(idle);
      still.removeEventListener("change", onMotion);
      stop?.();
    };
  }, []);

  return (
    <div ref={ref} className="fx-stage" aria-hidden="true">
      <div className="fx-host" />
      <MastheadSync />
    </div>
  );
}
