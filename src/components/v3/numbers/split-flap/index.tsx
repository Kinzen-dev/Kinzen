"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { prefersReduced } from "../shared";
import type { ViewProps } from "../types";
import { BLANK, FlapBoard } from "./markup";

const DIGITS = "0123456789";
/** While the board is on show and nobody holds the section, one row re-flips this often. */
const IDLE_FLIP_MS = 5200;

/* ------------------------------------------------------------------
   Flap engine. Plain DOM + Web Animations (transform and opacity only,
   so every leaf stays on the compositor); React renders the board once
   and never re-renders it. Each flip: the top leaf (old glyph) falls to
   -90deg, then the bottom leaf (new glyph) lands from 90deg; the last
   flip lands with a small mechanical bounce.
   ------------------------------------------------------------------ */
type TileEl = { root: HTMLElement; g: HTMLElement[]; lt: HTMLElement; lb: HTMLElement; target: string; narrow: boolean; ch: string };

function bind(root: HTMLElement): TileEl {
  return {
    root,
    g: [...root.querySelectorAll<HTMLElement>(".sf-g")],
    lt: root.querySelector(".sf-leaf-top") as HTMLElement,
    lb: root.querySelector(".sf-leaf-bot") as HTMLElement,
    target: root.dataset.target ?? BLANK,
    narrow: root.dataset.narrow !== undefined,
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

/** A random glyph for a flap in flight: digits, or the comma flap's own two faces. */
function randomGlyph(t: TileEl): string {
  if (t.narrow) return t.ch === "," ? BLANK : ",";
  let c = t.ch;
  while (c === t.ch) c = DIGITS[Math.floor(Math.random() * DIGITS.length)];
  return c;
}

/**
 * Split-flap board (numbers view 1): the four stats on a navy departures board. As each row comes
 * into view its gold flaps clatter into place and its caption types in; pointing at a row (or
 * tapping it) flips it again, and while the board is on show one row re-flips every few seconds.
 * The server renders the same board finished (./markup.tsx); reduced motion keeps it that way.
 */
export default function SplitFlap({ locale, copy, play }: ViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const spinRef = useRef<((row: HTMLElement) => void) | null>(null);

  // Motion: every flap starts blank before the first paint (SSR and no-JS show the final board).
  useLayoutEffect(() => {
    const el = root.current?.querySelector<HTMLElement>(".sf");
    if (!el || prefersReduced()) return;
    el.dataset.armed = "";
    for (const t of el.querySelectorAll<HTMLElement>(".sf-tile")) show(bind(t), BLANK);
  }, []);

  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>(".sf");
    if (!el || prefersReduced()) return;
    let alive = true;
    const frames = new Set<number>();
    const timers = new Set<number>();
    const later = (ms: number) =>
      new Promise<void>((r) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          r();
        }, ms);
        timers.add(id);
      });
    const rows = [...el.querySelectorAll<HTMLElement>("[data-row]")];
    const state = new Map(
      rows.map((r) => [r, { tiles: [...r.querySelectorAll<HTMLElement>(".sf-tile")].map(bind), busy: false, typed: false }]),
    );
    for (const s of state.values()) for (const t of s.tiles) t.ch = BLANK;

    const typeIn = (p: HTMLElement, delay: number, perUnit: number) => {
      const n = Number(p.dataset.count ?? 0);
      const t0 = performance.now() + delay;
      const step = (now: number) => {
        if (!alive) return;
        const shown = Math.max(0, (now - t0) / perUnit);
        p.style.setProperty("--shown", String(Math.min(n + 8, shown)));
        if (shown < n + 8) frames.add(requestAnimationFrame(step));
      };
      frames.add(requestAnimationFrame(step));
    };

    const spin = async (row: HTMLElement, first: boolean, after = 0) => {
      const s = state.get(row);
      if (!s || s.busy) return;
      s.busy = true;
      if (after) await later(after);
      // First run: blank flaps clatter too and land blank again, like a real board resetting.
      const live = first ? s.tiles : s.tiles.filter((t) => t.target !== BLANK);
      await Promise.all(
        live.map(async (t, i) => {
          // The check lands last, once its sentence has typed in.
          const wait = t.target === "✓" ? (first ? 1900 : 420) : i * (first ? 80 : 50);
          await later(wait);
          const flips = t.narrow
            ? 1 + (t.target === BLANK ? 1 : 0)
            : t.target === BLANK
              ? 2 + Math.floor(Math.random() * 3)
              : first
                ? 6 + Math.floor(Math.random() * 7)
                : 4 + Math.floor(Math.random() * 4);
          const ms = first ? 92 : 78;
          for (let k = 0; k < flips && alive; k++) await flip(t, randomGlyph(t), ms, false).catch(() => {});
          if (alive) await flip(t, t.target, 150, true).catch(() => {});
        }),
      );
      s.busy = false;
    };
    spinRef.current = (row) => {
      if (state.get(row)?.typed) void spin(row, false);
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
          const perUnit = locale === "th" ? 70 : 20;
          row.querySelectorAll<HTMLElement>(".sf-type").forEach((p, i) => typeIn(p, lag + 420 + i * 260, perUnit));
          void later(lag).then(() => alive && (row.dataset.lit = ""));
        }
      },
      { threshold: 0.6 },
    );
    rows.forEach((r) => io.observe(r));

    const offs = rows.map((r) => {
      const go = () => spinRef.current?.(r);
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
      spinRef.current = null;
      io.disconnect();
      offs.forEach((f) => f());
      frames.forEach((f) => cancelAnimationFrame(f));
      timers.forEach((t) => window.clearTimeout(t));
      el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    };
  }, [locale]);

  // On show and unheld: one row at a time re-flips, top to bottom, so the board stays alive.
  useEffect(() => {
    if (!play) return;
    const rows = [...(root.current?.querySelectorAll<HTMLElement>("[data-row]") ?? [])];
    let i = 0;
    const id = window.setInterval(() => {
      const row = rows[i++ % rows.length];
      if (row) spinRef.current?.(row);
    }, IDLE_FLIP_MS);
    return () => window.clearInterval(id);
  }, [play]);

  return (
    <div ref={root} className="nv-view">
      <FlapBoard locale={locale} copy={copy} />
    </div>
  );
}
