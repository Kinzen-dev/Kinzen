"use client";

import { useEffect, useRef, useState } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { startSoi, type CaptionKey, type Soi } from "./engine";
import { createSound, type Sound } from "./sound";
import "./soi.css";

const COPY = {
  en: {
    kicker: "Play · the soi",
    title: "A soi of agents",
    lede: "Drop a gold coin anywhere on the street. It is a task: watch the soi split it, pass it on and bring it home.",
    count: (n: string) => [n, " lanterns lit today"] as const,
    fine: "Prototype: the earlier lanterns are simulated (seeded on load), not real visitors.",
    soundOff: "Sound: off",
    soundOn: "Sound: on",
    drop: "Drop a coin",
    stage: "An ink-drawn Bangkok soi at dusk with tiny agents, stalls, a gold gate and a temple bell",
    steps: [
      "Tap the street to drop a coin.",
      "A task lands. The nearest agent picks it up.",
      "The noodle stall splits it three ways.",
      "Pieces are handed from stall to stall.",
      "The gold gate checks every piece. One is turned back to be redone.",
      "Redone, it passes.",
      "Back together at the temple: the bell rings, a lantern stays lit.",
    ],
    captions: {
      task: "task",
      split: "split × 3",
      handoff: "handoff",
      guardrail: "guardrail: turned back",
      redo: "redo",
      passes: "passes",
      merged: "merged",
      lit: "+1 lantern",
    } satisfies Record<CaptionKey, string>,
  },
  th: {
    kicker: "ลองเล่น · ซอย",
    title: "ซอยของเหล่าเอเจนต์",
    lede: "แตะที่ถนนเพื่อโยนเหรียญทอง เหรียญคืองานหนึ่งชิ้น ดูคนในซอยแบ่งงาน ส่งต่อกัน แล้วรวมกลับมาให้ครบ",
    count: (n: string) => ["วันนี้จุดโคมไปแล้ว ", n, " ดวง"] as const,
    fine: "ต้นแบบ: โคมที่จุดไว้ก่อนหน้าเป็นการจำลอง ยังไม่ใช่ผู้เข้าชมจริง",
    soundOff: "เสียง: ปิด",
    soundOn: "เสียง: เปิด",
    drop: "โยนเหรียญ",
    stage: "ซอยกรุงเทพยามค่ำวาดด้วยหมึก มีเอเจนต์ตัวเล็ก ร้านแผงลอย ประตูทอง และระฆังวัด",
    steps: [
      "แตะที่ถนนเพื่อโยนเหรียญ",
      "งานมาถึง คนที่อยู่ใกล้สุดเก็บขึ้นมา",
      "ร้านก๋วยเตี๋ยวแบ่งงานเป็นสามส่วน",
      "แต่ละส่วนถูกส่งต่อจากร้านหนึ่งไปอีกร้าน",
      "ประตูทองตรวจทุกส่วน มีชิ้นหนึ่งไม่ผ่าน ถูกส่งกลับไปทำใหม่",
      "แก้แล้วจึงผ่าน",
      "ทุกส่วนกลับมารวมกันที่วัด ระฆังดัง โคมดวงใหม่ติดค้างไว้",
    ],
    captions: {
      task: "งาน",
      split: "แบ่ง × 3",
      handoff: "ส่งต่อ",
      guardrail: "ด่านตรวจ: ส่งกลับ",
      redo: "ทำใหม่",
      passes: "ผ่าน",
      merged: "รวมครบ",
      lit: "+1 โคม",
    } satisfies Record<CaptionKey, string>,
  },
};

/** Soi of agents: an ink Bangkok soi at dusk where a dropped coin becomes a task for the street. */
export default function SoiOfAgents({ locale }: LabProps) {
  const th = locale === "th";
  const c = COPY[th ? "th" : "en"];
  const host = useRef<HTMLDivElement>(null);
  const soi = useRef<Soi | null>(null);
  const sound = useRef<Sound | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [mine, setMine] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const snd = createSound();
    sound.current = snd;
    let dead = false;
    // Captions are drawn on the canvas: wait for the site faces first.
    void document.fonts.ready.then(() => {
      if (dead) return;
      soi.current = startSoi(el, {
        captions: c.captions,
        still,
        sound: snd,
        thai: th,
        onCount: (n, m) => {
          setCount(n);
          if (m) setMine((k) => k + 1);
        },
        onStep: setStep,
      });
      el.dataset.ready = still ? "still" : "live";
    });
    return () => {
      dead = true;
      soi.current?.destroy();
      soi.current = null;
      snd.dispose();
    };
  }, [c.captions, th]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sound.current?.set(next);
  };

  const num = count === null ? "" : count.toLocaleString(th ? "th-TH" : "en-US");
  return (
    <section className="soi" data-scene="dark" aria-labelledby="soi-title">
      <div className="soi-head shell">
        <p className="soi-kicker">
          <i aria-hidden="true" />
          {nobr(c.kicker)}
        </p>
        <h2 id="soi-title" className="soi-title">
          {nobr(c.title)}
        </h2>
        <p className="soi-lede">{nobr(c.lede)}</p>
      </div>
      <div className="soi-frame">
        <div ref={host} className="soi-stage" role="img" aria-label={c.stage} />
        <p className="soi-count" aria-live="polite">
          {count !== null &&
            c.count(num).map((part, i) =>
              part === num ? (
                <b key={`${i}-${mine}`} className={mine ? "is-mine" : undefined}>
                  {num}
                </b>
              ) : (
                <span key={i}>{nobr(part)}</span>
              ),
            )}
        </p>
        <button type="button" className="soi-sound" aria-pressed={soundOn} onClick={toggleSound}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 8h3l4-3v10l-4-3H3z" />
            {soundOn ? (
              <path d="M13 7c1.3 1.6 1.3 4.4 0 6M15.5 5c2.4 2.8 2.4 7.2 0 10" />
            ) : (
              <path d="M13 8l4 4M17 8l-4 4" />
            )}
          </svg>
          {nobr(soundOn ? c.soundOn : c.soundOff)}
        </button>
      </div>
      <div className="soi-foot shell">
        <p className="soi-step" aria-live="polite">
          <span aria-hidden="true">{String(step).padStart(2, "0")}</span>
          {nobr(c.steps[step] ?? c.steps[0])}
        </p>
        <button type="button" className="soi-drop" onClick={() => soi.current?.drop()}>
          <i aria-hidden="true" />
          {nobr(c.drop)}
        </button>
        <p className="soi-fine">{nobr(c.fine)}</p>
      </div>
    </section>
  );
}
