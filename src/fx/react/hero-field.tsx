"use client";

import { useEffect, useRef } from "react";
import { startHeroStage } from "../stage/hero-stage";

/**
 * The canvas and its lifecycle. Loaded lazily by HeroFx; owns nothing but the GL stage.
 * Each effect run creates its own canvas: a WebGL context that was lost on cleanup can never
 * be reacquired from the same element (React StrictMode runs effects twice in development).
 */
export default function HeroField({ onOff }: { onOff: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const offRef = useRef(onOff);

  useEffect(() => {
    offRef.current = onOff;
  }, [onOff]);

  useEffect(() => {
    const host = ref.current;
    const stage = host?.parentElement;
    const hero = stage?.closest<HTMLElement>("[data-hero]");
    const wordmark = hero?.querySelector<HTMLElement>("[data-hero-wordmark]");
    if (!host || !stage || !hero || !wordmark) return;
    const canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    host.appendChild(canvas);
    const stop = startHeroStage({ hero, stage, canvas, wordmark }, () => offRef.current());
    return () => {
      stop();
      canvas.remove();
    };
  }, []);

  return <div ref={ref} className="fx-host" />;
}
