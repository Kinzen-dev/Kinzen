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
/**
 * Spaces that must not break in Thai copy (no characters added: an existing space becomes a
 * no-break space). A number keeps its unit ("7 ปี", "500 ข้อความ", "ทุก 6 ชั่วโมง"), and a short
 * Thai function word never ends a line before the Latin word it introduces ("ที่ ZyGen").
 */
const NUMBER_UNIT = /(\d[\d,.]*) (?=[\u0E00-\u0E7F])/g;
const LEAD_WORD = /(^|[\s(])(ที่|ใน|ของ|กับ|และ|บน|ด้วย|จาก|ให้|เป็น) (?=[A-Za-z0-9])/g;

export function nobr(text: unknown): ReactNode {
  if (typeof text !== "string" || !THAI.test(text)) return text as ReactNode;
  const src = text.replace(NUMBER_UNIT, "$1\u00a0").replace(LEAD_WORD, "$1$2\u00a0");
  const out: ReactNode[] = [];
  let plain = "";
  let i = 0;
  while (i < src.length) {
    const word = COMPOUNDS.find((w) => src.startsWith(w, i));
    if (word) {
      if (plain) out.push(plain);
      plain = "";
      out.push(createElement("span", { key: i, className: "nobr" }, word));
      i += word.length;
    } else {
      plain += src[i];
      i += 1;
    }
  }
  if (plain) out.push(plain);
  if (out.length === 1 && typeof out[0] === "string") return out[0];
  // One wrapper, so a flex or grid parent sees a single item, exactly as it saw the plain
  // string (several items would get the parent's gap between the parts of a sentence).
  return createElement("span", null, ...out);
}
