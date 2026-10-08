import type { Locale } from "@/content/schema";

/**
 * Copy for the lab-numbers-b demos (gold-numerals, editorial-numerals). King's four stats, facts
 * only: the figures mirror components/v3/numbers/facts.ts and the claims in content/site.ts (lab
 * demos are client components and cannot import @/content). EN is the source; TH keeps the
 * existing wording from i18n/v3/numbers.ts where it still fits. Visible Thai renders via nobr().
 */
export type Stat = {
  key: "production" | "techLead" | "shopify" | "yimwhan";
  /** The figure as drawn (the dust and the editorial glyph). */
  figure: string;
  label: string;
  note: string;
  /** Editorial source line: where the number comes from. */
  source: string;
  /** Card 4 only: the second figure that shares the card, and the outcome line. */
  second?: { figure: string; label: string };
  outcome?: string;
};

type Copy = {
  title: string;
  hint: string;
  hintTouch: string;
  measuredBtn: string;
  measured: string;
  sourceLabel: string;
  stats: Stat[];
};

const en: Copy = {
  title: "In numbers",
  hint: "Scroll to move the dust; the cursor stirs it.",
  hintTouch: "Scroll to move the dust; tap to stir it.",
  measuredBtn: "How it was measured",
  sourceLabel: "Source",
  measured:
    "A July 2026 test sent 500 real customer messages through the LINE reply pipeline. Deterministic code checks caught 37 rule violations in the raw model drafts, mostly overstated claims, and every final reply passed those checks in this test set.",
  stats: [
    {
      key: "production",
      figure: "7",
      label: "years building production systems",
      note: "since 2019",
      source: "Since 2019, counted in whole years",
    },
    {
      key: "techLead",
      figure: "4",
      label: "years as Tech Lead for AnyMind Group's EC Platform",
      note: "2022 to 2026",
      source: "AnyMind Group, 2022 to 2026",
    },
    {
      key: "shopify",
      figure: "20+",
      label: "Shopify stores worked on",
      note: "across my career",
      source: "Career total",
    },
    {
      key: "yimwhan",
      figure: "500",
      label: "real customer messages through the LINE reply pipeline",
      note: "Yimwhan AI, July 2026",
      source: "Yimwhan AI test set, July 2026",
      second: {
        figure: "37",
        label: "rule violations in raw model drafts caught by the code checks, mostly overstated claims",
      },
      outcome: "Every final reply passed those checks in this test set.",
    },
  ],
};

const th: Copy = {
  title: "ผลงานเป็นตัวเลข",
  hint: "เลื่อนหน้าเพื่อให้ผงทองไหลไปตัวเลขถัดไป ขยับเมาส์เพื่อกวน",
  hintTouch: "เลื่อนหน้าเพื่อให้ผงทองไหลไปตัวเลขถัดไป แตะเพื่อกวน",
  measuredBtn: "วัดผลอย่างไร",
  sourceLabel: "ที่มา",
  measured:
    "ทดสอบเมื่อกรกฎาคม 2026 โดยส่งข้อความจริงจากลูกค้า 500 ข้อความเข้าเส้นทางตอบกลับของ LINE ชุดตรวจในโค้ดแบบ deterministic (ตรวจตามกฎที่กำหนดไว้) จับร่างคำตอบจากโมเดลที่ผิดกฎได้ 37 ครั้ง ส่วนใหญ่เป็นคำอวดอ้างเกินจริง และในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านการตรวจทั้งหมด",
  stats: [
    {
      key: "production",
      figure: "7",
      label: "ปีที่ทำระบบใช้งานจริง",
      note: "ตั้งแต่ปี 2019",
      source: "ตั้งแต่ปี 2019 นับเป็นปีเต็ม",
    },
    {
      key: "techLead",
      figure: "4",
      label: "ปีที่เป็น Tech Lead ดูแล EC Platform ของ AnyMind Group",
      note: "ปี 2022 ถึง 2026",
      source: "AnyMind Group ปี 2022 ถึง 2026",
    },
    {
      key: "shopify",
      figure: "20+",
      label: "ร้านค้าบน Shopify ที่ผมทำมา",
      note: "ตลอดการทำงานที่ผ่านมา",
      source: "รวมทั้งหมดตลอดการทำงาน",
    },
    {
      key: "yimwhan",
      figure: "500",
      label: "ข้อความจริงจากลูกค้าที่ส่งเข้าเส้นทางตอบกลับของ LINE",
      note: "Yimwhan AI ก.ค. 2026",
      source: "ชุดทดสอบของ Yimwhan AI ก.ค. 2026",
      second: {
        figure: "37",
        label: "ครั้งที่ชุดตรวจในโค้ดจับได้ว่าร่างคำตอบจากโมเดลผิดกฎ ส่วนใหญ่เป็นคำอวดอ้างเกินจริง",
      },
      outcome: "ในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านชุดตรวจในโค้ด",
    },
  ],
};

export const numbersCopy = (locale: Locale): Copy => (locale === "th" ? th : en);
