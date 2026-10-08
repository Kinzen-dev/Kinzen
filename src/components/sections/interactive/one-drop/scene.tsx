"use client";

import { useEffect, useRef } from "react";
import { nobr } from "@/lib/thai-nodes";
import type { SceneProps } from "../types";
import { createBowl, type Bowl } from "./engine";
import { createPlinker } from "./sound";
import "./one-drop.css";

const COPY = {
  en: { drop: "Leave a drop", stage: "A bowl of dark water with gold drops blooming in it" },
  th: { drop: "ปล่อยหยดทอง", stage: "ชามน้ำสีเข้มกับหยดทองที่ค่อย ๆ บานออก" },
};

/** One drop: a bowl of dark water; a touch lets a gold drop fall and bloom among the earlier ones (lab-ix-c, ported). */
export default function OneDrop({ locale, onReady, onFail }: SceneProps) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const scene = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const bowl = useRef<Bowl | null>(null);

  useEffect(() => {
    const el = host.current;
    const sec = scene.current;
    if (!el || !sec) return;
    const plinker = createPlinker();
    const b = createBowl(el, sec, { onImpact: (w, small) => plinker.plink(w, small) });
    if (!b || b === "software") {
      plinker.stop();
      onFail?.(b ?? "none");
      return;
    }
    bowl.current = b;
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => onReady?.())));
    let pid = -1;
    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      pid = e.pointerId;
      b.press(e.clientX, e.clientY);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId === pid) b.move(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      b.release();
    };
    // A scroll that starts on the bowl (touch) cancels the bead instead of dropping it.
    const cancel = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      b.cancel();
    };
    const menu = (e: Event) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    el.addEventListener("contextmenu", menu);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      el.removeEventListener("contextmenu", menu);
      b.destroy();
      plinker.stop();
      bowl.current = null;
    };
    // Mounted once per visit of the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyDrop = () => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.35;
    bowl.current?.dropAt(Math.cos(a) * r, Math.sin(a) * r, 0.25 + Math.random() * 0.35);
  };

  return (
    <div ref={scene} className="od" data-scene="dark">
      <div ref={host} className="od-stage" role="img" aria-label={c.stage} />
      <button type="button" className="od-btn" onClick={keyDrop}>
        <i aria-hidden="true" />
        {nobr(c.drop)}
      </button>
    </div>
  );
}
