/**
 * v3 copy for the "tools" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  intro: "The stack behind the systems above, grouped by the job it does.",
  /** The switcher between the four views of the same stack (v4). */
  views: {
    bento: "Demos",
    spotlight: "Logo wall",
    orbit: "Orbit",
    pipeline: "Pipeline",
  },
  /** One line under the switcher: what the active view does and how to drive it. */
  hints: {
    bento: "Six small loops, one per job, on fictional data. Hover or tap a tile to pause it.",
    spotlight: "Move across the wall: tools under the light take their brand colours. Tap a group to light all of it.",
    orbit: "Six groups on their own orbits. Point at or tap a ring or a group to bring it forward.",
    pipeline: "One request, end to end. Point at or tap a station to see its tools.",
  },
  switcher: "Ways to show the tools",
  showing: "Now showing",
};
export type ToolsCopy = typeof en;
const th: ToolsCopy = {
  intro: "เครื่องมือเบื้องหลังระบบข้างบน จัดกลุ่มตามงานที่ใช้",
  views: {
    bento: "ตัวอย่างงาน",
    spotlight: "ผนังโลโก้",
    orbit: "วงโคจร",
    pipeline: "เส้นทางคำขอ",
  },
  hints: {
    bento: "หกตัวอย่างสั้น ๆ หนึ่งช่องต่อหนึ่งงาน ข้อมูลเป็นเรื่องสมมติ ชี้เมาส์หรือแตะที่ช่องเพื่อหยุดดู",
    spotlight: "เลื่อนไปบนผนัง โลโก้ที่อยู่ใต้แสงจะขึ้นสีจริงของแบรนด์ แตะชื่อกลุ่มเพื่อเปิดไฟทั้งกลุ่ม",
    orbit: "หกกลุ่ม กลุ่มละหนึ่งวงโคจร ชี้หรือแตะที่วงหรือชื่อกลุ่มเพื่อดึงกลุ่มนั้นขึ้นมาข้างหน้า",
    pipeline: "คำขอหนึ่งครั้ง ตั้งแต่ต้นจนจบ ชี้หรือแตะแต่ละจุดเพื่อดูเครื่องมือ",
  },
  switcher: "รูปแบบการแสดงเครื่องมือ",
  showing: "ตอนนี้แสดง",
};
export const tools = { en, th };
