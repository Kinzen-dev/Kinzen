"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { DoodleFrame } from "@/components/doodles/doodle-frame";
import { doodleArt, type DoodleName } from "@/components/doodles/art.generated";
import { nobr } from "@/lib/thai-nodes";
import { loadMotion } from "@/motion/gsap";
import type { LabProps } from "../../types";
import { reduced, statsCopy } from "../split-flap/stats";
import { ASPECT, drawMatrix, invalidateColors, MATRIX } from "../honest-viz/matrix";
import "./scrolly.css";

const UI = {
  en: {
    start: "Oct 2019",
    end: "Oct 2026",
    leadStart: "Jan 2022",
    leadEnd: "Mar 2026",
    legend: "1 dot = 1 message. Where the 37 come from is illustrative.",
    scroll: "Scroll",
  },
  th: {
    start: "ต.ค. 2019",
    end: "ต.ค. 2026",
    leadStart: "ม.ค. 2022",
    leadEnd: "มี.ค. 2026",
    legend: "จุดละ 1 ข้อความ ตำแหน่งที่มาของ 37 ครั้งเป็นภาพประกอบ",
    scroll: "เลื่อนลง",
  },
};

/** The morphing numeral's four states, in order. */
const FIGS = ["7", "4", "20+", "500"];
/** Scroll length of each stat, in viewport heights (the last one plays the 500/37 replay). */
const LENS = [1, 1, 1, 1.7];
const STARTS = LENS.map((_, i) => LENS.slice(0, i).reduce((a, b) => a + b, 0));
const TOTAL = LENS.reduce((a, b) => a + b, 0);
/** Half-width of each numeral morph, in stat units, centred on the boundary. */
const MORPH = 0.2;
const DOODLES: DoodleName[] = ["servers-cloud", "checklist-merge", "shop-bag", "shield-braces"];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => x * x * (3 - 2 * x);

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
      <div className="ss-caps">
        <span>{nobr(start)}</span>
        <span className="ss-cap-gold">{nobr(end)}</span>
      </div>
    </div>
  );
}

function LeadMotif({ start, end }: { start: string; end: string }) {
  return (
    <div className="ss-lead" aria-hidden="true">
      <div className="ss-caps">
        <span>{nobr(start)}</span>
        <span className="ss-cap-gold">{nobr(end)}</span>
      </div>
      <div className="ss-lead-segs">
        {[2022, 2023, 2024, 2025].map((y, k) => (
          <div key={y} className="ss-lead-seg" style={{ "--k0": k * 12, "--len": 12, flexGrow: 12 } as CSSProperties}>
            <span className="ss-lead-fill" />
            <span className="ss-lead-yr">{y}</span>
          </div>
        ))}
        <div className="ss-lead-seg ss-lead-tail" style={{ "--k0": 48, "--len": 2, flexGrow: 2 } as CSSProperties}>
          <span className="ss-lead-fill" />
        </div>
      </div>
    </div>
  );
}

function StoresMotif() {
  return (
    <div className="ss-stores" aria-hidden="true">
      {Array.from({ length: 20 }, (_, k) => (
        <svg key={k} viewBox="0 0 32 32" className="ss-store" style={{ "--k": k } as CSSProperties}>
          <path d="M5 13v13h22V13" pathLength={1} />
          <path d="M4 7h24l2 6a3 3 0 0 1-6.5 0 3 3 0 0 1-5.75 0 3 3 0 0 1-5.5 0 3 3 0 0 1-5.75 0A3 3 0 0 1 2 13Z" pathLength={1} />
          <path d={k % 3 === 0 ? "M9 26v-7h5v7M18 19h6v4h-6z" : "M18 26v-7h5v7M8 19h6v4H8z"} pathLength={1} />
        </svg>
      ))}
      <span className="ss-store-plus">+</span>
    </div>
  );
}

export default function ScrollyStats({ locale }: LabProps) {
  const c = statsCopy(locale);
  const ui = UI[locale];
  const root = useRef<HTMLElement>(null);
  const numeral = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = root.current;
    const num = numeral.current;
    const cv = canvas.current;
    if (!el || !num || !cv) return;
    let alive = true;
    let raf = 0;
    const panels = [...el.querySelectorAll<HTMLElement>(".ss-panel")];
    const replay = panels[3];
    const caught = el.querySelector(".ss-caught-count");
    const stage = el.querySelector<HTMLElement>(".ss-stage");
    const slots = [...num.querySelectorAll<HTMLElement>(".ss-slot")].map((s) => ({
      a: s.children[0] as HTMLElement,
      b: s.children[1] as HTMLElement,
      ca: "",
      cb: "",
    }));
    const offs: (() => void)[] = [];

    const paintReplay = (m: number) => {
      const f = drawMatrix(cv, m * MATRIX.duration);
      if (caught && caught.textContent !== String(f.caught)) caught.textContent = String(f.caught);
      replay.toggleAttribute("data-verdict", f.verdict);
      replay.toggleAttribute("data-precatch", f.caught === 0);
    };

    // Glyph advance widths of the numeral face (measured, never assumed: the site font may change).
    const widths = new Map<string, number>();
    let size = 0;
    let colW = 0;
    const measure = () => {
      const probe = document.createElement("span");
      probe.className = "ss-measure";
      num.appendChild(probe);
      for (const ch of "0123456789+") {
        probe.textContent = ch;
        widths.set(ch, probe.getBoundingClientRect().width);
      }
      size = parseFloat(getComputedStyle(num).fontSize);
      colW = num.clientWidth;
      probe.remove();
    };

    const setSlot = (span: HTMLElement, text: string) => {
      if (span.textContent !== text) span.textContent = text;
    };

    /** The numeral at story position s (stat units): Apple-style numeric morph per slot. */
    const renderNumeral = (s: number) => {
      let from = FIGS[0];
      let to = FIGS[0];
      let t = 0;
      for (let j = 1; j < FIGS.length; j++) {
        const b = STARTS[j];
        if (s >= b - MORPH) {
          from = FIGS[j - 1];
          to = FIGS[j];
          t = smooth(clamp01((s - (b - MORPH)) / (2 * MORPH)));
        }
      }
      if (t >= 1) from = to;
      // Centre the figure in its column; the width eases between the two figures as they morph.
      let total = 0;
      for (let j = 0; j < slots.length; j++) {
        const wa = widths.get(from[j] ?? "") ?? 0;
        total += wa + ((widths.get(to[j] ?? "") ?? 0) - wa) * t;
      }
      let x = Math.max(0, (colW - total) / 2);
      slots.forEach((slot, j) => {
        const ca = from[j] ?? "";
        const cb = to[j] ?? "";
        const same = ca === cb;
        setSlot(slot.a, ca);
        setSlot(slot.b, same ? "" : cb);
        const wa = widths.get(ca) ?? 0;
        const wb = widths.get(cb) ?? 0;
        const lift = size * 0.3;
        const blur = Math.min(16, size * 0.05);
        const ta = same ? 0 : t;
        slot.a.style.transform = `translate3d(${x}px, ${-ta * lift}px, 0)`;
        slot.a.style.opacity = String(1 - ta);
        slot.a.style.filter = ta > 0.01 ? `blur(${ta * blur}px)` : "";
        if (!same) {
          slot.b.style.transform = `translate3d(${x}px, ${(1 - t) * lift}px, 0)`;
          slot.b.style.opacity = String(t);
          slot.b.style.filter = t < 0.99 ? `blur(${(1 - t) * blur}px)` : "";
        }
        x += wa + (wb - wa) * t;
      });
    };

    /** Everything on the stage at story position s. */
    const render = (s: number) => {
      renderNumeral(s);
      let active = 0;
      panels.forEach((p, i) => {
        const start = STARTS[i];
        const end = start + LENS[i];
        const vin = i === 0 ? 1 : smooth(clamp01((s - start + 0.02) / 0.22));
        const vout = i === panels.length - 1 ? 1 : 1 - smooth(clamp01((s - (end - 0.2)) / 0.2));
        const v = Math.min(vin, vout);
        // Motif: draws through the first ~65% of its stat, holds for the rest.
        const m = clamp01((s - start - (i === 0 ? 0 : 0.08)) / (LENS[i] * 0.66));
        p.style.opacity = String(v);
        p.style.transform = `translate3d(0, ${(1 - vin) * 28 - (1 - vout) * 28}px, 0)`;
        p.style.visibility = v < 0.005 ? "hidden" : "";
        p.style.setProperty("--m", m.toFixed(4));
        if (v > 0.5) active = i;
        if (i === 3 && v > 0) paintReplay(m);
      });
      if (stage && stage.dataset.active !== String(active)) stage.dataset.active = String(active);
      stage?.style.setProperty("--p", (s / TOTAL).toFixed(4));
    };

    const scrolly = window.matchMedia("(min-width: 48rem) and (prefers-reduced-motion: no-preference)");
    let kill: (() => void) | null = null;

    // Wide screens with motion: a pinned story. The scroll position is the target; the stage eases
    // toward it every frame (so a wheel notch never jumps a morph), and sleeps once it arrives.
    const startScrolly = async () => {
      const { ScrollTrigger } = await loadMotion();
      if (!alive || !scrolly.matches) return;
      measure();
      let target = 0;
      let current = -1;
      let last = 0;
      const tick = (now: number) => {
        const dt = Math.min(64, now - (last || now));
        last = now;
        if (current < 0) current = target;
        const k = 1 - Math.exp(-dt / 70);
        current += (target - current) * k;
        if (Math.abs(target - current) < 0.0004) current = target;
        render(current);
        raf = current !== target ? requestAnimationFrame(tick) : 0;
        if (!raf) last = 0;
      };
      const wake = () => {
        if (!raf) raf = requestAnimationFrame(tick);
      };
      const st = ScrollTrigger.create({
        trigger: el.querySelector(".ss-track") as HTMLElement,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          target = self.progress * TOTAL;
          wake();
        },
        onRefresh: () => {
          measure();
          wake();
        },
      });
      target = st.progress * TOTAL;
      current = target;
      render(current);
      kill = () => {
        st.kill();
        cancelAnimationFrame(raf);
        raf = 0;
      };
    };

    // Phones and reduced motion: a vertical list. With motion, each motif draws in as its panel
    // enters (CSS transition on the registered --m); reduced motion shows every one finished.
    const startStack = () => {
      panels.forEach((p) => {
        p.style.opacity = "";
        p.style.transform = "";
        p.style.visibility = "";
      });
      if (reduced()) {
        panels.forEach((p) => p.style.setProperty("--m", "1"));
        paintReplay(1);
        return;
      }
      panels.forEach((p) => p.style.setProperty("--m", "0"));
      paintReplay(0);
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const p = e.target as HTMLElement;
            io.unobserve(p);
            p.style.setProperty("--m", "1");
            if (p === replay) {
              const t0 = performance.now();
              const step = (now: number) => {
                if (!alive) return;
                const k = clamp01((now - t0) / MATRIX.duration);
                paintReplay(k);
                if (k < 1) raf = requestAnimationFrame(step);
              };
              raf = requestAnimationFrame(step);
            }
          }
        },
        { rootMargin: "0px 0px -20% 0px", threshold: 0.2 },
      );
      panels.forEach((p) => io.observe(p));
      kill = () => {
        io.disconnect();
        cancelAnimationFrame(raf);
      };
    };

    const boot = () => {
      kill?.();
      kill = null;
      if (scrolly.matches) void startScrolly();
      else startStack();
    };
    boot();
    scrolly.addEventListener("change", boot);
    offs.push(() => scrolly.removeEventListener("change", boot));

    const repaint = () => {
      invalidateColors(cv);
      drawMatrix(cv, Number(cv.dataset.t ?? MATRIX.duration));
    };
    const mo = new MutationObserver(repaint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const ro = new ResizeObserver(repaint);
    ro.observe(cv);
    offs.push(() => {
      mo.disconnect();
      ro.disconnect();
    });

    return () => {
      alive = false;
      kill?.();
      offs.forEach((f) => f());
    };
  }, []);

  const rp = c.replay;
  const stats = [
    { key: "production", fig: "7", s: c.production },
    { key: "techLead", fig: "4", s: c.techLead },
    { key: "stores", fig: "20+", s: c.stores },
  ] as const;

  return (
    <section ref={root} className="ss" data-scene="dark" aria-labelledby="ss-title">
      <div className="ss-track" style={{ "--total": TOTAL } as CSSProperties}>
        <div className="ss-stage" data-active="0">
          <div className="ss-top shell">
            <h2 id="ss-title" className="ss-title">
              {nobr(c.title)}
            </h2>
            <span className="ss-hint" aria-hidden="true">
              {nobr(ui.scroll)}
            </span>
          </div>

          <div className="ss-body shell">
            <div ref={numeral} className="ss-numeral" aria-hidden="true">
              {[0, 1, 2].map((j) => (
                <span key={j} className="ss-slot">
                  <span>{FIGS[0][j] ?? ""}</span>
                  <span />
                </span>
              ))}
            </div>

            <ol className="ss-panels">
              {stats.map(({ key, fig, s }, i) => (
                <li key={key} className="ss-panel" data-i={i}>
                  <p className="ss-fig">{fig}</p>
                  <div className="ss-copy">
                    <Doodle name={DOODLES[i]} />
                    <p className="ss-note">{nobr(s.note)}</p>
                    <p className="ss-label">{nobr(s.label)}</p>
                  </div>
                  {i === 0 ? <YearsMotif start={ui.start} end={ui.end} /> : null}
                  {i === 1 ? <LeadMotif start={ui.leadStart} end={ui.leadEnd} /> : null}
                  {i === 2 ? <StoresMotif /> : null}
                </li>
              ))}
              <li className="ss-panel ss-panel-replay" data-i={3}>
                <p className="ss-fig">{rp.value}</p>
                <div className="ss-copy">
                  <Doodle name={DOODLES[3]} />
                  <p className="ss-note">{nobr(rp.note)}</p>
                  <p className="ss-label">{nobr(rp.label)}</p>
                </div>
                <div className="ss-replay">
                  <canvas ref={canvas} aria-hidden="true" style={{ aspectRatio: `${ASPECT.w} / ${ASPECT.h}` }} />
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
                  <p className="ss-legend">{nobr(ui.legend)}</p>
                </div>
              </li>
            </ol>
          </div>

          <ol className="ss-rail" aria-hidden="true">
            {FIGS.map((f, i) => (
              <li key={f} data-i={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
