"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { loadMotion } from "@/motion/gsap";
import type { LabProps } from "../../types";
import { GROUPS, SECTION, toolLabel, type Group, type GroupId } from "./data";
import { LabMark, markKind } from "./marks";
import { BUILDERS, type Timeline } from "./loops";
import "./bento.css";

/** Bento order and tile shape (the hero tile is AI engineering). */
const ORDER: GroupId[] = ["ai", "backend", "testing", "data-cloud", "frontend", "integrations"];

const COPY = {
  en: {
    hint: "Six small loops, one per job. Fictional data; hover or tap a tile to pause it.",
    swipe: "Swipe sideways for all six.",
    paused: "Paused",
    blurb: {
      ai: "A caller is heard, answered and checked before the reply goes out.",
      backend: "An API boots, takes a booking and streams the event to its consumers.",
      testing: "Every push runs unit and end-to-end tests before it can ship.",
      "data-cloud": "Rows land, an index answers, the cache hits, the service scales out.",
      frontend: "A booking screen assembles from components and books a slot.",
      integrations: "A storefront order hands off to a LINE message the customer can act on.",
    } satisfies Record<GroupId, string>,
    ai: {
      chat: "Clinic assistant",
      hello: "Hello, this is the clinic assistant. How can I help?",
      ask: "Can I book a cleaning on Friday?",
      reply: "Friday 10:30 is open. Shall I hold it for you?",
      checked: "Checked",
      evals: "Evals",
      checks: ["No diagnosis", "No dosage advice", "No price promise", "Polite, clinic tone", "Hands off to staff when unsure"],
      pipe: ["Write the rule", "Hear", "Answer", "Check"],
    },
    testing: { queued: "Queued", running: "Running", passed: "All checks passed", steps: ["Unit", "End-to-end", "Preview deploy"], tests: "tests passed" },
    data: {
      cols: ["id", "patient", "slot"],
      rows: [
        ["1041", "Ploy S.", "Thu 14:00"],
        ["1042", "Napat K.", "Fri 10:30"],
        ["1043", "Mint R.", "Fri 11:00"],
        ["1044", "Arm T.", "Sat 09:30"],
      ],
      index: "index scan · slot",
      cache: "cache hit",
      pods: "replicas",
    },
    frontend: { title: "Pick a time", sub: "Cleaning · 45 min", book: "Book", booked: "Booked" },
    integrations: {
      order: "Order",
      item: "Linen set × 2",
      paid: "Paid",
      msg: "Order #1001 is on its way.",
      track: "Track order",
    },
  },
  th: {
    hint: "หกตัวอย่างสั้น ๆ หนึ่งช่องต่อหนึ่งงาน ข้อมูลทั้งหมดเป็นเรื่องสมมติ ชี้เมาส์หรือแตะที่ช่องเพื่อหยุดอ่าน",
    paused: "หยุดอยู่",
    swipe: "ปัดไปด้านข้างเพื่อดูครบทั้งหกช่อง",
    blurb: {
      ai: "ฟังเสียงผู้โทร ตอบกลับ แล้วตรวจคำตอบก่อนส่งออกไป",
      backend: "API เริ่มทำงาน รับการจอง แล้วส่ง event ต่อให้ระบบที่รอฟังอยู่",
      testing: "ทุกครั้งที่ push จะรัน unit test และ e2e test ให้ผ่านก่อนส่งงานขึ้น",
      "data-cloud": "ข้อมูลเข้าตาราง index ช่วยค้น cache ตอบไว และระบบขยายรับโหลด",
      frontend: "หน้าจองคิวประกอบขึ้นจาก component แล้วกดจองช่วงเวลา",
      integrations: "ออร์เดอร์จากหน้าร้านส่งต่อเป็นข้อความ LINE ที่ลูกค้ากดดูต่อได้",
    } satisfies Record<GroupId, string>,
    ai: {
      chat: "ผู้ช่วยคลินิก",
      hello: "สวัสดีค่ะ ผู้ช่วยของคลินิกยินดีให้บริการ มีอะไรให้ช่วยคะ",
      ask: "ขอจองขูดหินปูนวันศุกร์ได้ไหมคะ",
      reply: "วันศุกร์ 10:30 ว่างค่ะ ให้จองไว้เลยไหมคะ",
      checked: "ตรวจแล้ว",
      evals: "Evals",
      checks: ["ไม่วินิจฉัยโรค", "ไม่แนะนำขนาดยา", "ไม่รับปากเรื่องราคา", "สุภาพแบบคลินิก", "ส่งต่อพนักงานเมื่อไม่แน่ใจ"],
      pipe: ["เขียนกฎ", "ฟัง", "ตอบ", "ตรวจ"],
    },
    testing: { queued: "รอคิว", running: "กำลังรัน", passed: "ผ่านทุกข้อ", steps: ["Unit test", "E2E test", "Deploy ตัวอย่าง"], tests: "รายการผ่าน" },
    data: {
      cols: ["id", "คนไข้", "เวลา"],
      rows: [
        ["1041", "พลอย ส.", "พฤ. 14:00"],
        ["1042", "ณภัทร ก.", "ศ. 10:30"],
        ["1043", "มิ้นท์ ร.", "ศ. 11:00"],
        ["1044", "อาร์ม ท.", "ส. 09:30"],
      ],
      index: "index scan · เวลา",
      cache: "cache hit",
      pods: "replicas",
    },
    frontend: { title: "เลือกเวลา", sub: "ขูดหินปูน · 45 นาที", book: "จองเลย", booked: "จองแล้ว" },
    integrations: {
      order: "ออร์เดอร์",
      item: "ชุดผ้าปูเตียง × 2",
      paid: "ชำระแล้ว",
      msg: "ออร์เดอร์ #1001 กำลังจัดส่งแล้วนะคะ",
      track: "ติดตามพัสดุ",
    },
  },
} as const;
type Copy = (typeof COPY)[Locale];

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

function AiStage({ c }: { c: Copy }) {
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
                <i key={i} data-x="bar" style={{ height: `${30 + 60 * Math.abs(Math.sin(i * 1.7))}%` }} />
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

function TestingStage({ c }: { c: Copy }) {
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

function DataStage({ c }: { c: Copy }) {
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

function FrontendStage({ c }: { c: Copy }) {
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

function IntegrationsStage({ c }: { c: Copy }) {
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

function Stage({ id, c }: { id: GroupId; c: Copy }) {
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

function Tile({ group, index, locale, c }: { group: Group; index: number; locale: Locale; c: Copy }) {
  const titleId = `bl-${group.id}-title`;
  return (
    <article className={`bl-tile bl-t-${group.id}`} data-tile={group.id} tabIndex={0} aria-labelledby={titleId}>
      <header className="bl-head">
        <span className="bl-idx">{String(index + 1).padStart(2, "0")}</span>
        <h3 id={titleId}>{nobr(group.label[locale])}</h3>
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
          <li key={tool.key} className="bl-chip" data-tool={tool.key} data-kind={markKind(tool.key)}>
            <LabMark name={tool.key} />
            <span>{nobr(toolLabel(tool, locale))}</span>
          </li>
        ))}
      </ul>
      <span className="bl-progress" aria-hidden="true">
        <span data-x="progress" />
      </span>
    </article>
  );
}

type Loop = { tl: Timeline | null; visible: boolean; held: boolean; started: boolean };

/**
 * Bento of the six tool groups; every tile loops a small fictional product demo (one GSAP
 * timeline per pass, rebuilt from the finished state each time, so a pass never rewinds).
 * Loops run only in view, start staggered, and pause while hovered, focused or tapped.
 * Reduced motion: the markup is the finished frame, so nothing runs and nothing is missing.
 */
export default function BentoLoops({ locale }: LabProps) {
  const root = useRef<HTMLDivElement>(null);
  const c = COPY[locale];
  const s = SECTION[locale];

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dead = false;
    const cleanups: (() => void)[] = [];

    void loadMotion().then(({ gsap }) => {
      if (dead) return;
      const tiles = Array.from(el.querySelectorAll<HTMLElement>("[data-tile]"));
      tiles.forEach((tile, i) => {
        const id = tile.dataset.tile as GroupId;
        const chips = Array.from(tile.querySelectorAll<HTMLElement>("[data-tool]"));
        const bar = tile.querySelector<HTMLElement>('[data-x="progress"]');
        const light = (keys: string[]) => {
          for (const chip of chips) chip.toggleAttribute("data-on", keys.includes(chip.dataset.tool ?? ""));
        };
        const loop: Loop = { tl: null, visible: false, held: false, started: false };
        const sync = () => {
          const run = loop.visible && !loop.held;
          tile.toggleAttribute("data-held", loop.held);
          if (run && !loop.started) {
            loop.started = true;
            pass(0.35 + i * 0.55);
          } else loop.tl?.paused(!run);
        };
        const pass = (delay: number) => {
          loop.tl?.kill();
          const tl = BUILDERS[id](gsap, tile, light);
          tl.delay(delay);
          tl.eventCallback("onUpdate", () => bar && gsap.set(bar, { scaleX: tl.progress() }));
          tl.eventCallback("onComplete", () => pass(0));
          loop.tl = tl;
          tl.paused(!(loop.visible && !loop.held));
        };
        const io = new IntersectionObserver(([e]) => {
          loop.visible = e.isIntersecting;
          sync();
        });
        io.observe(tile);
        const hold = () => {
          loop.held = true;
          sync();
        };
        const release = () => {
          loop.held = tile.matches(":hover") || tile.contains(document.activeElement);
          sync();
        };
        const onPointerEnter = (e: PointerEvent) => e.pointerType === "mouse" && hold();
        const onPointerLeave = (e: PointerEvent) => e.pointerType === "mouse" && release();
        // Touch: a tap toggles the pause (there is no hover to leave).
        const onPointerUp = (e: PointerEvent) => {
          if (e.pointerType === "mouse") return;
          loop.held = !loop.held;
          sync();
        };
        const onFocusOut = () => requestAnimationFrame(release);
        tile.addEventListener("pointerenter", onPointerEnter);
        tile.addEventListener("pointerleave", onPointerLeave);
        tile.addEventListener("pointerup", onPointerUp);
        tile.addEventListener("focusin", hold);
        tile.addEventListener("focusout", onFocusOut);
        cleanups.push(() => {
          io.disconnect();
          tile.removeEventListener("pointerenter", onPointerEnter);
          tile.removeEventListener("pointerleave", onPointerLeave);
          tile.removeEventListener("pointerup", onPointerUp);
          tile.removeEventListener("focusin", hold);
          tile.removeEventListener("focusout", onFocusOut);
          loop.tl?.kill();
        });
      });
    });

    return () => {
      dead = true;
      for (const fn of cleanups) fn();
    };
  }, []);

  return (
    <section className="bl shell" aria-labelledby="bl-title" ref={root}>
      <header className="bl-section-head">
        <h2 id="bl-title">{nobr(s.title)}</h2>
        <div className="bl-section-intro">
          <p>{nobr(s.intro)}</p>
          <p className="bl-hint">
            {nobr(c.hint)} <span className="bl-swipe">{nobr(c.swipe)}</span>
          </p>
        </div>
      </header>
      <div className="bl-grid">
        {ORDER.map((id, i) => {
          const group = GROUPS.find((g) => g.id === id);
          return group ? <Tile key={id} group={group} index={i} locale={locale} c={c} /> : null;
        })}
      </div>
    </section>
  );
}
