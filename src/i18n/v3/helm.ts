/**
 * v3 copy for the "helm" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 * The window mockup itself is fictional UI chrome (aria-hidden) and stays in English.
 */
const en = {
  kicker: "Agent workspace",
  stageLabel: "Helm walkthrough",
  step: "Step",
  beats: [
    {
      title: "Open a workspace",
      body: "Point it at a project folder and pick how many agents to run. Nothing is running yet.",
    },
    {
      title: "Agents take their seats",
      body: "Four panes open in a grid. Each gets a call-sign and shows its engine: Claude Code, Codex, Kimi or Cursor.",
    },
    {
      title: "They work in parallel",
      body: "Every pane runs its own agent. They read, edit and run tests at the same time, side by side.",
    },
    {
      title: "Work passes between seats",
      body: "One agent hands a note straight to another by name, with no copy and paste in between.",
    },
    {
      title: "Checks turn green",
      body: "Each pane reports its own check, and the change merges once every one of them passes.",
    },
  ],
  builtWith: "Built with",
  cta: "Read the Helm case",
  illustration: "Illustration. The workspace, files and messages are fictional.",
  summary:
    "Animated illustration of a Helm window: four agent panes named Atlas, Nova, Vega and Sable work on a fictional project.",
};
export type HelmCopy = typeof en;
const th: HelmCopy = {
  kicker: "พื้นที่ทำงานของ agent",
  stageLabel: "ขั้นตอนการทำงานของ Helm",
  step: "ขั้นที่",
  beats: [
    {
      title: "เปิด workspace ใหม่",
      body: "ชี้ไปที่โฟลเดอร์ของโปรเจกต์ แล้วเลือกว่าจะให้ agent ทำงานกี่ตัว ตอนนี้ยังไม่มีอะไรรันอยู่",
    },
    {
      title: "agent เข้าประจำที่",
      body: "เปิดขึ้นมาสี่ช่องเรียงเป็นตาราง แต่ละช่องมีชื่อเรียกของตัวเอง และบอกว่าใช้ Claude Code, Codex, Kimi หรือ Cursor",
    },
    {
      title: "ทำงานไปพร้อมกัน",
      body: "แต่ละช่องรัน agent ของตัวเอง อ่านโค้ด แก้ไฟล์ และรันเทสต์ไปพร้อม ๆ กัน",
    },
    {
      title: "ส่งงานต่อกันเอง",
      body: "agent ตัวหนึ่งส่งโน้ตถึงอีกตัวได้ด้วยการเรียกชื่อ ผมไม่ต้องคอยส่งต่อเอง",
    },
    {
      title: "เช็คผ่านครบ งานก็ merge",
      body: "ทุกช่องรายงานผลเช็คของตัวเอง พอผ่านครบทุกช่อง โค้ดที่แก้ก็ merge เข้าไป",
    },
  ],
  builtWith: "สร้างด้วย",
  cta: "อ่านเรื่อง Helm ต่อ",
  illustration: "ภาพประกอบ: workspace ไฟล์ และข้อความในภาพเป็นข้อมูลสมมติ",
  summary: "ภาพเคลื่อนไหวจำลองหน้าต่าง Helm: agent สี่ช่องชื่อ Atlas, Nova, Vega และ Sable ทำงานกับโปรเจกต์สมมติ",
};
export const helm = { en, th };
