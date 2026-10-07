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
      body: "Each pane reports its own checks, and they are reviewed before the change merges.",
    },
  ],
  builtWith: "Built with",
  cta: "Read the Helm case",
  illustration: "Illustration. The workspace, files and messages are fictional.",
  /** Labels inside the window mockup (code, commands, file and branch names stay English). */
  ui: {
    workspaces: "Workspaces",
    openTerminals: "open terminals",
    idle: "IDLE",
    working: "WORKING",
    merged: "MERGED",
    passed: "PASSED",
    newMission: "new mission",
    newWorkspace: "New workspace",
    spaceHint: "panes in a grid",
    swarmHint: "a composed roster",
    howMany: "How many terminals?",
    create: "Create workspace",
    noteBody: "picker.ts ready for review",
    mergedBefore: "Merged",
    mergedAfter: "into main",
    checks: "4 of 4 checks",
    placeholder: "Message the crew",
    dispatch: "add a slot picker to booking, with tests",
  },
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
      title: "ตรวจผ่านแล้วจึง merge",
      body: "แต่ละช่องรายงานผลการตรวจ เพื่อใช้ตรวจสอบก่อนรวมโค้ดที่แก้ไข",
    },
  ],
  builtWith: "สร้างด้วย",
  cta: "อ่านเรื่อง Helm ต่อ",
  illustration: "ภาพประกอบ: workspace ไฟล์ และข้อความในภาพเป็นข้อมูลสมมติ",
  ui: {
    workspaces: "พื้นที่ทำงาน",
    openTerminals: "เทอร์มินัลที่เปิดอยู่",
    idle: "ว่าง",
    working: "กำลังทำ",
    merged: "merge แล้ว",
    passed: "ผ่าน",
    newMission: "งานใหม่",
    newWorkspace: "workspace ใหม่",
    spaceHint: "ช่องเรียงเป็นตาราง",
    swarmHint: "จัดทีม agent เอง",
    howMany: "เปิดกี่เทอร์มินัล",
    create: "สร้าง workspace",
    noteBody: "picker.ts พร้อมให้ตรวจ",
    mergedBefore: "merge",
    mergedAfter: "เข้า main แล้ว",
    checks: "ผ่าน 4 จาก 4",
    placeholder: "ส่งข้อความถึงทีม",
    dispatch: "เพิ่มตัวเลือกเวลานัดในหน้าจอง พร้อมเทสต์",
  },
  summary: "ภาพเคลื่อนไหวจำลองหน้าต่าง Helm: agent สี่ช่องชื่อ Atlas, Nova, Vega และ Sable ทำงานกับโปรเจกต์สมมติ",
};
export const helm = { en, th };
