import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { nobr } from "@/lib/thai-nodes";

const graphemes =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function split(text: string): string[] {
  return graphemes ? [...graphemes.segment(text)].map((s) => s.segment) : [...text];
}

/**
 * Copy that can "type in": the nobr() text (Thai compounds kept whole) with every grapheme in its
 * own inline span carrying `--i`. A parent animates `--shown` (0..n); CSS reveals each character
 * from it, so typing never reflows the paragraph (the space is reserved from the first frame) and
 * Thai combining marks stay with their base letter. Returns the character count with the node.
 */
export function typed(text: string, className = "tp"): { node: ReactNode; count: number } {
  let i = 0;
  const walk = (n: ReactNode): ReactNode => {
    if (typeof n === "string")
      return split(n).map((g) => (
        <span key={i} className="tp-ch" style={{ ["--i" as string]: i++ }}>
          {g}
        </span>
      ));
    if (isValidElement(n)) {
      const el = n as ReactElement<{ children?: ReactNode }>;
      return cloneElement(el, undefined, ...Children.toArray(el.props.children).map(walk));
    }
    return n;
  };
  const node = <span className={className}>{walk(nobr(text))}</span>;
  return { node, count: i };
}
