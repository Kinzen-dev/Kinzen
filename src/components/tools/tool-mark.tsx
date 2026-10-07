import { LOGO_SPRITE, logos } from "./logos.generated";
import { toolMark } from "./tool-marks";
import "./tool-mark.css";

/** The mark for `name` (decorative: the visible name next to it is the label), or nothing. */
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
      fill={color}
      data-badge={"badge" in logo ? logo.badge : undefined}
    >
      <use href={`${LOGO_SPRITE}#${mark}`} />
    </svg>
  );
}
