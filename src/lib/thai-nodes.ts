import { createElement, type ReactNode } from "react";
import { COMPOUNDS } from "./thai";

const THAI = /[฀-๿]/;
const THAI_RUN = /[฀-๿]+/g;

/**
 * Spaces that must not break in Thai copy (no characters added: an existing space becomes a
 * no-break space). A number keeps its unit ("7 ปี", "500 ข้อความ", "ทุก 6 ชั่วโมง"), and a short
 * Thai function word never ends a line before the Latin word it introduces ("ที่ ZyGen").
 */
const NUMBER_UNIT = /(\d[\d,.]*) (?=[฀-๿])/g;
const LEAD_WORD = /(^|[\s(])(ที่|ใน|ของ|กับ|และ|บน|ด้วย|จาก|ให้|เป็น) (?=[A-Za-z0-9])/g;

/** The repeat mark "ๆ" never starts a line: the space before it becomes a no-break space. */
const REPEAT_MARK = / ๆ/g;

/** Polite endings never start a line on their own: they stay with the word before them. */
const PARTICLES = new Set(["ค่ะ", "คะ", "ครับ", "นะ", "นะคะ", "นะครับ", "จ้ะ", "จ้า"]);

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "word" }) : null;

/** Character ranges [start, end) that must not break inside. */
function protectedRanges(src: string): [number, number][] {
  const ranges: [number, number][] = [];
  const free = (s: number, e: number) => !ranges.some(([a, b]) => s < b && e > a);
  // 1. Known compounds and phrases (longest first; COMPOUNDS is sorted that way).
  for (const word of COMPOUNDS) {
    let from = 0;
    for (;;) {
      const at = src.indexOf(word, from);
      if (at < 0) break;
      if (free(at, at + word.length)) ranges.push([at, at + word.length]);
      from = at + 1;
    }
  }
  // 2. A polite ending joins the word before it ("เจ็บมากค่ะ" never wraps as "เจ็บมาก | ค่ะ").
  if (segmenter) {
    for (const m of src.matchAll(THAI_RUN)) {
      const base = m.index ?? 0;
      const segs = [...segmenter.segment(m[0])];
      for (let k = 1; k < segs.length; k++) {
        if (!PARTICLES.has(segs[k].segment)) continue;
        const s = base + segs[k - 1].index;
        const e = base + segs[k].index + segs[k].segment.length;
        // Grow an existing range that ends where the particle starts, else add a new one.
        const prev = ranges.find(([, b]) => b === base + segs[k].index);
        if (prev && prev[0] <= s) prev[1] = e;
        else if (free(s, e)) ranges.push([s, e]);
      }
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

/**
 * Visible text with Thai kept whole where the browser's dictionary would split it badly: known
 * compounds and phrases, and polite endings with their word, each become a
 * `<span class="nobr">` (white-space: nowrap); numbers keep their unit. Adds no characters
 * (spaces may become no-break spaces), so copy, search and the browser's own Thai dictionary
 * see the original text. Non-strings and text without Thai pass through untouched. Safe in
 * server and client components (no hooks). Never use the result in a string (template literal,
 * join): it is a React node.
 */
export function nobr(text: unknown): ReactNode {
  if (typeof text !== "string" || !THAI.test(text)) return text as ReactNode;
  const src = text.replace(NUMBER_UNIT, "$1 ").replace(LEAD_WORD, "$1$2 ").replace(REPEAT_MARK, "\u00a0ๆ");
  const ranges = protectedRanges(src);
  if (ranges.length === 0) return src;
  const out: ReactNode[] = [];
  let at = 0;
  for (const [s, e] of ranges) {
    if (s > at) out.push(src.slice(at, s));
    out.push(createElement("span", { key: s, className: "nobr" }, src.slice(s, e)));
    at = e;
  }
  if (at < src.length) out.push(src.slice(at));
  // One wrapper, so a flex or grid parent sees a single item, exactly as it saw the plain
  // string (several items would get the parent's gap between the parts of a sentence).
  return createElement("span", null, ...out);
}
