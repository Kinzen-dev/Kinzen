"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/schema";
import type { LabProps } from "../../types";
import { Banner } from "../b-banner/banner";
import { stripJoiners } from "@/lib/thai-plain";
import { useFpsProbe, useReducedMotion, watchVisible } from "../b-banner/hooks";
import "./agents-at-work.css";

/* ------------------------------------------------------------------
   A Helm-like workspace: three fictional agents type in their panes and
   hand work to each other (a gold arrow carries a task chip from pane to
   pane). The reviewer runs the tests and commits; the commit message is
   the hero line, which lands in the copy beside it. Then the panes clear
   and it starts again.
   Everything runs on one visible-time clock (rAF): off screen or on a
   hidden tab the clock stops, so the story pauses instead of racing.
   ------------------------------------------------------------------ */

type PaneId = "plan" | "build" | "review";
type Tok = [text: string, cls?: string];

const PANES: Record<Locale, Record<PaneId, { name: string; role: string }>> = {
  en: {
    plan: { name: "atlas", role: "plan" },
    build: { name: "brook", role: "build" },
    review: { name: "cedar", role: "review" },
  },
  th: {
    plan: { name: "atlas", role: "วางแผน" },
    build: { name: "brook", role: "เขียนโค้ด" },
    review: { name: "cedar", role: "ตรวจงาน" },
  },
};
const STATUS: Record<Locale, { typing: string; waiting: string; done: string }> = {
  en: { typing: "typing", waiting: "waiting", done: "done" },
  th: { typing: "กำลังพิมพ์", waiting: "รอคิว", done: "เสร็จแล้ว" },
};
const PLAN: Record<Locale, string[]> = {
  en: ["# task: reply guard", "1. block dosing advice", "2. block diagnosis", "3. test every reply"],
  th: ["# งาน: ด่านตรวจคำตอบ", "1. บล็อกการแนะนำขนาดยา", "2. บล็อกการวินิจฉัย", "3. ทดสอบทุกคำตอบ"],
};
const CODE = [
  "export function guard(reply: Reply) {",
  "  for (const rule of RULES) {",
  "    if (rule.match(reply.text)) {",
  "      return block(rule.id);",
  "    }",
  "  }",
  "  return pass(reply);",
  "}",
];
const TESTS = ["$ pnpm test guard", "✓ blocks dosing advice", "✓ blocks diagnosis", "✓ 12 passed"];
const HANDOFF: Record<Locale, [string, string]> = { en: ["guard.ts", "review"], th: ["guard.ts", "ตรวจงาน"] };
const COMMITTED: Record<Locale, string> = { en: "committed just now", th: "commit เมื่อสักครู่" };
const HASH = "a1f9e3c";

const KW = /\b(export|function|const|for|of|if|return)\b/;
/** A tiny highlighter: keywords, CONSTANTS, calls, comments, test ticks and the shell prompt. */
function tokens(line: string): Tok[] {
  if (line.startsWith("#")) return [[line, "c"]];
  if (line.startsWith("✓")) return [["✓", "ok"], [line.slice(1)]];
  if (line.startsWith("$ ")) return [["$ ", "p"], [line.slice(2)]];
  const out: Tok[] = [];
  const re = /(\b(?:export|function|const|for|of|if|return)\b)|(\b[A-Z_]{2,}\b)|(\b\w+(?=\())|(\b[A-Z]\w+\b)/g;
  let last = 0;
  for (const m of line.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push([line.slice(last, i)]);
    out.push([m[0], m[1] && KW.test(m[1]) ? "k" : m[2] ? "n" : m[3] ? "f" : "t"]);
    last = i + m[0].length;
  }
  if (last < line.length) out.push([line.slice(last)]);
  return out;
}

/** Per-character delay: a human-ish cadence (pauses after punctuation, quick runs inside words). */
function charDelay(ch: string, base: number, rnd: () => number): number {
  if (ch === " ") return base * 1.4 + rnd() * base;
  if (/[.,:;)}]/.test(ch)) return base * 3 + rnd() * base * 3;
  return base * (0.55 + rnd() * 0.9);
}

/** Deterministic noise so every loop types the same way (no Math.random flicker in screenshots). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Workspace({ locale, heroLine }: { locale: Locale; heroLine: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const panes = PANES[locale];
  const status = STATUS[locale];
  useFpsProbe("agents-at-work");

  useEffect(() => {
    const el = root.current;
    if (!el || reduced === null) return;
    const body = (id: PaneId) => el.querySelector<HTMLElement>(`[data-pane="${id}"] .aw-body`);
    const paneEl = (id: PaneId) => el.querySelector<HTMLElement>(`[data-pane="${id}"]`);
    const banner = el.closest("section");
    const lineEl = banner?.querySelector<HTMLElement>("[data-hb-line]");
    const commitEl = banner?.querySelector<HTMLElement>("[data-aw-commit]");
    const svg = el.querySelector<SVGSVGElement>(".aw-wires");
    const wire = svg?.querySelector<SVGPathElement>(".aw-wire");
    const head = svg?.querySelector<SVGPathElement>(".aw-head");
    const chip = el.querySelector<HTMLElement>(".aw-chip");
    if (!svg || !wire || !head || !chip) return;

    const caret = document.createElement("span");
    caret.className = "aw-caret";

    const states = STATUS[locale];
    const setStatus = (id: PaneId, s: keyof typeof states) => {
      const p = paneEl(id);
      if (!p) return;
      p.dataset.state = s;
      const label = p.querySelector(".aw-state-text");
      if (label) label.textContent = states[s];
    };
    /** The pane whose body is open on phones (the others fold to their header). */
    const setActive = (id: PaneId) => {
      for (const p of el.querySelectorAll<HTMLElement>("[data-pane]")) p.toggleAttribute("data-active", p.dataset.pane === id);
    };
    const newLine = (id: PaneId, cls = ""): HTMLElement | null => {
      const b = body(id);
      if (!b) return null;
      const div = document.createElement("div");
      div.className = `aw-line ${cls}`;
      b.appendChild(div);
      // Keep the pane short: the oldest line scrolls away.
      while (b.children.length > 12) b.firstElementChild?.remove();
      return div;
    };

    /* ----- the finished frame (reduced motion, and the first paint before the story starts) ----- */
    const fill = () => {
      for (const id of ["plan", "build", "review"] as PaneId[]) {
        const b = body(id);
        if (b) b.textContent = "";
        setStatus(id, "done");
      }
      const put = (id: PaneId, line: string, cls = "") => {
        const d = newLine(id, cls);
        if (!d) return;
        for (const [text, c] of tokens(line)) {
          const s = document.createElement("span");
          if (c) s.className = c;
          s.textContent = text;
          d.appendChild(s);
        }
      };
      PLAN[locale].forEach((l) => put("plan", l));
      CODE.forEach((l) => put("build", l));
      TESTS.forEach((l) => put("review", l));
      put("review", `$ git commit -m "${heroLine}"`, "aw-msg");
      put("review", `[main ${HASH}] 1 file changed`, "aw-dim");
      commitEl?.setAttribute("data-on", "");
      setActive("review");
    };

    if (reduced) {
      fill();
      return;
    }

    /* ----- visible-time clock ----- */
    let clock = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    let dead = false;
    const waiters: { at: number; res: () => void }[] = [];
    const ticks = new Set<(t: number) => void>();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (visible) {
        clock += dt;
        for (const f of ticks) f(clock);
        for (let i = waiters.length - 1; i >= 0; i--) {
          if (waiters[i].at <= clock) {
            waiters[i].res();
            waiters.splice(i, 1);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const stopWatch = watchVisible(el, (v) => {
      visible = v;
      last = performance.now();
    });
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        waiters.push({ at: clock + ms, res });
      });

    const type = async (id: PaneId, line: string, base: number, rnd: () => number, cls = "") => {
      const d = newLine(id, cls);
      if (!d) return;
      d.appendChild(caret);
      for (const [text, c] of tokens(line)) {
        const s = document.createElement("span");
        if (c) s.className = c;
        d.insertBefore(s, caret);
        for (const ch of text) {
          if (dead) return;
          s.textContent += ch;
          await sleep(charDelay(ch, base, rnd));
        }
      }
    };

    /* ----- handoff: a gold wire draws from one pane to the next and a chip rides it ----- */
    const handoff = async (from: PaneId, to: PaneId, label: string) => {
      const a = paneEl(from)?.getBoundingClientRect();
      const b = paneEl(to)?.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      if (!a || !b) return;
      const ax = a.left + a.width / 2 - box.left;
      const ay = a.top + a.height / 2 - box.top;
      const bx = b.left + b.width / 2 - box.left;
      const by = b.top + b.height / 2 - box.top;
      let p0: [number, number], p1: [number, number], c0: [number, number], c1: [number, number];
      if (Math.abs(by - ay) > Math.abs(bx - ax)) {
        // Stacked panes (phones): from one pane's header to the next one's, bowing over the text.
        p0 = [a.right - box.left - 70, a.top - box.top + 16];
        p1 = [b.right - box.left - 70, b.top - box.top + 16];
        const dy = p1[1] - p0[1];
        c0 = [p0[0] - 110, p0[1] + dy * 0.25];
        c1 = [p1[0] - 110, p1[1] - dy * 0.25];
      } else {
        const right = bx > ax;
        p0 = [(right ? a.right : a.left) - box.left, ay];
        p1 = [(right ? b.left : b.right) - box.left, Math.min(Math.max(ay, b.top - box.top + 40), b.bottom - box.top - 40)];
        const dx = (p1[0] - p0[0]) * 0.6;
        c0 = [p0[0] + dx, p0[1] - 30];
        c1 = [p1[0] - dx, p1[1] - 30];
      }
      wire.setAttribute("d", `M${p0[0]} ${p0[1]} C${c0[0]} ${c0[1]} ${c1[0]} ${c1[1]} ${p1[0]} ${p1[1]}`);
      const len = wire.getTotalLength();
      chip.textContent = label;
      el.dataset.handoff = "on";
      const dur = 1100;
      const t0 = clock;
      const tick = (t: number) => {
        const u = Math.min(1, (t - t0) / dur);
        const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
        wire.style.strokeDasharray = `${len}`;
        wire.style.strokeDashoffset = `${len * (1 - e)}`;
        const pt = wire.getPointAtLength(len * e);
        chip.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;
        // Arrow head at the end, pointing along the last segment.
        const q = wire.getPointAtLength(Math.max(0, len * e - 6));
        const ang = Math.atan2(pt.y - q.y, pt.x - q.x);
        head.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(${(ang * 180) / Math.PI})`);
      };
      ticks.add(tick);
      await sleep(dur + 40);
      ticks.delete(tick);
      tick(t0 + dur);
      paneEl(to)?.classList.add("aw-receive");
      setActive(to);
      await sleep(700);
      paneEl(to)?.classList.remove("aw-receive");
      el.dataset.handoff = "off";
    };

    const append = (d: HTMLElement, text: string, c?: string) => {
      const s = document.createElement("span");
      if (c) s.className = c;
      s.textContent = text;
      d.appendChild(s);
    };

    const story = async () => {
      let round = 0;
      while (!dead) {
        const rnd = rng(7 + round);
        for (const id of ["plan", "build", "review"] as PaneId[]) {
          const b = body(id);
          if (b) b.textContent = "";
          setStatus(id, "waiting");
        }
        commitEl?.removeAttribute("data-on");
        lineEl?.classList.remove("aw-landed");
        el.dataset.fading = "off";
        setActive("plan");
        await sleep(500);

        setStatus("plan", "typing");
        for (const l of PLAN[locale]) {
          await type("plan", l, 38, rnd);
          await sleep(260);
        }
        if (dead) return;
        setStatus("plan", "done");
        await handoff("plan", "build", HANDOFF[locale][0]);

        setStatus("build", "typing");
        for (const l of CODE) {
          await type("build", l, 26, rnd);
          await sleep(140 + rnd() * 160);
        }
        if (dead) return;
        setStatus("build", "done");
        await handoff("build", "review", HANDOFF[locale][1]);

        setStatus("review", "typing");
        await type("review", TESTS[0] ?? "", 34, rnd);
        await sleep(520);
        for (const l of TESTS.slice(1)) {
          // Test output arrives a line at a time, not typed.
          const d = newLine("review");
          if (d) for (const [text, c] of tokens(l)) append(d, text, c);
          await sleep(240);
        }
        await sleep(360);
        await type("review", `$ git commit -m "${heroLine}"`, 11, rnd, "aw-msg");
        if (dead) return;
        await sleep(300);
        const d = newLine("review", "aw-dim");
        if (d) d.textContent = `[main ${HASH}] 1 file changed`;
        setStatus("review", "done");
        // The commit lands in the copy: the hero line takes a gold sweep and gets its hash.
        lineEl?.classList.add("aw-landed");
        commitEl?.setAttribute("data-on", "");
        await sleep(5200);
        el.dataset.fading = "on";
        await sleep(700);
        round++;
      }
    };
    void story();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      stopWatch();
      for (const w of waiters) w.res();
      waiters.length = 0;
      ticks.clear();
      caret.remove();
      lineEl?.classList.remove("aw-landed");
    };
  }, [reduced, locale, heroLine]);

  return (
    <div ref={root} className="aw-host" aria-hidden="true" data-handoff="off">
      <div className="aw-window">
        <div className="aw-bar">
          <span className="aw-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="aw-title">helm · 3 agents</span>
          <span className="aw-live">
            <span className="aw-live-dot" />
            live
          </span>
        </div>
        <div className="aw-grid">
          {(["plan", "build", "review"] as PaneId[]).map((id) => (
            <div
              key={id}
              className={`aw-pane aw-pane-${id}`}
              data-pane={id}
              data-state="waiting"
              data-active={id === "plan" ? "" : undefined}
            >
              <div className="aw-pane-head">
                <span className="aw-avatar">{panes[id].name[0]}</span>
                <span className="aw-name">{panes[id].name}</span>
                <span className="aw-role">{panes[id].role}</span>
                <span className="aw-state">
                  <span className="aw-state-dot" />
                  <span className="aw-state-text">{status.waiting}</span>
                </span>
              </div>
              <div className="aw-body" />
            </div>
          ))}
        </div>
      </div>
      <svg className="aw-wires">
        <path className="aw-wire" />
        <path className="aw-head" d="M-9 -5 L0 0 L-9 5" />
      </svg>
      <span className="aw-chip" />
    </div>
  );
}

export default function AgentsAtWork({ locale, banner }: LabProps) {
  return (
    <Banner
      banner={banner}
      id="aw"
      locale={locale}
      stage={<Workspace locale={locale} heroLine={stripJoiners(banner.heroLine)} />}
      lineSlot={
        <p className="aw-commit" data-aw-commit aria-hidden="true">
          <span className="aw-commit-dot" />
          <span className="aw-commit-hash">{HASH}</span>
          <span>{COMMITTED[locale]}</span>
        </p>
      }
    />
  );
}
