"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { loadMotion } from "@/motion/gsap";
import { PlayFrame, useReducedMotion } from "../trick-my-ai/frame";
import "./call-to-booking.css";

type Fact = "name" | "issue" | "time";
type Part = string | { fact: Fact; text: string };
type Line = { who: "ai" | "caller"; parts: Part[] };

const FACTS: Fact[] = ["name", "issue", "time"];
/** Fictional call length shown on the scrubber. */
const CALL_SECONDS = 70;

const COPY = {
  en: {
    eyebrow: "Lab · interactive",
    title: "A call becomes a booking",
    instruction:
      "Drag the scrubber through a phone call and watch the name, the problem and the time lift into the booking card.",
    note: "Fictional call, clinic and patient, scripted on this page: nothing is recognised, recorded or sent.",
    head: "Call · Moonbeam Dental (fictional)",
    who: { ai: "Clinic AI", caller: "Caller" },
    lines: [
      { who: "ai", parts: ["Moonbeam Dental, this is the clinic assistant. How can I help?"] },
      { who: "caller", parts: ["Hi, this is ", { fact: "name", text: "Napat Srisuk" }, ". I'd like to book a visit."] },
      { who: "ai", parts: ["Of course. What's bothering you?"] },
      { who: "caller", parts: [{ fact: "issue", text: "My lower left back tooth hurts when I chew" }, "."] },
      { who: "ai", parts: ["Thank you. When would suit you?"] },
      { who: "caller", parts: [{ fact: "time", text: "Tuesday morning, around ten" }, ", if possible."] },
      { who: "ai", parts: ["Noted. The team will confirm the slot by LINE."] },
    ] as Line[],
    card: "Booking request",
    fields: { name: "Patient", issue: "Concern", time: "Preferred time" },
    values: { name: "Napat Srisuk", issue: "Lower left back tooth hurts when chewing", time: "Tue · around 10:00" },
    listening: "Listening…",
    ready: "Ready for staff to confirm",
    play: "Play the call",
    pause: "Pause",
    scrub: "Call position",
    before: "Call",
    after: "Booking",
    view: "Show",
  },
  th: {
    eyebrow: "ห้องทดลอง · ลองเล่น",
    title: "สายโทรเข้ากลายเป็นใบจองคิว",
    instruction:
      "ลากแถบเลื่อนไปตามบทสนทนาทางโทรศัพท์ แล้วดูชื่อ อาการ และเวลาที่สะดวก ลอยออกมาเติมลงในใบจองคิว",
    note: "สายโทร คลินิก และคนไข้เป็นเรื่องสมมติ บทสนทนาเตรียมไว้ในหน้านี้ ไม่มีการถอดเสียง บันทึก หรือส่งข้อมูลออกไป",
    head: "สายโทรเข้า · คลินิกทันตกรรมแสงจันทร์ (สมมติ)",
    who: { ai: "AI ของคลินิก", caller: "ผู้โทร" },
    lines: [
      { who: "ai", parts: ["คลินิกทันตกรรมแสงจันทร์ สวัสดีค่ะ มีอะไรให้ช่วยไหมคะ"] },
      { who: "caller", parts: ["สวัสดีครับ ชื่อ", { fact: "name", text: "ณภัทร ศรีสุข" }, "ครับ อยากจองคิวครับ"] },
      { who: "ai", parts: ["ได้เลยค่ะ มีอาการอะไรคะ"] },
      { who: "caller", parts: [{ fact: "issue", text: "ฟันกรามล่างซ้ายปวดเวลาเคี้ยว" }, "ครับ"] },
      { who: "ai", parts: ["ขอบคุณค่ะ สะดวกวันไหนคะ"] },
      { who: "caller", parts: [{ fact: "time", text: "วันอังคารช่วงเช้า ประมาณสิบโมง" }, "ครับ"] },
      { who: "ai", parts: ["รับทราบค่ะ เดี๋ยวพนักงานยืนยันคิวทาง LINE นะคะ"] },
    ] as Line[],
    card: "คำขอจองคิว",
    fields: { name: "ชื่อคนไข้", issue: "อาการที่แจ้ง", time: "เวลาที่สะดวก" },
    values: { name: "ณภัทร ศรีสุข", issue: "ปวดฟันกรามล่างซ้ายเวลาเคี้ยว", time: "อังคาร · ประมาณ 10:00" },
    listening: "กำลังฟัง…",
    ready: "รอพนักงานยืนยันคิว",
    play: "เล่นสายนี้",
    pause: "หยุด",
    scrub: "ตำแหน่งในสาย",
    before: "บทสนทนา",
    after: "ใบจองคิว",
    view: "ดู",
  },
} as const;

/** Decorative waveform bars (deterministic, so server and client agree). */
const WAVE = Array.from({ length: 64 }, (_, i) =>
  Math.round(18 + 70 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.23) * (i % 9 < 6 ? 1 : 0.35))),
);

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Gsap = Awaited<ReturnType<typeof loadMotion>>["gsap"];

/**
 * The whole call as one paused timeline: lines arrive, each fact is highlighted where it was said,
 * a copy of it flies along an arc (MotionPath) into its field, the field fills. The scrubber sets
 * the timeline's progress, so dragging back un-does everything exactly.
 */
function buildTimeline(gsap: Gsap, root: HTMLElement, fly: HTMLElement) {
  const q = <T extends Element>(s: string) => [...root.querySelectorAll<T>(s)];
  const lines = q<HTMLElement>(".cb-line");
  fly.replaceChildren();
  gsap.set([...lines, ...q(".cb-fact"), ...q(".cb-row"), ...q(".cb-val"), ...q(".cb-empty"), ...q(".cb-status > *")], {
    clearProps: "all",
  });
  const box = root.getBoundingClientRect();
  const rel = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
  let t = 0;
  lines.forEach((line, i) => {
    if (i > 0) {
      tl.fromTo(line, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, t);
      tl.to(lines[i - 1], { opacity: 0.72, duration: 0.4 }, t);
    }
    t += 0.7;
    for (const span of line.querySelectorAll<HTMLElement>(".cb-fact")) {
      const fact = span.dataset.fact as Fact;
      const row = root.querySelector<HTMLElement>(`.cb-row[data-field="${fact}"]`);
      const val = row?.querySelector<HTMLElement>(".cb-val");
      const empty = row?.querySelector<HTMLElement>(".cb-empty");
      if (!row || !val || !empty) continue;
      const from = rel(span);
      const to = rel(val);
      const clone = document.createElement("span");
      clone.className = "cb-clone";
      clone.textContent = span.textContent;
      clone.style.left = `${from.x}px`;
      clone.style.top = `${from.y}px`;
      fly.appendChild(clone);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const bend = Math.min(110, len * 0.35);
      const mid = { x: dx / 2 + (dy / len) * bend, y: dy / 2 - (dx / len) * bend };

      tl.fromTo(span, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.35 }, t);
      tl.fromTo(clone, { opacity: 0, scale: 1 }, { opacity: 1, scale: 1.06, duration: 0.2 }, t + 0.3);
      tl.fromTo(
        clone,
        { x: 0, y: 0 },
        {
          motionPath: { path: [{ x: 0, y: 0 }, mid, { x: dx, y: dy }], curviness: 1.4 },
          duration: 1,
          ease: "power2.inOut",
        },
        t + 0.35,
      );
      tl.to(clone, { scale: 0.92, duration: 0.5, ease: "power1.in" }, t + 0.85);
      tl.to(clone, { opacity: 0, duration: 0.18 }, t + 1.3);
      tl.to(empty, { opacity: 0, duration: 0.15 }, t + 1.25);
      tl.fromTo(
        val,
        { opacity: 0, clipPath: "inset(0 100% 0 0)" },
        { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: 0.45, ease: "power2.out" },
        t + 1.28,
      );
      tl.fromTo(row, { "--glow": 0 }, { "--glow": 1, duration: 0.2 }, t + 1.28);
      tl.to(row, { "--glow": 0, duration: 0.8 }, t + 1.5);
      t += 1.1;
    }
  });
  const [draft, ready] = q<HTMLElement>(".cb-status > *");
  tl.to(draft, { opacity: 0, y: -8, duration: 0.3 }, t);
  tl.fromTo(ready, { opacity: 0, y: 8, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(2)" }, t + 0.1);
  tl.set({}, {}, t + 0.8);
  return tl;
}

export default function CallToBooking({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const reduced = useReducedMotion();
  const rangeId = useId();
  const root = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const api = useRef<{ scrub: (p: number) => void; toggle: () => void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [after, setAfter] = useState(true);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let cleanup = () => {};
    void Promise.all([loadMotion(), import("gsap/MotionPathPlugin")]).then(([{ gsap }, { MotionPathPlugin }]) => {
      const el = root.current;
      const flyEl = fly.current;
      if (!alive || !el || !flyEl) return;
      gsap.registerPlugin(MotionPathPlugin);
      let tl = buildTimeline(gsap, el, flyEl);
      let scrubTween: gsap.core.Tween | null = null;
      const sync = () => {
        const p = tl.progress();
        const r = range.current;
        if (r) {
          if (document.activeElement !== r) r.value = String(Math.round(p * 1000));
          r.style.setProperty("--p", String(p));
        }
        if (time.current) time.current.textContent = `${clock(p * CALL_SECONDS)} / ${clock(CALL_SECONDS)}`;
      };
      const wire = () => {
        tl.eventCallback("onUpdate", sync);
        tl.eventCallback("onComplete", () => setPlaying(false));
      };
      wire();
      sync();
      api.current = {
        scrub: (p) => {
          tl.pause();
          setPlaying(false);
          scrubTween?.kill();
          scrubTween = gsap.to(tl, { progress: p, duration: 0.45, ease: "power3.out", onUpdate: sync });
        },
        toggle: () => {
          scrubTween?.kill();
          if (tl.isActive() && !tl.paused()) {
            tl.pause();
            setPlaying(false);
            return;
          }
          if (tl.progress() >= 0.999) tl.progress(0);
          tl.timeScale(0.8).play();
          setPlaying(true);
        },
      };
      // Layout changes (resize, fonts, orientation): re-measure and rebuild at the same position.
      let frame = 0;
      let lastW = el.clientWidth;
      const ro = new ResizeObserver(() => {
        if (el.clientWidth === lastW) return;
        lastW = el.clientWidth;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const p = tl.progress();
          const wasPlaying = !tl.paused();
          scrubTween?.kill();
          tl.kill();
          tl = buildTimeline(gsap, el, flyEl);
          wire();
          tl.progress(p);
          if (wasPlaying) tl.timeScale(0.8).play();
        });
      });
      ro.observe(el);
      cleanup = () => {
        ro.disconnect();
        cancelAnimationFrame(frame);
        scrubTween?.kill();
        tl.kill();
        api.current = null;
      };
    });
    return () => {
      alive = false;
      cleanup();
    };
  }, [reduced]);

  const still = reduced ? (after ? "after" : "before") : undefined;

  return (
    <PlayFrame eyebrow={c.eyebrow} title={c.title} instruction={c.instruction} note={c.note}>
      <div className="cb" ref={root} data-still={still}>
        <div className="cb-call">
          <p className="cb-head">
            <span className="cb-live" aria-hidden="true" />
            {nobr(c.head)}
          </p>
          <ol className="cb-lines">
            {c.lines.map((line, i) => (
              <li key={i} className="cb-line" data-who={line.who}>
                <span className="cb-who">{nobr(c.who[line.who])}</span>
                <p>
                  {line.parts.map((p, j) =>
                    typeof p === "string" ? (
                      <span key={j}>{nobr(p)}</span>
                    ) : (
                      <span key={j} className="cb-fact" data-fact={p.fact}>
                        {p.text}
                      </span>
                    ),
                  )}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="cb-card">
          <p className="cb-card-head">
            <span className="pa-label">{nobr(c.card)}</span>
            <span className="cb-status">
              <span className="cb-draft">{nobr(c.listening)}</span>
              <span className="cb-ready">✓ {nobr(c.ready)}</span>
            </span>
          </p>
          <dl className="cb-fields">
            {FACTS.map((f) => (
              <div key={f} className="cb-row" data-field={f}>
                <dt>{nobr(c.fields[f])}</dt>
                <dd>
                  <span className="cb-empty" aria-hidden="true" />
                  <span className="cb-val">{nobr(c.values[f])}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="cb-scrub">
          {reduced ? (
            <div className="cb-toggle">
              <span className="pa-label">{nobr(c.view)}</span>
              <div className="pa-seg">
                <button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>
                  {nobr(c.before)}
                </button>
                <button type="button" aria-pressed={after} onClick={() => setAfter(true)}>
                  {nobr(c.after)}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className="pa-btn cb-play" onClick={() => api.current?.toggle()}>
                <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
                {nobr(playing ? c.pause : c.play)}
              </button>
              <div className="cb-range">
                <label htmlFor={rangeId} className="pa-label">
                  {nobr(c.scrub)}
                </label>
                <div className="cb-track">
                  <span className="cb-wave" aria-hidden="true">
                    {WAVE.map((h, i) => (
                      <i key={i} style={{ height: `${h}%` }} />
                    ))}
                  </span>
                  <input
                    id={rangeId}
                    ref={range}
                    type="range"
                    min={0}
                    max={1000}
                    step={10}
                    defaultValue={0}
                    onInput={(e) => api.current?.scrub(Number(e.currentTarget.value) / 1000)}
                  />
                </div>
              </div>
              <span className="cb-time readout tabular" ref={time}>
                {`${clock(0)} / ${clock(CALL_SECONDS)}`}
              </span>
            </>
          )}
        </div>
        <div className="cb-fly" ref={fly} aria-hidden="true" />
      </div>
    </PlayFrame>
  );
}
