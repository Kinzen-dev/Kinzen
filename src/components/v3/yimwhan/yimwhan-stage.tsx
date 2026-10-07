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
 * The five-beat story. Scroll progress picks the beat (StickyStage); each beat flips data
 * attributes and CSS transitions do the motion (transform and opacity only). Elements that appear
 * later keep their space from the start, and the chat and transcript are re-aimed with a
 * translate, so nothing on the page ever re-flows while the visitor scrolls (CLS 0).
 * The mockups are decorative (aria-hidden); the beat list beside them is the real text.
 */
export function YimwhanStage({ copy }: { copy: YimwhanCopy }) {
  const [step, setStep] = useState(LAST);
  const [live, setLive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const m = copy.mock;

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

  // Keep the newest item in view: transcript scrolls up once it fills its pane; the phone chat
  // sits on its bottom edge like a real chat. Measured on beat change and resize only.
  useLayoutEffect(() => {
    const aim = () => {
      fit(feedRef.current, step, "top");
      fit(chatRef.current, step, "bottom");
    };
    aim();
    const ro = new ResizeObserver(aim);
    if (feedRef.current) ro.observe(feedRef.current);
    if (chatRef.current) ro.observe(chatRef.current);
    return () => ro.disconnect();
  }, [step]);

  return (
    <StickyStage steps={STEPS} vh={85} label={copy.stageLabel} className="yw-track" stageClassName="yw-stage">
      <div ref={rootRef} className="yw-stage-grid" data-step={step} data-live={live || undefined}>
        <div className="yw-copy">
          <div className="yw-progress" aria-hidden="true">
            <span className="yw-count tabular">
              <span className="yw-count-now">{String(step + 1).padStart(2, "0")}</span>
              <span className="yw-count-of"> / {String(STEPS).padStart(2, "0")}</span>
            </span>
            <span className="yw-segs">
              {copy.beats.map((_, i) => (
                <span key={i} className="yw-seg" style={{ "--i": i } as CSSProperties} />
              ))}
            </span>
          </div>
          <ol className="yw-beats">
            {copy.beats.map((b, i) => (
              <li key={i} className="yw-beat" data-on={i === step || undefined} data-past={i < step || undefined}>
                <p className="yw-beat-n readout">
                  {nobr(copy.step)} {i + 1}
                </p>
                <h4 className="yw-beat-title">{nobr(b.title)}</h4>
                <p className="yw-beat-text">{nobr(b.text)}</p>
                {b.stat ? <p className="yw-beat-stat">{nobr(b.stat)}</p> : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="yw-mock-area">
          <div className="yw-frame">
            <span className="yw-illus-at">
              <span className="yw-illus">{nobr(copy.illustration)}</span>
            </span>
            <div className="yw-mock" aria-hidden="true">
              {/* ---------- back office window ---------- */}
              <div className="yw-win">
                <div className="yw-win-bar">
                  <span className="yw-lights">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="yw-win-title">
                    {nobr(m.window)} · {nobr(m.clinic)}
                  </span>
                  <span className="yw-chip yw-chip-ok">
                    <span className="yw-dot yw-pulse" />
                    {nobr(m.aiOn)}
                  </span>
                </div>
                <div className="yw-win-body">
                  <nav className="yw-side">
                    <span className="yw-brand">
                      <span className="yw-brand-mark">y</span>
                      <span className="yw-brand-name">{nobr(m.clinic)}</span>
                    </span>
                    {m.nav.map((n, i) => (
                      <span key={n} className="yw-nav" data-active={i === 1 || undefined}>
                        <NavIcon i={i} />
                        {nobr(n)}
                        {i === 1 ? <span className="yw-badge" data-on={on(step, 4)} /> : null}
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
                    <div className="yw-call" data-on={on(step, 1)}>
                      <span className="yw-call-head">
                        <PhoneIcon />
                        {nobr(m.call)}
                        <span className="yw-call-time tabular">{m.callTime}</span>
                      </span>
                      <span className="yw-wave">
                        {Array.from({ length: 18 }, (_, i) => (
                          <i key={i} style={{ "--i": i } as CSSProperties} />
                        ))}
                      </span>
                      <span className="yw-caption">{nobr(m.caption)}</span>
                    </div>
                    <div className="yw-rows" data-on={on(step, 4)}>
                      {m.rows.map((r, i) => (
                        <div key={r.name} className="yw-row" data-new={i === 0 || undefined}>
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
                        </div>
                      ))}
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
                      <span className="yw-status">
                        {m.status.map((s, i) => (
                          <span key={s} className="yw-status-chip" data-on={i === step || undefined} data-n={i}>
                            <span className="yw-dot" />
                            {nobr(s)}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="yw-feed-view">
                      <div ref={feedRef} className="yw-feed">
                        <Item from={0} step={step} className="yw-msg yw-msg-patient">
                          <span className="yw-who">
                            <span className="yw-rec" />
                            {nobr(m.transcript)} · {nobr(m.patient)} · {m.patientTime}
                          </span>
                          <span className="yw-bubble">
                            <span className="yw-words">{nobr(m.message)}</span>
                          </span>
                        </Item>
                        <Item from={2} step={step} className="yw-msg yw-msg-draft" hold={m.draft} end>
                          <span className="yw-who">
                            {nobr(m.draft)} <span className="yw-faint">({nobr(m.notSent)})</span>
                          </span>
                          <span className="yw-bubble">
                            {nobr(m.draftBefore)}
                            <span className="yw-flag">{nobr(m.draftFlagged)}</span>
                            {nobr(m.draftAfter)}
                          </span>
                        </Item>
                        <Item from={3} step={step} className="yw-guard" hold={m.guard}>
                          <span className="yw-guard-head">
                            <ShieldIcon />
                            {nobr(m.guard)}
                            <span className="yw-verdict">
                              {nobr(m.blocked)} · <span className="yw-mono">{m.checks.find((c) => !c.pass)?.rule}</span>
                            </span>
                          </span>
                          {m.checks.map((c, i) => (
                            <span
                              key={c.rule}
                              className="yw-check"
                              data-pass={c.pass || undefined}
                              style={{ "--i": i } as CSSProperties}
                            >
                              <span className="yw-check-icon">{c.pass ? "✓" : "✕"}</span>
                              <span className="yw-check-label">{nobr(c.label)}</span>
                              <span className="yw-mono">{c.rule}</span>
                            </span>
                          ))}
                        </Item>
                        <Item from={4} step={step} className="yw-msg yw-msg-reply" hold={m.sent} end>
                          <span className="yw-who">
                            {nobr(m.sent)} <span className="yw-tick">{"✓✓"}</span>
                          </span>
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
                      <span className="yw-day">{nobr(m.today)}</span>
                      <span className="yw-lb yw-lb-ai" data-at="-1" data-on="">
                        {nobr(m.greeting)}
                      </span>
                      <Item from={0} step={step} className="yw-lb yw-lb-me">
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
                        <Item from={4} step={step} className="yw-lb yw-lb-ai yw-lb-reply">
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
          </div>
        </div>
      </div>
    </StickyStage>
  );
}

function Item({
  from,
  step,
  className,
  hold,
  end,
  children,
}: {
  from: number;
  step: number;
  className: string;
  /** Label of the dashed slot drawn where this item will land, until it does. */
  hold?: string;
  /** Slot sits on the right (model side). */
  end?: boolean;
  children: ReactNode;
}) {
  const item = (
    <span className={className} data-at={from} data-on={on(step, from)}>
      {children}
    </span>
  );
  if (!hold) return item;
  return (
    <span className="yw-hold" data-end={end || undefined} data-label={hold} data-on={on(step, from)}>
      {item}
    </span>
  );
}

/**
 * Re-aim a list so its newest visible item is in view, with a translate (never layout).
 * "top": the list starts at the top and only moves up once the newest item would fall below
 * the fold. "bottom": the newest item always sits on the bottom edge, like a chat.
 */
function fit(list: HTMLElement | null, step: number, mode: "top" | "bottom") {
  const view = list?.parentElement;
  if (!list || !view) return;
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
  const bottom = top + last.offsetHeight + pad;
  const room = view.clientHeight;
  let shift = room - bottom;
  if (mode === "top") {
    // Scroll whole items off the top, never leave a sliver of one behind.
    const need = bottom - room;
    const padTop = parseFloat(getComputedStyle(list).paddingTop) || 0;
    const next = [...list.children].find((el) => (el as HTMLElement).offsetTop - padTop >= need) as
      HTMLElement | undefined;
    shift = need <= 0 ? 0 : -((next?.offsetTop ?? need + padTop) - padTop);
  }
  list.style.setProperty("--shift", `${Math.round(shift)}px`);
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
    "M12 20h8M4 20l1-4L16 5l3 3L8 19z",
    "M5 20V10M12 20V4M19 20v-7",
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
