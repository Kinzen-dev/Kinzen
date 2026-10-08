import type { Locale } from "@/content/schema";

/** Every hotspot in the room, in keyboard order. */
export type SpotId = "monitor" | "phone" | "lamp" | "window" | "cat";

/** Fictional throughout: no real clinic, patient or project. */
const COPY = {
  en: {
    city: "Bangkok",
    back: "Back to the desk",
    close: "Close",
    timeLapse: "Play a day at the window",
    live: "Back to live time",
    hint: "Drag to look around",
    hintPhone: "Tap the gold dots",
    stage:
      "A hand-drawn 3D desk at night: a wide monitor, a gold desk phone, a notepad, a lamp, two plants and a window over the Bangkok skyline.",
    spots: {
      monitor: "Monitor: watch three agents hand work to each other",
      phone: "Phone: ring the voice agent",
      lamp: "Lamp: switch it on or off",
      window: "Window: look out at Bangkok",
      cat: "Cat doodle",
    } satisfies Record<SpotId, string>,
    short: {
      monitor: "Agents",
      phone: "Call",
      lamp: "Lamp",
      window: "Window",
      cat: "Cat",
    } satisfies Record<SpotId, string>,
    agentsTitle: "Three agents, one task",
    agentsNote: "Planner splits it, builder writes it, reviewer checks it. Each hands the work on.",
    greeting:
      "Hello, thanks for calling. This is the clinic's assistant. I can book, move or cancel an appointment for you. How can I help today?",
    calling: "Voice agent answering",
    phase: { night: "night", dawn: "dawn", day: "day", dusk: "dusk" },
  },
  th: {
    city: "กรุงเทพฯ",
    back: "กลับไปที่โต๊ะ",
    close: "ปิด",
    timeLapse: "ดูหน้าต่างครบหนึ่งวัน",
    live: "กลับเวลาจริง",
    hint: "ลากเพื่อหมุนดู",
    hintPhone: "แตะจุดสีทอง",
    stage:
      "โต๊ะทำงานสามมิติลายเส้นหมึกตอนกลางคืน มีจอกว้าง โทรศัพท์ตั้งโต๊ะสีทอง สมุดจด โคมไฟ ต้นไม้สองกระถาง และหน้าต่างมองเห็นตึกในกรุงเทพฯ",
    spots: {
      monitor: "จอ: ดูเอเจนต์สามตัวส่งงานต่อกัน",
      phone: "โทรศัพท์: โทรหาเอเจนต์รับสาย",
      lamp: "โคมไฟ: เปิดหรือปิดไฟ",
      window: "หน้าต่าง: มองออกไปที่กรุงเทพฯ",
      cat: "แมวที่วาดไว้",
    } satisfies Record<SpotId, string>,
    short: {
      monitor: "เอเจนต์",
      phone: "โทร",
      lamp: "โคมไฟ",
      window: "หน้าต่าง",
      cat: "แมว",
    } satisfies Record<SpotId, string>,
    agentsTitle: "เอเจนต์สามตัว งานเดียว",
    agentsNote: "ตัววางแผนแบ่งงาน ตัวเขียนลงมือ ตัวตรวจเช็คก่อนส่งต่อ",
    greeting:
      "สวัสดีค่ะ ขอบคุณที่โทรมานะคะ ผู้ช่วยของคลินิกยินดีให้บริการค่ะ จะจอง เลื่อน หรือยกเลิกนัดก็ได้เลยค่ะ วันนี้ให้ช่วยเรื่องอะไรดีคะ",
    calling: "เอเจนต์กำลังรับสาย",
    phase: { night: "กลางคืน", dawn: "เช้ามืด", day: "กลางวัน", dusk: "พลบค่ำ" },
  },
} as const;

export type Copy = (typeof COPY)["en" | "th"];
export const copyFor = (locale: Locale): Copy => (locale === "th" ? COPY.th : COPY.en);

/**
 * The monitor's script (code-side text, English in both locales, like a real terminal). Each
 * task runs planner -> builder -> reviewer; `hand` lines send a gold ticket to the next pane.
 */
export type AgentLine = { pane: 0 | 1 | 2; text: string; kind?: "cmd" | "ok" | "hand" | "dim" };

export const AGENTS = ["planner", "builder", "reviewer"] as const;

export const SCRIPT: AgentLine[][] = [
  [
    { pane: 0, text: "task: let callers move a booking by LINE", kind: "cmd" },
    { pane: 0, text: "read booking/flow.ts, rules/replies.ts", kind: "dim" },
    { pane: 0, text: "plan: 1 find slot  2 confirm  3 notify" },
    { pane: 0, text: "-> builder: step 1 + 2", kind: "hand" },
    { pane: 1, text: "<- planner: step 1 + 2", kind: "dim" },
    { pane: 1, text: "edit booking/move.ts  (+48 -6)", kind: "cmd" },
    { pane: 1, text: "add test: moves to next free slot" },
    { pane: 1, text: "pnpm test  14 passed", kind: "ok" },
    { pane: 1, text: "-> reviewer: diff #212", kind: "hand" },
    { pane: 2, text: "<- builder: diff #212", kind: "dim" },
    { pane: 2, text: "check: reply never promises a result", kind: "cmd" },
    { pane: 2, text: "check: times in Asia/Bangkok" },
    { pane: 2, text: "approved, ship to staging", kind: "ok" },
    { pane: 2, text: "-> planner: done", kind: "hand" },
  ],
  [
    { pane: 0, text: "task: missed call -> LINE follow-up", kind: "cmd" },
    { pane: 0, text: "read voice/hangup.ts", kind: "dim" },
    { pane: 0, text: "plan: queue message after 2 min" },
    { pane: 0, text: "-> builder: queue + template", kind: "hand" },
    { pane: 1, text: "<- planner: queue + template", kind: "dim" },
    { pane: 1, text: "edit voice/followup.ts  (+31)", kind: "cmd" },
    { pane: 1, text: "retry on 429 with backoff" },
    { pane: 1, text: "pnpm test  21 passed", kind: "ok" },
    { pane: 1, text: "-> reviewer: diff #213", kind: "hand" },
    { pane: 2, text: "<- builder: diff #213", kind: "dim" },
    { pane: 2, text: "check: no message 22:00-08:00", kind: "cmd" },
    { pane: 2, text: "found: quiet hours missing", kind: "dim" },
    { pane: 2, text: "-> builder: add quiet hours", kind: "hand" },
    { pane: 1, text: "fix: hold until 08:00  (+9)", kind: "cmd" },
    { pane: 1, text: "pnpm test  22 passed", kind: "ok" },
    { pane: 1, text: "-> reviewer: diff #213 v2", kind: "hand" },
    { pane: 2, text: "approved", kind: "ok" },
    { pane: 2, text: "-> planner: done", kind: "hand" },
  ],
  [
    { pane: 0, text: "task: nightly cost report", kind: "cmd" },
    { pane: 0, text: "plan: sum tokens per channel" },
    { pane: 0, text: "-> builder: report job", kind: "hand" },
    { pane: 1, text: "<- planner: report job", kind: "dim" },
    { pane: 1, text: "edit jobs/cost.ts  (+64)", kind: "cmd" },
    { pane: 1, text: "pnpm test  9 passed", kind: "ok" },
    { pane: 1, text: "-> reviewer: diff #214", kind: "hand" },
    { pane: 2, text: "<- builder: diff #214", kind: "dim" },
    { pane: 2, text: "check: estimate vs billing drift", kind: "cmd" },
    { pane: 2, text: "approved", kind: "ok" },
    { pane: 2, text: "-> planner: done", kind: "hand" },
  ],
];
