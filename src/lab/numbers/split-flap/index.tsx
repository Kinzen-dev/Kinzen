"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { nobr } from "@/lib/thai-nodes";
import type { LabProps } from "../../types";
import { reduced, statsCopy } from "./stats";
import { typed } from "./typed";
import "./flap.css";

/** Every figure is set right-aligned in three flaps, like a departures board. */
const SLOTS = 3;
const DIGITS = "0123456789";
const BLANK = " ";

const UI = {
  en: { cols: ["Figure", "What", "Context"], hover: "Hover a row to flip it again.", tap: "Tap a row to flip it again." },
  th: {
    cols: ["ตัวเลข", "เรื่อง", "ช่วงเวลาและที่มา"],
    hover: "ชี้ที่แถวไหนก็ได้ ตัวเลขจะพลิกอีกรอบ",
    tap: "แตะแถวไหนก็ได้ ตัวเลขจะพลิกอีกรอบ",
  },
};

function pad(fig: string): string[] {
  const chars = [...fig];
  return [...Array(Math.max(0, SLOTS - chars.length)).fill(BLANK), ...chars];
}

/** One flap: static top and bottom halves, two hinged leaves that carry the flip. */
function Tile({ ch, small }: { ch: string; small?: boolean }) {
  return (
    <span className={small ? "sf-tile sf-tile-sm" : "sf-tile"} data-target={ch} data-blank={ch === BLANK ? "" : undefined}>
      <span className="sf-half sf-top">
        <span className="sf-g">{ch}</span>
      </span>
      <span className="sf-half sf-bot">
        <span className="sf-g">{ch}</span>
      </span>
      <span className="sf-leaf sf-leaf-top">
        <span className="sf-g">{ch}</span>
        <span className="sf-shade" />
      </span>
      <span className="sf-leaf sf-leaf-bot">
        <span className="sf-g">{ch}</span>
        <span className="sf-shade" />
      </span>
    </span>
  );
}

function Flaps({ fig, value }: { fig: string; value: string }) {
  return (
    <p className="sf-fig">
      <span className="sr-only">{value}</span>
      <span className="sf-tiles" aria-hidden="true">
        {pad(fig).map((ch, i) => (
          <Tile key={i} ch={ch} />
        ))}
      </span>
    </p>
  );
}

function Caption({ text, className }: { text: string; className: string }) {
  const t = typed(text);
  return (
    <p className={`sf-type ${className}`} data-count={t.count}>
      {t.node}
    </p>
  );
}

/* ------------------------------------------------------------------
   Flap engine. Plain DOM + Web Animations (transform and opacity only,
   so every leaf stays on the compositor); React renders the board once
   and never re-renders it. Each flip: the top leaf (old glyph) falls to
   -90deg, then the bottom leaf (new glyph) lands from 90deg; the last
   flip lands with a small mechanical bounce.
   ------------------------------------------------------------------ */
type TileEl = { root: HTMLElement; g: HTMLElement[]; lt: HTMLElement; lb: HTMLElement; target: string; ch: string };

function bind(root: HTMLElement): TileEl {
  const g = [...root.querySelectorAll<HTMLElement>(".sf-g")];
  return {
    root,
    g,
    lt: root.querySelector(".sf-leaf-top") as HTMLElement,
    lb: root.querySelector(".sf-leaf-bot") as HTMLElement,
    target: root.dataset.target ?? BLANK,
    ch: root.dataset.target ?? BLANK,
  };
}

/** g[0] static top, g[1] static bottom, g[2] top leaf, g[3] bottom leaf. */
function show(t: TileEl, ch: string) {
  for (const el of t.g) el.textContent = ch;
  t.ch = ch;
}

function flip(t: TileEl, next: string, ms: number, last: boolean): Promise<void> {
  const [top, bot, lt, lb] = t.g;
  top.textContent = next;
  lb.textContent = next;
  const half = ms / 2;
  const fall = t.lt.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], {
    duration: half,
    easing: "cubic-bezier(0.55, 0, 1, 0.45)",
    fill: "forwards",
  });
  t.lt.lastElementChild?.animate([{ opacity: 0 }, { opacity: 0.55 }], { duration: half, fill: "forwards" });
  const landFrames = last
    ? [
        { transform: "rotateX(90deg)" },
        { transform: "rotateX(0deg)", offset: 0.55, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
        { transform: "rotateX(16deg)", offset: 0.75, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
        { transform: "rotateX(0deg)" },
      ]
    : [{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }];
  const land = t.lb.animate(landFrames, {
    duration: last ? ms * 1.1 : half,
    delay: half,
    easing: last ? "linear" : "cubic-bezier(0, 0.55, 0.45, 1)",
    fill: "backwards",
  });
  t.lb.lastElementChild?.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: half, delay: half, fill: "backwards" });
  return land.finished.then(() => {
    bot.textContent = next;
    lt.textContent = next;
    fall.cancel();
    t.lt.lastElementChild?.getAnimations().forEach((a) => a.cancel());
    t.ch = next;
  });
}

function randomDigit(not: string): string {
  let c = not;
  while (c === not) c = DIGITS[Math.floor(Math.random() * DIGITS.length)];
  return c;
}

export default function SplitFlap({ locale }: LabProps) {
  const c = statsCopy(locale);
  const ui = UI[locale];
  const root = useRef<HTMLElement>(null);

  // Motion: start every flap blank before the first paint (SSR and no-JS show the final board).
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reduced()) return;
    el.dataset.armed = "";
    for (const t of el.querySelectorAll<HTMLElement>(".sf-tile")) show(bind(t), BLANK);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced()) return;
    let alive = true;
    const frames = new Set<number>();
    const rows = [...el.querySelectorAll<HTMLElement>("[data-row]")];
    const state = new Map(
      rows.map((r) => [r, { tiles: [...r.querySelectorAll<HTMLElement>(".sf-tile")].map(bind), busy: false, typed: false }]),
    );
    for (const s of state.values()) for (const t of s.tiles) t.ch = BLANK;

    const typeIn = (p: HTMLElement, delay: number, perChar: number) => {
      const n = Number(p.dataset.count ?? 0);
      const t0 = performance.now() + delay;
      const step = (now: number) => {
        if (!alive) return;
        const shown = Math.max(0, (now - t0) / perChar);
        p.style.setProperty("--shown", String(Math.min(n + 8, shown)));
        if (shown < n + 8) frames.add(requestAnimationFrame(step));
      };
      frames.add(requestAnimationFrame(step));
    };

    const spin = async (row: HTMLElement, first: boolean, after = 0) => {
      const s = state.get(row);
      if (!s || s.busy) return;
      s.busy = true;
      if (after) await new Promise((r) => setTimeout(r, after));
      // First run: blank flaps clatter too and land blank again, like a real board resetting.
      const live = first ? s.tiles : s.tiles.filter((t) => t.target !== BLANK);
      await Promise.all(
        live.map(async (t, i) => {
          // The check lands last, once its sentence has typed in.
          const wait = t.target === "✓" ? (first ? 1900 : 420) : i * (first ? 90 : 55);
          await new Promise((r) => setTimeout(r, wait));
          const flips =
            t.target === BLANK ? 2 + Math.floor(Math.random() * 3) : first ? 6 + Math.floor(Math.random() * 7) : 4 + Math.floor(Math.random() * 4);
          const ms = first ? 92 : 78;
          for (let k = 0; k < flips && alive; k++) await flip(t, randomDigit(t.ch), ms, false).catch(() => {});
          if (alive) await flip(t, t.target, 150, true).catch(() => {});
        }),
      );
      s.busy = false;
    };

    const io = new IntersectionObserver(
      (entries) => {
        // Rows that enter together start one after another, top to bottom.
        let order = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const lag = order++ * 260;
          const row = e.target as HTMLElement;
          io.unobserve(row);
          const s = state.get(row);
          if (!s || s.typed) continue;
          s.typed = true;
          void spin(row, true, lag);
          const perChar = locale === "th" ? 30 : 22;
          row.querySelectorAll<HTMLElement>(".sf-type").forEach((p, i) => typeIn(p, lag + 420 + i * 260, perChar));
          setTimeout(() => alive && (row.dataset.lit = ""), lag);
        }
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0 },
    );
    rows.forEach((r) => io.observe(r));

    const offs = rows.map((r) => {
      const go = () => {
        if (state.get(r)?.typed) void spin(r, false);
      };
      const enter = (e: PointerEvent) => e.pointerType === "mouse" && go();
      const tap = (e: PointerEvent) => e.pointerType !== "mouse" && go();
      r.addEventListener("pointerenter", enter);
      r.addEventListener("pointerup", tap);
      return () => {
        r.removeEventListener("pointerenter", enter);
        r.removeEventListener("pointerup", tap);
      };
    });

    return () => {
      alive = false;
      io.disconnect();
      offs.forEach((f) => f());
      frames.forEach((f) => cancelAnimationFrame(f));
      el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    };
  }, [locale]);

  const rp = c.replay;
  return (
    <section ref={root} className="sf" aria-labelledby="sf-title">
      <div className="shell">
        <div className="sf-board" data-scene="dark">
          <header className="sf-head">
            <h2 id="sf-title" className="sf-title">
              {nobr(c.title)}
            </h2>
          </header>
          <div className="sf-cols" aria-hidden="true">
            {ui.cols.map((col) => (
              <span key={col}>{col}</span>
            ))}
          </div>
          <ol className="sf-rows">
            {(["production", "techLead", "stores"] as const).map((k) => {
              const s = c[k];
              const fig = `${s.value}${"suffix" in s ? s.suffix : ""}`;
              return (
                <li key={k} className="sf-row" data-row>
                  <Flaps fig={fig} value={fig} />
                  <Caption text={s.label} className="sf-label" />
                  <p className="sf-note">{nobr(s.note)}</p>
                </li>
              );
            })}
            <li className="sf-row sf-group" data-row>
              <div className="sf-sub">
                <Flaps fig={String(rp.value)} value={String(rp.value)} />
                <Caption text={rp.label} className="sf-label" />
              </div>
              <div className="sf-sub sf-sub-caught">
                <Flaps fig={String(rp.caught)} value={String(rp.caught)} />
                <Caption text={rp.caughtLabel} className="sf-label" />
              </div>
              <div className="sf-passed">
                <span className="sf-check" aria-hidden="true">
                  <Tile ch="✓" small />
                </span>
                <Caption text={rp.passed} className="sf-passed-text" />
              </div>
              <p className="sf-note sf-note-group">{nobr(rp.note)}</p>
            </li>
          </ol>
        </div>
        <p className="sf-hint">
          <span className="sf-hint-hover">{nobr(ui.hover)}</span>
          <span className="sf-hint-tap">{nobr(ui.tap)}</span>
        </p>
      </div>
    </section>
  );
}
