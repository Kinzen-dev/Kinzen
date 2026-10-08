import type { Ref } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { ToolMark } from "@/components/tools/tool-mark";
import { toolMark } from "@/components/tools/tool-marks";
import { groupById, type GroupId, type ToolGroup } from "../types";
import { COPY, type BentoCopy } from "./copy";
import "./bento.css";

/**
 * The bento's markup: six tiles, each a small fictional product demo drawn at its finished frame.
 * No hooks: the server renders it as the section's static first view (complete for no-JS, search
 * and reduced motion), and the client chunk renders the same markup and drives the loops.
 */

/** Bento order (the wide tiles are AI engineering and integrations). */
const ORDER: GroupId[] = ["ai", "backend", "testing", "data-cloud", "frontend", "integrations"];

/** "mark" for a brand mark, "practice" for a way of working, "text" for a text-only tool. */
function markKind(name: string): "mark" | "practice" | "text" {
  const mark = toolMark(name);
  return !mark ? "text" : mark === "practice" ? "practice" : "mark";
}

/** Text that types in without moving its neighbours: a hidden copy holds the final size. */
function Typed({ x, text, className = "" }: { x: string; text: string; className?: string }) {
  return (
    <span className={`bl-typed ${className}`}>
      <span className="bl-ghost">{text}</span>
      <span className="bl-type" data-x={x} data-text={text}>
        {text}
      </span>
    </span>
  );
}

const Tick = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="bl-tick-svg">
    <path d="M3.5 8.4l2.9 2.9 6.1-6.6" />
  </svg>
);

function AiStage({ c }: { c: BentoCopy }) {
  return (
    <>
      <ol className="bl-pipe">
        {c.ai.pipe.map((label, i) => (
          <li key={label} data-x="pipe" className="is-done">
            <span className="bl-pipe-dot" />
            <span className="bl-pipe-n">{String(i + 1).padStart(2, "0")}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="bl-win bl-chat">
        <div className="bl-win-head">
          <span className="bl-live" />
          {c.ai.chat}
        </div>
        <div className="bl-chat-body">
          <div className="bl-msg bl-out bl-hello">{c.ai.hello}</div>
          <div className="bl-msg bl-in bl-voice" data-x="voice">
            <svg viewBox="0 0 16 16" className="bl-play">
              <path d="M5 3.5v9l7.5-4.5z" />
            </svg>
            <span className="bl-bars">
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} data-x="bar" style={{ height: `${Math.round(30 + 60 * Math.abs(Math.sin(i * 1.7)))}%` }} />
              ))}
            </span>
            <span className="bl-dur">0:04</span>
          </div>
          <div className="bl-msg bl-in" data-x="ask">
            <Typed x="askText" text={c.ai.ask} />
          </div>
          <div className="bl-reply-slot">
            <div className="bl-typing" data-x="dots">
              <i />
              <i />
              <i />
            </div>
            <div className="bl-msg bl-out" data-x="reply">
              <Typed x="replyText" text={c.ai.reply} />
            </div>
            <span className="bl-ok" data-x="ok">
              <Tick /> {c.ai.checked}
            </span>
          </div>
        </div>
      </div>
      <div className="bl-side">
        <div className="bl-win bl-code">
          <div className="bl-win-head">guard.ts</div>
          <pre className="bl-code-body">
            <code>
              <span className="bl-line">
                <span className="bl-ln">1</span>
                <span className="bl-k">import</span> {"{ rules, block }"} <span className="bl-k">from</span>{" "}
                <span className="bl-s">&quot;./guard&quot;</span>;
              </span>
              <span className="bl-line">
                <span className="bl-ln">2</span>
              </span>
              <span className="bl-line">
                <span className="bl-ln">3</span>
                <span className="bl-c">{"// what the assistant must never say"}</span>
              </span>
              <span className="bl-line">
                <span className="bl-ln">4</span>
                <span className="bl-k">export const</span> guard = rules([
              </span>
              <span className="bl-line">
                <span className="bl-ln">5</span>
                {"  "}block(<span className="bl-s">&quot;diagnosis&quot;</span>),
              </span>
              <span className="bl-line">
                <span className="bl-ln">6</span>
                {"  "}block(<span className="bl-s">&quot;dosage&quot;</span>),
              </span>
              <span className="bl-line">
                <span className="bl-ln">7</span>
                {"  "}
                <span className="bl-code-new" data-x="codeRow">
                  <Typed x="codeLine" text={'block("price-promise"),'} />
                  <span className="bl-caret" data-x="caret" />
                </span>
              </span>
              <span className="bl-line">
                <span className="bl-ln">8</span>]);
              </span>
            </code>
          </pre>
        </div>
        <div className="bl-win bl-evals">
          <div className="bl-win-head">
            {c.ai.evals}
            <span className="bl-evals-n">
              <b data-x="evalN">12</b>/12
            </span>
          </div>
          <ul>
            {c.ai.checks.map((label) => (
              <li key={label} data-x="check">
                <span className="bl-tick" data-x="tick">
                  <Tick />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function BackendStage() {
  return (
    <>
      <div className="bl-win bl-term">
        <div className="bl-win-head">
          <span className="bl-dots">
            <i />
            <i />
            <i />
          </span>
          api
        </div>
        <div className="bl-term-body">
          <p>
            <span className="bl-prompt">$</span> <Typed x="cmd" text="pnpm start:api" />
          </p>
          <p data-x="l2">
            <span className="bl-okc">✓</span> NestJS · Fastify · listening :3000
          </p>
          <p data-x="l3">
            <span className="bl-arrow">→</span> mutation createBooking <span className="bl-okc">ok</span>
          </p>
          <p data-x="l4" className="bl-log">
            <span className="bl-arrow">←</span> notify.ts · reminder queued
          </p>
          <p data-x="l5" className="bl-log">
            <span className="bl-arrow">←</span> report.py · row appended
          </p>
        </div>
      </div>
      <div className="bl-queue">
        <div className="bl-node" data-x="producer">
          api
        </div>
        <div className="bl-lane" data-x="lane">
          <span className="bl-topic">booking.created</span>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="bl-evt" data-x="evt" />
          ))}
        </div>
        <div className="bl-sinks">
          <div className="bl-node" data-x="sink">
            notify.ts
          </div>
          <div className="bl-node" data-x="sink">
            report.py
          </div>
        </div>
      </div>
    </>
  );
}

function TestingStage({ c }: { c: BentoCopy }) {
  const tools = ["Vitest + Jest", "Playwright", "GitHub Actions"];
  return (
    <div className="bl-win bl-ci" data-x="ci" data-state="passed">
      <div className="bl-win-head">
        <span>CI · main</span>
        <span className="bl-status">
          <span data-s="queued">{c.testing.queued}</span>
          <span data-s="running">{c.testing.running}</span>
          <span data-s="passed">{c.testing.passed}</span>
        </span>
      </div>
      <ul className="bl-steps">
        {c.testing.steps.map((label, i) => (
          <li key={label} data-x="step" data-state="done">
            <span className="bl-step-icon">
              <span className="bl-spin" />
              <Tick />
            </span>
            <span>{label}</span>
            <span className="bl-step-tool">{tools[i]}</span>
          </li>
        ))}
      </ul>
      <div className="bl-ci-foot">
        <span className="bl-bar">
          <span data-x="bar" />
        </span>
        <span className="bl-count">
          <b data-x="count">148</b> {c.testing.tests}
        </span>
      </div>
    </div>
  );
}

function DataStage({ c }: { c: BentoCopy }) {
  return (
    <>
      <div className="bl-win bl-table">
        <div className="bl-win-head">
          <span>bookings</span>
          <span className="bl-pill" data-x="idx">
            {c.data.index}
          </span>
        </div>
        <div className="bl-grid-t">
          <span className="bl-scan" data-x="scan" />
          <div className="bl-tr bl-th">
            {c.data.cols.map((col) => (
              <span key={col}>{col}</span>
            ))}
          </div>
          {c.data.rows.map((row, r) => (
            <div key={row[0]} className={r === 1 ? "bl-tr is-hit" : "bl-tr"} data-x="row">
              {row.map((cell, i) => (
                <span key={i}>{cell}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="bl-infra">
        <span className="bl-pill" data-x="cache">
          {c.data.cache}
        </span>
        <span className="bl-pods">
          {Array.from({ length: 3 }, (_, i) => (
            <i key={i} data-x="pod" />
          ))}
          <span>{c.data.pods} 3/3</span>
        </span>
        <span className="bl-pill" data-x="edge">
          edge
        </span>
      </div>
    </>
  );
}

function FrontendStage({ c }: { c: BentoCopy }) {
  return (
    <div className="bl-win bl-app">
      <div className="bl-win-head">
        <span className="bl-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="bl-url" data-x="url">
          /book
        </span>
        <span className="bl-vite" data-x="vite">
          vite ready
        </span>
      </div>
      <div className="bl-app-body">
        <div className="bl-skel" data-x="skel" aria-hidden="true">
          <i className="bl-sk-title" />
          <i className="bl-sk-sub" />
          <span className="bl-sk-slots">
            <i />
            <i />
            <i />
          </span>
          <i className="bl-sk-btn" />
        </div>
        <div className="bl-real">
          <strong data-x="part">{c.frontend.title}</strong>
          <span className="bl-app-sub" data-x="part">
            {c.frontend.sub}
          </span>
          <span className="bl-slots" data-x="part">
            {["10:30", "11:00", "13:30"].map((s) => (
              <span key={s} data-x="slot">
                {s}
              </span>
            ))}
          </span>
          <span className="bl-btn" data-x="btn" data-state="done">
            <span data-s="idle">{c.frontend.book}</span>
            <span data-s="done">
              <Tick /> {c.frontend.booked}
            </span>
          </span>
        </div>
        <svg className="bl-cursor" data-x="cursor" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 1.5l11 6.2-4.6 1.1 2.6 4.6-1.9 1-2.6-4.6L3 13z" />
        </svg>
      </div>
    </div>
  );
}

function IntegrationsStage({ c }: { c: BentoCopy }) {
  return (
    <div className="bl-int">
      <div className="bl-win bl-order" data-x="order">
        <div className="bl-win-head">{c.integrations.order}</div>
        <div className="bl-order-body">
          <span className="bl-liquid">
            <span data-x="liq">{"{{ order.name }}"}</span>
            <strong data-x="num">#1001</strong>
          </span>
          <span className="bl-item">{c.integrations.item}</span>
          <span className="bl-pill bl-paid" data-x="paid">
            {c.integrations.paid}
          </span>
        </div>
      </div>
      <div className="bl-wire">
        <span className="bl-wire-line" />
        <span className="bl-wire-label">orders/paid → push</span>
        <span className="bl-wire-dot" data-x="dot" />
      </div>
      <div className="bl-win bl-linechat">
        <div className="bl-win-head">LINE</div>
        <div className="bl-linechat-body">
          <div className="bl-msg bl-in" data-x="bubble">
            {c.integrations.msg}
          </div>
          <span className="bl-liff" data-x="liff">
            {c.integrations.track}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stage({ id, c }: { id: GroupId; c: BentoCopy }) {
  switch (id) {
    case "ai":
      return <AiStage c={c} />;
    case "backend":
      return <BackendStage />;
    case "testing":
      return <TestingStage c={c} />;
    case "data-cloud":
      return <DataStage c={c} />;
    case "frontend":
      return <FrontendStage c={c} />;
    case "integrations":
      return <IntegrationsStage c={c} />;
  }
}

function Tile({ group, index, c }: { group: ToolGroup; index: number; c: BentoCopy }) {
  const titleId = `bl-${group.id}-title`;
  return (
    <article className={`bl-tile bl-t-${group.id}`} data-tile={group.id} tabIndex={0} aria-labelledby={titleId}>
      <header className="bl-head">
        <span className="bl-idx">{String(index + 1).padStart(2, "0")}</span>
        <h3 id={titleId}>{nobr(group.label)}</h3>
        <span className="bl-paused" aria-hidden="true">
          {nobr(c.paused)}
        </span>
      </header>
      <p className="bl-blurb">{nobr(c.blurb[group.id])}</p>
      <div className={`bl-stage bl-s-${group.id}`} aria-hidden="true">
        <Stage id={group.id} c={c} />
      </div>
      <ul className="bl-tools">
        {group.tools.map((tool) => (
          <li key={tool.key} className="bl-chip" data-tool={tool.key} data-kind={markKind(tool.key)} data-tool-host>
            <ToolMark name={tool.key} />
            <span>{nobr(tool.label)}</span>
          </li>
        ))}
      </ul>
      <span className="bl-progress" aria-hidden="true">
        <span data-x="progress" />
      </span>
    </article>
  );
}

export function BentoMarkup({
  locale,
  groups,
  rootRef,
}: {
  locale: Locale;
  groups: ToolGroup[];
  rootRef?: Ref<HTMLDivElement>;
}) {
  const c = COPY[locale];
  return (
    <div className="bl" ref={rootRef}>
      <div className="bl-grid">
        {ORDER.map((id, i) => (
          <Tile key={id} group={groupById(groups, id)} index={i} c={c} />
        ))}
      </div>
    </div>
  );
}
