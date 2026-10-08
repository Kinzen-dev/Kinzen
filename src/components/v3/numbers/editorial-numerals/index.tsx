"use client";

import { useEffect, useId, useRef, useState } from "react";
import { STAT_KEYS } from "@/i18n/v3/numbers";
import { nobr } from "@/lib/thai-nodes";
import { acquireGl } from "../gl-lease";
import { useReducedMotion, useStep } from "../shared";
import type { ViewProps } from "../types";
import { createInk, type Ink } from "./ink";
import "./editorial.css";

const NARROW_MQ = "(max-width: 47.99rem)";
const sideOf = (i: number) => (i % 2 ? "right" : "left");

/**
 * Editorial numerals (numbers view 5): a magazine spread on the page scene. The figure is set
 * enormous, cropped by the screen edge (alternating sides) and filled with slow gold-ink marbling
 * that bleeds in from that edge; a slim caption and a source line sit on the other side. Spreads
 * turn while the section is seen and unheld; the numbered rail jumps. The 500/37 spread opens a
 * "how it was measured" note. One WebGL canvas for every figure (the section's single context);
 * reduced motion: one still frame of the ink; no WebGL2: the figure in gold type.
 */
export default function EditorialNumerals({ copy, play }: ViewProps) {
  const { stats, ui } = copy;
  const reduced = useReducedMotion();
  const [step, go] = useStep(play, reduced);
  const rootRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<Ink | null>(null);
  const stepRef = useRef(step);
  const [mode, setMode] = useState<"pending" | "ink" | "type">("pending");
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const figures = STAT_KEYS.map((k) => stats[k].figure);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = root?.querySelector<HTMLCanvasElement>(".ed-canvas");
    if (!root || !canvas) return;
    let dead = false;
    let release: (() => void) | null = null;
    const lease = acquireGl();
    const family = getComputedStyle(root).fontFamily || "sans-serif";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void Promise.all([lease, document.fonts.load(`600 100px ${family}`, "0123456789+,").catch(() => undefined)]).then(
      ([free]) => {
        release = free;
        if (dead) return free();
        const i = stepRef.current;
        const ink = createInk(canvas, root, {
          figure: figures[i],
          side: sideOf(i),
          font: family,
          reduced: still,
          narrow: () => window.matchMedia(NARROW_MQ).matches,
          // Wide stages: the caption sits beside the drawn figure, not at a fixed column.
          onLayout: ({ left, right }) => {
            const r = root.getBoundingClientRect();
            const c = canvas.getBoundingClientRect();
            const gap = Math.max(32, r.width * 0.04);
            const side = root.dataset.side;
            const at = side === "right" ? r.right - (c.left + left) + gap : c.left + right - r.left + gap;
            const max = r.width - Math.min(r.width * 0.42, 448);
            root.style.setProperty("--ed-cap-at", `${Math.round(Math.max(0, Math.min(max, at)))}px`);
          },
        });
        if (!ink) {
          setMode("type");
          free();
          release = null;
          return;
        }
        inkRef.current = ink;
        ink.show(figures[i], sideOf(i));
        setMode("ink");
      },
    );
    return () => {
      dead = true;
      inkRef.current?.destroy();
      inkRef.current = null;
      release?.();
      if (!release) void lease.then((free) => free());
    };
    // figures come from copy (stable per locale).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stepRef.current = step;
    inkRef.current?.show(figures[step], sideOf(step));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const rp = stats.replay;
  // The note belongs to the 500/37 spread: it closes whenever another spread is shown.
  const isOpen = open && step === 3;

  return (
    <div ref={rootRef} className="nv-view ed" data-mode={mode} data-side={sideOf(step)}>
      <div className="ed-stage" aria-hidden="true">
        <canvas className="ed-canvas" />
        <p className="ed-fig">
          {figures.map((f, i) => (
            <span key={f} data-on={i === step ? "" : undefined} data-side={sideOf(i)}>
              {f}
            </span>
          ))}
        </p>
      </div>

      <ol className="ed-caps">
        {STAT_KEYS.map((k, i) => {
          const s = stats[k];
          return (
            <li key={k} className="ed-cap" data-on={i === step ? "" : undefined} data-side={sideOf(i)}>
              <p className="ed-idx">
                <span>{pad(i + 1)}</span>
              </p>
              <h3 className="ed-label">
                <span className="sr-only">{s.figure} </span>
                {nobr(s.label)}
              </h3>
              {k === "replay" ? (
                <>
                  <p className="ed-second">
                    <span className="ed-second-fig">{rp.caught}</span>
                    <span className="ed-second-label">{nobr(rp.caughtLabel)}</span>
                  </p>
                  <p className="ed-outcome">{nobr(rp.passed)}</p>
                </>
              ) : null}
              <p className="ed-source">
                <span>{nobr(ui.source)}</span>
                {nobr(s.source)}
              </p>
              {k === "replay" ? (
                <div className="ed-measure" data-open={isOpen || undefined}>
                  <button
                    type="button"
                    className="ed-measure-btn"
                    aria-expanded={isOpen}
                    aria-controls={noteId}
                    tabIndex={i === step ? 0 : -1}
                    onClick={() => setOpen(!isOpen)}
                  >
                    <i aria-hidden="true" />
                    {nobr(rp.measuredBtn)}
                  </button>
                  <div className="ed-note" id={noteId}>
                    <div>
                      <p>{nobr(rp.measured)}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="ed-steps" role="group" aria-label={ui.step}>
        {STAT_KEYS.map((k, i) => (
          <button key={k} type="button" aria-current={i === step ? "step" : undefined} aria-label={stats[k].figure} onClick={() => go(i)}>
            <span aria-hidden="true">{pad(i + 1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
