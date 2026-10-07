"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { loadMotion } from "@/motion/gsap";
import { PlayFrame, useInView, useReducedMotion } from "../trick-my-ai/frame";
import { judge, type RuleId } from "../trick-my-ai/rules";
import { addBubble, createSmash } from "./smash";
import "./hype-smash.css";

const COPY = {
  en: {
    eyebrow: "Lab · interactive",
    title: "Hype smash",
    instruction:
      "Drop a phrase onto the guard bar: overstated claims and cure promises shatter, safe lines reach the patient's LINE chat.",
    note: "Simplified illustration: the same small EN/TH phrase rules as Trick my AI, running in your browser. The clinic and the messages are fictional; this is not the production rule set.",
    ready: "Ready-made",
    own: "Your own phrase",
    placeholder: "e.g. Whitening that lasts forever",
    drop: "Drop it",
    blocked: "blocked",
    passed: "reached the patient",
    guard: "Guard",
    chat: "Moonbeam Dental (fictional)",
    hello: "Hi, do you do teeth whitening?",
    tray: "Blocked by the guard",
    phrases: [
      "Cures sensitivity 100%",
      "Open Saturday 9:00 to 17:00",
      "Best clinic in Bangkok",
      "A dentist will check it first",
      "Painless, guaranteed",
      "Free parking behind the clinic",
      "#1 whitening in Thailand",
      "Take 2 painkillers tonight",
      "We can book you Tuesday at 10",
    ],
  },
  th: {
    eyebrow: "ห้องทดลอง · ลองเล่น",
    title: "ทุบคำโฆษณาเกินจริง",
    instruction:
      "ปล่อยข้อความลงบนแถบชุดตรวจ คำอวดอ้างเกินจริงและคำสัญญาว่ารักษาหายจะแตกกระจาย ส่วนข้อความที่ปลอดภัยจะไปถึงแชท LINE ของคนไข้",
    note: "ตัวอย่างแบบย่อ: ใช้กฎคำไทยและอังกฤษชุดเล็กชุดเดียวกับ “ลองหลอก AI ของผมดู” ทำงานในเบราว์เซอร์ของคุณ คลินิกและข้อความเป็นเรื่องสมมติ ไม่ใช่ชุดกฎที่ใช้งานจริง",
    ready: "ข้อความสำเร็จรูป",
    own: "พิมพ์ข้อความเอง",
    placeholder: "เช่น ฟันขาวถาวร ไม่กลับมาเหลือง",
    drop: "ปล่อยลงไป",
    blocked: "ถูกบล็อก",
    passed: "ถึงคนไข้",
    guard: "ชุดตรวจ",
    chat: "คลินิกทันตกรรมแสงจันทร์ (สมมติ)",
    hello: "สวัสดีครับ ที่คลินิกมีฟอกสีฟันไหมครับ",
    tray: "ชุดตรวจบล็อกไว้",
    phrases: [
      "รักษาเสียวฟันหายขาด 100%",
      "เปิดวันเสาร์ 9:00 ถึง 17:00",
      "คลินิกที่ดีที่สุดในกรุงเทพฯ",
      "ทันตแพทย์จะตรวจให้ก่อนค่ะ",
      "ไม่เจ็บเลย รับประกัน",
      "มีที่จอดรถหลังคลินิกค่ะ",
      "ฟอกสีฟันอันดับ 1 ในไทย",
      "กินยาแก้ปวด 2 เม็ดก่อนนอน",
      "จองคิววันอังคาร 10 โมงได้ค่ะ",
    ],
  },
} as const;

type Engine = ReturnType<typeof createSmash>;
type Blocked = { text: string; rules: RuleId[]; key: number };

export default function HypeSmash({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const reduced = useReducedMotion();
  const inputId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [own, setOwn] = useState("");
  const [count, setCount] = useState({ blocked: 0, passed: 0 });
  const [tray, setTray] = useState<Blocked[]>([]);
  const inView = useInView(stage, 0.45);
  const autoplayed = useRef(false);

  // The chat opens with the patient's question, in every mode.
  useEffect(() => {
    const el = chat.current;
    if (!el) return;
    el.replaceChildren();
    addBubble(el, c.hello, "in");
  }, [c.hello]);

  // Motion: load GSAP + Physics2D + Flip once, build the engine; tear it all down on unmount.
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    void Promise.all([loadMotion(), import("gsap/Physics2DPlugin"), import("gsap/Flip")]).then(
      ([{ gsap }, { Physics2DPlugin }, { Flip }]) => {
        if (!alive || !stage.current || !layer.current || !bar.current || !chat.current) return;
        gsap.registerPlugin(Physics2DPlugin, Flip);
        engine.current = createSmash(
          { stage: stage.current, layer: layer.current, bar: bar.current, chat: chat.current },
          gsap,
          Flip,
          {
            onResult: (_t, v) =>
              setCount((n) => (v.pass ? { ...n, passed: n.passed + 1 } : { ...n, blocked: n.blocked + 1 })),
          },
        );
        setReady(true);
      },
    );
    return () => {
      alive = false;
      engine.current?.destroy();
      engine.current = null;
      setReady(false);
    };
  }, [reduced]);

  // First time on screen with motion: three phrases fall by themselves (about 4 s), then it waits.
  useEffect(() => {
    if (!ready || !inView || autoplayed.current) return;
    const timers = [0, 1, 2].map((i) =>
      window.setTimeout(
        () => {
          autoplayed.current = true;
          engine.current?.drop(c.phrases[i]);
        },
        300 + i * 1100,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [ready, inView, c.phrases]);

  /** Reduced motion: the verdict lands at once (blocked tray or chat), nothing moves. */
  const placeStill = (text: string) => {
    const v = judge(text);
    if (v.pass) {
      if (chat.current) addBubble(chat.current, text, "out");
      setCount((n) => ({ ...n, passed: n.passed + 1 }));
    } else {
      setTray((t) => [{ text, rules: v.fired, key: Date.now() + Math.random() }, ...t].slice(0, 3));
      setCount((n) => ({ ...n, blocked: n.blocked + 1 }));
    }
  };

  // Reduced motion opens as a composed still: two blocked phrases in the tray, one safe line sent.
  const seeded = useRef(false);
  useEffect(() => {
    if (!reduced || seeded.current) return;
    // The flag is set when the seed lands (not before), so a remount that cancels the timer reseeds.
    const id = window.setTimeout(() => {
      seeded.current = true;
      [c.phrases[0], c.phrases[2], c.phrases[1]].forEach(placeStill);
    }, 0);
    return () => window.clearTimeout(id);
  }, [reduced, c.phrases]);

  const drop = (text: string) => {
    if (!text.trim()) return;
    if (reduced) placeStill(text.trim().slice(0, 60));
    else engine.current?.drop(text);
  };

  return (
    <PlayFrame eyebrow={c.eyebrow} title={c.title} instruction={c.instruction} note={c.note}>
      <div className="hs">
        <div className="hs-stage" ref={stage}>
          <p className="hs-count readout" aria-live="polite">
            <span className="hs-count-bad">
              <b className="tabular">{count.blocked}</b> {nobr(c.blocked)}
            </span>
            <span className="hs-count-ok">
              <b className="tabular">{count.passed}</b> {nobr(c.passed)}
            </span>
          </p>
          {reduced && tray.length > 0 && (
            <ul className="hs-tray" aria-label={c.tray}>
              {tray.map((b) => (
                <li key={b.key}>
                  <s>{b.text}</s>
                  <code>✕ {b.rules.join(" · ")}</code>
                </li>
              ))}
            </ul>
          )}
          <div className="hs-bar" ref={bar}>
            <span className="hs-bar-label">{nobr(c.guard)}</span>
          </div>
          <div className="hs-phone">
            <p className="hs-phone-head">
              <span className="hs-avatar" aria-hidden="true" />
              {nobr(c.chat)}
              <span className="hs-line">LINE</span>
            </p>
            <div className="hs-chat" ref={chat} aria-live="polite" />
          </div>
          <div className="hs-layer" ref={layer} aria-hidden="true" />
        </div>

        <div className="hs-controls">
          <div className="hs-chips" role="group" aria-label={c.ready}>
            <span className="pa-label">{nobr(c.ready)}</span>
            {c.phrases.map((p) => (
              <button key={p} type="button" className="pa-chip" onClick={() => drop(p)} disabled={!reduced && !ready}>
                {nobr(p)}
              </button>
            ))}
          </div>
          <form
            className="hs-form"
            onSubmit={(e) => {
              e.preventDefault();
              drop(own);
              setOwn("");
            }}
          >
            <label htmlFor={inputId} className="pa-label">
              {nobr(c.own)}
            </label>
            <div className="hs-form-row">
              <input
                id={inputId}
                className="hs-input"
                value={own}
                maxLength={60}
                placeholder={c.placeholder}
                onChange={(e) => setOwn(e.target.value)}
              />
              <button type="submit" className="pa-btn" data-primary="" disabled={!own.trim() || (!reduced && !ready)}>
                {nobr(c.drop)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PlayFrame>
  );
}
