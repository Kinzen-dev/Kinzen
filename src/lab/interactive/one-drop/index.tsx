"use client";

import { useEffect, useRef, useState } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { createBowl, type Bowl } from "./engine";
import { createPlinker, type Plinker } from "./sound";
import "./one-drop.css";

const COPY = {
  en: {
    line: "Leave a drop. Everyone who came today is in here.",
    hint: "Tap to let a drop fall. Hold for a heavier one.",
    fine: "Prototype: the earlier drops are simulated, not real visitors.",
    soundOff: "Sound: off",
    soundOn: "Sound: on",
    drop: "Leave a drop",
    stage: "A bowl of dark water with gold drops",
  },
  th: {
    line: "ฝากไว้สักหยด ทุกคนที่แวะมาวันนี้อยู่ในนี้",
    hint: "แตะเพื่อหยด กดค้างไว้ให้หยดหนักขึ้น",
    fine: "ต้นแบบ: หยดเก่าในชามเป็นการจำลอง ยังไม่ใช่ผู้เข้าชมจริง",
    soundOff: "เสียง: ปิด",
    soundOn: "เสียง: เปิด",
    drop: "ปล่อยหยดทอง",
    stage: "ชามน้ำสีเข้มกับหยดทอง",
  },
};

/** One drop: a bowl of dark water; a touch lets a gold drop fall and bloom among the day's others. */
export default function OneDrop({ locale }: LabProps) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const bowl = useRef<Bowl | null>(null);
  const plinker = useRef<Plinker | null>(null);
  const soundOn = useRef(false);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const el = host.current;
    const sec = section.current;
    if (!el || !sec) return;
    const b = createBowl(el, sec, {
      onImpact: (w, small) => {
        if (soundOn.current) plinker.current?.plink(w, small);
      },
    });
    bowl.current = b;
    if (!b) {
      sec.dataset.ready = "none";
      return;
    }
    sec.dataset.ready = "webgl";
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
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      el.removeEventListener("contextmenu", menu);
      b.destroy();
      bowl.current = null;
      plinker.current?.close();
      plinker.current = null;
    };
  }, []);

  const toggleSound = () => {
    const next = !soundOn.current;
    // The audio context is made on the first switch-on (a user gesture), never before.
    if (next && !plinker.current) plinker.current = createPlinker();
    soundOn.current = next;
    setSound(next);
  };

  const keyDrop = () => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.35;
    bowl.current?.dropAt(Math.cos(a) * r, Math.sin(a) * r, 0.25 + Math.random() * 0.35);
  };

  return (
    <section ref={section} className="od" data-scene="dark" aria-labelledby="od-line">
      <header className="od-head shell">
        <h2 id="od-line" className="od-line">
          {nobr(c.line)}
        </h2>
        <p className="od-hint">{nobr(c.hint)}</p>
      </header>
      <div ref={host} className="od-stage" role="img" aria-label={c.stage} />
      <footer className="od-foot shell">
        <div className="od-actions">
          <button type="button" className="od-btn" onClick={keyDrop}>
            <i aria-hidden="true" />
            {nobr(c.drop)}
          </button>
          <button type="button" className="od-btn od-sound" aria-pressed={sound} onClick={toggleSound}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 8h3l4-3.5v11L6 12H3z" />
              {sound ? <path className="od-wave" d="M13 7.2c1 .8 1.5 1.8 1.5 2.8s-.5 2-1.5 2.8M15 5.2c1.6 1.3 2.4 3 2.4 4.8s-.8 3.5-2.4 4.8" /> : <path className="od-wave" d="M13.5 8l4 4M17.5 8l-4 4" />}
            </svg>
            {nobr(sound ? c.soundOn : c.soundOff)}
          </button>
        </div>
        <p className="od-fine">{nobr(c.fine)}</p>
      </footer>
    </section>
  );
}
