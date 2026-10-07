import type { CSSProperties } from "react";
import { LOGO_SPRITE, logos } from "@/components/tools/logos.generated";
import { toolMark } from "@/components/tools/tool-marks";
import "./marks.css";

/**
 * A tool's mark in the theme tone; it takes its brand colour when an ancestor sets `data-on`
 * (or on hover/focus, per the demo's CSS). A black brand mark lights to full ink; a mark that
 * would vanish on the surface (React/Vitest on light, SQLite/Fly.io on dark) gets a tile when lit.
 * Text-only tools (no mark, or a mark we leave out) and practices return null: the caller shows
 * the name instead.
 */
export function LabMark({ name, className = "" }: { name: string; className?: string }) {
  const mark = toolMark(name);
  if (!mark) return null;
  if (mark === "practice") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`lm lm-practice ${className}`}>
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  const logo: { color: string; badge?: string } = logos[mark];
  const style = { "--brand": logo.color === "currentColor" ? "var(--ink)" : logo.color } as CSSProperties;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`lm ${className}`}
      style={style}
      data-badge={logo.badge}
    >
      <use href={`${LOGO_SPRITE}#${mark}`} />
    </svg>
  );
}

/** "mark" for a brand mark, "practice" for a way of working, "text" for a text-only tool. */
export function markKind(name: string): "mark" | "practice" | "text" {
  const mark = toolMark(name);
  return !mark ? "text" : mark === "practice" ? "practice" : "mark";
}
