"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { nobr } from "@/lib/thai-nodes";
import type { LabProps } from "../../types";
import { reduced, statsCopy } from "../split-flap/stats";
import { ASPECT, drawMatrix, invalidateColors, MATRIX } from "./matrix";
import "./viz.css";

const UI = {
  en: {
    start: "Oct 2019",
    today: "Oct 2026",
    leadStart: "Jan 2022",
    leadEnd: "Mar 2026",
    guard: "code checks",
    legend: "1 dot = 1 message. Where the 37 come from is illustrative.",
    replay: "Replay",
  },
  th: {
    start: "ต.ค. 2019",
    today: "ต.ค. 2026",
    leadStart: "ม.ค. 2022",
    leadEnd: "มี.ค. 2026",
    guard: "ชุดตรวจในโค้ด",
    legend: "จุดละ 1 ข้อความ ตำแหน่งที่มาของ 37 ครั้งเป็นภาพประกอบ",
    replay: "เล่นอีกครั้ง",
  },
};

/* Time domains, in months: the career from Oct 2019 to the build month (Oct 2026), and the Tech
   Lead role from Jan 2022 to Mar 2026 (50 months: four whole years and a two-month tail). */
const CAREER_MONTHS = 84;
const YEAR_TICKS = [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => ({ y, m: (y - 2019) * 12 - 9 }));
const LEAD_MONTHS = 50;
const STORES = 20;

const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t: number) => 1 - (1 - t) ** 3,
  linear: (t: number) => t,
};

type Run = { alive: boolean; frames: Set<number> };

function tween(run: Run, ms: number, fn: (p: number) => void, e: (t: number) => number = ease.inOut): Promise<void> {
  return new Promise((done) => {
    const t0 = performance.now();
    const step = (now: number) => {
      if (!run.alive) return done();
      const t = Math.min(1, (now - t0) / ms);
      fn(e(t));
      if (t < 1) run.frames.add(requestAnimationFrame(step));
      else done();
    };
    run.frames.add(requestAnimationFrame(step));
  });
}
const wait = (run: Run, ms: number) => new Promise<void>((r) => setTimeout(r, run.alive ? ms : 0));

function setCount(el: Element | null, n: number) {
  if (el && el.textContent !== String(n)) el.textContent = String(n);
}

/* ------------------------------ The four plays ------------------------------ */

async function playCareer(card: HTMLElement, run: Run) {
  const fill = card.querySelector<HTMLElement>(".hv-axis-fill");
  const head = card.querySelector<HTMLElement>(".hv-axis-head");
  const dots = [...card.querySelectorAll<HTMLElement>(".hv-anniv")];
  const count = card.querySelector(".hv-count");
  card.dataset.state = "run";
  await tween(run, 2200, (p) => {
    if (fill) fill.style.transform = `scaleX(${p})`;
    if (head) head.style.transform = `translateX(${p * 100}%)`;
    const years = Math.floor((p * CAREER_MONTHS) / 12 + 1e-6);
    dots.forEach((d, i) => d.toggleAttribute("data-on", i < years));
    setCount(count, years);
  });
  card.dataset.state = "done";
}

async function playLead(card: HTMLElement, run: Run) {
  const segs = [...card.querySelectorAll<HTMLElement>(".hv-seg-fill")];
  const count = card.querySelector(".hv-count");
  card.dataset.state = "run";
  setCount(count, 0);
  for (let i = 0; i < segs.length && run.alive; i++) {
    const seg = segs[i];
    const tail = i === segs.length - 1;
    await tween(run, tail ? 260 : 520, (p) => (seg.style.transform = `scaleX(${p})`), tail ? ease.out : ease.inOut);
    if (!tail) {
      setCount(count, i + 1);
      seg.parentElement?.setAttribute("data-on", "");
    }
  }
  card.dataset.state = "done";
}

async function playStores(card: HTMLElement, run: Run) {
  const shops = [...card.querySelectorAll<HTMLElement>(".hv-shop")];
  const plus = card.querySelector<HTMLElement>(".hv-shop-plus");
  const count = card.querySelector(".hv-count");
  const suffix = card.querySelector<HTMLElement>(".hv-suffix");
  card.dataset.state = "run";
  let shown = 0;
  await tween(
    run,
    STORES * 70,
    (p) => {
      const n = Math.min(STORES, Math.floor(p * STORES + 0.999));
      for (; shown < n; shown++) shops[shown]?.setAttribute("data-on", "");
      setCount(count, n);
    },
    ease.linear,
  );
  await wait(run, 160);
  plus?.setAttribute("data-on", "");
  suffix?.setAttribute("data-on", "");
  card.dataset.state = "done";
}

async function playReplay(card: HTMLElement, run: Run, canvas: HTMLCanvasElement) {
  const count = card.querySelector(".hv-count");
  const caught = card.querySelector(".hv-count-caught");
  card.dataset.state = "run";
  const total = MATRIX.duration;
  await tween(
    run,
    total,
    (p) => {
      const f = drawMatrix(canvas, p * total);
      setCount(count, f.messages);
      setCount(caught, f.caught);
      if (f.caught > 0) card.removeAttribute("data-precatch");
      if (f.verdict) card.setAttribute("data-verdict", "");
    },
    ease.linear,
  );
  card.dataset.state = "done";
}

/* ------------------------------ Markup pieces ------------------------------ */

function StoreGlyph({ alt }: { alt: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <use href={alt ? "#hv-shop-b" : "#hv-shop-a"} />
    </svg>
  );
}

function Num({ value, suffix, className = "hv-count" }: { value: number; suffix?: string; className?: string }) {
  return (
    <span className="hv-num">
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      {/* The final value, invisible, holds the width while the counter runs up to it. */}
      <span aria-hidden="true" className="hv-num-box">
        <span className="hv-num-ghost">{value}</span>
        <span className={`${className} tabular`}>{value}</span>
      </span>
      {suffix ? (
        <span aria-hidden="true" className="hv-suffix" data-on="">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

function Replay({ label }: { label: string }) {
  return (
    <button type="button" className="hv-replay" data-replay>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{nobr(label)}</span>
    </button>
  );
}

export default function HonestViz({ locale }: LabProps) {
  const c = statsCopy(locale);
  const ui = UI[locale];
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Layout effect: with motion, every card is reset to its zero state before the first paint
  // (SSR and reduced motion show the final, composed state).
  useLayoutEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const still = reduced();
    let run: Run = { alive: true, frames: new Set() };
    const runs = new Map<HTMLElement, Run>();
    const ro = new ResizeObserver(() => drawMatrix(cv, Number(cv.dataset.t ?? MATRIX.duration)));
    ro.observe(cv);
    // Theme flips (system or the header toggle) repaint the canvas in the new colours.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const repaint = () => {
      invalidateColors(cv);
      drawMatrix(cv, Number(cv.dataset.t ?? MATRIX.duration));
    };
    mq.addEventListener("change", repaint);
    const mo = new MutationObserver(repaint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    const reset = (card: HTMLElement) => {
      const kind = card.dataset.card;
      card.dataset.state = "idle";
      card.querySelectorAll("[data-on]").forEach((n) => n.removeAttribute("data-on"));
      card.removeAttribute("data-verdict");
      card.querySelectorAll<HTMLElement>(".hv-axis-fill, .hv-seg-fill").forEach((n) => (n.style.transform = "scaleX(0)"));
      const head = card.querySelector<HTMLElement>(".hv-axis-head");
      if (head) head.style.transform = "translateX(0%)";
      setCount(card.querySelector(".hv-count"), 0);
      setCount(card.querySelector(".hv-count-caught"), 0);
      if (kind === "replay") {
        card.setAttribute("data-precatch", "");
        drawMatrix(cv, 0);
      }
    };
    const play = (card: HTMLElement) => {
      runs.get(card)!.alive = false;
      const r: Run = { alive: true, frames: new Set() };
      runs.set(card, r);
      reset(card);
      const kind = card.dataset.card;
      if (kind === "production") void playCareer(card, r);
      if (kind === "techLead") void playLead(card, r);
      if (kind === "stores") void playStores(card, r);
      if (kind === "replay") void playReplay(card, r, cv);
    };

    const cards = [...el.querySelectorAll<HTMLElement>("[data-card]")];
    cards.forEach((card) => runs.set(card, { alive: false, frames: new Set() }));
    if (still) {
      drawMatrix(cv, MATRIX.duration);
      cards.forEach((card) => card.setAttribute("data-verdict", ""));
    } else cards.forEach(reset);

    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const card = e.target as HTMLElement;
          io.unobserve(card);
          const lag = order++ * 180;
          setTimeout(() => run.alive && play(card), lag);
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.35 },
    );
    if (!still) cards.forEach((card) => io.observe(card));

    const onReplay = (e: Event) => {
      const btn = (e.target as HTMLElement).closest("[data-replay]");
      const card = btn?.closest<HTMLElement>("[data-card]");
      if (card && !reduced()) play(card);
    };
    el.addEventListener("click", onReplay);

    return () => {
      run.alive = false;
      run = { alive: false, frames: new Set() };
      for (const r of runs.values()) {
        r.alive = false;
        r.frames.forEach((f) => cancelAnimationFrame(f));
      }
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", repaint);
      el.removeEventListener("click", onReplay);
    };
  }, []);

  const rp = c.replay;
  return (
    <section ref={root} className="hv" aria-labelledby="hv-title">
      <svg width="0" height="0" className="hv-defs" aria-hidden="true">
        <defs>
          {/* A storefront: awning with scallops, window, door. Two variants so the grid is not a stamp. */}
          <symbol id="hv-shop-a" viewBox="0 0 32 32">
            <path d="M5 13v13h22V13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M4 7h24l2 6a3 3 0 0 1-6.5 0 3 3 0 0 1-5.75 0 3 3 0 0 1-5.5 0 3 3 0 0 1-5.75 0A3 3 0 0 1 2 13Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M18 26v-7h5v7M8 19h6v4H8z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </symbol>
          <symbol id="hv-shop-b" viewBox="0 0 32 32">
            <path d="M5 13v13h22V13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M4 7h24l2 6a3 3 0 0 1-6.5 0 3 3 0 0 1-5.75 0 3 3 0 0 1-5.5 0 3 3 0 0 1-5.75 0A3 3 0 0 1 2 13Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M9 26v-7h5v7M18 19h6v4h-6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </symbol>
        </defs>
      </svg>
      <div className="shell">
        <h2 id="hv-title" className="hv-title">
          {nobr(c.title)}
        </h2>
        <div className="hv-grid">
          {/* 7: the career on a year axis, one dot per completed year. */}
          <article className="hv-card" data-card="production">
            <div className="hv-head">
              <Num value={c.production.value} />
              <div className="hv-text">
                <p className="hv-label">{nobr(c.production.label)}</p>
                <p className="hv-note">{nobr(c.production.note)}</p>
              </div>
              <Replay label={ui.replay} />
            </div>
            <div className="hv-axis" aria-hidden="true">
              <div className="hv-axis-rail" />
              <div className="hv-axis-fill" />
              {YEAR_TICKS.map((t) => (
                <span key={t.y} className="hv-yr" style={{ "--x": t.m / CAREER_MONTHS } as CSSProperties}>
                  <span>{t.y}</span>
                </span>
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className="hv-anniv" data-on="" style={{ "--x": ((i + 1) * 12) / CAREER_MONTHS } as CSSProperties} />
              ))}
              <span className="hv-axis-start" />
              <div className="hv-axis-head">
                <span />
              </div>
              <span className="hv-axis-cap hv-cap-start">{nobr(ui.start)}</span>
              <span className="hv-axis-cap hv-cap-end">{nobr(ui.today)}</span>
            </div>
          </article>

          {/* 4: the Tech Lead role as four whole years and the two-month tail. */}
          <article className="hv-card" data-card="techLead">
            <div className="hv-head">
              <Num value={c.techLead.value} />
              <div className="hv-text">
                <p className="hv-label">{nobr(c.techLead.label)}</p>
                <p className="hv-note">{nobr(c.techLead.note)}</p>
              </div>
              <Replay label={ui.replay} />
            </div>
            <div className="hv-bar" aria-hidden="true">
              <span className="hv-axis-cap hv-cap-start">{nobr(ui.leadStart)}</span>
              <span className="hv-axis-cap hv-cap-end">{nobr(ui.leadEnd)}</span>
              <div className="hv-segs">
                {[2022, 2023, 2024, 2025].map((y) => (
                  <div key={y} className="hv-seg" data-on="" style={{ flexGrow: 12 }}>
                    <span className="hv-seg-fill" />
                    <span className="hv-seg-yr">{y}</span>
                  </div>
                ))}
                <div className="hv-seg hv-seg-tail" style={{ flexGrow: LEAD_MONTHS - 48 }}>
                  <span className="hv-seg-fill" />
                </div>
              </div>
            </div>
          </article>

          {/* 20+: twenty storefronts, then the plus. */}
          <article className="hv-card" data-card="stores">
            <div className="hv-head">
              <Num value={c.stores.value} suffix={c.stores.suffix} />
              <div className="hv-text">
                <p className="hv-label">{nobr(c.stores.label)}</p>
                <p className="hv-note">{nobr(c.stores.note)}</p>
              </div>
              <Replay label={ui.replay} />
            </div>
            <ul className="hv-shops" aria-hidden="true">
              {Array.from({ length: STORES }, (_, i) => (
                <li key={i} className="hv-shop" data-on="">
                  <StoreGlyph alt={(i * 7) % 3 === 0} />
                </li>
              ))}
              <li className="hv-shop-plus" data-on="">
                +
              </li>
            </ul>
          </article>

          {/* 500 and 37 on one card: messages as dots, violations caught on the guard line. */}
          <article className="hv-card hv-card-replay" data-card="replay" data-verdict="">
            <div className="hv-head">
              <Num value={rp.value} />
              <div className="hv-text">
                <p className="hv-label">{nobr(rp.label)}</p>
                <p className="hv-note">{nobr(rp.note)}</p>
              </div>
              <Replay label={ui.replay} />
            </div>
            <div className="hv-matrix">
              <canvas ref={canvas} aria-hidden="true" style={{ aspectRatio: `${ASPECT.w} / ${ASPECT.h}` }} />
              <span className="hv-guard-label" aria-hidden="true">
                {nobr(ui.guard)}
              </span>
            </div>
            <div className="hv-head hv-head-caught">
              <Num value={rp.caught} className="hv-count-caught" />
              <p className="hv-label">{nobr(rp.caughtLabel)}</p>
            </div>
            <p className="hv-verdict">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{nobr(rp.passed)}</span>
            </p>
            <p className="hv-legend">{nobr(ui.legend)}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
