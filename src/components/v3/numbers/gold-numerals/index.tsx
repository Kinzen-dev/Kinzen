"use client";

import { useEffect, useRef, useState } from "react";
import { STAT_KEYS } from "@/i18n/v3/numbers";
import { nobr } from "@/lib/thai-nodes";
import { acquireGl } from "../gl-lease";
import { useReducedMotion, useStep } from "../shared";
import type { ViewProps } from "../types";
import { createNumeralStage, type Layout, type NumeralStage } from "./stage";
import "./gold.css";

/** Figure left of the captions on wide stages, above them on narrow ones (matches gold.css). */
function layout(): Layout {
  if (window.matchMedia("(min-width: 48rem)").matches) return { zone: { x0: 0.05, y0: 0.2, x1: 0.53, y1: 0.78 } };
  return { zone: { x0: 0.08, y0: 0.07, x1: 0.92, y1: 0.43 } };
}

/**
 * Gold numerals (numbers view 4): gold dust forms each stat in turn on a navy stage, streaming
 * from 7 to 10+ to 6,000+ to 500 while the captions follow; the pointer stirs it, a click or tap
 * sends a pulse. The lab's pinned scroll became a self-playing story (steps move while the section
 * is seen and unheld; the numbered rail jumps). The dust uses the section's single WebGL context
 * and gives it back on unmount. Reduced motion, no WebGL2 or a software renderer: the figure in
 * gold type, same layout. All four stats stay in the DOM as text.
 */
export default function GoldNumerals({ copy, play }: ViewProps) {
  const { stats, ui } = copy;
  const reduced = useReducedMotion();
  const [step, go] = useStep(play, reduced);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<NumeralStage | null>(null);
  const [mode, setMode] = useState<"pending" | "fx" | "still">("pending");
  const figures = STAT_KEYS.map((k) => stats[k].figure);
  const stepRef = useRef(step);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    // Reduced motion: the still (rendered from `reduced`), no context at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dead = false;
    let release: (() => void) | null = null;
    const lease = acquireGl();
    const family = getComputedStyle(root).fontFamily || "sans-serif";
    void Promise.all([lease, document.fonts.load(`600 100px ${family}`, "0123456789+,").catch(() => undefined)]).then(
      ([free]) => {
        release = free;
        if (dead) return free();
        const stage = createNumeralStage(canvas, root, {
          figures,
          font: family,
          coarse: window.matchMedia("(pointer: coarse)").matches,
          layout,
          onReady: (ok) => !dead && setMode(ok ? "fx" : "still"),
        });
        if (!stage) {
          setMode("still");
          free();
          release = null;
          return;
        }
        root.dataset.tier = stage.tier;
        stage.setIndex(stepRef.current);
        stageRef.current = stage;
      },
    );
    return () => {
      dead = true;
      stageRef.current?.destroy();
      stageRef.current = null;
      release?.();
      // Still waiting for the context: give the turn straight back when it comes.
      if (!release) void lease.then((free) => free());
    };
    // figures come from copy (stable per locale).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stepRef.current = step;
    stageRef.current?.setIndex(step);
  }, [step]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div ref={rootRef} className="nv-view gn" data-scene="dark" data-mode={reduced ? "still" : mode}>
      <canvas ref={canvasRef} className="gn-canvas" aria-hidden="true" />
      <p className="gn-still" aria-hidden="true">
        {figures.map((f, i) => (
          <span key={f} data-on={i === step ? "" : undefined}>
            {f}
          </span>
        ))}
      </p>

      <ol className="gn-list">
        {STAT_KEYS.map((k, i) => {
          const s = stats[k];
          return (
            <li key={k} className="gn-item" data-on={i === step ? "" : undefined}>
              <p className="gn-meta">
                <span className="gn-idx">
                  {pad(i + 1)} / {pad(STAT_KEYS.length)}
                </span>
                <span className="gn-note">{nobr(s.note)}</span>
              </p>
              <p className="gn-label">
                <span className="sr-only">{s.figure} </span>
                {nobr(s.label)}
              </p>
              {k === "replay" ? (
                <>
                  <p className="gn-product">{nobr(stats.replay.product)}</p>
                  <div className="gn-second">
                    <p className="gn-second-fig">{stats.replay.caught}</p>
                    <p className="gn-second-label">{nobr(stats.replay.caughtLabel)}</p>
                  </div>
                  <p className="gn-outcome">
                    <i aria-hidden="true" />
                    {nobr(stats.replay.passed)}
                  </p>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="gn-steps" role="group" aria-label={ui.step}>
        {STAT_KEYS.map((k, i) => (
          <button key={k} type="button" aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
            <span>{stats[k].figure}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
