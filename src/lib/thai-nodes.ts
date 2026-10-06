import { createElement, type ReactNode } from "react";
import { COMPOUNDS } from "./thai";

const THAI = /[฀-๿]/;

/**
 * Visible text with known Thai compounds kept on one line: each compound becomes a
 * `<span class="nobr">` (white-space: nowrap). Adds no characters, so copy, search and the
 * browser's own Thai dictionary see the original text. Non-strings and text without Thai pass
 * through untouched. Safe in server and client components (no hooks). Never use the result in a
 * string (template literal, join): it is a React node.
 */
export function nobr(text: unknown): ReactNode {
  if (typeof text !== "string" || !THAI.test(text)) return text as ReactNode;
  const out: ReactNode[] = [];
  let plain = "";
  let i = 0;
  while (i < text.length) {
    const word = COMPOUNDS.find((w) => text.startsWith(w, i));
    if (word) {
      if (plain) out.push(plain);
      plain = "";
      out.push(createElement("span", { key: i, className: "nobr" }, word));
      i += word.length;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (plain) out.push(plain);
  if (out.length === 1 && typeof out[0] === "string") return out[0];
  // One wrapper, so a flex or grid parent sees a single item, exactly as it saw the plain
  // string (several items would get the parent's gap between the parts of a sentence).
  return createElement("span", null, ...out);
}
