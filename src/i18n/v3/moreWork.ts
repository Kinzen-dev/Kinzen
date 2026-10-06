/**
 * v3 copy for the "moreWork" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  /** Home: the card collage under the two scenes. */
  title: "More systems",
  intro: "Commerce at scale, a party game, and the tools I build for my own work.",
  allSystems: "All systems",
  /** Under the "All systems" link. {count} = systems in the index. */
  allSystemsHint: "{count} systems, sortable and filterable",
  openProject: "Open project",
  /** Phone carousel dots. */
  dots: "Choose a system",
  /** {name} = system name. */
  dot: "Show {name}",
  /** Intro for the home #work section header (the ledger moved to /work). */
  sectionIntro: "The things I have built and still stand behind: two told in full, the rest at a glance.",
  /** The /work index page. */
  page: {
    title: "Work",
    description:
      "Every public system Kittipong (King) Khonthong has built: AI products, commerce platforms, developer tools and games.",
    heading: "All systems",
    intro: "Everything public in one place: each system up close first, then the full index you can sort and filter.",
    cards: "Up close",
    index: "Index",
  },
};
export type MoreWorkCopy = typeof en;
const th: MoreWorkCopy = {
  title: "ระบบอื่นที่ผมทำ",
  intro: "ตั้งแต่อีคอมเมิร์ซสเกลใหญ่ เกมปาร์ตี้ ไปจนถึงเครื่องมือที่ผมทำไว้ใช้เอง",
  allSystems: "ดูระบบทั้งหมด",
  allSystemsHint: "{count} ระบบ เรียงและกรองได้",
  openProject: "เปิดหน้าโปรเจกต์",
  dots: "เลือกระบบ",
  dot: "ดู {name}",
  sectionIntro: "งานที่ผมสร้างและยังยืนยันได้เต็มปาก สองระบบแรกเล่าแบบเต็ม ที่เหลือดูได้ในหน้าเดียว",
  page: {
    title: "ผลงาน",
    description:
      "ทุกระบบที่กฤติพงษ์ ก้อนทอง (คิง) สร้างและเปิดเผยได้ ทั้งผลิตภัณฑ์ AI แพลตฟอร์มอีคอมเมิร์ซ เครื่องมือนักพัฒนา และเกม",
    heading: "ระบบทั้งหมด",
    intro: "รวมทุกระบบที่เปิดเผยได้ไว้ที่นี่ ด้านบนเป็นการ์ดของแต่ละระบบ ด้านล่างเป็นตารางรวมที่เรียงและกรองได้",
    cards: "ดูทีละระบบ",
    index: "ตารางรวม",
  },
};
export const moreWork = { en, th };
