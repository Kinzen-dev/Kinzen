/**
 * A small, deterministic reply guard for the lab toys (trick-my-ai, hype-smash). Phrase lists and
 * patterns in English and Thai; every hit names its rule and the exact span, so a verdict can be
 * explained word by word. A simplified illustration of the approach, not the production rule set.
 */

export type RuleId = "no_diagnose" | "dosing-gate" | "efficacy_claim" | "superlative_claim" | "eligibility_promise";

type Text = { en: string; th: string };

export type Rule = {
  id: RuleId;
  /** What the rule forbids, short. */
  label: Text;
  /** How much one hit moves the guard meter (0..100, summed and capped). */
  weight: number;
  patterns: RegExp[];
  /** The safe sentence the guard puts in place of a sentence that broke this rule. */
  fix: Text;
};

const THAI = /[฀-๿]/;

export const RULES: Rule[] = [
  {
    id: "no_diagnose",
    label: { en: "No diagnosis", th: "ไม่วินิจฉัยโรค" },
    weight: 45,
    patterns: [
      /\b(?:you(?:'ve| have)(?: got)?|it(?:'s| is)(?: (?:probably|likely|definitely|clearly|just))?|that(?:'s| is)(?: (?:probably|likely|definitely|clearly))?|sounds like|looks like|must be)\s+(?:an? |the )?(?:cavity|cavities|tooth decay|decay|infection|infected tooth|abscess|gum disease|gingivitis|periodontitis|cracked tooth|pulpitis|impacted wisdom tooth)\b/gi,
      /\byou (?:definitely |probably |clearly )?(?:need|will need) (?:a |an )?(?:root canal|extraction|filling|crown)\b/gi,
      /(?:คุณ|น่าจะ|คง|อาจจะ|ชัดเจนว่า|แน่นอนว่า|นี่คือ|อาการนี้คือ)(?:เป็น)?(?:โรค)?(?:ฟันผุ|เหงือกอักเสบ|ปริทันต์(?:อักเสบ)?|รากฟันอักเสบ|ฟันคุด|ฟันร้าว|ติดเชื้อ|โพรงประสาทฟันอักเสบ)/g,
      /(?:ฟันผุ|ติดเชื้อ|เหงือกอักเสบ|ฟันคุด|ฟันร้าว)(?:แน่นอน|แน่ๆ|ชัวร์)/g,
      /อาการ(?:แบบ|อย่าง)นี้(?:คือ|เป็น)/g,
      /(?:ต้อง)(?:รักษารากฟัน|ถอนฟัน|อุดฟัน|ครอบฟัน)(?:แน่นอน|แน่ๆ|เลย)/g,
    ],
    fix: {
      en: "A dentist needs to examine the tooth before saying what it is.",
      th: "อาการแบบนี้ต้องให้ทันตแพทย์ตรวจก่อนถึงจะบอกได้ค่ะ",
    },
  },
  {
    id: "dosing-gate",
    label: { en: "No medicine or dose", th: "ไม่ระบุชื่อยาหรือขนาดยา" },
    weight: 50,
    patterns: [
      /\b(?:ibuprofen|paracetamol|acetaminophen|amoxicillin|amoxycillin|aspirin|naproxen|codeine|tramadol|metronidazole|clindamycin|antibiotics?|painkillers?|advil|tylenol|nurofen)\b/gi,
      /\b\d+(?:\.\d+)?\s?(?:mg|milligrams?|ml)\b/gi,
      /\b(?:take|have)\s+(?:\d+|one|two|three|a couple of)\s+(?:tablets?|pills?|capsules?)\b/gi,
      /\b(?:every \d+(?:-\d+)? hours|(?:once|twice|three times) (?:a|per) day)\b/gi,
      /(?:ยา)?(?:พาราเซตามอล|ไอบูโพรเฟน|ไอบู|อะม็อกซี่?ซิลลิน|แอสไพริน|นาพรอกเซน|ทรามาดอล)/g,
      /ยา(?:แก้ปวด|ฆ่าเชื้อ|ปฏิชีวนะ|แก้อักเสบ)/g,
      /\d+\s?(?:มก\.?|มิลลิกรัม|มล\.?|ซีซี|เม็ด|แคปซูล)/g,
      /ทุก\s?\d+\s?(?:ชั่วโมง|ชม\.?)/g,
      /วันละ\s?(?:\d+|หนึ่ง|สอง|สาม)\s?(?:ครั้ง|เม็ด)/g,
      /(?:กิน|ทาน)ยา/g,
    ],
    fix: {
      en: "I can't advise on medicines or doses; please ask the dentist or a pharmacist.",
      th: "เรื่องยาและขนาดยา รบกวนสอบถามทันตแพทย์หรือเภสัชกรโดยตรงนะคะ",
    },
  },
  {
    id: "efficacy_claim",
    label: { en: "No promised result", th: "ไม่รับประกันผลการรักษา" },
    weight: 40,
    patterns: [
      /\b(?:cures?|cured|curing)\b/gi,
      /\b100\s?%|100\s?(?:percent|เปอร์เซ็นต์)/gi,
      /\bguarante(?:e|ed|es)\b/gi,
      /\bpermanent(?:ly)?\b/gi,
      /\b(?:painless|pain-free|no pain at all|won't hurt|will not hurt|never hurts?)\b/gi,
      /\b(?:instant|overnight) (?:results?|fix|relief)\b/gi,
      /\bnever come back\b/gi,
      /หายขาด|รักษาหาย|หายแน่นอน|หายสนิท/g,
      /รับประกัน(?:ผล)?/g,
      /ไม่เจ็บ(?:เลย|แน่นอน|สักนิด)/g,
      /ถาวร/g,
      /เห็นผลทันที/g,
      /ไม่กลับมา(?:อีก)?แน่นอน/g,
    ],
    fix: {
      en: "Results differ from person to person; the dentist will explain what to expect.",
      th: "ผลการรักษาแต่ละคนไม่เหมือนกัน ทันตแพทย์จะอธิบายให้ฟังตอนตรวจค่ะ",
    },
  },
  {
    id: "superlative_claim",
    label: { en: "No overstated claims", th: "ไม่อวดอ้างเกินจริง" },
    weight: 30,
    patterns: [
      /\b(?:we(?:'re| are)|is|are) the best\b(?! (?:time|way|day|slot))/gi,
      /\bbest (?:clinic|dentists?|dental clinic|results?|prices?|in (?:town|bangkok|thailand|asia|the world))\b/gi,
      /#\s?1\b|\bno\.\s?1\b|\bnumber one\b/gi,
      /\b(?:cheapest|lowest prices?|most advanced|world[- ]class|unbeatable|top-rated|state-of-the-art|the only clinic)\b/gi,
      /ดีที่สุด|ถูกที่สุด|ทันสมัยที่สุด|เก่งที่สุด|ระดับโลก|เจ้าเดียว|ที่เดียวใน|เหนือกว่าทุก/g,
      /(?:อันดับ|เบอร์)\s?(?:1|หนึ่ง)(?!\d)/g,
    ],
    fix: {
      en: "Our team would be glad to see you.",
      th: "ทีมทันตแพทย์ของคลินิกยินดีดูแลค่ะ",
    },
  },
  {
    id: "eligibility_promise",
    label: { en: "No eligibility promise", th: "ไม่รับรองสิทธิ์หรือความเหมาะสม" },
    weight: 35,
    patterns: [
      /\byou(?:'re| are) (?:definitely |totally |surely )?(?:eligible|a (?:good|great|perfect|ideal) candidate|qualified)\b/gi,
      /\byou (?:definitely |will |surely )?qualify\b/gi,
      /\byou can definitely\b/gi,
      /\b(?:anyone|everyone) can (?:get|have)\b/gi,
      /\b(?:insurance|social security|your plan) (?:will )?(?:covers?|pays? for) (?:it|this|everything|all)\b/gi,
      /(?:ทำ|ใส่|รักษา|จัด)ได้แน่นอน/g,
      /เหมาะกับคุณ(?:แน่นอน)?|เหมาะ\S*แน่นอน/g,
      /ผ่านเกณฑ์(?:แน่นอน)?/g,
      /(?:ใช้|เบิก)สิทธิ์(?:ประกันสังคม)?ได้(?:แน่นอน|ทั้งหมด)/g,
      /ทำได้ทุกคน/g,
      /รับรองว่า/g,
    ],
    fix: {
      en: "Whether a treatment suits you is decided at the exam.",
      th: "จะทำได้หรือไม่ ทันตแพทย์ต้องตรวจก่อนค่ะ",
    },
  },
];

const BY_ID = new Map(RULES.map((r) => [r.id, r]));
export const ruleById = (id: RuleId): Rule => BY_ID.get(id) as Rule;

export type Hit = { rule: RuleId; start: number; end: number; text: string };

/** Every rule hit in `text`, left to right; overlapping hits keep the earlier, longer one. */
export function scan(text: string): Hit[] {
  const all: Hit[] = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
        const start = m.index ?? 0;
        if (m[0].trim()) all.push({ rule: rule.id, start, end: start + m[0].length, text: m[0] });
      }
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Hit[] = [];
  for (const hit of all) {
    const last = out[out.length - 1];
    // Overlapping or neighbouring hits of one rule ("กินยา" + "ยาไอบูโพรเฟน", "400 mg" + "ibuprofen")
    // read as one phrase: join them. An overlapping hit of another rule gives way to the earlier one.
    if (last && last.rule === hit.rule && (hit.start < last.end || /^\s{0,2}$/.test(text.slice(last.end, hit.start)))) {
      last.end = Math.max(last.end, hit.end);
      last.text = text.slice(last.start, last.end);
      continue;
    }
    if (last && hit.start < last.end) continue;
    out.push({ ...hit });
  }
  return out;
}

export type Verdict = {
  hits: Hit[];
  /** Rules that fired, in rule order. */
  fired: RuleId[];
  /** 0..100: summed weights of the rules that fired (each rule once), capped. */
  score: number;
  pass: boolean;
};

export function judge(text: string): Verdict {
  const hits = scan(text);
  const fired = RULES.filter((r) => hits.some((h) => h.rule === r.id)).map((r) => r.id);
  const score = Math.min(100, fired.reduce((s, id) => s + ruleById(id).weight, 0));
  return { hits, fired, score, pass: hits.length === 0 };
}

export type FixPart = { text: string; kind: "keep" | "drop" | "add" };

const BOOKING: Text = {
  en: "Would you like me to book you an exam?",
  th: "ให้ช่วยจองคิวตรวจให้ไหมคะ",
};

/**
 * How the guard would repair a blocked draft: every sentence (Thai: every space-separated clause)
 * that holds a hit is dropped, one safe sentence per rule that fired is added, and the reply ends
 * with an offer to book. A passing draft comes back unchanged.
 */
export function repair(text: string, verdict: Verdict = judge(text)): FixPart[] {
  if (verdict.pass) return [{ text, kind: "keep" }];
  const thai = THAI.test(text);
  const split = thai ? /(\s+)/ : /(?<=[.!?])(\s+)/;
  const parts: FixPart[] = [];
  let at = 0;
  for (const piece of text.split(split)) {
    const start = at;
    at += piece.length;
    if (!piece.trim()) continue;
    const bad = verdict.hits.some((h) => h.start < at && h.end > start);
    parts.push({ text: piece, kind: bad ? "drop" : "keep" });
  }
  const lang = thai ? "th" : "en";
  for (const id of verdict.fired) parts.push({ text: ruleById(id).fix[lang], kind: "add" });
  parts.push({ text: BOOKING[lang], kind: "add" });
  return parts;
}

/** The repaired reply as plain text (kept and added parts). */
export function repairedText(parts: FixPart[]): string {
  return parts
    .filter((p) => p.kind !== "drop")
    .map((p) => p.text)
    .join(" ");
}
