/**
 * A toy rule check: a few phrase patterns a clinic assistant must never say. Deliberately small
 * and readable; it only illustrates the idea of checking every reply in code before it is sent.
 */
export type RuleId = "promise" | "diagnosis" | "medication" | "pressure";

export const RULES: { id: RuleId; en: RegExp; th: RegExp }[] = [
  {
    id: "promise",
    en: /\b(guarantee[ds]?|100 ?(%|percent)|definitely (works?|fix(es)?)|won'?t hurt|will not hurt|doesn'?t hurt|painless|no pain|risk[- ]free|no risk|permanent(ly)?)\b/gi,
    th: /รับประกัน|การันตี|ได้ผลแน่นอน|ผลแน่นอน|ไม่เจ็บ|ไม่ปวดเลย|หายขาด|ร้อยเปอร์เซ็นต์|100 ?%/g,
  },
  {
    id: "diagnosis",
    en: /\b((sounds like|looks like|you (probably |might |must )?have|it'?s (probably |likely )?)\s*(an? |the )?(infection|abscess|cavity|cavities|gum disease|decay|cancer))\b|\b(infection|abscess)\b/gi,
    th: /ติดเชื้อ|ฟันผุ|เหงือกอักเสบ|อักเสบ|เป็นโรค|น่าจะเป็นโรค/g,
  },
  {
    id: "medication",
    en: /\b(take (one|two|three|four|\d+|a|some|an?)?\s?(pills?|tablets?|capsules?|painkillers?|ibuprofen|paracetamol|antibiotics?)|\d+ ?mg|painkillers?|antibiotics?|ibuprofen|paracetamol|double (the|your) dose|stop taking)\b/gi,
    th: /(ทาน|กิน)ยา|ยาแก้ปวด|ยาฆ่าเชื้อ|ยาปฏิชีวนะ|\d+ ?เม็ด|(หนึ่ง|สอง|สาม|สี่)เม็ด|มิลลิกรัม/g,
  },
  {
    id: "pressure",
    en: /\b(only (for )?today|today only|last chance|limited time|act now|hurry|cheapest|best in (town|bangkok|thailand))\b/gi,
    th: /เฉพาะวันนี้|วันนี้เท่านั้น|โอกาสสุดท้าย|ถูกที่สุด|ดีที่สุด|รีบจอง/g,
  },
];

export type Hit = { start: number; end: number; rule: RuleId };

/** Every match of every rule in both languages (speech in either can show up), overlaps merged. */
export function check(text: string): Hit[] {
  const hits: Hit[] = [];
  for (const r of RULES) {
    for (const re of [r.en, r.th]) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        if (!m[0]) continue;
        hits.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, rule: r.id });
      }
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Hit[] = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    if (last && h.start < last.end) last.end = Math.max(last.end, h.end);
    else out.push({ ...h });
  }
  return out;
}

/** Split text into plain and flagged runs for rendering. */
export function segments(text: string, hits: Hit[]) {
  const out: { text: string; rule?: RuleId }[] = [];
  let at = 0;
  for (const h of hits) {
    if (h.start > at) out.push({ text: text.slice(at, h.start) });
    out.push({ text: text.slice(h.start, h.end), rule: h.rule });
    at = h.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
