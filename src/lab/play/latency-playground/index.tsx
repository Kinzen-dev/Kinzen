"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { PlayFrame, useReducedMotion } from "../trick-my-ai/frame";
import "./latency-playground.css";

type Mode = "streaming" | "batch";
type Stage = "stt" | "llm" | "guard" | "tts";
type Seg = { stage: Stage; start: number; end: number; speak?: boolean };
type Plan = { firstWord: number; segs: Seg[]; ticks: { stage: Stage; at: number }[] };

/** Milliseconds after the patient stops talking. Illustrative timings, not a benchmark. */
const AXIS = 3600;
const PLANS: Record<Mode, Plan> = {
  // Streaming: the transcript is ready as speech ends, the model streams, the guard checks each
  // finished sentence, and speech starts on the first checked sentence.
  streaming: {
    firstWord: 860,
    segs: [
      { stage: "stt", start: 0, end: 180 },
      { stage: "llm", start: 180, end: 1500 },
      { stage: "guard", start: 640, end: 680 },
      { stage: "guard", start: 1180, end: 1220 },
      { stage: "guard", start: 1500, end: 1540 },
      { stage: "tts", start: 680, end: 860 },
      { stage: "tts", start: 860, end: AXIS, speak: true },
    ],
    ticks: [{ stage: "llm", at: 420 }],
  },
  // Batch: every stage waits for the one before it to finish completely.
  batch: {
    firstWord: 2950,
    segs: [
      { stage: "stt", start: 0, end: 650 },
      { stage: "llm", start: 650, end: 2050 },
      { stage: "guard", start: 2050, end: 2090 },
      { stage: "tts", start: 2090, end: 2950 },
      { stage: "tts", start: 2950, end: AXIS, speak: true },
    ],
    ticks: [],
  },
};
const STAGES: Stage[] = ["stt", "llm", "guard", "tts"];
/** A tap shorter than this plays the whole sample sentence instead. */
const MIN_HOLD = 450;
const AUTO_TALK = 1900;

const AUDIO = {
  en: new URL("./reply-en.m4a", import.meta.url).href,
  th: new URL("./reply-th.m4a", import.meta.url).href,
};

const COPY = {
  en: {
    eyebrow: "Lab · interactive",
    title: "Latency playground",
    instruction:
      "Hold the button while the patient speaks, let go, and see (and hear) when the first word of the answer arrives.",
    note: "Illustrative timings to show the shape of the difference, not a benchmark of any system. The voice is synthetic (macOS text to speech), the call is fictional, and your microphone is never used.",
    hold: "Hold to talk",
    talking: "Talking…",
    working: "Answering…",
    again: "Hold to talk again",
    mode: "Pipeline",
    modes: { streaming: "Streaming", batch: "Batch" },
    sound: "Sound",
    on: "On",
    off: "Off",
    stages: { stt: "Speech to text", llm: "Model", guard: "Guard", tts: "Text to speech" },
    firstToken: "first token",
    firstWord: "first word",
    patient: "Patient",
    clinic: "Clinic AI",
    recording: (s: string) => `Recording ${s} s, transcribed when you let go`,
    utterance: "Hi, my back tooth hurts when I chew. Can I come in this week?",
    reply:
      "Thanks for calling. A dentist should check that tooth in person. I can book you for Tuesday at ten. Shall I hold that slot?",
    ttfw: "Time to first word",
    compare: "Try both pipelines to compare.",
    sec: (ms: number) => `${(ms / 1000).toFixed(2)} s`,
  },
  th: {
    eyebrow: "ห้องทดลอง · ลองเล่น",
    title: "สนามทดลองความหน่วง",
    instruction: "กดปุ่มค้างไว้ระหว่างที่คนไข้พูด แล้วปล่อย ดูและฟังว่าคำแรกของคำตอบมาถึงตอนไหน",
    note: "ตัวเลขเป็นตัวอย่างเพื่อให้เห็นรูปแบบความต่าง ไม่ใช่ผลวัดของระบบใด เสียงเป็นเสียงสังเคราะห์ (text to speech ของ macOS) สายโทรเป็นเรื่องสมมติ และไม่มีการใช้ไมโครโฟนของคุณ",
    hold: "กดค้างเพื่อพูด",
    talking: "กำลังพูด…",
    working: "กำลังตอบ…",
    again: "กดค้างเพื่อพูดอีกครั้ง",
    mode: "รูปแบบการทำงาน",
    modes: { streaming: "สตรีมมิง", batch: "ทีละขั้น" },
    sound: "เสียง",
    on: "เปิด",
    off: "ปิด",
    stages: { stt: "แปลงเสียงเป็นข้อความ", llm: "โมเดล", guard: "ชุดตรวจ", tts: "แปลงข้อความเป็นเสียง" },
    firstToken: "คำแรกจากโมเดล",
    firstWord: "คำแรกที่ได้ยิน",
    patient: "คนไข้",
    clinic: "AI ของคลินิก",
    recording: (s: string) => `กำลังอัด ${s} วินาที จะถอดเสียงเมื่อปล่อยปุ่ม`,
    utterance: "สวัสดีครับ ฟันกรามล่างปวดเวลาเคี้ยว สัปดาห์นี้มีคิวว่างไหมครับ",
    reply: "ขอบคุณที่โทรมานะคะ อาการแบบนี้ต้องให้ทันตแพทย์ตรวจที่คลินิกค่ะ ว่างวันอังคารสิบโมง จองให้เลยไหมคะ",
    ttfw: "เวลาจนได้ยินคำแรก",
    compare: "ลองทั้งสองแบบเพื่อเทียบกัน",
    sec: (ms: number) => `${(ms / 1000).toFixed(2)} วินาที`,
  },
} as const;

/** Paint the waterfall at time `now` (ms after release). Direct DOM writes: no React per frame. */
function paintLanes(root: HTMLElement | null, counter: HTMLElement | null, plan: Plan, now: number) {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-seg]").forEach((el) => {
    const s = plan.segs[Number(el.dataset.seg)];
    if (!s) return;
    const f = Math.max(0, Math.min(1, (now - s.start) / (s.end - s.start)));
    el.style.transform = `scaleX(${f})`;
  });
  root.style.setProperty("--now", String(Math.min(1, now / AXIS)));
  root.toggleAttribute("data-heard", now >= plan.firstWord);
  if (counter) counter.textContent = `${Math.round(Math.max(0, Math.min(now, AXIS)))} ms`;
}

type Phase = "idle" | "talking" | "running" | "done";

const words = (s: string, locale: Locale) =>
  locale === "th"
    ? [...new Intl.Segmenter("th", { granularity: "word" }).segment(s)].map((w) => w.segment)
    : s.split(/(?<= )/);

export default function LatencyPlayground({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("streaming");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sound, setSound] = useState(true);
  const [heard, setHeard] = useState(false);
  const [spoken, setSpoken] = useState(0);
  const [held, setHeld] = useState(0);
  const [results, setResults] = useState<Partial<Record<Mode, number>>>({});
  const [runMode, setRunMode] = useState<Mode>("streaming");

  const lanes = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const wave = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const talkStart = useRef(0);
  const audio = useRef<{ ctx: AudioContext; buffer: AudioBuffer | null; source: AudioBufferSourceNode | null } | null>(
    null,
  );
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const utterance = words(c.utterance, locale);

  // Unmount: stop the loop, timers, audio.
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      timers.current.forEach((t) => window.clearTimeout(t));
      const a = audio.current;
      audio.current = null;
      try {
        a?.source?.stop();
      } catch {}
      void a?.ctx.close();
    },
    [],
  );

  // Reduced motion: the idle view is the complete diagram for the chosen pipeline.
  useEffect(() => {
    if (reduced && phase === "idle") paintLanes(lanes.current, counter.current, PLANS[mode], AXIS);
  }, [reduced, phase, mode]);

  /** Created inside the first press (a user gesture), so the browser lets it play later. */
  const ensureAudio = () => {
    if (audio.current) {
      void audio.current.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const a = { ctx, buffer: null as AudioBuffer | null, source: null as AudioBufferSourceNode | null };
    audio.current = a;
    void fetch(AUDIO[locale])
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => {
        a.buffer = buf;
      })
      .catch(() => {});
  };

  const stopAll = () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    try {
      audio.current?.source?.stop();
    } catch {}
    if (audio.current) audio.current.source = null;
  };

  const paint = (plan: Plan, now: number) => paintLanes(lanes.current, counter.current, plan, now);

  const startTalk = () => {
    if (phase === "talking" || phase === "running") return;
    stopAll();
    ensureAudio();
    setHeard(false);
    setSpoken(0);
    setHeld(0);
    setRunMode(mode);
    setPhase("talking");
    talkStart.current = performance.now();
    if (lanes.current) paint(PLANS[mode], -1);
    // Speech: words arrive at a talking pace; the waveform moves while the button is held.
    const perWord = AUTO_TALK / utterance.length;
    const tick = () => {
      const t = performance.now() - talkStart.current;
      setSpoken(Math.min(utterance.length, Math.floor(t / perWord) + 1));
      setHeld(Math.floor(t / 100) * 100);
      if (wave.current && !reduced) {
        wave.current.querySelectorAll<HTMLElement>("i").forEach((b, i) => {
          const v = 0.25 + 0.75 * Math.abs(Math.sin(t / 90 + i * 0.7) * Math.sin(t / 230 + i * 1.3));
          b.style.transform = `scaleY(${v})`;
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const run = () => {
    cancelAnimationFrame(raf.current);
    const plan = PLANS[runMode];
    setSpoken(utterance.length);
    setPhase("running");
    if (wave.current)
      wave.current.querySelectorAll<HTMLElement>("i").forEach((b) => (b.style.transform = "scaleY(0.15)"));
    // Audio, scheduled on the audio clock for the first-word moment.
    const a = audio.current;
    if (a?.buffer && soundRef.current) {
      const src = a.ctx.createBufferSource();
      src.buffer = a.buffer;
      src.connect(a.ctx.destination);
      src.start(a.ctx.currentTime + plan.firstWord / 1000);
      a.source = src;
    }
    timers.current.push(window.setTimeout(() => setHeard(true), plan.firstWord));
    const done = () => {
      setPhase("done");
      setResults((r) => ({ ...r, [runMode]: plan.firstWord }));
    };
    if (reduced) {
      paint(plan, AXIS);
      timers.current.push(window.setTimeout(done, plan.firstWord));
      return;
    }
    const t0 = performance.now();
    const frame = () => {
      const now = performance.now() - t0;
      paint(plan, now);
      if (now < AXIS) raf.current = requestAnimationFrame(frame);
      else done();
    };
    raf.current = requestAnimationFrame(frame);
  };

  const release = () => {
    if (phase !== "talking") return;
    const t = performance.now() - talkStart.current;
    if (t < MIN_HOLD) {
      // A tap: let the sample sentence finish by itself, then release.
      timers.current.push(window.setTimeout(run, AUTO_TALK - t));
      return;
    }
    run();
  };

  const shown = phase === "idle" ? mode : runMode;
  const plan = PLANS[shown];
  const busy = phase === "talking" || phase === "running";
  const replyWords = words(c.reply, locale);

  return (
    <PlayFrame eyebrow={c.eyebrow} title={c.title} instruction={c.instruction} note={c.note}>
      <div className="lp" data-phase={phase}>
        <div className="lp-top">
          <div className="lp-opts">
            <span className="pa-label">{nobr(c.mode)}</span>
            <div className="pa-seg">
              {(["streaming", "batch"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  disabled={busy}
                  onClick={() => {
                    setMode(m);
                    if (phase === "done") {
                      setPhase("idle");
                      setHeard(false);
                      setSpoken(0);
                      paint(PLANS[m], -1);
                    }
                  }}
                >
                  {nobr(c.modes[m])}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="pa-btn lp-sound" aria-pressed={sound} onClick={() => setSound((v) => !v)}>
            {nobr(c.sound)}: {nobr(sound ? c.on : c.off)}
          </button>
        </div>

        <div className="lp-talk">
          <button
            type="button"
            className="lp-mic"
            data-active={phase === "talking" || undefined}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              startTalk();
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                startTalk();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                release();
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="lp-mic-dot" aria-hidden="true" />
            {nobr(
              phase === "talking" ? c.talking : phase === "running" ? c.working : phase === "done" ? c.again : c.hold,
            )}
          </button>
          <div className="lp-wave" ref={wave} aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>

        <div className="lp-chat" aria-live="polite">
          <div className="lp-bubble lp-patient" data-on={phase !== "idle" || undefined}>
            <span className="pa-label">{nobr(c.patient)}</span>
            <p>
              {runMode === "batch" && phase === "talking" ? (
                <span className="lp-rec">{c.recording((held / 1000).toFixed(1))}</span>
              ) : (
                (phase === "idle" ? utterance : utterance.slice(0, spoken)).join("")
              )}
            </p>
          </div>
          <div className="lp-bubble lp-clinic" data-on={heard || undefined}>
            <span className="pa-label">{nobr(c.clinic)}</span>
            <p style={{ "--pace": `${(locale === "th" ? 7400 : 6600) / replyWords.length}ms` } as CSSProperties}>
              {!heard && "…"}
              {heard &&
                replyWords.map((w, i) => (
                  <span key={i} style={{ "--i": i } as CSSProperties}>
                    {w}
                  </span>
                ))}
            </p>
          </div>
        </div>

        <div
          className="lp-lanes"
          ref={lanes}
          data-late={plan.firstWord / AXIS > 0.6 || undefined}
          style={{ "--fw": plan.firstWord / AXIS } as CSSProperties}
        >
          <div className="lp-lanes-head">
            <span className="pa-label">{nobr(c.modes[shown])}</span>
            <span className="lp-counter readout tabular" ref={counter}>
              0 ms
            </span>
          </div>
          <div className="lp-rows">
            {STAGES.map((st) => (
              <div key={`${shown}-${st}`} className="lp-lane" data-stage={st}>
                <span className="lp-lane-name">{nobr(c.stages[st])}</span>
                <div className="lp-track">
                  {plan.segs.map((s, i) =>
                    s.stage === st ? (
                      <i
                        key={i}
                        className="lp-ghost"
                        data-speak={s.speak || undefined}
                        style={{ left: `${(s.start / AXIS) * 100}%`, width: `${((s.end - s.start) / AXIS) * 100}%` }}
                      >
                        <b className="lp-seg" data-seg={i} />
                      </i>
                    ) : null,
                  )}
                  {plan.ticks
                    .filter((t) => t.stage === st)
                    .map((t) => (
                      <span key={t.at} className="lp-tick" style={{ left: `${(t.at / AXIS) * 100}%` }}>
                        {nobr(c.firstToken)}
                      </span>
                    ))}
                </div>
              </div>
            ))}
            <div className="lp-lane lp-axis-row" aria-hidden="true">
              <span />
              <div className="lp-axis">
                {[0, 1000, 2000, 3000].map((ms) => (
                  <span key={ms} style={{ left: `${(ms / AXIS) * 100}%` }}>
                    {ms / 1000} s
                  </span>
                ))}
              </div>
            </div>
            <div className="lp-overlay" aria-hidden="true">
              <div className="lp-fw">
                <span>
                  {nobr(c.firstWord)} · {c.sec(plan.firstWord)}
                </span>
              </div>
              <div className="lp-cursor" />
            </div>
          </div>
        </div>

        <div className="lp-compare">
          <span className="pa-label">{nobr(c.ttfw)}</span>
          {(["streaming", "batch"] as Mode[]).map((m) => (
            <div key={m} className="lp-cmp" data-mode={m} data-has={results[m] !== undefined || undefined}>
              <span className="lp-cmp-name">{nobr(c.modes[m])}</span>
              <span className="lp-cmp-bar">
                <i style={{ width: results[m] ? `${(results[m] / AXIS) * 100}%` : 0 }} />
              </span>
              <span className="lp-cmp-val readout tabular">{results[m] ? c.sec(results[m]) : "·"}</span>
            </div>
          ))}
          {Object.keys(results).length < 2 && <p className="lp-hint">{nobr(c.compare)}</p>}
        </div>
      </div>
    </PlayFrame>
  );
}
