/**
 * v3 copy for the "numbers" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 * The numbers themselves come from content (components/v3/numbers/facts.ts), never from here.
 */
const en = {
  title: "In numbers",
  production: { label: "years building production systems", note: "since 2019" },
  techLead: { label: "years as Tech Lead for AnyMind Group's EC Platform", note: "2022 to 2026" },
  replayed: { label: "real customer messages replayed through the guard; every one passed", note: "Yimwhan AI" },
  caught: { label: "raw model violations caught by the code filters", note: "Yimwhan AI" },
};
export type NumbersCopy = typeof en;
const th: NumbersCopy = {
  title: "ผลงานเป็นตัวเลข",
  production: { label: "ปีที่ทำระบบใช้งานจริง", note: "ตั้งแต่ปี 2019" },
  techLead: { label: "ปีที่เป็น Tech Lead ดูแล EC Platform ของ AnyMind Group", note: "ปี 2022 ถึง 2026" },
  replayed: { label: "ข้อความจริงจากลูกค้าที่นำมารันซ้ำผ่านชุดตรวจ ผ่านครบทุกข้อความ", note: "Yimwhan AI" },
  caught: { label: "ครั้งที่ตัวกรองในโค้ดดักคำตอบดิบจากโมเดลที่ผิดกฎไว้ได้", note: "Yimwhan AI" },
};
export const numbers = { en, th };
