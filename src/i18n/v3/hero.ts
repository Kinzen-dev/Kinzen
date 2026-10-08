/**
 * v3 copy for the "hero" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  /** "I build": `lead` + `key`, joined by `join` (Thai runs the two words together). */
  lead: "I",
  key: "build",
  join: " ",
  /** What he builds (content: clinic receptionist, AnyMind EC Platform, Helm, Visual QA). Longest first: the
   *  first phrase is the one painted on load, and it sets the LCP size. */
  phrases: ["AI phone and LINE assistants", "Shopify platforms", "agent workspaces", "developer tools"],
  /** Phone set (below 48rem), index-aligned with `phrases`: every phrase fits one line at 360 px,
   *  so the cycler box is one line tall and short phrases never leave an empty band. */
  phrasesPhone: ["AI receptionists", "Shopify platforms", "agent workspaces", "developer tools"],
  /** Fact chips beside the CTAs: who and how to work with, from profile.availability (the numbers
   *  live in the strip below, so none repeats here). */
  facts: {
    works: { label: "Works", value: "Remote first" },
    openTo: { label: "Open to", value: "Senior and lead roles" },
    projects: { label: "Projects through", value: "Vesperwerk" },
  },
  /** The looping hero picture's pause control (an accessible name only, no visible text). */
  stage: { pause: "Pause the animation", play: "Play the animation" },
};
export type HeroCopy = typeof en;
const th: HeroCopy = {
  lead: "ผม",
  key: "สร้าง",
  join: "",
  phrases: [
    "ผู้ช่วย AI รับสายและตอบแชท LINE",
    "แพลตฟอร์ม Shopify",
    "พื้นที่ทำงานของ AI agent",
    "เครื่องมือสำหรับนักพัฒนา",
  ],
  phrasesPhone: ["AI รับสายและตอบแชท", "แพลตฟอร์ม Shopify", "พื้นที่ทำงานของ AI agent", "เครื่องมือสำหรับนักพัฒนา"],
  facts: {
    works: { label: "ทำงาน", value: "ทางไกลเป็นหลัก" },
    openTo: { label: "เปิดรับ", value: "ตำแหน่ง senior และ lead" },
    projects: { label: "รับงานโปรเจกต์ผ่าน", value: "Vesperwerk" },
  },
  stage: { pause: "หยุดภาพเคลื่อนไหว", play: "เล่นภาพเคลื่อนไหวต่อ" },
};
export const hero = { en, th };
