"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { numbersCopy } from "../gold-numerals/copy";
import { createInk, type Ink } from "./ink";
import "./editorial-numerals.css";

/**
 * Editorial numerals (lab-numbers-b): magazine spreads on the page scene. Each figure is enormous,
 * cropped by the viewport edge (alternating sides) and filled with slow gold-ink marbling that
 * bleeds in from the edge as it arrives; a slim caption and a source line sit on the other side,
 * moving at a different rate on scroll. The 500/37 spread opens a "how it was measured" note on
 * hover or on its button. Reduced motion: one still frame of the ink, no parallax. No WebGL2: the
 * figures are set in gold type.
 */
export default function EditorialNumerals({ locale }: LabProps) {
  const c = numbersCopy(locale);
  const rootRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"ink" | "type">("ink");
  const [open, setOpen] = useState(false);
  const noteId = useId();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = [...root.querySelectorAll<HTMLElement>(".ed-row")];
    const family = getComputedStyle(root).fontFamily || "sans-serif";
    let dead = false;
    let inks: Ink[] = [];
    let io: IntersectionObserver | null = null;
    let raf = 0;

    // Parallax: the figure drifts against the scroll, the caption a little with it.
    const parallax = () => {
      raf = 0;
      const vh = window.innerHeight;
      const amp = window.innerWidth < 700 ? 0.5 : 1;
      for (const row of rows) {
        const r = row.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const k = (r.top + r.height / 2 - vh / 2) / vh;
        row.style.setProperty("--ed-fig-y", `${(k * 70 * amp).toFixed(1)}px`);
        row.style.setProperty("--ed-cap-y", `${(k * -26 * amp).toFixed(1)}px`);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(parallax);
    };

    document.fonts
      .load(`600 100px ${family}`, "0123457+")
      .catch(() => undefined)
      .then(() => {
        if (dead) return;
        for (const row of rows) {
          const canvas = row.querySelector<HTMLCanvasElement>(".ed-canvas");
          const figure = row.dataset.figure ?? "";
          const ink = canvas
            ? createInk(canvas, row, {
                figure,
                side: row.dataset.side === "right" ? "right" : "left",
                font: family,
                reduced,
                // Wide screens: the caption sits beside the figure, bottom on its baseline.
                onLayout: ({ left, right }) => {
                  const side = row.dataset.side;
                  const rr = row.getBoundingClientRect();
                  const cr = canvas.getBoundingClientRect();
                  const gap = Math.max(32, window.innerWidth * 0.045);
                  const pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
                  const max = rr.width - pad - Math.min(rr.width * 0.42, 480);
                  const at = side === "right" ? rr.right - (cr.left + left) + gap : cr.left + right - rr.left + gap;
                  row.style.setProperty("--ed-cap-at", `${Math.round(Math.min(max, Math.max(pad, at)))}px`);
                },
              })
            : null;
          if (!ink) {
            inks.forEach((i) => i.destroy());
            inks = [];
            setMode("type");
            return;
          }
          inks.push(ink);
        }
        root.dataset.ready = "ink";
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              const i = rows.indexOf(e.target as HTMLElement);
              inks[i]?.reveal();
              (e.target as HTMLElement).dataset.in = "";
            }
          },
          { threshold: 0.35 },
        );
        rows.forEach((r) => io!.observe(r));
        if (!reduced) {
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
          parallax();
        }
      });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      inks.forEach((i) => i.destroy());
    };
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section ref={rootRef} className="ed" data-mode={mode} aria-labelledby="ed-title">
      <header className="ed-head shell">
        <h2 id="ed-title" className="ed-kicker">
          {nobr(c.title)}
        </h2>
        <span className="ed-head-rule" aria-hidden="true" />
      </header>

      {c.stats.map((s, i) => (
        <article
          key={s.key}
          className="ed-row"
          data-key={s.key}
          data-figure={s.figure}
          data-side={i % 2 ? "right" : "left"}
          data-open={s.second && open ? "" : undefined}
        >
          <div className="ed-stage" aria-hidden="true">
            <canvas className="ed-canvas" />
            <p className="ed-fig">{s.figure}</p>
          </div>
          <div className="ed-cap">
            <p className="ed-idx">
              <span>{pad(i + 1)}</span>
            </p>
            <h3 className="ed-label">
              <span className="sr-only">{s.figure} </span>
              {nobr(s.label)}
            </h3>
            {s.second ? (
              <p className="ed-second">
                <span className="ed-second-fig">{s.second.figure}</span>
                <span className="ed-second-label">{nobr(s.second.label)}</span>
              </p>
            ) : null}
            {s.outcome ? <p className="ed-outcome">{nobr(s.outcome)}</p> : null}
            <p className="ed-source">
              <span>{nobr(c.sourceLabel)}</span>
              {nobr(s.source)}
            </p>
            {s.second ? (
              <div className="ed-measure">
                <button
                  type="button"
                  className="ed-measure-btn"
                  aria-expanded={open}
                  aria-controls={noteId}
                  onClick={() => setOpen((v) => !v)}
                >
                  <i aria-hidden="true" />
                  {nobr(c.measuredBtn)}
                </button>
                <div className="ed-note" id={noteId}>
                  <div>
                    <p>{nobr(c.measured)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
