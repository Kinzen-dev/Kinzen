/**
 * v3 copy for the "numbers" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 * The numbers themselves come from content (components/v3/numbers/facts.ts), never from here.
 */
const en = {
  title: "In numbers",
  production: { label: "years building production systems", note: "since 2019" },
  techLead: { label: "years as Tech Lead for AnyMind Group's EC Platform", note: "2022 to 2026" },
  replayed: {
    label: "real customer messages in a replay test; all final replies passed the configured checks",
    note: "Yimwhan AI, July 2026",
  },
  caught: { label: "rule violations in raw model drafts, caught by the code filters", note: "Yimwhan AI, July 2026" },
};
export type NumbersCopy = typeof en;
const th: NumbersCopy = {
  title: "ผลงานเป็นตัวเลข",
  production: { label: "ปีที่ทำระบบใช้งานจริง", note: "ตั้งแต่ปี 2019" },
  techLead: { label: "ปีที่เป็น Tech Lead ดูแล EC Platform ของ AnyMind Group", note: "ปี 2022 ถึง 2026" },
  replayed: {
    label: "ข้อความจริงจากลูกค้าที่นำมาทดสอบซ้ำ คำตอบหลังผ่านตัวกรองผ่านเกณฑ์ครบทุกข้อความในชุดทดสอบนี้",
    note: "Yimwhan AI ก.ค. 2026",
  },
  caught: { label: "ครั้งที่ตัวกรองในโค้ดตรวจพบและบล็อกร่างคำตอบจากโมเดลที่ไม่ผ่านกฎ", note: "Yimwhan AI ก.ค. 2026" },
};
export const numbers = { en, th };
