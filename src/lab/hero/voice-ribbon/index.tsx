"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { Banner } from "../b-banner/banner";
import { useFpsProbe, useReducedMotion, watchVisible } from "../b-banner/hooks";
import "./voice-ribbon.css";

/* ------------------------------------------------------------------
   A gold ribbon that moves with a short synthetic Thai demo call (macOS
   `say -v Kanya`, a fictional clinic booking a scale and clean). The
   visitor taps Play (never autoplay); a Web Audio AnalyserNode feeds the
   ribbon (loudness swells it, the spectrum ripples its strands, the
   speaker tints it) while the transcript types itself in step with the
   audio clock. Captions ship as WebVTT tracks on the audio element, and
   the full transcript is in the DOM for screen readers.
   ------------------------------------------------------------------ */

const AUDIO = new URL("./call.m4a", import.meta.url).href;
const VTT_TH = new URL("./call.th.vtt", import.meta.url).href;
const VTT_EN = new URL("./call.en.vtt", import.meta.url).href;

type Who = "ai" | "caller";
type Cue = { start: number; end: number; who: Who; th: string; en: string };

/** Cue times measured from the generated audio (each line trimmed, 0.6 s between turns). */
const CUES: Cue[] = [
  { start: 0.4, end: 3.754, who: "ai", th: "สวัสดีค่ะ คลินิกทันตกรรมใบบัวค่ะ", en: "Hello, Baibua Dental Clinic." },
  { start: 4.354, end: 7.749, who: "caller", th: "สวัสดีค่ะ อยากจองคิวขูดหินปูนค่ะ", en: "Hi, I'd like to book a scale and clean." },
  {
    start: 8.349,
    end: 12.772,
    who: "ai",
    th: "ได้ค่ะ วันอังคารนี้ สิบโมงครึ่ง สะดวกไหมคะ",
    en: "Sure. This Tuesday at 10:30, does that work?",
  },
  { start: 13.372, end: 14.118, who: "caller", th: "สะดวกค่ะ", en: "That works." },
  {
    start: 14.718,
    end: 18.441,
    who: "ai",
    th: "จองให้แล้วนะคะ เดี๋ยวส่งรายละเอียดทาง LINE ให้ค่ะ",
    en: "You're booked. I'll send the details on LINE.",
  },
];

const UI: Record<
  Locale,
  {
    play: string;
    pause: string;
    again: string;
    aria: string;
    meta: string;
    who: Record<Who, string>;
    hint: string;
    transcript: string;
  }
> = {
  en: {
    play: "Play demo call",
    pause: "Pause",
    again: "Play again",
    aria: "Play a 19 second demo call in Thai",
    meta: "Synthetic voice · fictional clinic · Thai",
    who: { ai: "Clinic AI", caller: "Caller" },
    hint: "Tap play: the ribbon follows the voice, the transcript types itself.",
    transcript: "Transcript of the demo call",
  },
  th: {
    play: "ฟังตัวอย่างสาย",
    pause: "หยุด",
    again: "ฟังอีกครั้ง",
    aria: "ฟังตัวอย่างสายภาษาไทย ยาว 19 วินาที",
    meta: "เสียงสังเคราะห์ · คลินิกสมมติ",
    who: { ai: "ผู้ช่วย AI", caller: "คนไข้" },
    hint: "กดฟัง แล้วเส้นสีทองจะขยับตามเสียง พร้อมข้อความที่ขึ้นตามเสียงพูด",
    transcript: "ข้อความถอดจากสายตัวอย่าง",
  },
};

const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "grapheme" }) : null;
const graphemes = (s: string) => (seg ? Array.from(seg.segment(s), (g) => g.segment) : Array.from(s));

type Phase = "idle" | "playing" | "paused" | "ended";

function Voice({ locale }: { locale: Locale }) {
  const ui = UI[locale];
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const lines = useRef<HTMLOListElement>(null);
  const graph = useRef<{ ctx: AudioContext; an: AnalyserNode; src: MediaElementAudioSourceNode } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const reduced = useReducedMotion();
  useFpsProbe("voice-ribbon");

  /* ----- the ribbon + transcript loop (one rAF; paused off screen) ----- */
  useEffect(() => {
    const c = canvas.current;
    const a = audio.current;
    const list = lines.current;
    if (!c || !a || !list || reduced === null) return;
    const g = c.getContext("2d");
    if (!g) return;
    const parts = CUES.map((cue) => graphemes(cue.th));
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-cue]"));
    const shown = CUES.map(() => -1);

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const freq = new Uint8Array(512);
    const wave = new Uint8Array(1024);
    let level = 0; // smoothed loudness 0..1
    let tint = 0; // 0 = clinic AI (gold), 1 = caller (cream)
    const bands = [0, 0, 0, 0];
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let running = false;

    const draw = (dt: number) => {
      const an = graph.current?.an;
      const playing = !a.paused && !a.ended;
      let target = 0;
      if (an && playing) {
        an.getByteTimeDomainData(wave);
        let sum = 0;
        for (let i = 0; i < wave.length; i++) {
          const v = (wave[i] - 128) / 128;
          sum += v * v;
        }
        target = Math.min(1, Math.sqrt(sum / wave.length) * 5.5);
        an.getByteFrequencyData(freq);
        const edges = [2, 8, 24, 64, 160];
        for (let b = 0; b < 4; b++) {
          let s = 0;
          for (let i = edges[b]; i < edges[b + 1]; i++) s += freq[i];
          const v = s / (edges[b + 1] - edges[b]) / 255;
          bands[b] += (v - bands[b]) * 0.18;
        }
      } else {
        for (let b = 0; b < 4; b++) bands[b] *= 0.94;
      }
      // Fast attack, slow release: the ribbon swells with a syllable and settles after it.
      level += (target - level) * (target > level ? 0.35 : 0.07);
      const now = a.currentTime;
      const cue = CUES.find((q) => now >= q.start - 0.05 && now <= q.end + 0.3);
      if (cue) tint += ((cue.who === "caller" ? 1 : 0) - tint) * 0.06;
      t += dt * (0.55 + level * 1.6);

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      const mid = h / 2;
      const amp = h * (0.07 + level * 0.36);
      const strands = 7;
      const step = Math.max(4, w / 180);
      // Gold for the clinic's voice, a warm cream for the caller.
      const r = Math.round(226 + 22 * tint);
      const gg = Math.round(178 + 50 * tint);
      const bb = Math.round(92 + 110 * tint);
      for (let s = 0; s < strands; s++) {
        const k = s / (strands - 1) - 0.5; // -0.5..0.5 across the ribbon
        g.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const u = x / w;
          const env = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 1.6;
          const twist = Math.sin(u * 3.2 + t * 0.9) * 0.9 + Math.sin(u * 7.1 - t * 1.3 + s * 0.3) * 0.35;
          const ripple =
            Math.sin(u * 23 + t * 4 + s * 0.8) * bands[2] * 0.5 + Math.sin(u * 41 - t * 6 + s) * bands[3] * 0.45;
          const y = mid + env * (amp * twist + amp * 0.55 * k * Math.cos(u * 4 + t) + h * 0.12 * ripple * (0.4 + level));
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        const edge = 1 - Math.abs(k) * 1.6;
        g.strokeStyle = `rgba(${r},${gg},${bb},${(0.18 + 0.5 * edge * (0.45 + level)).toFixed(3)})`;
        g.lineWidth = 1 + edge * 1.6;
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";

      // Transcript: graphemes revealed in step with the audio clock (never ahead of the voice).
      for (let i = 0; i < CUES.length; i++) {
        const q = CUES[i];
        const row = rows[i];
        if (!row) continue;
        const p = Math.min(1, Math.max(0, (now - q.start) / (q.end - q.start)));
        const n = now < q.start ? 0 : Math.ceil(parts[i].length * p);
        const state = n === 0 ? "wait" : p < 1 ? "live" : "done";
        if (n !== shown[i] || state !== row.dataset.state) {
          shown[i] = n;
          const text = row.querySelector<HTMLElement>(".vr-text");
          if (text) text.textContent = parts[i].slice(0, n).join("");
          row.dataset.state = state;
          // Phones show one line: the newest one that has started.
          const current = rows.reduce((k, r2, j) => (r2.dataset.state === "wait" ? k : j), -1);
          rows.forEach((r2, j) => r2.toggleAttribute("data-current", j === current));
        }
      }
    };

    const frame = (nowMs: number) => {
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      draw(dt);
      raf = requestAnimationFrame(frame);
    };
    if (reduced) {
      // A composed still: the ribbon at rest, the full transcript shown.
      draw(0);
      for (let i = 0; i < CUES.length; i++) {
        const row = rows[i];
        const text = row?.querySelector<HTMLElement>(".vr-text");
        if (row && text) {
          text.textContent = CUES[i].th;
          row.dataset.state = "done";
          row.toggleAttribute("data-current", i === CUES.length - 1);
        }
      }
      const redraw = () => draw(0);
      ro.disconnect();
      const ro2 = new ResizeObserver(() => {
        resize();
        redraw();
      });
      ro2.observe(c);
      return () => ro2.disconnect();
    }
    const stopWatch = watchVisible(c, (v) => {
      if (v && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!v && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    return () => {
      stopWatch();
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced]);

  /* ----- audio element events -> phase ----- */
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onPlay = () => setPhase("playing");
    const onPause = () => setPhase(a.ended ? "ended" : "paused");
    const onEnded = () => setPhase("ended");
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.pause();
      const gr = graph.current;
      graph.current = null;
      if (gr) {
        gr.src.disconnect();
        gr.an.disconnect();
        void gr.ctx.close();
      }
    };
  }, []);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused && !a.ended) {
      a.pause();
      return;
    }
    // The audio graph is built on the first tap (a user gesture, so the context may start).
    if (!graph.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const src = ctx.createMediaElementSource(a);
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.72;
        src.connect(an);
        an.connect(ctx.destination);
        graph.current = { ctx, an, src };
      }
    }
    void graph.current?.ctx.resume();
    if (a.ended || phase === "ended") a.currentTime = 0;
    void a.play();
  }, [phase]);

  const label = phase === "playing" ? ui.pause : phase === "ended" ? ui.again : ui.play;
  return (
    <div className="vr-host" data-phase={phase}>
      <div className="vr-head">
        <button type="button" className="vr-play" onClick={toggle} aria-label={phase === "playing" ? ui.pause : ui.aria}>
          <span className="vr-play-icon" aria-hidden="true">
            {phase === "playing" ? (
              <svg viewBox="0 0 16 16" width="14" height="14">
                <rect x="3" y="2.5" width="3.4" height="11" rx="1" />
                <rect x="9.6" y="2.5" width="3.4" height="11" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path d="M4.5 2.6v10.8c0 .6.7 1 1.2.6l8-5.4a.7.7 0 0 0 0-1.2l-8-5.4c-.5-.4-1.2 0-1.2.6z" />
              </svg>
            )}
          </span>
          {nobr(label)}
        </button>
        <span className="vr-meta">{nobr(ui.meta)}</span>
      </div>
      <canvas ref={canvas} className="vr-canvas" aria-hidden="true" />
      <p className="vr-hint" aria-hidden="true">
        {nobr(ui.hint)}
      </p>
      <ol ref={lines} className="vr-lines" aria-hidden="true">
        {CUES.map((q, i) => (
          <li key={i} data-cue={i} data-who={q.who} data-state="wait" lang="th">
            <span className="vr-who">{ui.who[q.who]}</span>
            <span className="vr-text" />
            {locale === "en" ? <span className="vr-gloss">{q.en}</span> : null}
          </li>
        ))}
      </ol>
      {/* Screen readers get the whole call as text; the typed copy above is decoration. */}
      <div className="sr-only">
        <p>{ui.transcript}</p>
        <ol>
          {CUES.map((q, i) => (
            <li key={i}>
              {ui.who[q.who]}: <span lang="th">{q.th}</span>
              {locale === "en" ? ` (${q.en})` : null}
            </li>
          ))}
        </ol>
      </div>
      <audio ref={audio} src={AUDIO} preload="none">
        <track kind="captions" src={VTT_TH} srcLang="th" label="ไทย" default={locale === "th"} />
        <track kind="subtitles" src={VTT_EN} srcLang="en" label="English" default={locale === "en"} />
      </audio>
    </div>
  );
}

export default function VoiceRibbon({ locale }: { locale: Locale }) {
  return <Banner id="vr" locale={locale} stage={<Voice locale={locale} />} />;
}
