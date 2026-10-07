/**
 * v3 copy for the "moreWork" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  /** Home: the card collage under the two scenes. */
  title: "More work",
  intro: "Commerce, a party game, and the tools I build for my own work.",
  allSystems: "All work",
  /** Under the "All work" link. {count} = projects in the index (from data, never typed in). */
  allSystemsHint: "{count} projects, sortable and filterable",
  openProject: "Open project",
  /** Phone carousel dots. */
  dots: "Choose a project",
  /** {name} = project name. */
  dot: "Show {name}",
  /** Intro for the home #work section header (the ledger moved to /work). */
  sectionIntro: "The first two come with illustrated walkthroughs; the others have a summary and more detail below.",
  /** The /work index page. */
  page: {
    title: "Work",
    description:
      "Public work by Kittipong (King) Khonthong: AI products, commerce platforms, developer tools and games.",
    heading: "All work",
    intro: "Everything I can show publicly: browse the cards below, or use the index further down to filter and sort.",
    cards: "Up close",
    index: "Index",
  },
  /** Project pages, phones: the architecture drawing fits the screen first. */
  plate: { full: "View full size", fit: "Fit to screen" },
};
export type MoreWorkCopy = typeof en;
const th: MoreWorkCopy = {
  title: "ผลงานอื่นของผม",
  intro: "ตั้งแต่งานอีคอมเมิร์ซและเกมปาร์ตี้ ไปจนถึงเครื่องมือที่ผมทำไว้ใช้เอง",
  allSystems: "ดูผลงานทั้งหมด",
  allSystemsHint: "{count} ผลงาน เรียงและกรองได้",
  openProject: "เปิดหน้าโปรเจกต์",
  dots: "เลือกผลงาน",
  dot: "ดู {name}",
  sectionIntro: "สองโปรเจกต์แรกมีภาพประกอบขั้นตอนการทำงาน ส่วนโปรเจกต์อื่นดูสรุปและรายละเอียดเพิ่มเติมได้ด้านล่าง",
  page: {
    title: "ผลงาน",
    description:
      "ผลงานที่เปิดเผยได้ของกฤติพงษ์ ก้อนทอง (คิง) ทั้งผลิตภัณฑ์ AI แพลตฟอร์มอีคอมเมิร์ซ เครื่องมือนักพัฒนา และเกม",
    heading: "ผลงานทั้งหมด",
    intro: "รวมผลงานที่เปิดเผยได้ เลือกดูจากการ์ดด้านล่าง หรือใช้ตารางท้ายหน้าเพื่อกรองและเรียงลำดับ",
    cards: "ดูผลงานแต่ละชิ้น",
    index: "ตารางรวม",
  },
  plate: { full: "ดูขนาดเต็ม", fit: "ย่อให้พอดีจอ" },
};
export const moreWork = { en, th };
