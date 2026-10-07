"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { YimwhanCopy } from "@/i18n/v3/yimwhan";
import { StickyStage } from "@/motion/sticky-stage";
import { nobr } from "@/lib/thai-nodes";

const STEPS = 5;
const LAST = STEPS - 1;

/** On from a given beat onward (cumulative), so the last beat is the whole story. */
const on = (step: number, from: number) => (step >= from ? "" : undefined);

/**
 * Scroll position (in beats, 0..5) where an element starts to reveal. CSS turns it into a
 * scroll-linked reveal (`--r` from `--p`), so every beat keeps moving while the visitor scrolls.
 */
const at = (k: number) => ({ "--k": round(k) }) as CSSProperties;
/** Short decimals in the inline styles (long float tails also trip the output's phone-number guard). */
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The five-beat story. Scroll progress picks the beat (StickyStage); each beat flips data
 * attributes and CSS transitions do the motion (transform and opacity only), so nothing on the page
 * re-flows while the visitor scrolls (CLS 0). Two compositions share the beat state, chosen by a
 * container query on the room the mockup gets: the full one (back office window with queue and
 * conversation, plus the patient's LINE phone) and a compact one (one card per beat, whole items
 * only, nothing under 10.5px). The mockups are decorative (aria-hidden); the beat list is the text.
 */
export function YimwhanStage({ copy }: { copy: YimwhanCopy }) {
  const [step, setStep] = useState(LAST);
  const [live, setLive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const m = copy.mock;
  const failed = m.checks.find((c) => !c.pass);

  // Looping details (waveform, typing dots, live dots) run only while the stage is on screen.
  // The beat also follows the stage's own data-step, which StickyStage sets when the runtime
  // starts mid-page (above the scene, progress 0, it fires no update).
  useEffect(() => {
    const el = rootRef.current;
    const stage = el?.parentElement;
    if (!el || !stage) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el);
    const read = () => {
      const n = Number(stage.dataset.step);
      if (Number.isInteger(n)) setStep(Math.max(0, Math.min(LAST, n)));
    };
    const mo = new MutationObserver(read);
    mo.observe(stage, { attributes: true, attributeFilter: ["data-step"] });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  // Full composition: the transcript and the phone chat sit on their bottom edge like real chats,
  // the newest item last. Measured on beat change and resize only.
  useLayoutEffect(() => {
    const aim = () => {
      fit(feedRef.current, step);
      fit(chatRef.current, step);
    };
    aim();
    const ro = new ResizeObserver(aim);
    if (feedRef.current) ro.observe(feedRef.current);
    if (chatRef.current) ro.observe(chatRef.current);
    return () => ro.disconnect();
  }, [step]);

  const status = (
    <span className="yw-status">
      {m.status.map((s, i) => (
        <span key={s} className="yw-status-chip" data-on={i === step || undefined} data-n={i}>
          <span className="yw-dot" />
          {nobr(s)}
        </span>
      ))}
    </span>
  );
  const lights = (
    <span className="yw-lights">
      <i />
      <i />
      <i />
    </span>
  );
  const patientWho = (
    <span className="yw-who">
      <span className="yw-rec" />
      {nobr(m.transcript)} · {nobr(m.patient)} · {m.patientTime}
    </span>
  );
  // Beat 3: the draft types itself in, then the guard's gold scan line runs under the flagged words.
  const draftBubble = (
    <span className="yw-bubble">
      {m.draftBefore ? <Words text={m.draftBefore} from={2.05} to={2.15} /> : null}
      <span className="yw-flag">
        <Words parts={m.draftFlaggedWords} from={2.1} to={2.35} scan={[2.5, 2.9]} />
      </span>
      <Words text={m.draftAfter} from={2.35} to={2.45} />
    </span>
  );
  const draftWho = (
    <span className="yw-who">
      {nobr(m.draft)} <span className="yw-faint">({nobr(m.notSent)})</span>
    </span>
  );
  const verdict = (k: number) => (
    <span className="yw-verdict yw-pop" style={at(k)}>
      {nobr(m.blocked)} · <span className="yw-mono">{failed?.rule}</span>
    </span>
  );
  const sentWho = (
    <span className="yw-who yw-who-sent">
      {nobr(m.sent)} <span className="yw-tick">{"✓✓"}</span>
    </span>
  );
  const callStrip = (state: "auto" | "live") => (
    <span className="yw-call" data-on={state === "live" ? "" : on(step, 1)}>
      <span className="yw-call-head">
        <PhoneIcon />
        <span className="yw-swap">
          <span data-show={state === "live" ? undefined : step === 0 || undefined}>{nobr(m.incoming)}</span>
          <span data-show={state === "live" ? "" : step >= 1 || undefined}>{nobr(m.call)}</span>
        </span>
        <span className="yw-call-time tabular">{m.callTime}</span>
      </span>
      <span className="yw-call-body">
        <span className="yw-wave">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
        <span className="yw-swap">
          <span className="yw-caller tabular" data-show={state === "live" ? undefined : step === 0 || undefined}>
            {m.caller}
          </span>
          <span className="yw-caption" data-show={state === "live" ? "" : step >= 1 || undefined}>
            <Words text={m.caption} from={1.05} to={1.55} />
          </span>
        </span>
      </span>
    </span>
  );
  const row = (r: (typeof m.rows)[number], i: number, extra?: string, k?: number) => (
    <span
      key={r.name}
      className={`yw-row ${extra ?? ""} ${k === undefined ? "" : "yw-r"}`}
      data-new={i === 0 || undefined}
      style={k === undefined ? undefined : at(k)}
    >
      <span className="yw-row-top">
        <span className="yw-tag" data-ch={r.channel === "LINE" ? "line" : "call"}>
          {nobr(r.channel)}
        </span>
        <span className="yw-row-name">{nobr(r.name)}</span>
        <span className="yw-row-time tabular">{r.time}</span>
      </span>
      <span className="yw-row-sum">{nobr(r.summary)}</span>
      <span className="yw-pill" data-state={i === 0 ? "new" : "done"}>
        {nobr(r.status)}
      </span>
    </span>
  );

  return (
    <StickyStage steps={STEPS} vh={85} label={copy.stageLabel} className="yw-track" stageClassName="yw-stage">
      <div
        ref={rootRef}
        className="yw-stage-grid"
        data-step={step}
        data-live={live || undefined}
        style={{ "--step": step } as CSSProperties}
      >
        <ol className="yw-beats">
          {copy.beats.map((b, i) => (
            <li key={i} className="yw-beat" data-on={i === step || undefined} data-past={i < step || undefined}>
              <span className="yw-progress" aria-hidden="true">
                <span className="yw-count tabular">
                  <span className="yw-count-now">{String(i + 1).padStart(2, "0")}</span>
                  <span className="yw-count-of">&nbsp;/&nbsp;{String(STEPS).padStart(2, "0")}</span>
                </span>
                <span className="yw-segs">
                  {copy.beats.map((_, n) => (
                    <span key={n} className="yw-seg" style={{ "--i": n } as CSSProperties} />
                  ))}
                </span>
              </span>
              <p className="yw-beat-n readout">
                {nobr(copy.step)} {i + 1}
              </p>
              <h4 className="yw-beat-title">{nobr(b.title)}</h4>
              {/* Fills with the scroll inside this beat, so the page never feels stuck between beats. */}
              <span className="yw-beat-meter" aria-hidden="true" />
              <p className="yw-beat-text">{nobr(b.text)}</p>
              {b.stat ? <p className="yw-beat-stat">{nobr(b.stat)}</p> : null}
            </li>
          ))}
        </ol>

        <div className="yw-mock-area">
          <div className="yw-frame">
            <span className="yw-illus-at">
              <span className="yw-illus">{nobr(copy.illustration)}</span>
            </span>
            <div className="yw-mock" aria-hidden="true">
              {/* ================= full composition ================= */}
              <div className="yw-full">
                <div className="yw-win">
                  <div className="yw-win-bar">
                    {lights}
                    <span className="yw-win-title">
                      {nobr(m.window)} · {nobr(m.clinic)}
                    </span>
                    <span className="yw-chip yw-chip-ok">
                      <span className="yw-dot yw-pulse" />
                      {nobr(m.aiOn)}
                    </span>
                  </div>
                  <div className="yw-win-body">
                    <nav className="yw-rail">
                      <span className="yw-brand-mark">y</span>
                      {/* Two items only: the phone overlaps the lower rail, so nothing may sit there. */}
                      {[0, 1].map((i) => (
                        <span key={i} className="yw-rail-item" data-active={i === 1 || undefined}>
                          <NavIcon i={i} />
                          {i === 1 ? <span className="yw-badge" data-on={on(step, 4)} style={at(4.6)} /> : null}
                        </span>
                      ))}
                    </nav>

                    <div className="yw-queue">
                      <p className="yw-kicker">{nobr(m.cases)}</p>
                      <p className="yw-h">
                        {nobr(m.queue)}
                        <span className="yw-live">
                          <span className="yw-dot yw-dot-red yw-pulse" />
                          {nobr(m.live)} 2
                        </span>
                      </p>
                      {callStrip("auto")}
                      <div className="yw-rows" data-on={on(step, 4)} style={at(4.3)}>
                        {m.rows.map((r, i) => row(r, i))}
                      </div>
                    </div>

                    <div className="yw-pane">
                      <div className="yw-pane-head">
                        <span className="yw-pane-title">
                          {nobr(m.conversation)}
                          <span className="yw-tag" data-ch="line">
                            LINE
                          </span>
                        </span>
                        {status}
                      </div>
                      <div className="yw-feed-view">
                        <div ref={feedRef} className="yw-feed">
                          {m.history.map((h) => (
                            <span key={h.day} className="yw-hist">
                              <span className="yw-day" data-at="-1" data-on="">
                                {nobr(h.day)}
                              </span>
                              <span className="yw-msg yw-msg-old" data-at="-1" data-on="">
                                <span className="yw-bubble">{nobr(h.question)}</span>
                              </span>
                              <span className="yw-msg yw-msg-old yw-msg-ai" data-at="-1" data-on="">
                                <span className="yw-bubble">{nobr(h.answer)}</span>
                              </span>
                            </span>
                          ))}
                          <span className="yw-day" data-at="-1" data-on="">
                            {nobr(m.today)}
                          </span>
                          <Item from={0} step={step} k={0.1} className="yw-msg yw-msg-patient">
                            {patientWho}
                            <span className="yw-bubble">
                              <Words text={m.message} from={0.15} to={0.6} />
                            </span>
                          </Item>
                          <Item from={2} step={step} className="yw-msg yw-msg-draft">
                            {draftWho}
                            {draftBubble}
                          </Item>
                          <Item from={3} step={step} k={3.02} className="yw-guard">
                            <span className="yw-guard-head">
                              <ShieldIcon />
                              {nobr(m.guard)}
                              {verdict(3.75)}
                            </span>
                            {m.checks.map((c, i) => (
                              <span
                                key={c.rule}
                                className="yw-check yw-r"
                                data-pass={c.pass || undefined}
                                style={at(3.2 + i * 0.18)}
                              >
                                <span className="yw-check-icon">{c.pass ? "✓" : "✕"}</span>
                                <span className="yw-check-label">{nobr(c.label)}</span>
                                <span className="yw-mono">{c.rule}</span>
                              </span>
                            ))}
                          </Item>
                          <Item from={4} step={step} k={4.02} className="yw-msg yw-msg-reply">
                            {sentWho}
                            <span className="yw-bubble">{nobr(m.reply)}</span>
                          </Item>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ---------- patient's phone (LINE) ---------- */}
                <div className="yw-phone">
                  <div className="yw-screen">
                    <span className="yw-island" />
                    <span className="yw-sb tabular">
                      <span>{m.patientTime}</span>
                      <span className="yw-sb-icons">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                    <span className="yw-line-head">
                      <span className="yw-back">{"‹"}</span>
                      <span className="yw-avatar">
                        <ToothIcon />
                      </span>
                      <span className="yw-line-name">{nobr(m.clinic)}</span>
                    </span>
                    <div className="yw-chat-view">
                      <div ref={chatRef} className="yw-chat">
                        <span className="yw-day" data-at="-1" data-on="">
                          {nobr(m.today)}
                        </span>
                        <span className="yw-lb yw-lb-ai" data-at="-1" data-on="">
                          {nobr(m.greeting)}
                        </span>
                        <Item from={0} step={step} k={0.02} className="yw-lb yw-lb-me">
                          <span className="yw-lb-meta">
                            <span data-on={on(step, 1)} className="yw-read">
                              {nobr(m.read)}
                            </span>
                            {m.patientTime}
                          </span>
                          <span className="yw-lb-text">{nobr(m.message)}</span>
                        </Item>
                        {/* Typing sits over the top of the reply's box, so no gap opens when it lands. */}
                        <span className="yw-slot">
                          <span className="yw-lb-typing" data-at="1" data-on={step >= 1 && step < 4 ? "" : undefined}>
                            <i />
                            <i />
                            <i />
                          </span>
                          <Item from={4} step={step} k={4.08} className="yw-lb yw-lb-ai yw-lb-reply">
                            {nobr(m.reply)}
                          </Item>
                        </span>
                      </div>
                    </div>
                    <span className="yw-input">
                      <span className="yw-input-field">{m.input}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ================= compact composition: one card per beat ================= */}
              <div className="yw-cmp">
                <div className="yw-cmp-bar">
                  {lights}
                  <span className="yw-pane-title">
                    {nobr(m.conversation)}
                    <span className="yw-tag" data-ch="line">
                      LINE
                    </span>
                  </span>
                  {status}
                </div>
                <div className="yw-cmp-stage">
                  <Panel n={0} step={step}>
                    <span className="yw-note yw-r" style={at(-0.3)}>
                      <span className="yw-row-top">
                        <span className="yw-tag" data-ch="line">
                          LINE
                        </span>
                        <span className="yw-row-name">{nobr(m.patient)}</span>
                        <span className="yw-row-time tabular">{m.patientTime}</span>
                        <span className="yw-pill" data-state="new">
                          {nobr(m.rows[0]?.status)}
                        </span>
                      </span>
                      <span className="yw-note-text">
                        <Words text={m.message} from={0} to={0.4} />
                      </span>
                    </span>
                    {m.rows.slice(1, 4).map((r, i) => row(r, i + 1, "yw-row-mini", 0.3 + i * 0.15))}
                  </Panel>
                  <Panel n={1} step={step}>
                    <span className="yw-r" style={at(0.7)}>
                      {callStrip("live")}
                    </span>
                    <span className="yw-msg yw-msg-patient yw-r" style={at(1.25)}>
                      {patientWho}
                      <span className="yw-bubble">{nobr(m.message)}</span>
                    </span>
                  </Panel>
                  <Panel n={2} step={step}>
                    <span className="yw-msg yw-msg-patient yw-msg-short yw-r" style={at(1.7)}>
                      <span className="yw-bubble">
                        <span className="yw-clamp">{nobr(m.message)}</span>
                      </span>
                    </span>
                    <span className="yw-msg yw-msg-draft yw-r" style={at(2)}>
                      {draftWho}
                      {draftBubble}
                    </span>
                  </Panel>
                  <Panel n={3} step={step}>
                    <span className="yw-msg yw-msg-draft yw-r" style={at(2.7)}>
                      {draftWho}
                      {draftBubble}
                    </span>
                    <span className="yw-guard yw-r" style={at(3.05)}>
                      <span className="yw-guard-head">
                        <ShieldIcon />
                        {nobr(m.guard)}
                        {verdict(3.45)}
                      </span>
                      <span className="yw-check yw-r" style={at(3.25)}>
                        <span className="yw-check-icon">{"✕"}</span>
                        <span className="yw-check-label">{nobr(failed?.label)}</span>
                      </span>
                    </span>
                    <span className="yw-passed yw-r" style={at(3.6)}>
                      <span className="yw-check-icon">{"✓"}</span>
                      {nobr(m.passed)}
                    </span>
                  </Panel>
                  <Panel n={4} step={step}>
                    <span className="yw-verdict-row yw-r" style={at(3.7)}>
                      {verdict(3.7)}
                    </span>
                    <span className="yw-msg yw-msg-reply yw-r" style={at(4.05)}>
                      {sentWho}
                      <span className="yw-bubble">{nobr(m.reply)}</span>
                    </span>
                    <span className="yw-logged yw-r" style={at(4.35)}>
                      <span className="yw-tag" data-ch="line">
                        LINE
                      </span>
                      <span className="yw-row-name">{nobr(m.patient)}</span>
                      <span className="yw-logged-text">{nobr(m.logged)}</span>
                    </span>
                  </Panel>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StickyStage>
  );
}

function Item({
  from,
  k = from,
  step,
  className,
  children,
}: {
  from: number;
  /** Where its scroll-linked reveal starts (defaults to the beat it belongs to). */
  k?: number;
  step: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={`${className} yw-r`} data-at={from} data-on={on(step, from)} style={at(k)}>
      {children}
    </span>
  );
}

/**
 * Text that types itself in with the scroll, one word (Thai: one space-separated phrase, never
 * split further) at a time, from beat position `from` to `to`. Opacity only: the box keeps its
 * full size from the start. `scan` runs a gold line under each word in turn (the guard reading).
 */
function Words({
  text = "",
  parts: given,
  from,
  to,
  scan,
}: {
  text?: string;
  /** Pre-split words (Thai has no spaces between words): rendered as given, no separators added. */
  parts?: string[];
  from: number;
  to: number;
  scan?: [number, number];
}) {
  const parts = given ?? text.split(" ").filter(Boolean);
  const sep = given ? null : " ";
  const last = Math.max(1, parts.length - 1);
  const lead = !given && text.startsWith(" ") ? " " : null;
  return (
    <>
      {lead}
      {parts.map((w, i) => (
        <span
          key={i}
          className={scan ? "yw-w yw-fw" : "yw-w"}
          style={
            {
              "--k": round(from + ((to - from) * i) / last),
              ...(scan ? { "--ks": round(scan[0] + ((scan[1] - scan[0]) * i) / last) } : {}),
            } as CSSProperties
          }
        >
          {nobr(w)}
          {i < parts.length - 1 ? sep : null}
        </span>
      ))}
    </>
  );
}

/** One beat of the compact composition: shown only on its beat; items that do not fit drop whole. */
function Panel({ n, step, children }: { n: number; step: number; children: ReactNode }) {
  return (
    <div className="yw-panel" data-on={n === step || undefined} data-past={n < step || undefined}>
      {children}
    </div>
  );
}

/**
 * Keep the newest visible item of a list in view, like a chat, with a translate (never layout).
 * Older items scroll up under the view's soft top edge.
 */
function fit(list: HTMLElement | null, step: number) {
  const view = list?.parentElement;
  if (!list || !view || !list.offsetHeight) return;
  let last: HTMLElement | null = null;
  for (const el of list.querySelectorAll<HTMLElement>("[data-at]")) {
    const at = Number(el.dataset.at);
    if (at <= step && el.dataset.on !== undefined) last = el;
  }
  if (!last) return;
  const pad = parseFloat(getComputedStyle(list).paddingBottom) || 0;
  // Layout offset inside the list (offsetTop ignores transforms, so in-flight motion never skews it).
  let top = 0;
  for (let el: HTMLElement | null = last; el && el !== list; el = el.offsetParent as HTMLElement | null) {
    top += el.offsetTop;
  }
  const shift = view.clientHeight - (top + last.offsetHeight + pad);
  // Short content starts at the top (no empty band above the history); long content sits on the
  // bottom edge with the newest item last.
  list.style.setProperty("--shift", `${Math.round(Math.min(0, shift))}px`);
}

/* ---------- tiny line icons (decorative, inside the aria-hidden mockup) ---------- */

const icon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function NavIcon({ i }: { i: number }) {
  const d = [
    "M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
    "M4 6h16v9H15l-3 3-3-3H4z",
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  ][i];
  return (
    <svg {...icon} className="yw-icon">
      <path d={d} />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...icon} className="yw-icon">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...icon} className="yw-icon">
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ToothIcon() {
  return (
    <svg {...icon} className="yw-icon">
      <path d="M7 4c-2 0-3 2-3 4 0 3 1 5 2 8 .5 2 1 4 2.5 4S10 17 12 17s2 3 3.5 3S17 18 18 16c1-3 2-5 2-8 0-2-1-4-3-4-2 0-3 1-5 1S9 4 7 4z" />
    </svg>
  );
}
