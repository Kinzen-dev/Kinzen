import type { PlateSpec } from "./types";

/**
 * Plate descriptions. Every label and constraint restates a fact already in
 * src/content/site.ts (project stack, outcomes, experience highlights); nothing
 * here may introduce a new number, client or claim.
 */

const yimwhan: PlateSpec = {
  projectId: "proj-yimwhan",
  drawing: "KZ-01",
  title: {
    en: "Voice and LINE path through the reply rule checks",
    th: "เส้นทางเสียงและ LINE ผ่านชุดตรวจคำตอบตามกฎ",
  },
  revision: "2026-10",
  width: 1240,
  height: 860,
  boundaries: [{ id: "fly", label: { en: "Fly.io" }, x: 470, y: 160, w: 560, h: 410 }],
  nodes: [
    {
      id: "caller",
      label: { en: "Caller", th: "ผู้โทร" },
      sub: { en: ["phone"], th: ["โทรศัพท์"] },
      x: 40,
      y: 110,
      w: 160,
      h: 64,
    },
    {
      id: "line-user",
      label: { en: "LINE user", th: "ผู้ใช้ LINE" },
      sub: { en: ["chat"], th: ["แชท"] },
      x: 40,
      y: 290,
      w: 160,
      h: 64,
    },
    { id: "twilio", label: { en: "Twilio" }, sub: { en: ["media stream"] }, x: 245, y: 110, w: 195, h: 64 },
    {
      id: "line-api",
      label: { en: "LINE Messaging API" },
      sub: { en: ["webhook"] },
      x: 245,
      y: 290,
      w: 195,
      h: 64,
    },
    {
      id: "service",
      label: { en: "Fastify service", th: "บริการ Fastify" },
      sub: { en: ["TypeScript"] },
      x: 510,
      y: 200,
      w: 200,
      h: 100,
    },
    { id: "store", label: { en: "SQLite" }, sub: { en: ["Litestream"] }, x: 510, y: 350, w: 200, h: 70 },
    {
      id: "recall",
      label: { en: "Outbound recall", th: "การโทรติดตาม" },
      x: 510,
      y: 470,
      w: 200,
      h: 64,
    },
    {
      id: "model",
      label: { en: "Model call", th: "เรียกโมเดล" },
      sub: { en: ["Gemini on Vertex AI", "Claude fallback"], th: ["Gemini on Vertex AI", "สำรองด้วย Claude"] },
      x: 770,
      y: 36,
      w: 230,
      h: 90,
    },
    {
      id: "guard",
      label: { en: "Reply rule checks", th: "ชุดตรวจคำตอบตามกฎ" },
      sub: { en: ["voice, LINE, recall"], th: ["เสียง LINE และการโทรติดตาม"] },
      emphasis: true,
      x: 770,
      y: 220,
      w: 230,
      h: 96,
    },
    { id: "reply", label: { en: "Reply", th: "คำตอบ" }, x: 1080, y: 232, w: 120, h: 72 },
  ],
  edges: [
    {
      id: "e-call",
      from: "caller",
      to: "twilio",
      points: [
        [200, 142],
        [245, 142],
      ],
    },
    {
      id: "e-chat",
      from: "line-user",
      to: "line-api",
      points: [
        [200, 322],
        [245, 322],
      ],
    },
    {
      id: "e-stream",
      from: "twilio",
      to: "service",
      points: [
        [440, 142],
        [456, 142],
        [456, 230],
        [510, 230],
      ],
    },
    {
      id: "e-webhook",
      from: "line-api",
      to: "service",
      points: [
        [440, 322],
        [456, 322],
        [456, 270],
        [510, 270],
      ],
    },
    {
      id: "e-model",
      from: "service",
      to: "model",
      points: [
        [610, 200],
        [610, 80],
        [770, 80],
      ],
    },
    {
      id: "e-draft",
      from: "model",
      to: "guard",
      points: [
        [885, 126],
        [885, 220],
      ],
      label: { en: "model draft", th: "ร่างจากโมเดล" },
      labelAt: [877, 200],
      labelAnchor: "end",
    },
    {
      id: "e-recall",
      from: "recall",
      to: "guard",
      points: [
        [710, 502],
        [740, 502],
        [740, 290],
        [770, 290],
      ],
    },
    {
      id: "e-store",
      from: "service",
      to: "store",
      points: [
        [610, 300],
        [610, 350],
      ],
      arrow: "none",
    },
    {
      id: "e-reply",
      from: "guard",
      to: "reply",
      points: [
        [1000, 268],
        [1080, 268],
      ],
    },
    {
      id: "e-back-call",
      from: "reply",
      to: "caller",
      points: [
        [1140, 304],
        [1140, 720],
        [20, 720],
        [20, 142],
        [40, 142],
      ],
      label: { en: "Reply goes back on the channel it came in on", th: "ตอบกลับทางช่องทางเดิม" },
      labelAt: [620, 708],
      labelAnchor: "middle",
    },
    {
      id: "e-back-chat",
      from: "reply",
      to: "line-user",
      points: [
        [20, 322],
        [40, 322],
      ],
    },
  ],
  constraints: [
    {
      id: "c-guard",
      leader: [
        [885, 316],
        [885, 596],
      ],
      at: [897, 600],
      lines: {
        en: [
          "Checks each draft before it",
          "reaches a patient, with rules",
          "that block diagnoses, dosing",
          "advice and cure claims",
        ],
        th: ["ตรวจร่างคำตอบก่อนส่งถึงคนไข้", "ตามกฎบล็อกการวินิจฉัย", "การแนะนำขนาดยา", "และการอ้างว่ารักษาหาย"],
      },
    },
    {
      id: "c-replay",
      leader: [
        [885, 172],
        [1036, 172],
      ],
      at: [1044, 146],
      lines: {
        en: ["Replay of 500 real", "messages, July 2026:", "37 rule violations", "caught in code"],
        th: ["ทดสอบซ้ำ 500 ข้อความจริง", "ก.ค. 2026 โค้ดบล็อกร่าง", "ที่ไม่ผ่านกฎได้ 37 ครั้ง"],
      },
    },
    {
      id: "c-release",
      leader: [
        [500, 570],
        [500, 604],
      ],
      at: [512, 608],
      lines: {
        en: ["Gated releases,", "one-step rollback"],
        th: ["ทุก release ผ่านด่านตรวจ", "ย้อนกลับได้ในขั้นตอนเดียว"],
      },
    },
    {
      id: "c-silence",
      leader: [
        [300, 174],
        [300, 196],
      ],
      at: [252, 214],
      lines: {
        en: ["Silence frames injected", "server-side when the carrier", "suppresses silence"],
        th: ["เติมเฟรมเงียบจากฝั่งเซิร์ฟเวอร์", "เมื่อผู้ให้บริการเครือข่าย", "ตัดช่วงเงียบทิ้ง"],
      },
    },
    {
      id: "c-number",
      leader: [
        [120, 110],
        [120, 78],
      ],
      at: [40, 50],
      lines: {
        en: ["Dedicated phone number,", "in production since July 2026"],
        th: ["เบอร์โทรเฉพาะ", "ใช้งานจริงตั้งแต่กรกฎาคม 2026"],
      },
    },
  ],
  titleBlock: { x: 860, y: 760, w: 360, h: 80 },
};

const AGENTS = ["Claude Code", "Codex", "Kimi", "Cursor"] as const;

const helm: PlateSpec = {
  projectId: "proj-helm",
  drawing: "KZ-02",
  title: { en: "Agent workspace on macOS", th: "พื้นที่ทำงานของ agent บน macOS" },
  revision: "2026-10",
  width: 1240,
  height: 640,
  boundaries: [{ id: "macos", label: { en: "macOS" }, x: 40, y: 40, w: 1160, h: 470 }],
  nodes: [
    { id: "shell", label: { en: "Tauri 2 shell" }, container: true, x: 80, y: 90, w: 1080, h: 380 },
    {
      id: "ui",
      label: { en: "TypeScript UI", th: "หน้าจอ TypeScript" },
      container: true,
      x: 120,
      y: 150,
      w: 1000,
      h: 160,
    },
    ...AGENTS.map((name, i) => ({
      id: `tile-${i}`,
      label: { en: name },
      sub: { en: ["agent tile"], th: ["ช่อง agent"] },
      x: 150 + i * 240,
      y: 210,
      w: 210,
      h: 76,
    })),
    { id: "core", label: { en: "Rust core", th: "แกนหลัก Rust" }, emphasis: true, x: 120, y: 370, w: 1000, h: 64 },
  ],
  edges: AGENTS.map((_, i) => ({
    id: `e-tile-${i}`,
    from: `tile-${i}`,
    to: "core",
    points: [
      [255 + i * 240, 286],
      [255 + i * 240, 370],
    ],
    arrow: "none" as const,
  })),
  constraints: [
    {
      id: "c-daily",
      leader: [
        [300, 470],
        [300, 548],
      ],
      at: [312, 556],
      lines: {
        en: ["In daily use as my primary", "development environment"],
        th: ["ใช้เป็นเครื่องมือพัฒนาหลัก", "ของผมทุกวัน"],
      },
    },
    {
      id: "c-side",
      leader: [
        [735, 210],
        [735, 126],
      ],
      at: [747, 124],
      lines: { en: ["Agents work side by side"], th: ["agent ทำงานเคียงข้างกัน"] },
    },
  ],
  titleBlock: { x: 860, y: 540, w: 360, h: 80 },
};

const PLATES: Record<string, PlateSpec> = {
  [yimwhan.projectId]: yimwhan,
  [helm.projectId]: helm,
};

export function getPlateSpec(projectId: string): PlateSpec | undefined {
  return PLATES[projectId];
}
