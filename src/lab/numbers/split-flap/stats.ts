import type { Locale } from "@/content/schema";

/**
 * The four numbers, shared by the three numbers-a demos (split-flap, honest-viz, scrolly-stats).
 * Facts only, as King set them for the lab: careerStart 2019-10, the AnyMind Tech Lead role
 * Jan 2022 to Mar 2026, 20+ Shopify stores (site.ts), the Yimwhan AI replay (500 messages, 37
 * violations caught, every final reply passed). Demos are client components and must not import
 * @/content, so the values are written here; the strip on the home page still reads content.
 */
export type StatKey = "production" | "techLead" | "stores" | "replay";

const en = {
  title: "In numbers",
  production: { value: 7, label: "years building production systems", note: "since 2019" },
  techLead: { value: 4, label: "years as Tech Lead for AnyMind Group's EC Platform", note: "2022 to 2026" },
  stores: { value: 20, suffix: "+", label: "Shopify stores built across my career", note: "career total" },
  replay: {
    value: 500,
    label: "real customer messages through the LINE reply pipeline",
    note: "Yimwhan AI, July 2026",
    caught: 37,
    caughtLabel: "rule violations in raw model drafts caught by the code checks, mostly overstated claims",
    passed: "Every final reply passed those checks in this test set.",
  },
};

export type StatsCopy = typeof en;

const th: StatsCopy = {
  title: "ผลงานเป็นตัวเลข",
  production: { value: 7, label: "ปีที่ทำระบบใช้งานจริง", note: "ตั้งแต่ปี 2019" },
  techLead: { value: 4, label: "ปีที่เป็น Tech Lead ดูแล EC Platform ของ AnyMind Group", note: "ปี 2022 ถึง 2026" },
  stores: { value: 20, suffix: "+", label: "ร้านค้าบน Shopify ที่ผมทำมาตลอดการทำงาน", note: "รวมทุกงานที่ผ่านมา" },
  replay: {
    value: 500,
    label: "ข้อความจริงจากลูกค้าที่ส่งเข้าเส้นทางตอบกลับของ LINE",
    note: "Yimwhan AI ก.ค. 2026",
    caught: 37,
    caughtLabel: "ครั้งที่ชุดตรวจในโค้ดจับร่างคำตอบจากโมเดลที่ผิดกฎได้ ส่วนใหญ่เป็นคำอวดอ้างเกินจริง",
    passed: "ในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านชุดตรวจในโค้ด",
  },
};

export function statsCopy(locale: Locale): StatsCopy {
  return locale === "th" ? th : en;
}

/** Reading order of the four stats. */
export const ORDER: StatKey[] = ["production", "techLead", "stores", "replay"];

/** True when the visitor allows motion (re-read each call; the setting can change live). */
export function reduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
