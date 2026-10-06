import { createElement, type ReactNode } from "react";
import { COMPOUNDS } from "./thai";

const THAI = /[฀-๿]/;

/**
 * Visible text with known Thai compounds kept on one line: each compound becomes a
 * `<span class="nobr">` (white-space: nowrap). Adds no characters, so copy, search and the
 * browser's own Thai dictionary see the original text. Non-strings and text without Thai pass
 * through untouched. Safe in server and client components (no hooks).
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
  return out.length === 1 && typeof out[0] === "string" ? out[0] : out;
}
