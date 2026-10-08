"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { nobr } from "@/lib/thai-nodes";
import { prefersReduced } from "../shared";
import type { ViewProps } from "../types";
import { drawMatrix, invalidateColors, MATRIX, TALL, WIDE, type Grid } from "./matrix";
import "./viz.css";

/* The career from Oct 2019 to the build month (Oct 2026): 84 months, seven whole years. */
const CAREER_MONTHS = 84;
const YEAR_TICKS = [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => ({ y, m: (y - 2019) * 12 - 9 }));
const BRANDS = 10;
const TEAM = 8;
const TEAM_MIN = 5;
/** 6,000 daily active users at 100 a dot. */
const USER_DOTS = 60;
const PER_DOT = 100;

/** Phones and narrow cards lay the 500 messages out wide and short. */
const WIDE_MQ = "(max-width: 63.99rem)";
const gridNow = (): Grid => (window.matchMedia(WIDE_MQ).matches ? WIDE : TALL);

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

const fmt = new Intl.NumberFormat("en-US");
function setCount(el: Element | null, n: number) {
  const s = fmt.format(n);
  if (el && el.textContent !== s) el.textContent = s;
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

async function playBrands(card: HTMLElement, run: Run) {
  const shops = [...card.querySelectorAll<HTMLElement>(".hv-shop")];
  const plus = card.querySelector<HTMLElement>(".hv-shop-plus");
  const people = [...card.querySelectorAll<HTMLElement>(".hv-person")];
  const count = card.querySelector(".hv-count");
  const suffix = card.querySelector<HTMLElement>(".hv-suffix");
  card.dataset.state = "run";
  let shown = 0;
  await tween(
    run,
    BRANDS * 110,
    (p) => {
      const n = Math.min(BRANDS, Math.floor(p * BRANDS + 0.999));
      for (; shown < n; shown++) shops[shown]?.setAttribute("data-on", "");
      setCount(count, n);
    },
    ease.linear,
  );
  await wait(run, 160);
  plus?.setAttribute("data-on", "");
  suffix?.setAttribute("data-on", "");
  for (let i = 0; i < people.length && run.alive; i++) {
    people[i].setAttribute("data-on", "");
    await wait(run, 70);
  }
  card.dataset.state = "done";
}

async function playUsers(card: HTMLElement, run: Run) {
  const dots = [...card.querySelectorAll<HTMLElement>(".hv-user")];
  const plus = card.querySelector<HTMLElement>(".hv-user-plus");
  const count = card.querySelector(".hv-count");
  const suffix = card.querySelector<HTMLElement>(".hv-suffix");
  card.dataset.state = "run";
  let shown = 0;
  await tween(
    run,
    1800,
    (p) => {
      const n = Math.min(USER_DOTS, Math.floor(p * USER_DOTS + 0.999));
      for (; shown < n; shown++) dots[shown]?.setAttribute("data-on", "");
      setCount(count, n * PER_DOT);
    },
    ease.out,
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
  const grid = gridNow();
  await tween(
    run,
    total,
    (p) => {
      const f = drawMatrix(canvas, p * total, grid);
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

function Num({ figure, className = "hv-count" }: { figure: string; className?: string }) {
  const [, digits, suffix] = /^([\d,]+)(\D*)$/.exec(figure) ?? [figure, figure, ""];
  return (
    <span className="hv-num">
      <span className="sr-only">{figure}</span>
      {/* The final value, invisible, holds the width while the counter runs up to it. */}
      <span aria-hidden="true" className="hv-num-box">
        <span className="hv-num-ghost">{digits}</span>
        <span className={`${className} tabular`}>{digits}</span>
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
    <button type="button" className="hv-replay" data-replay aria-label={label}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Head({ figure, label, note, replay }: { figure: string; label: string; note: string; replay: string }) {
  return (
    <div className="hv-head">
      <Num figure={figure} />
      <div className="hv-text">
        <p className="hv-label">{nobr(label)}</p>
        <p className="hv-note">{nobr(note)}</p>
      </div>
      <Replay label={replay} />
    </div>
  );
}

/**
 * Honest micro-visualizations (numbers view 2): each figure drawn as its real quantity. Seven years
 * on an axis, ten storefronts and a plus with the team of five to eight beside them, sixty dots of
 * a hundred daily users each (a neutral field, nothing about the platform's trade), and the 500
 * messages with the 37 caught on the guard line. Counters and pictures share one clock; DOM marks
 * move by transform, the matrix is a pure canvas function of time. SSR and reduced motion show the
 * finished pictures.
 */
export default function HonestViz({ copy }: ViewProps) {
  const { stats, ui } = copy;
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const still = prefersReduced();
    const runs = new Map<HTMLElement, Run>();
    let alive = true;
    const paintFinal = () => drawMatrix(cv, Number(cv.dataset.t ?? MATRIX.duration), gridNow());
    const ro = new ResizeObserver(paintFinal);
    ro.observe(cv);
    // Theme flips (system or the header toggle) repaint the canvas in the new colours.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const repaint = () => {
      invalidateColors(cv);
      paintFinal();
    };
    mq.addEventListener("change", repaint);
    const mo = new MutationObserver(repaint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    const reset = (card: HTMLElement) => {
      card.dataset.state = "idle";
      card.querySelectorAll("[data-on]").forEach((n) => n.removeAttribute("data-on"));
      card.removeAttribute("data-verdict");
      card.querySelectorAll<HTMLElement>(".hv-axis-fill").forEach((n) => (n.style.transform = "scaleX(0)"));
      const head = card.querySelector<HTMLElement>(".hv-axis-head");
      if (head) head.style.transform = "translateX(0%)";
      setCount(card.querySelector(".hv-count"), 0);
      setCount(card.querySelector(".hv-count-caught"), 0);
      if (card.dataset.card === "replay") {
        card.setAttribute("data-precatch", "");
        drawMatrix(cv, 0, gridNow());
      }
    };
    const play = (card: HTMLElement) => {
      runs.get(card)!.alive = false;
      const r: Run = { alive: true, frames: new Set() };
      runs.set(card, r);
      reset(card);
      const kind = card.dataset.card;
      if (kind === "production") void playCareer(card, r);
      if (kind === "brands") void playBrands(card, r);
      if (kind === "users") void playUsers(card, r);
      if (kind === "replay") void playReplay(card, r, cv);
    };

    const cards = [...el.querySelectorAll<HTMLElement>("[data-card]")];
    cards.forEach((card) => runs.set(card, { alive: false, frames: new Set() }));
    if (still) {
      paintFinal();
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
          setTimeout(() => alive && play(card), lag);
        }
      },
      { threshold: 0.5 },
    );
    if (!still) cards.forEach((card) => io.observe(card));

    const onReplay = (e: Event) => {
      const btn = (e.target as HTMLElement).closest("[data-replay]");
      const card = btn?.closest<HTMLElement>("[data-card]");
      if (card && !prefersReduced()) play(card);
    };
    el.addEventListener("click", onReplay);

    return () => {
      alive = false;
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

  const rp = stats.replay;
  return (
    <div ref={root} className="nv-view hv">
      <svg width="0" height="0" className="hv-defs" aria-hidden="true">
        <defs>
          {/* A storefront: awning with scallops, window, door. Two variants so the row is not a stamp. */}
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
          {/* A person: head and shoulders. */}
          <symbol id="hv-person" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0Z" />
          </symbol>
        </defs>
      </svg>
      <div className="hv-grid">
        {/* 7: the career on a year axis, one dot per completed year. */}
        <article className="hv-card" data-card="production">
          <Head {...stats.production} replay={ui.replay} />
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
            <span className="hv-axis-cap hv-cap-start">{nobr(ui.careerStart)}</span>
            <span className="hv-axis-cap hv-cap-end">{nobr(ui.today)}</span>
          </div>
        </article>

        {/* 10+: ten storefronts and the plus; the team of five to eight beside them. */}
        <article className="hv-card" data-card="brands">
          <Head {...stats.brands} replay={ui.replay} />
          <div className="hv-brands" aria-hidden="true">
            <ul className="hv-shops">
              {Array.from({ length: BRANDS }, (_, i) => (
                <li key={i} className="hv-shop" data-on="">
                  <svg viewBox="0 0 32 32" focusable="false">
                    <use href={(i * 7) % 3 === 0 ? "#hv-shop-b" : "#hv-shop-a"} />
                  </svg>
                </li>
              ))}
              <li className="hv-shop-plus" data-on="">
                +
              </li>
            </ul>
            <div className="hv-team">
              <ul className="hv-people">
                {Array.from({ length: TEAM }, (_, i) => (
                  <li key={i} className="hv-person" data-on="" data-range={i >= TEAM_MIN ? "" : undefined}>
                    <svg viewBox="0 0 24 24" focusable="false">
                      <use href="#hv-person" />
                    </svg>
                  </li>
                ))}
              </ul>
              <span className="hv-team-cap">{nobr(ui.team)}</span>
            </div>
          </div>
        </article>

        {/* 6,000+: sixty dots of a hundred daily active users each, then the plus. */}
        <article className="hv-card" data-card="users">
          <Head {...stats.users} replay={ui.replay} />
          <div className="hv-users-wrap" aria-hidden="true">
            <ul className="hv-users">
              {Array.from({ length: USER_DOTS }, (_, i) => (
                <li key={i} className="hv-user" data-on="" style={{ "--k": i } as CSSProperties} />
              ))}
              <li className="hv-user-plus" data-on="">
                +
              </li>
            </ul>
            <span className="hv-legend">{nobr(ui.usersLegend)}</span>
          </div>
        </article>

        {/* 500 and 37 on one card: messages as dots, violations caught on the guard line. */}
        <article className="hv-card hv-card-replay" data-card="replay" data-verdict="">
          <div className="hv-head">
            <Num figure={rp.figure} />
            <div className="hv-text">
              <p className="hv-label">{nobr(rp.label)}</p>
              <p className="hv-note">
                {nobr(rp.note)}
                <span className="hv-product">{nobr(rp.product)}</span>
              </p>
            </div>
            <Replay label={ui.replay} />
          </div>
          <div className="hv-matrix">
            <canvas ref={canvas} aria-hidden="true" />
            <span className="hv-guard-label" aria-hidden="true">
              {nobr(ui.guard)}
            </span>
          </div>
          <div className="hv-head hv-head-caught">
            <Num figure={rp.caught} className="hv-count-caught" />
            <p className="hv-label">{nobr(rp.caughtLabel)}</p>
          </div>
          <p className="hv-verdict">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{nobr(rp.passed)}</span>
          </p>
          <p className="hv-legend">{nobr(ui.matrixLegend)}</p>
        </article>
      </div>
    </div>
  );
}
