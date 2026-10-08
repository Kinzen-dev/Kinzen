"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { DoodleFrame } from "@/components/doodles/doodle-frame";
import { doodleArt, type DoodleName } from "@/components/doodles/art.generated";
import { STAT_KEYS } from "@/i18n/v3/numbers";
import { nobr } from "@/lib/thai-nodes";
import { drawMatrix, invalidateColors, MATRIX, TALL, WIDE } from "../honest-viz/matrix";
import { clamp01, smooth, STEP_MS, useReducedMotion, useStep } from "../shared";
import type { ViewProps } from "../types";
import "./scrolly.css";

const DOODLES: DoodleName[] = ["checklist-merge", "shop-bag", "servers-cloud", "shield-braces"];
/** Slots of the morphing numeral: the longest figure, 6,000+. */
const SLOTS = 6;
const MORPH_MS = 900;
/** Phones lay the 500 messages out wide and short (matches scrolly.css). */
const WIDE_MQ = "(max-width: 47.99rem)";

function Doodle({ name }: { name: DoodleName }) {
  const art = doodleArt[name];
  return (
    <DoodleFrame w={art.w} h={art.h} className="ss-doodle">
      <path fill="currentColor" d={art.d} />
    </DoodleFrame>
  );
}

/* ------------------------------ Motifs (draw from --m, 0..1) ------------------------------ */

function YearsMotif({ start, end }: { start: string; end: string }) {
  // Seven hops, one per completed year, Oct 2019 to Oct 2026 on an even axis.
  const W = 1000;
  const step = W / 7;
  return (
    <div className="ss-years" aria-hidden="true">
      <div className="ss-caps">
        <span>{nobr(start)}</span>
        <span className="ss-cap-gold">{nobr(end)}</span>
      </div>
      <svg viewBox={`0 -70 ${W} 90`} preserveAspectRatio="xMidYMax meet">
        <line x1="0" x2={W} y1="0" y2="0" className="ss-axis" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={i * step} x2={i * step} y1="-6" y2="6" className="ss-tick" />
        ))}
        {Array.from({ length: 7 }, (_, k) => (
          <path
            key={k}
            d={`M${k * step + 6} 0 Q ${(k + 0.5) * step} -64 ${(k + 1) * step - 6} 0`}
            pathLength={1}
            className="ss-hop"
            style={{ "--k": k } as CSSProperties}
          />
        ))}
        {Array.from({ length: 7 }, (_, k) => (
          <circle key={k} cx={(k + 1) * step} cy="0" r="5" className="ss-land" style={{ "--k": k } as CSSProperties} />
        ))}
        <circle cx="0" cy="0" r="5" className="ss-origin" />
      </svg>
      <div className="ss-years-labels">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ "--x": i / 7 } as CSSProperties}>
            {2019 + i}
          </span>
        ))}
      </div>
    </div>
  );
}

const STORE_PATHS = [
  "M5 13v13h22V13",
  "M4 7h24l2 6a3 3 0 0 1-6.5 0 3 3 0 0 1-5.75 0 3 3 0 0 1-5.5 0 3 3 0 0 1-5.75 0A3 3 0 0 1 2 13Z",
];

function BrandsMotif({ team }: { team: string }) {
  return (
    <div className="ss-brands" aria-hidden="true">
      <div className="ss-stores">
        {Array.from({ length: 10 }, (_, k) => (
          <svg key={k} viewBox="0 0 32 32" className="ss-store" style={{ "--k": k } as CSSProperties}>
            {STORE_PATHS.map((d) => (
              <path key={d} d={d} pathLength={1} />
            ))}
            <path d={k % 3 === 0 ? "M9 26v-7h5v7M18 19h6v4h-6z" : "M18 26v-7h5v7M8 19h6v4H8z"} pathLength={1} />
          </svg>
        ))}
        <span className="ss-store-plus">+</span>
      </div>
      <div className="ss-team">
        {Array.from({ length: 8 }, (_, k) => (
          <svg key={k} viewBox="0 0 24 24" className="ss-person" data-range={k >= 5 ? "" : undefined} style={{ "--k": k } as CSSProperties}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0Z" />
          </svg>
        ))}
        <span className="ss-team-cap">{nobr(team)}</span>
      </div>
    </div>
  );
}

function UsersMotif({ legend }: { legend: string }) {
  return (
    <div className="ss-users" aria-hidden="true">
      <div className="ss-users-field">
        {Array.from({ length: 60 }, (_, k) => (
          <span key={k} className="ss-user" style={{ "--k": k } as CSSProperties} />
        ))}
        <span className="ss-user-plus">+</span>
      </div>
      <span className="ss-legend">{nobr(legend)}</span>
    </div>
  );
}

/**
 * Story (numbers view 3): the lab's pinned scroll story made self-playing. One huge numeral morphs
 * 7, 10+, 6,000+, 500 on a navy stage, each step with its doodle, its words and a gold motif that
 * draws itself (the years hopping along an axis, ten storefronts and the team, a field of users,
 * the 500 messages with the 37 caught). Steps move on while the section is seen and unheld; the
 * numbered rail jumps. Reduced motion: still compositions, the rail still switches.
 */
export default function ScrollyStats({ copy, play }: ViewProps) {
  const { stats, ui } = copy;
  const reduced = useReducedMotion();
  const [step, go] = useStep(play, reduced);
  const root = useRef<HTMLDivElement>(null);
  const numeral = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const figs = STAT_KEYS.map((k) => stats[k].figure);
  const prev = useRef(0);

  useEffect(() => {
    const el = root.current;
    const num = numeral.current;
    const cv = canvas.current;
    if (!el || !num || !cv) return;
    const from = prev.current;
    prev.current = step;
    const panels = [...el.querySelectorAll<HTMLElement>(".ss-panel")];
    const replay = panels[3];
    const caught = el.querySelector(".ss-caught-count");
    const inner = num.firstElementChild as HTMLElement;
    const slots = [...num.querySelectorAll<HTMLElement>(".ss-slot")].map((s) => ({
      a: s.children[0] as HTMLElement,
      b: s.children[1] as HTMLElement,
    }));
    const grid = () => (window.matchMedia(WIDE_MQ).matches ? WIDE : TALL);
    const paintReplay = (m: number) => {
      const f = drawMatrix(cv, m * MATRIX.duration, grid());
      if (caught && caught.textContent !== String(f.caught)) caught.textContent = String(f.caught);
      replay.toggleAttribute("data-verdict", f.verdict);
      replay.toggleAttribute("data-precatch", f.caught === 0);
    };

    // Glyph advance widths of the numeral face (measured, never assumed: the site font may change).
    // The probe sits in the numeral box, outside the scaled inner layer, so it reads true widths.
    const widths = new Map<string, number>();
    const probe = document.createElement("span");
    probe.className = "ss-measure";
    num.appendChild(probe);
    for (const ch of "0123456789+,") {
      probe.textContent = ch;
      widths.set(ch, probe.getBoundingClientRect().width);
    }
    probe.remove();
    const size = parseFloat(getComputedStyle(num).fontSize);
    const colW = num.clientWidth;
    const widthOf = (f: string) => [...f].reduce((w, ch) => w + (widths.get(ch) ?? 0), 0);
    /** Each figure as large as the column allows, never past its base size. */
    const fit = (f: string) => Math.min(1, (colW * 0.98) / Math.max(1, widthOf(f)));

    const setSlot = (span: HTMLElement, text: string) => {
      if (span.textContent !== text) span.textContent = text;
    };
    /** The numeral between two figures (t 0..1): per-slot morph, the whole set scaled to fit. */
    const renderNumeral = (a: string, b: string, t: number) => {
      const A = [...a];
      const B = [...b];
      const total = widthOf(a) + (widthOf(b) - widthOf(a)) * t;
      let x = -total / 2;
      for (let j = 0; j < SLOTS; j++) {
        const ca = A[j] ?? "";
        const cb = B[j] ?? "";
        const same = ca === cb;
        const slot = slots[j];
        setSlot(slot.a, ca);
        setSlot(slot.b, same ? "" : cb);
        const wa = widths.get(ca) ?? 0;
        const wb = widths.get(cb) ?? 0;
        const lift = size * 0.3;
        const blur = Math.min(16, size * 0.05);
        const ta = same ? 0 : t;
        slot.a.style.transform = `translate3d(${x}px, ${-ta * lift}px, 0)`;
        slot.a.style.opacity = String(1 - ta);
        slot.a.style.filter = ta > 0.01 && ta < 0.99 ? `blur(${ta * blur}px)` : "";
        if (!same) {
          slot.b.style.transform = `translate3d(${x}px, ${(1 - t) * lift}px, 0)`;
          slot.b.style.opacity = String(t);
          slot.b.style.filter = t > 0.01 && t < 0.99 ? `blur(${(1 - t) * blur}px)` : "";
        }
        x += wa + (wb - wa) * t;
      }
      const sc = fit(a) + (fit(b) - fit(a)) * t;
      inner.style.transform = `scale(${sc})`;
    };

    const setPanels = (active: number, m: number) => {
      panels.forEach((p, i) => {
        p.toggleAttribute("data-on", i === active);
        p.style.setProperty("--m", i === active ? m.toFixed(4) : i < active ? "1" : "0");
      });
      if (active === 3) paintReplay(m);
      el.dataset.active = String(active);
    };

    const ro = new ResizeObserver(() => renderNumeral(figs[step], figs[step], 0));
    ro.observe(num);
    const repaint = () => {
      invalidateColors(cv);
      drawMatrix(cv, Number(cv.dataset.t ?? MATRIX.duration), grid());
    };
    const mo = new MutationObserver(repaint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    if (reduced) {
      renderNumeral(figs[step], figs[step], 0);
      setPanels(step, 1);
      return () => {
        ro.disconnect();
        mo.disconnect();
      };
    }

    // One clock per step: the numeral morphs in, then the motif draws through ~65% of the step.
    let raf = 0;
    const t0 = performance.now();
    const drawMs = step === 3 ? MATRIX.duration : STEP_MS[step] * 0.62;
    const first = from === step;
    const tick = (now: number) => {
      const e = now - t0;
      const mt = first ? 1 : smooth(clamp01(e / MORPH_MS));
      renderNumeral(figs[from], figs[step], mt);
      const m = clamp01((e - (first ? 200 : MORPH_MS * 0.55)) / drawMs);
      setPanels(step, step === 3 ? m : smooth(m));
      if (mt < 1 || m < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
    // figs is derived from copy, stable per locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reduced]);

  const rp = stats.replay;
  const items = [
    { key: "production", s: stats.production, motif: <YearsMotif start={ui.careerStart} end={ui.today} /> },
    { key: "brands", s: stats.brands, motif: <BrandsMotif team={ui.team} /> },
    { key: "users", s: stats.users, motif: <UsersMotif legend={ui.usersLegend} /> },
  ] as const;

  return (
    <div ref={root} className="nv-view ss" data-scene="dark" data-active="0">
      <div ref={numeral} className="ss-numeral" aria-hidden="true">
        <div className="ss-numeral-inner">
          {Array.from({ length: SLOTS }, (_, j) => (
            <span key={j} className="ss-slot">
              <span>{figs[0][j] ?? ""}</span>
              <span />
            </span>
          ))}
        </div>
      </div>

      <ol className="ss-panels">
        {items.map(({ key, s, motif }, i) => (
          <li key={key} className="ss-panel" data-i={i} data-on={i === 0 ? "" : undefined}>
            <div className="ss-copy">
              <Doodle name={DOODLES[i]} />
              <p className="ss-note">{nobr(s.note)}</p>
              <p className="ss-label">
                <span className="sr-only">{s.figure} </span>
                {nobr(s.label)}
              </p>
            </div>
            {motif}
          </li>
        ))}
        <li className="ss-panel ss-panel-replay" data-i={3}>
          <div className="ss-copy">
            <p className="ss-note">
              {nobr(rp.note)} <span className="ss-product">{nobr(rp.product)}</span>
            </p>
            <p className="ss-label">
              <span className="sr-only">{rp.figure} </span>
              {nobr(rp.label)}
            </p>
          </div>
          <div className="ss-replay">
            <canvas ref={canvas} aria-hidden="true" />
            <div className="ss-caught">
              <p className="ss-caught-fig">
                <span className="sr-only">{rp.caught}</span>
                <span className="ss-caught-count tabular" aria-hidden="true">
                  {rp.caught}
                </span>
              </p>
              <p className="ss-caught-label">{nobr(rp.caughtLabel)}</p>
            </div>
            <p className="ss-verdict">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{nobr(rp.passed)}</span>
            </p>
          </div>
        </li>
      </ol>

      <div className="ss-rail" role="group" aria-label={ui.step}>
        {STAT_KEYS.map((k, i) => (
          <button
            key={k}
            type="button"
            aria-current={i === step ? "step" : undefined}
            aria-label={stats[k].figure}
            onClick={() => go(i)}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
