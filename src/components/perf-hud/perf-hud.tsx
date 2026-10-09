"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { startMonitor, type Sample } from "./monitor";

const box: CSSProperties = {
  position: "fixed",
  left: "max(0.5rem, env(safe-area-inset-left))",
  bottom: "max(0.5rem, env(safe-area-inset-bottom))",
  zIndex: 2147483000,
  display: "grid",
  gap: "0.125rem",
  padding: "0.375rem 0.5rem",
  borderRadius: "0.375rem",
  background: "#111",
  color: "#f2f2f2",
  font: "500 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
  fontVariantNumeric: "tabular-nums",
  pointerEvents: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
};
const button: CSSProperties = {
  pointerEvents: "auto",
  justifySelf: "start",
  minHeight: "24px",
  marginTop: "0.125rem",
  padding: "0 0.5rem",
  border: "1px solid #6b6b6b",
  borderRadius: "0.25rem",
  background: "#111",
  color: "#f2f2f2",
  font: "inherit",
};

/** Green at a steady 55+ fps, amber from 40, red below. */
const fpsColor = (fps: number) => (fps >= 55 ? "#7ee787" : fps >= 40 ? "#f2cc60" : "#ff7b72");
const ms = (v: number | null) => (v === null ? "-" : v.toFixed(1));

/**
 * Field perf HUD for a real phone (?perf=1): fps over the last second, frame-time p95 over the last
 * 5 s, long tasks per minute (long frames where the browser has no long-task timing), page rAF
 * requests per second, running animations (on screen), canvases that drew in the last second, the
 * device class and the frame governor's mode when it publishes one.
 */
export function PerfHud({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Sample | null>(null);

  useEffect(() => {
    const monitor = startMonitor();
    const id = window.setInterval(() => setS(monitor.sample()), 500);
    return () => {
      window.clearInterval(id);
      monitor.stop();
    };
  }, []);

  const g = s?.governor;
  const gov = g?.mode
    ? [
        g.mode,
        g.fpsCap ? `${g.fpsCap}cap` : "",
        g.scale ? `x${g.scale}` : "",
        g.active !== undefined ? `${g.active} live` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "n/a";

  return (
    <aside aria-label="Performance monitor" data-perf-hud="" style={box}>
      {s ? (
        <>
          <span>
            <span style={{ color: fpsColor(s.fps) }}>{s.fps} fps</span> · p95 {ms(s.p95)} ms
          </span>
          <span>
            long {s.longKind} {s.longPerMin}/min · rAF {s.rafPerSec}/s
          </span>
          <span>
            anims {s.animations} ({s.animationsOnScreen} on screen) · canvases {s.canvasesDrawing}
          </span>
          <span>
            {s.deviceClass} · DPR {s.dpr} · gov {gov}
          </span>
        </>
      ) : (
        <span>perf: measuring</span>
      )}
      <button type="button" style={button} onClick={onClose}>
        Hide
      </button>
    </aside>
  );
}
