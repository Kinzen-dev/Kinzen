/**
 * v3 copy for the "hero" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  /** "I build": `lead` + `key`, joined by `join` (Thai runs the two words together). */
  lead: "I",
  key: "build",
  join: " ",
  /** What he builds (content: Yimwhan, AnyMind EC Platform, Helm, Visual QA). Longest first: the
   *  first phrase is the one painted on load, and it sets the LCP size. */
  phrases: ["AI phone and LINE assistants", "Shopify platforms", "agent workspaces", "developer tools"],
};
export type HeroCopy = typeof en;
const th: HeroCopy = {
  lead: "ผม",
  key: "สร้าง",
  join: "",
  phrases: ["ผู้ช่วย AI รับสายและตอบแชท LINE", "แพลตฟอร์ม Shopify", "พื้นที่ทำงานของ AI agent", "เครื่องมือสำหรับนักพัฒนา"],
};
export const hero = { en, th };
