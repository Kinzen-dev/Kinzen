"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nobr } from "@/lib/thai-nodes";
import type { LabProps } from "../../types";
import { bangkokHours, clockText, skyAt } from "./clock";
import { copyFor, type SpotId } from "./copy";
import type { CallState, Engine } from "./engine";
import { AgentSheet } from "./sheet";
import "./night-desk.css";

const CLIPS = {
  en: new URL("./greet-en.m4a", import.meta.url).href,
  th: new URL("./greet-th.m4a", import.meta.url).href,
};
const SPOTS: SpotId[] = ["monitor", "phone", "lamp", "window", "cat"];

export default function NightDesk({ locale }: LabProps) {
  const th = locale === "th";
  const c = copyFor(locale);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLElement>(null);
  const phase = useRef<HTMLElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const spots = useRef<Partial<Record<SpotId, HTMLButtonElement | null>>>({});
  const engine = useRef<Engine | null>(null);
  const [mode, setMode] = useState<{ phone: boolean; still: boolean } | null>(null);
  const [focus, setFocus] = useState<SpotId | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sound, setSound] = useState(false);
  const [call, setCall] = useState<CallState>({ state: "idle", words: 0 });
  const [lapse, setLapse] = useState(false);
  const [touched, setTouched] = useState(false);
  const [failed, setFailed] = useState(false);
  const words = useMemo(() => c.greeting.split(" "), [c.greeting]);
  // The Bangkok minute is read on the client only (no hydration mismatch); the engine keeps it live after.
  const [initial, setInitial] = useState<{ text: string; phase: keyof typeof c.phase } | null>(null);

  useEffect(() => {
    const read = () => {
      const h = bangkokHours();
      setInitial((v) => v ?? { text: clockText(h), phase: skyAt(h).phase });
      setMode({
        phone: matchMedia("(pointer: coarse)").matches || innerWidth < 768,
        still: matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    };
    read();
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    const h = host.current;
    const cv = canvas.current;
    if (!h || !cv || !mode) return;
    let dead = false;
    const probe = document.createElement("span");
    probe.style.fontFamily = "var(--font-mono)";
    h.appendChild(probe);
    const font = getComputedStyle(probe).fontFamily || "ui-monospace, Menlo, monospace";
    probe.remove();
    void import("./engine")
      .then(({ createNightDesk }) => {
        if (dead) return;
        engine.current = createNightDesk({
          canvas: cv,
          host: h,
          phone: mode.phone,
          still: mode.still,
          font,
          clipUrl: th ? CLIPS.th : CLIPS.en,
          words: words.length,
          noteLabel: `call ${clockText(bangkokHours())}`,
          els: { clock: clock.current, phase: phase.current, ring: ring.current, spots: spots.current },
          phaseLabel: (p) => c.phase[p],
          onFocus: setFocus,
          onSheet: () => setSheet(true),
          onCall: setCall,
          onLapse: setLapse,
        });
      })
      .catch(() => setFailed(true));
    return () => {
      dead = true;
      engine.current?.destroy();
      engine.current = null;
    };
    // The engine is rebuilt only when the device mode or the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, th]);

  const act = (s: SpotId) => {
    setTouched(true);
    engine.current?.activate(s);
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    void engine.current?.setSound(next);
  };
  const caption = call.state === "idle" && call.words === 0 ? "" : words.slice(0, call.words).join(" ");

  return (
    <section className="nd shell" aria-labelledby="nd-title" lang={th ? "th" : "en"}>
      <header className="nd-head">
        <p className="nd-kicker">
          <i aria-hidden="true" />
          {nobr(c.kicker)}
        </p>
        <h2 id="nd-title" className="nd-title">
          {nobr(c.title)}
        </h2>
        <p className="nd-lede">{nobr(c.lede)}</p>
      </header>

      <figure className="nd-figure">
        <div
          ref={host}
          className="nd-stage"
          data-scene="dark"
          data-mode={mode ? (mode.still ? "still" : mode.phone ? "phone" : "desk") : "boot"}
          data-focus={focus ?? undefined}
          data-phase={initial?.phase}
          onPointerDown={() => setTouched(true)}
        >
          <canvas ref={canvas} className="nd-canvas" role="img" aria-label={c.stage} />

          <div className="nd-hud">
            <button
              type="button"
              className="nd-clock"
              onClick={() => engine.current?.timeLapse()}
              aria-label={`${lapse ? c.live : c.timeLapse}`}
              title={lapse ? c.live : c.timeLapse}
            >
              <b ref={clock}>{initial?.text ?? "--:--"}</b>
              <span>{nobr(c.city)}</span>
              <span className="nd-phase" ref={phase}>
                {initial ? c.phase[initial.phase] : ""}
              </span>
              <svg viewBox="0 0 16 16" aria-hidden="true" data-lapse={lapse || undefined}>
                <path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7M2.6 2.4v3.8h3.8" />
              </svg>
            </button>
            <button type="button" className="nd-sound" aria-pressed={sound} aria-label={sound ? c.soundOn : c.soundOff} onClick={toggleSound}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 8h3l4-3.5v11L6 12H3z" />
                {sound ? <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5a7 7 0 0 1 0 10" /> : <path d="M13.5 8l4 4m0-4l-4 4" />}
              </svg>
              <span>{sound ? nobr(c.soundOn) : nobr(c.soundOff)}</span>
            </button>
          </div>

          {SPOTS.map((s) => (
            <button
              key={s}
              ref={(el) => {
                spots.current[s] = el;
              }}
              type="button"
              className="nd-spot"
              data-spot={s}
              data-hidden="true"
              aria-label={c.spots[s]}
              onClick={() => act(s)}
            >
              <i aria-hidden="true" />
              <span>{nobr(c.short[s])}</span>
            </button>
          ))}
          <span ref={ring} className="nd-ring" data-on="false" data-hidden="true" aria-hidden="true">
            <svg viewBox="0 0 60 40">
              <path d="M8 6c-6 8-6 20 0 28M16 11c-3.5 5-3.5 13 0 18M44 11c3.5 5 3.5 13 0 18M52 6c6 8 6 20 0 28" />
            </svg>
          </span>

          {focus ? (
            <button type="button" className="nd-back" onClick={() => engine.current?.back()}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3L5 8l5 5" />
              </svg>
              {nobr(c.back)}
            </button>
          ) : null}

          <p className="nd-caption" aria-live="polite" data-on={call.state !== "idle" || undefined}>
            {call.state !== "idle" ? (
              <>
                <span className="nd-caption-who">{nobr(c.calling)}</span>
                <span>{caption ? nobr(caption) : "…"}</span>
              </>
            ) : null}
          </p>

          <p className="nd-hint" data-off={touched || focus !== null || undefined} aria-hidden="true">
            {mode?.phone || mode?.still ? nobr(c.hintPhone) : nobr(c.hint)}
          </p>
          {failed ? <p className="nd-fail">WebGL is not available on this device.</p> : null}
        </div>
        <figcaption className="nd-cap">
          <span>{nobr(c.fictional)}</span>
        </figcaption>
      </figure>

      {sheet ? (
        <AgentSheet
          copy={c}
          still={!!mode?.still}
          onClose={() => {
            setSheet(false);
            spots.current.monitor?.focus();
          }}
        />
      ) : null}
    </section>
  );
}
