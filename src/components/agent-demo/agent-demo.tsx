"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import "./agent-demo.css";

type Copy = Dictionary["demo"];
type Scenario = Copy["scenarios"][number];

/**
 * Stages of one scripted run. Each stage is a moment the visitor can read; the
 * delay is how long the *previous* stage holds before this one appears.
 */
const STAGES = [
  { id: "patient", hold: 0 },
  { id: "typing", hold: 700 },
  { id: "draft", hold: 1500 },
  { id: "checking", hold: 1300 },
  { id: "blocked", hold: 1300 },
  { id: "typing-reply", hold: 1400 },
  { id: "sent", hold: 1300 },
] as const;
const FINAL = STAGES.length - 1;
/** How long a finished run rests before auto-play moves on. */
const REST_MS = 7000;
const VEIL_MS = 450;

const at = (stage: number, id: (typeof STAGES)[number]["id"]) => stage >= STAGES.findIndex((s) => s.id === id);

function isField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

/**
 * "Code over prompts": a scripted, real-DOM clinic inbox. The model draft breaks a
 * clinical rule, the guard flags the span and blocks it, the safe reply is sent.
 * Labelled on screen as an illustration. Loops only while in view on a visible tab.
 */
export function AgentDemo({ copy }: { copy: Copy }) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Server render and no-JS: the finished first exchange, so the HTML carries the whole story.
  const [scenario, setScenario] = useState(0);
  const [stage, setStage] = useState<number>(FINAL);
  const [veil, setVeil] = useState<{ key: number; scenario: number; stage: number } | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [run, setRun] = useState(0);
  const started = useRef(false);
  const state = useRef({ scenario, stage });
  useEffect(() => {
    state.current = { scenario, stage };
  }, [scenario, stage]);

  const active = inView && tabVisible && !reduced;

  /** Start a run, laying a still copy of what was on screen over it so the window never blanks. */
  const play = useCallback(
    (next: number) => {
      const prev = state.current;
      setRun((r) => r + 1);
      if (reduced) {
        setVeil(null);
        setScenario(next);
        setStage(FINAL);
        return;
      }
      setVeil({ key: Date.now(), scenario: prev.scenario, stage: prev.stage });
      setScenario(next);
      setStage(0);
    },
    [reduced],
  );

  const choose = useCallback(
    (next: number) => {
      setAutoplay(false); // the visitor took the wheel
      started.current = true; // and the first-view replay must never override their pick
      play(next);
    },
    [play],
  );

  // Environment: in view, tab visible, motion preference.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(motion.matches);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    onMotion();
    onVis();
    // "In view" = a real share of the screen, not a sliver. The demo is taller than a phone,
    // so measure against the viewport as well as the element.
    const io = new IntersectionObserver(
      ([e]) =>
        setInView(
          e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.4),
        ),
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    io.observe(root);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // First time the demo is seen with motion allowed: replay the first exchange from the top.
  useEffect(() => {
    if (active && !started.current) {
      started.current = true;
      const runAtStart = state.current;
      // Deferred a frame so the replay starts as its own render, not inside this effect.
      // Skipped if the visitor picked a message in between.
      const id = requestAnimationFrame(() => {
        if (state.current === runAtStart) play(0);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [active, play]);

  // Reduced motion: whatever is selected shows its final transcript, no veil.
  useEffect(() => {
    if (!reduced) return;
    const id = requestAnimationFrame(() => {
      setStage(FINAL);
      setVeil(null);
    });
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  // Advance the script, one stage at a time, only while active.
  useEffect(() => {
    if (!active || !started.current) return;
    if (stage < FINAL) {
      const id = window.setTimeout(() => setStage((s) => Math.min(s + 1, FINAL)), STAGES[stage + 1].hold);
      return () => window.clearTimeout(id);
    }
    if (autoplay) {
      const id = window.setTimeout(() => play((state.current.scenario + 1) % copy.scenarios.length), REST_MS);
      return () => window.clearTimeout(id);
    }
  }, [active, stage, autoplay, play, copy.scenarios.length]);

  // Clear the veil after its cross-fade (CSS runs the fade; this only removes the node).
  useEffect(() => {
    if (!veil) return;
    const id = window.setTimeout(() => setVeil(null), VEIL_MS + 50);
    return () => window.clearTimeout(id);
  }, [veil]);

  // Polite outcome announcement when a run finishes (after hydration only, never on load).
  useEffect(() => {
    if (stage !== FINAL || run === 0) return;
    const s = copy.scenarios[scenario];
    const id = window.setTimeout(
      () => setAnnouncement(copy.announce.replace("{rule}", s.ruleLabel).replace("{reply}", s.reply)),
      0,
    );
    return () => window.clearTimeout(id);
  }, [stage, scenario, run, copy]);

  // Keys 1/2/3: only while the demo is in view and focus is not in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inView || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (isField(document.activeElement)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > copy.scenarios.length) return;
      e.preventDefault();
      choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inView, choose, copy.scenarios.length]);

  return (
    <div
      ref={rootRef}
      data-active={active}
      className="agent-demo grid gap-8 border-t border-rule pt-8 md:grid-cols-12 md:grid-rows-[auto_1fr] md:gap-x-6"
    >
      <div className="grid content-start gap-3 md:col-span-4 md:row-start-1">
        <h3 className="text-xl tracking-[-0.03em]">{copy.title}</h3>
        <p className="max-w-[44ch] text-ink-2">{copy.intro}</p>
      </div>

      <figure
        className="agent-demo-window m-0 border border-rule-strong bg-surface md:col-span-8 md:col-start-5 md:row-span-2 md:row-start-1"
        aria-labelledby="agent-demo-title"
      >
        <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-3">
          <span id="agent-demo-title" className="text-sm font-semibold whitespace-nowrap">
            {copy.windowTitle}
          </span>
          <span className="text-xs text-ink-2">{copy.label}</span>
        </figcaption>

        <div className="agent-demo-stack p-4 md:p-6">
          {/* Sizers: every finished exchange, invisible, so the window keeps one height. */}
          {copy.scenarios.map((s) => (
            <div key={`sizer-${s.rule}`} className="agent-demo-sizer" aria-hidden="true">
              <Transcript copy={copy} s={s} stage={FINAL} />
            </div>
          ))}
          <div className="agent-demo-live">
            <Transcript copy={copy} s={copy.scenarios[scenario]} stage={stage} key={run} />
          </div>
          {veil ? (
            <div key={veil.key} className="agent-demo-veil" aria-hidden="true">
              <Transcript copy={copy} s={copy.scenarios[veil.scenario]} stage={veil.stage} still />
            </div>
          ) : null}
        </div>
      </figure>

      <div className="grid content-start gap-5 md:col-span-4 md:row-start-2">
        <div role="group" aria-labelledby="agent-demo-choose" className="grid gap-2">
          <p id="agent-demo-choose" className="flex items-baseline justify-between gap-4 text-sm text-ink-2">
            <span>{copy.choose}</span>
            <span className="agent-demo-keyhint text-xs text-ink-3" aria-hidden="true">
              {copy.keyHint}
            </span>
          </p>
          {copy.scenarios.map((s, i) => (
            <button
              key={s.rule}
              type="button"
              aria-pressed={scenario === i}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => choose(i)}
              className="agent-demo-choice grid min-h-11 grid-cols-[auto_1fr] items-baseline gap-3 border border-rule px-4 py-3 text-left transition-colors duration-200 hover:border-rule-strong"
            >
              <kbd className="readout" aria-hidden="true">
                {i + 1}
              </kbd>
              <span>{s.choice}</span>
            </button>
          ))}
        </div>

        {!reduced ? (
          <button
            type="button"
            onClick={() => setAutoplay((a) => !a)}
            className="link min-h-11 w-fit text-sm text-ink-2"
          >
            {autoplay ? copy.pause : copy.play}
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}

function Transcript({ copy, s, stage, still }: { copy: Copy; s: Scenario; stage: number; still?: boolean }) {
  const blocked = at(stage, "blocked");
  return (
    <ol className={`agent-demo-transcript grid content-start gap-4 ${still ? "is-still" : ""}`}>
      <li className="agent-demo-msg agent-demo-patient">
        <span className="agent-demo-who">{copy.patient}</span>
        <p className="agent-demo-bubble border border-rule">{s.patient}</p>
      </li>

      {at(stage, "typing") && !at(stage, "draft") ? <Typing label={copy.typing} /> : null}

      {at(stage, "draft") ? (
        <li className="agent-demo-msg agent-demo-draft" data-blocked={blocked || undefined}>
          <span className="agent-demo-who">
            {copy.draft} <span className="text-ink-3">({copy.draftNote})</span>
          </span>
          <p className="agent-demo-bubble border border-dashed border-rule-strong">
            {s.draftBefore}
            {blocked ? (
              <del className="agent-demo-flag">{s.draftFlagged}</del>
            ) : (
              <span className={at(stage, "checking") ? "agent-demo-scan" : undefined}>{s.draftFlagged}</span>
            )}
            {s.draftAfter}
          </p>
          {at(stage, "checking") ? (
            <p className="agent-demo-guard" data-state={blocked ? "blocked" : "checking"}>
              <span className="agent-demo-dot" aria-hidden="true" />
              {blocked ? (
                <span>
                  <strong className="font-semibold">{copy.blocked}:</strong> {s.ruleLabel}{" "}
                  <code className="readout">{s.rule}</code>
                </span>
              ) : (
                <span>{copy.checking}</span>
              )}
            </p>
          ) : null}
        </li>
      ) : null}

      {at(stage, "typing-reply") && !at(stage, "sent") ? <Typing label={copy.typingReply} /> : null}

      {at(stage, "sent") ? (
        <li className="agent-demo-msg agent-demo-reply">
          <span className="agent-demo-who">{copy.sent}</span>
          <p className="agent-demo-bubble bg-ink text-ground">{s.reply}</p>
        </li>
      ) : null}
    </ol>
  );
}

/** The model's side is always on the right, so typing sits there too. */
function Typing({ label }: { label: string }) {
  return (
    <li className="agent-demo-msg agent-demo-typing agent-demo-reply">
      <span className="agent-demo-who">{label}</span>
      <span className="agent-demo-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </li>
  );
}
