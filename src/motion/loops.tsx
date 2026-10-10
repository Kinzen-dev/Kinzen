import { isValidElement, type ReactNode } from "react";
import "./loops.css";

/** The plain text of a node tree (strings, numbers, arrays and elements' children). */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/**
 * Gold sweep: a slow light passing over one key word (loop). Compositor only: the word is plain
 * ink; a gold copy above it (CSS generated content, so it is not in the text, the accessible name
 * or a crawler's snippet) sits in a soft-edged window that slides across while the copy inside
 * slides back the same distance, so the letters never move. Both are transform animations.
 */
export function Sweep({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={["sweep", className].filter(Boolean).join(" ")}>
      {children}
      <span className="sweep-hl" aria-hidden="true">
        <span className="sweep-hl-in" data-text={textOf(children)} />
      </span>
    </span>
  );
}

/** Border beam: a short light running round its parent's border (loop). The parent carries the
 *  `beam` class; this ring holds a conic light that rotates (transform only) under a ring mask. */
export function BeamRing() {
  return <span className="beam-ring" aria-hidden="true" />;
}
