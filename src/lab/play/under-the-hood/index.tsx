"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { createReveal } from "./reveal";
import "./under-the-hood.css";

/** Fictional clinic, patients and messages. */
const COPY = {
  en: {
    kicker: "Play · reveal",
    title: "What's under the hood",
    lede: "Rub the screen to wipe the polish away and see the system that runs it. It heals on its own.",
    show: "Show the blueprint",
    hide: "Hide the blueprint",
    rub: "Rub here",
    fictional: "Fictional clinic and patients",
    stage: "A clinic inbox mockup over its architecture drawing",
    desc: "Underneath: caller through Twilio and LINE user through the LINE Messaging API, into a Fastify service in TypeScript with SQLite, a model call, then the reply rule checks, and the reply goes back on the channel it came in on.",
    clinic: "Riverside Dental",
    tabs: ["Inbox", "Calls", "Bookings"],
    threads: [
      { n: "Ploy S.", ch: "LINE", m: "Can I move my cleaning to Saturday?", t: "09:12" },
      { n: "Anan K.", ch: "Call", m: "Asked about a braces consult", t: "08:47" },
      { n: "Nok P.", ch: "LINE", m: "Thank you! See you Tuesday", t: "Yest." },
      { n: "Wilai T.", ch: "Call", m: "Recall: 6-month check-up", t: "Yest." },
    ],
    chat: [
      { who: "in", text: "Hi, can I move my cleaning to Saturday?" },
      { who: "out", text: "Saturday 10:30 is open. Shall I book it for you?" },
      { who: "in", text: "Yes please" },
    ],
    booked: "Booked · Sat 10:30 · Scale and polish",
    handling: "Assistant is handling this chat",
    ai: "Assistant",
  },
  th: {
    kicker: "ลองเล่น · เปิดดูข้างใน",
    title: "ข้างใต้หน้าจอมีอะไร",
    lede: "ถูหน้าจอเพื่อลบความสวยงามออก แล้วดูระบบที่ทำงานอยู่ข้างใต้ สักพักหน้าจอจะกลับมาเอง",
    show: "เปิดดูแบบระบบ",
    hide: "ปิดแบบระบบ",
    rub: "ถูตรงนี้",
    fictional: "คลินิกและคนไข้สมมติ",
    stage: "หน้าจอกล่องข้อความคลินิกที่วางทับแบบโครงระบบ",
    desc: "ข้างใต้: ผู้โทรผ่าน Twilio และผู้ใช้ LINE ผ่าน LINE Messaging API เข้าบริการ Fastify ที่เขียนด้วย TypeScript พร้อม SQLite เรียกโมเดล ผ่านชุดตรวจคำตอบตามกฎ แล้วตอบกลับทางช่องทางเดิม",
    clinic: "คลินิกทันตกรรมริมน้ำ",
    tabs: ["กล่องข้อความ", "สายโทร", "การจอง"],
    threads: [
      { n: "พลอย ส.", ch: "LINE", m: "ขอเลื่อนขูดหินปูนเป็นวันเสาร์ได้ไหมคะ", t: "09:12" },
      { n: "อนันต์ ก.", ch: "โทร", m: "สอบถามเรื่องปรึกษาจัดฟัน", t: "08:47" },
      { n: "นก พ.", ch: "LINE", m: "ขอบคุณค่ะ เจอกันวันอังคาร", t: "เมื่อวาน" },
      { n: "วิไล ท.", ch: "โทร", m: "โทรติดตาม: ตรวจฟันครบ 6 เดือน", t: "เมื่อวาน" },
    ],
    chat: [
      { who: "in", text: "สวัสดีค่ะ ขอเลื่อนขูดหินปูนเป็นวันเสาร์ได้ไหมคะ" },
      { who: "out", text: "วันเสาร์ 10:30 ว่างค่ะ จองให้เลยไหมคะ" },
      { who: "in", text: "ได้ค่ะ" },
    ],
    booked: "จองแล้ว · เสาร์ 10:30 · ขูดหินปูน",
    handling: "ผู้ช่วยกำลังดูแลแชทนี้",
    ai: "ผู้ช่วย",
  },
};

export default function UnderTheHood({ locale }: { locale: Locale }) {
  const th = locale === "th";
  const c = COPY[th ? "th" : "en"];
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<ReturnType<typeof createReveal>>(null);
  const [hold, setHold] = useState(false);
  const [rubbed, setRubbed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    let dead = false;
    const font = getComputedStyle(root).fontFamily || "sans-serif";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.fonts
      .load(`600 15px ${font}`, th ? "ชุดตรวจคำตอบ" : "Reply")
      .catch(() => undefined)
      .then(() => {
        if (dead) return;
        api.current = createReveal(canvas, { reduced, th, font, onRub: () => setRubbed(true) });
      });
    return () => {
      dead = true;
      api.current?.destroy();
      api.current = null;
    };
  }, [th]);

  return (
    <section ref={rootRef} className="uth shell" aria-labelledby="uth-title">
      <header className="uth-head">
        <p className="uth-kicker">
          <i aria-hidden="true" />
          {nobr(c.kicker)}
        </p>
        <h2 id="uth-title" className="uth-title">
          {nobr(c.title)}
        </h2>
        <p className="uth-lede">{nobr(c.lede)}</p>
      </header>

      <figure className="uth-card">
        <div className="uth-screen">
        <div className="uth-ui" aria-hidden="true">
          <div className="uth-top">
            <span className="uth-logo" />
            <strong>{c.clinic}</strong>
            <nav>
              {c.tabs.map((t, i) => (
                <span key={t} data-on={i === 0 || undefined}>
                  {t}
                  {i === 0 ? <b>4</b> : null}
                </span>
              ))}
            </nav>
          </div>
          <div className="uth-body">
            <ul className="uth-list">
              {c.threads.map((t, i) => (
                <li key={t.n} data-on={i === 0 || undefined}>
                  <span className="uth-av">{t.n.slice(0, 1)}</span>
                  <span className="uth-row">
                    <span className="uth-name">{t.n}</span>
                    <span className="uth-msg">{t.m}</span>
                  </span>
                  <span className="uth-meta">
                    <span>{t.t}</span>
                    <span className="uth-ch" data-ch={t.ch === "LINE" ? "line" : "call"}>
                      {t.ch}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="uth-chat">
              <div className="uth-chat-head">
                <span className="uth-av">{c.threads[0].n.slice(0, 1)}</span>
                <span>
                  <strong>{c.threads[0].n}</strong>
                  <span className="uth-ch" data-ch="line">
                    LINE
                  </span>
                </span>
              </div>
              <div className="uth-msgs">
                {c.chat.map((m, i) => (
                  <p key={i} className="uth-bubble" data-who={m.who}>
                    {m.who === "out" ? <span className="uth-ai">{c.ai}</span> : null}
                    {m.text}
                  </p>
                ))}
                <p className="uth-booked">{c.booked}</p>
              </div>
              <div className="uth-composer">
                <span className="uth-dot" />
                {c.handling}
              </div>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="uth-canvas" role="img" aria-label={c.stage} aria-describedby="uth-desc" />
        {!rubbed && !hold ? (
          <span className="uth-rub" aria-hidden="true">
            {c.rub}
          </span>
        ) : null}
        </div>
        <figcaption className="uth-cap">
          <span className="readout">{c.fictional}</span>
          <button
            type="button"
            className="uth-btn"
            aria-pressed={hold}
            onClick={() => {
              const next = !hold;
              setHold(next);
              api.current?.setHold(next);
            }}
          >
            {hold ? c.hide : c.show}
          </button>
        </figcaption>
        <p id="uth-desc" className="sr-only">
          {c.desc}
        </p>
      </figure>
    </section>
  );
}
