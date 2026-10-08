import type { CSSProperties } from "react";
import { LOGO_SPRITE, logos } from "./logos.generated";
import { toolMark } from "./tool-marks";
import "./tool-mark.css";

/**
 * The mark for `name` (decorative: the visible name next to it is the label), or nothing.
 * It renders in the label's tone; its host (`data-tool-host`) shows the brand colour on hover,
 * focus or a tap (ToolMarkTap).
 */
export function ToolMark({ name }: { name: string }) {
  const mark = toolMark(name);
  if (!mark) return null;
  if (mark === "practice") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="tool-mark tool-mark-practice">
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      </svg>
    );
  }
  const { color, ...logo } = logos[mark];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="tool-mark"
      style={{ "--brand": color } as CSSProperties}
      data-badge={"badge" in logo ? logo.badge : undefined}
    >
      <use href={`${LOGO_SPRITE}#${mark}`} />
    </svg>
  );
}
