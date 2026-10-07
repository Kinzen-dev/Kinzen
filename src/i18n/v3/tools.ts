/**
 * v3 copy for the "tools" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  intro: "The stack behind the systems above, grouped by the job it does.",
};
export type ToolsCopy = typeof en;
const th: ToolsCopy = {
  intro: "เครื่องมือเบื้องหลังระบบข้างบน จัดกลุ่มตามงานที่ใช้",
};
export const tools = { en, th };
