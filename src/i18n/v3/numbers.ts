/**
 * v4 copy for the "numbers" section: four cards, four stories, shown five ways (switchable views).
 * EN is the source; TH mirrors its shape (type-checked). Visible Thai renders through nobr() at the
 * call site; no em or en dashes.
 *
 * The figures live here (King, 2026-10-08). Source of truth for every number and its wording:
 * ~/Projects/kittipong-resume/content/CLAIMS.md (7 years from 2019-10; AnyMind Tech Lead 2022-01
 * to 2026-03, team of 5 to 8, 10+ brands; 6,000+ daily active users, OK to print; the July 2026
 * replay, 500 messages and 37 caught). Never print a percentage from 500/37. The 6,000+ card names
 * no client, domain or industry: only "real-time transactional platform" and "confidential client".
 * The clinic product is only ever "AI phone and LINE receptionist for dental clinics".
 */
export type StatKey = "production" | "brands" | "users" | "replay";

/** Reading order of the four stats (every view follows it). */
export const STAT_KEYS: StatKey[] = ["production", "brands", "users", "replay"];

const en = {
  title: "In numbers",
  switcher: "Ways to show the numbers",
  showing: "Showing",
  views: {
    "split-flap": "Board",
    "honest-viz": "To scale",
    "scrolly-stats": "Story",
    "gold-numerals": "Gold dust",
    "editorial-numerals": "Print",
  },
  hints: {
    "split-flap": "A departures board: every figure clatters into place. Point at a row to flip it again.",
    "honest-viz": "Each figure drawn as its real quantity: years on an axis, brands and people, dots for users and messages.",
    "scrolly-stats": "One figure at a time, morphing into the next, with the picture that tells it.",
    "gold-numerals": "Gold dust gathers into each figure in turn; the cursor stirs it.",
    "editorial-numerals": "Magazine spreads: each figure set huge in gold ink, with its source.",
  },
  stats: {
    production: {
      figure: "7",
      label: "years building production systems",
      note: "since 2019",
      source: "Counted in whole years since October 2019",
    },
    brands: {
      figure: "10+",
      label: "brands at AnyMind Group, leading a team of 5 to 8 engineers",
      note: "Tech Lead, 2022 to 2026",
      source: "AnyMind Group, EC Platform, 2022 to 2026",
    },
    users: {
      figure: "6,000+",
      label: "daily active users on the real-time transactional platform I work on",
      note: "confidential client",
      source: "Real-time transactional platform, confidential client",
    },
    replay: {
      figure: "500",
      label: "real customer messages through the LINE reply pipeline",
      note: "July 2026",
      product: "AI phone and LINE receptionist for dental clinics",
      source: "AI phone and LINE receptionist for dental clinics, July 2026 test set",
      caught: "37",
      caughtLabel: "rule violations in raw model drafts caught by the code checks, mostly overstated claims",
      passed: "Every final reply passed those checks in this test set.",
      measuredBtn: "How it was measured",
      measured:
        "500 first messages, sampled from real LINE conversations, ran through the production LINE reply pipeline on the pinned model in July 2026. A bounded replay, not a guarantee for every reply in production.",
    },
  },
  ui: {
    figure: "Figure",
    what: "What",
    context: "Context",
    source: "Source",
    replay: "Replay",
    careerStart: "Oct 2019",
    today: "Today",
    brandsCaption: "10 brands and more",
    team: "team of 5 to 8",
    usersLegend: "1 dot = 100 daily active users",
    matrixLegend: "1 dot = 1 message. Where the 37 come from is illustrative.",
    guard: "code checks",
    step: "Figure",
  },
};

export type NumbersCopy = typeof en;

const th: NumbersCopy = {
  title: "ผลงานเป็นตัวเลข",
  switcher: "รูปแบบการแสดงตัวเลข",
  showing: "กำลังแสดง",
  views: {
    "split-flap": "บอร์ด",
    "honest-viz": "ตามสัดส่วน",
    "scrolly-stats": "เรื่องเล่า",
    "gold-numerals": "ผงทอง",
    "editorial-numerals": "นิตยสาร",
  },
  hints: {
    "split-flap": "บอร์ดแบบป้ายสนามบิน ตัวเลขพลิกเข้าที่ทีละแถว ชี้ที่แถวไหนก็ได้ ตัวเลขจะพลิกอีกรอบ",
    "honest-viz": "วาดตัวเลขตามจำนวนจริง ปีบนเส้นเวลา แบรนด์กับคนในทีม และจุดแทนผู้ใช้กับข้อความ",
    "scrolly-stats": "ทีละตัวเลข แต่ละตัวค่อย ๆ เปลี่ยนเป็นตัวถัดไป พร้อมภาพที่เล่าเรื่องของมัน",
    "gold-numerals": "ผงทองรวมตัวเป็นตัวเลขทีละตัว ขยับเมาส์เพื่อกวนผงทองได้",
    "editorial-numerals": "หน้านิตยสาร ตัวเลขใหญ่เต็มหน้าด้วยหมึกสีทอง พร้อมบอกที่มา",
  },
  stats: {
    production: {
      figure: "7",
      label: "ปีที่สร้างระบบใช้งานจริง",
      note: "ตั้งแต่ปี 2019",
      source: "นับเป็นปีเต็มตั้งแต่ตุลาคม 2019",
    },
    brands: {
      figure: "10+",
      label: "แบรนด์ที่ AnyMind Group โดยผมนำทีมวิศวกร 5 ถึง 8 คน",
      note: "Tech Lead ปี 2022 ถึง 2026",
      source: "AnyMind Group ทีม EC Platform ปี 2022 ถึง 2026",
    },
    users: {
      figure: "6,000+",
      label: "ผู้ใช้งานต่อวันบนแพลตฟอร์มธุรกรรมแบบเรียลไทม์ที่ผมทำอยู่",
      note: "ลูกค้าที่ขอไม่เปิดเผยชื่อ",
      source: "แพลตฟอร์มธุรกรรมแบบเรียลไทม์ ลูกค้าที่ขอไม่เปิดเผยชื่อ",
    },
    replay: {
      figure: "500",
      label: "ข้อความจริงจากลูกค้าที่ส่งเข้าเส้นทางตอบกลับของ LINE",
      note: "ก.ค. 2026",
      product: "ผู้ช่วย AI รับสายและตอบแชท LINE ให้คลินิกทันตกรรม",
      source: "ผู้ช่วย AI รับสายและตอบแชท LINE ให้คลินิกทันตกรรม ชุดทดสอบ ก.ค. 2026",
      caught: "37",
      caughtLabel: "ครั้งที่ชุดตรวจในโค้ดจับร่างคำตอบจากโมเดลที่ผิดกฎได้ ส่วนใหญ่เป็นคำอวดอ้างเกินจริง",
      passed: "ในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านชุดตรวจในโค้ด",
      measuredBtn: "วัดผลอย่างไร",
      measured:
        "สุ่มข้อความแรกของลูกค้า 500 ข้อความจากบทสนทนา LINE จริง แล้วส่งเข้าเส้นทางตอบกลับของ LINE ในระบบจริง ด้วยโมเดลรุ่นที่ล็อกไว้ เมื่อ ก.ค. 2026 เป็นการทดสอบในขอบเขตที่จำกัด ไม่ได้รับประกันทุกคำตอบในระบบจริง",
    },
  },
  ui: {
    figure: "ตัวเลข",
    what: "เรื่อง",
    context: "ที่มา",
    source: "ที่มา",
    replay: "เล่นอีกครั้ง",
    careerStart: "ต.ค. 2019",
    today: "วันนี้",
    brandsCaption: "10 แบรนด์ขึ้นไป",
    team: "ทีม 5 ถึง 8 คน",
    usersLegend: "จุดละ 100 ผู้ใช้งานต่อวัน",
    matrixLegend: "จุดละ 1 ข้อความ ตำแหน่งที่มาของ 37 ครั้งเป็นภาพประกอบ",
    guard: "ชุดตรวจในโค้ด",
    step: "ตัวเลข",
  },
};

export const numbers = { en, th };
