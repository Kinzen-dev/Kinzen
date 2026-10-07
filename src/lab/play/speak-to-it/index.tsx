"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { COPY, SCRIPT } from "./copy";
import { check, RULES, segments } from "./rules";
import "./speak-to-it.css";

/** The slice of the Web Speech API this demo uses (not in TypeScript's DOM lib). */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noop = () => () => {};
/** False when the page's Permissions-Policy switches the microphone off (Chrome exposes this). */
const micAllowed = () => {
  const d = document as unknown as { featurePolicy?: { allowsFeature(f: string): boolean } };
  return d.featurePolicy ? d.featurePolicy.allowsFeature("microphone") : true;
};
const BARS = 32;

type Mode = "idle" | "asking" | "listening" | "script";
type Live = {
  rec?: Recognition;
  stream?: MediaStream;
  audio?: HTMLAudioElement;
  ctx?: AudioContext;
  raf?: number;
  stopping?: boolean;
};

/** Release every live resource: recognition, mic tracks, audio element, audio graph, RAF. */
function release(l: Live, bars: HTMLDivElement | null) {
  l.stopping = true;
  if (l.raf) cancelAnimationFrame(l.raf);
  try {
    l.rec?.abort();
  } catch {
    /* already stopped */
  }
  l.stream?.getTracks().forEach((t) => t.stop());
  if (l.audio) {
    l.audio.pause();
    l.audio.removeAttribute("src");
  }
  l.ctx?.close().catch(() => undefined);
  bars?.querySelectorAll("i").forEach((b) => (b.style.transform = ""));
}
type ErrKey = "notAllowed" | "network" | "noSpeech" | "other" | "policy";

export default function SpeakToIt({ locale }: { locale: Locale }) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const supported = useSyncExternalStore(
    noop,
    () => !!getCtor(),
    () => true,
  );
  const policyOk = useSyncExternalStore(noop, micAllowed, () => true);
  const [lang, setLang] = useState<"en" | "th">(locale === "th" ? "th" : "en");
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<ErrKey | null>(null);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const barsRef = useRef<HTMLDivElement>(null);
  const live = useRef<Live>({});
  const [scripted, setScripted] = useState(false);

  const text = (finalText + (interim ? (finalText ? " " : "") + interim : "")).trim();
  const hits = useMemo(() => check(text), [text]);

  const teardown = () => {
    release(live.current, barsRef.current);
    live.current = {};
  };
  useEffect(() => {
    const l = live;
    const bars = barsRef.current;
    return () => release(l.current, bars);
  }, []);

  /** Drive the level bars from an analyser. */
  const meter = (ctx: AudioContext, node: AudioNode) => {
    const an = ctx.createAnalyser();
    an.fftSize = 128;
    an.smoothingTimeConstant = 0.7;
    node.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const bars = [...(barsRef.current?.querySelectorAll("i") ?? [])];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      an.getByteFrequencyData(data);
      bars.forEach((b, i) => {
        // Mirror around the centre so the ribbon reads as a voice, not a spectrum chart.
        const k = Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
        const v = data[Math.min(data.length - 1, Math.floor(k * data.length * 0.55) + 1)] / 255;
        b.style.transform = `scaleY(${reduced ? 0.3 : Math.max(0.08, v * 1.15)})`;
      });
      live.current.raf = requestAnimationFrame(tick);
    };
    live.current.raf = requestAnimationFrame(tick);
    return an;
  };

  const startMic = async () => {
    const Ctor = getCtor();
    if (!Ctor) return;
    teardown();
    setError(null);
    setScripted(false);
    setFinalText("");
    setInterim("");
    setMode("asking");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMode("idle");
      setError("notAllowed");
      return;
    }
    const ctx = new AudioContext();
    live.current = { stream, ctx };
    meter(ctx, ctx.createMediaStreamSource(stream));

    const rec = new Ctor();
    rec.lang = lang === "th" ? "th-TH" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    let committed = "";
    let session = "";
    rec.onresult = (e) => {
      let fin = "";
      let mid = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else mid += r[0].transcript;
      }
      session = fin;
      setFinalText((committed + " " + fin).trim());
      setInterim(mid.trim());
    };
    rec.onerror = (e) => {
      const map: Record<string, ErrKey> = {
        "not-allowed": "notAllowed",
        "service-not-allowed": "notAllowed",
        network: "network",
        "no-speech": "noSpeech",
      };
      if (e.error !== "aborted") setError(map[e.error] ?? "other");
    };
    rec.onend = () => {
      // Chrome ends a session after a pause; carry the text over and keep listening until Stop.
      if (live.current.rec === rec && !live.current.stopping) {
        committed = (committed + " " + session).trim();
        session = "";
        setInterim("");
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stop */
        }
      }
      if (live.current.rec === rec) {
        teardown();
        setMode("idle");
      }
    };
    live.current.rec = rec;
    try {
      rec.start();
      setMode("listening");
    } catch {
      teardown();
      setMode("idle");
      setError("other");
    }
  };

  const stopAll = () => {
    teardown();
    setInterim("");
    setMode("idle");
  };

  const playScript = async () => {
    teardown();
    setError(null);
    setFinalText("");
    setInterim("");
    const s = SCRIPT[lang];
    const src = (await (lang === "th" ? import("./audio-th") : import("./audio-en"))).default;
    const audio = new Audio(src);
    const ctx = new AudioContext();
    const node = ctx.createMediaElementSource(audio);
    node.connect(ctx.destination);
    live.current = { audio, ctx };
    // Word boundaries, so the transcript grows a word at a time (Thai has no spaces).
    const seg = new Intl.Segmenter(lang, { granularity: "word" });
    const bounds = s.sentences.map((t) => [...seg.segment(t)].map((p) => p.index + p.segment.length));
    const total = s.seconds.reduce((a, b) => a + b, 0);
    meter(ctx, node);
    const step = () => {
      const scale = (audio.duration || total) / total;
      let t = audio.currentTime / scale;
      const parts: string[] = [];
      for (let i = 0; i < s.sentences.length; i++) {
        const d = s.seconds[i];
        if (t <= 0) break;
        const f = Math.min(1, t / (d * 0.92));
        const end = [...bounds[i]].reverse().find((b) => b <= f * s.sentences[i].length) ?? 0;
        parts.push(s.sentences[i].slice(0, end));
        t -= d;
      }
      setFinalText(parts.join(" ").trim());
      if (!audio.ended && live.current.audio === audio) requestAnimationFrame(step);
    };
    audio.onended = () => {
      setFinalText(s.sentences.join(" "));
      if (live.current.audio === audio) {
        teardown();
        setMode("idle");
      }
    };
    setMode("script");
    setScripted(true);
    try {
      await audio.play();
      requestAnimationFrame(step);
    } catch {
      // Playback refused (autoplay policy): show the whole transcript so the check still reads.
      setFinalText(s.sentences.join(" "));
      teardown();
      setMode("idle");
    }
  };

  const status =
    mode === "listening" ? c.listening : mode === "script" ? c.playing : mode === "asking" ? c.asking : null;

  return (
    <section className="sti shell" aria-labelledby="sti-title">
      <header className="sti-head">
        <p className="sti-kicker">
          <i aria-hidden="true" />
          {nobr(c.kicker)}
        </p>
        <h2 id="sti-title" className="sti-title">
          {nobr(c.title)}
        </h2>
        <p className="sti-lede">{nobr(c.lede)}</p>
      </header>

      <div className="sti-card scene-card" data-scene="dark" data-mode={mode}>
        <div className="sti-controls">
          <div className="sti-seg" role="group" aria-label={c.langLabel}>
            {(["en", "th"] as const).map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                disabled={mode !== "idle"}
                onClick={() => setLang(l)}
              >
                {l === "en" ? "English" : "ไทย"}
              </button>
            ))}
          </div>

          <div className="sti-mic-wrap">
            <button
              type="button"
              className="sti-mic"
              disabled={!supported || !policyOk || mode === "asking" || mode === "script"}
              aria-pressed={mode === "listening"}
              onClick={() => (mode === "listening" ? stopAll() : startMic())}
            >
              <svg viewBox="0 0 24 24" width={28} height={28} aria-hidden="true">
                {mode === "listening" ? (
                  <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
                ) : (
                  <path
                    d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <span>{mode === "listening" ? c.stop : mode === "asking" ? c.asking : c.start}</span>
            </button>
            <div ref={barsRef} className="sti-bars" aria-hidden="true">
              {Array.from({ length: BARS }, (_, i) => (
                <i key={i} style={{ animationDelay: `${-i * 90}ms` }} />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="sti-btn"
            data-emphasis={!supported || !policyOk || error === "notAllowed" || error === "network" || undefined}
            disabled={mode === "asking" || mode === "listening"}
            onClick={() => (mode === "script" ? stopAll() : playScript())}
          >
            {mode === "script" ? c.stopScript : c.script}
          </button>

          {supported && !policyOk ? (
            <p className="sti-privacy sti-unsupported" role="note">
              {nobr(c.errors.policy)}
            </p>
          ) : supported ? (
            <p className="sti-privacy">{nobr(c.privacy)}</p>
          ) : (
            <p className="sti-privacy sti-unsupported" role="note">
              {nobr(c.unsupported)}
            </p>
          )}
        </div>

        <div className="sti-panel">
          <div className="sti-panel-head">
            <span className="readout">{c.transcriptLabel}</span>
            {status ? (
              <span className="sti-status readout">
                <b aria-hidden="true" />
                {status}
              </span>
            ) : null}
          </div>
          <p className="sti-transcript" aria-live="polite" lang={lang}>
            {text ? (
              segments(text, hits).map((s, i) =>
                s.rule ? (
                  <mark key={i} data-rule={s.rule} title={c.rules[s.rule].name}>
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )
            ) : (
              <span className="sti-placeholder">{nobr(mode === "idle" && !error ? c.tryLine : c.placeholder)}</span>
            )}
          </p>
          {error ? (
            <p className="sti-error" role="alert">
              {nobr(c.errors[error])}
            </p>
          ) : null}

          <div className="sti-rules">
            <span className="readout">{c.rulesTitle}</span>
            <ul>
              {RULES.map((r) => {
                const n = hits.filter((h) => h.rule === r.id).length;
                return (
                  <li key={r.id} data-hit={n > 0 || undefined}>
                    <span className="sti-rule-name">
                      {nobr(c.rules[r.id].name)}
                      {n > 0 ? <b>{n}</b> : null}
                    </span>
                    <span className="sti-rule-why">{nobr(c.rules[r.id].why)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="sti-verdict" data-hit={hits.length > 0 || undefined}>
              {text ? nobr(hits.length ? c.flagged(hits.length) : c.clean) : nobr(c.note)}
            </p>
            {scripted && text ? (
              <p className="sti-foot readout">{c.scriptedNote}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
