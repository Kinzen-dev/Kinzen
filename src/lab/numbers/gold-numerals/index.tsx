"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { numbersCopy } from "./copy";
import { createNumeralStage, type Layout } from "./stage";
import "./gold-numerals.css";

/** Figures sit left of the captions on wide screens, above them on narrow ones (matches the CSS). */
function layout(cw: number, ch: number): Layout {
  if (cw >= 900 && cw / ch > 1.15) return { zone: { x0: 0.06, y0: 0.24, x1: 0.55, y1: 0.8 } };
  return { zone: { x0: 0.07, y0: 0.17, x1: 0.93, y1: 0.51 } };
}

/**
 * Gold numerals (lab-numbers-b): a pinned navy scene where gold dust forms each stat in turn.
 * Scrolling through the section moves the dust from one figure to the next (7, 4, 20+, 500);
 * the pointer stirs it, a click or tap sends a pulse. The four stats are real text in an ordered
 * list (the canvas is decorative), so the section reads complete without the dust. Reduced
 * motion, no WebGL2 or a software renderer: a composed still with the figures in gold type.
 */
export default function GoldNumerals({ locale }: LabProps) {
  const c = numbersCopy(locale);
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"pending" | "fx" | "still">("pending");
  const [touch, setTouch] = useState(false);
  const total = c.stats.length;

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const canvas = canvasRef.current;
    if (!section || !pin || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let dead = false;
    let stage: ReturnType<typeof createNumeralStage> = null;
    let raf = 0;
    let last = -1;
    const read = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(0.9999, Math.max(0, -r.top / span));
      const i = Math.floor(p * total);
      if (i !== last) {
        last = i;
        setActive(i);
        stage?.setIndex(i);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    const family = getComputedStyle(section).fontFamily || "sans-serif";
    document.fonts
      .load(`600 100px ${family}`, "0123457+")
      .catch(() => undefined)
      .then(() => {
        if (dead) return;
        setTouch(coarse);
        if (reduced) {
          setMode("still");
          return;
        }
        stage = createNumeralStage(canvas, pin, {
          figures: c.stats.map((s) => s.figure),
          font: family,
          coarse,
          layout,
        });
        if (!stage) {
          setMode("still");
          return;
        }
        section.dataset.tier = stage.tier;
        section.dataset.count = String(stage.count);
        setMode("fx");
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        read();
      });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      stage?.destroy();
    };
  }, [c.stats, total]);

  /** Jump to a stat: scroll to the middle of its share of the pinned range. */
  const go = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / total) * span, behavior: "smooth" });
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      className="gn"
      data-scene="dark"
      data-mode={mode}
      aria-labelledby="gn-title"
      style={{ "--gn-steps": total } as CSSProperties}
    >
      <div ref={pinRef} className="gn-pin">
        <canvas ref={canvasRef} className="gn-canvas" aria-hidden="true" />
        <header className="gn-head">
          <h2 id="gn-title" className="gn-kicker">
            <i aria-hidden="true" />
            {nobr(c.title)}
          </h2>
          <p className="gn-hint">{nobr(touch ? c.hintTouch : c.hint)}</p>
        </header>

        <ol className="gn-list">
          {c.stats.map((s, i) => (
            <li key={s.key} className="gn-item" data-active={mode !== "fx" || i === active ? "" : undefined}>
              <p className="gn-fig">{s.figure}</p>
              <div className="gn-cap">
                <p className="gn-meta">
                  <span className="gn-idx">
                    {pad(i + 1)} / {pad(total)}
                  </span>
                  <span className="gn-note">{nobr(s.note)}</span>
                </p>
                <p className="gn-label">{nobr(s.label)}</p>
                {s.second ? (
                  <div className="gn-second">
                    <p className="gn-second-fig">{s.second.figure}</p>
                    <p className="gn-second-label">{nobr(s.second.label)}</p>
                  </div>
                ) : null}
                {s.outcome ? (
                  <p className="gn-outcome">
                    <i aria-hidden="true" />
                    {nobr(s.outcome)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {mode === "fx" ? (
          <nav className="gn-steps" aria-label={c.title}>
            {c.stats.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-current={i === active ? "step" : undefined}
                aria-label={`${s.figure} ${s.label}`}
                onClick={() => go(i)}
              >
                <span>{s.figure}</span>
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
