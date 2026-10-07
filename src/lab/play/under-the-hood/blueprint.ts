/**
 * The blueprint under the mockup, in the plates' drawing style (one hairline weight, dashed
 * boundary, double outline on the parts the drawing is about, title block), drawn with Canvas 2D
 * so it can be masked per frame. Every label restates the site's own Yimwhan plate
 * (src/components/plates/data.ts); nothing new is claimed. Two layouts: wide and tall (phones).
 */
type L = { en: string; th?: string };
type Node = { x: number; y: number; w: number; h: number; label: L; sub?: L; emphasis?: boolean };
type Edge = { pts: [number, number][]; arrow?: boolean; label?: L; at?: [number, number]; anchor?: CanvasTextAlign };
type Spec = { w: number; h: number; boundary?: { x: number; y: number; w: number; h: number; label: L }; nodes: Node[]; edges: Edge[]; tb: { x: number; y: number; w: number; h: number } };

const N = {
  caller: { label: { en: "Caller", th: "ผู้โทร" }, sub: { en: "phone", th: "โทรศัพท์" } },
  lineUser: { label: { en: "LINE user", th: "ผู้ใช้ LINE" }, sub: { en: "chat", th: "แชท" } },
  twilio: { label: { en: "Twilio" }, sub: { en: "media stream" } },
  lineApi: { label: { en: "LINE Messaging API" }, sub: { en: "webhook" } },
  service: { label: { en: "Fastify service", th: "บริการ Fastify" }, sub: { en: "TypeScript" }, emphasis: true },
  store: { label: { en: "SQLite" }, sub: { en: "Litestream" } },
  model: { label: { en: "Model call", th: "เรียกโมเดล" }, sub: { en: "Gemini on Vertex AI" } },
  guard: { label: { en: "Reply rule checks", th: "ชุดตรวจคำตอบตามกฎ" }, sub: { en: "voice, LINE, recall", th: "เสียง LINE และการโทรติดตาม" }, emphasis: true },
  reply: { label: { en: "Reply", th: "คำตอบ" } },
};
const BACK: L = { en: "Reply goes back on the channel it came in on", th: "ตอบกลับทางช่องทางเดิม" };
const DRAFT: L = { en: "model draft", th: "ร่างจากโมเดล" };

const WIDE: Spec = {
  w: 1000,
  h: 600,
  boundary: { x: 430, y: 150, w: 470, h: 262, label: { en: "Fly.io" } },
  nodes: [
    { ...N.caller, x: 40, y: 90, w: 150, h: 60 },
    { ...N.lineUser, x: 40, y: 260, w: 150, h: 60 },
    { ...N.twilio, x: 225, y: 90, w: 175, h: 60 },
    { ...N.lineApi, x: 225, y: 260, w: 175, h: 60 },
    { ...N.service, x: 455, y: 190, w: 190, h: 92 },
    { ...N.store, x: 455, y: 322, w: 190, h: 64 },
    { ...N.model, x: 680, y: 40, w: 200, h: 78 },
    { ...N.guard, x: 680, y: 192, w: 200, h: 88 },
    { ...N.reply, x: 920, y: 206, w: 64, h: 60 },
  ],
  edges: [
    { pts: [[190, 120], [225, 120]] },
    { pts: [[190, 290], [225, 290]] },
    { pts: [[400, 120], [420, 120], [420, 215], [455, 215]] },
    { pts: [[400, 290], [420, 290], [420, 257], [455, 257]] },
    { pts: [[550, 190], [550, 79], [680, 79]] },
    { pts: [[780, 118], [780, 192]], label: DRAFT, at: [772, 162], anchor: "right" },
    { pts: [[645, 236], [680, 236]] },
    { pts: [[880, 236], [920, 236]] },
    { pts: [[550, 282], [550, 322]], arrow: false },
    { pts: [[952, 266], [952, 470], [20, 470], [20, 120], [40, 120]], label: BACK, at: [486, 458], anchor: "center" },
    { pts: [[20, 290], [40, 290]] },
  ],
  tb: { x: 640, y: 500, w: 340, h: 80 },
};

const TALL: Spec = {
  w: 400,
  h: 720,
  nodes: [
    { ...N.caller, x: 20, y: 20, w: 170, h: 58 },
    { ...N.lineUser, x: 210, y: 20, w: 170, h: 58 },
    { ...N.twilio, x: 20, y: 108, w: 170, h: 58 },
    { ...N.lineApi, x: 210, y: 108, w: 170, h: 58 },
    { ...N.service, x: 20, y: 206, w: 220, h: 78 },
    { ...N.store, x: 260, y: 214, w: 120, h: 62 },
    { ...N.model, x: 20, y: 320, w: 360, h: 62 },
    { ...N.guard, x: 20, y: 418, w: 360, h: 78 },
    { ...N.reply, x: 140, y: 532, w: 120, h: 50 },
  ],
  edges: [
    { pts: [[105, 78], [105, 108]] },
    { pts: [[295, 78], [295, 108]] },
    { pts: [[105, 166], [105, 206]] },
    { pts: [[295, 166], [295, 186], [180, 186], [180, 206]] },
    { pts: [[240, 245], [260, 245]], arrow: false },
    { pts: [[130, 284], [130, 320]] },
    { pts: [[200, 382], [200, 418]], label: DRAFT, at: [210, 404], anchor: "left" },
    { pts: [[200, 496], [200, 532]] },
  ],
  tb: { x: 20, y: 630, w: 360, h: 72 },
};

export type Ink = { ground: string; surface: string; ink: string; ink2: string; ink3: string; rule: string; gold: string };

const tx = (l: L, th: boolean) => (th && l.th) || l.en;

/** Paint the blueprint into `ctx` (CSS px space already scaled by the caller) to fill w x h. */
export function drawBlueprint(ctx: CanvasRenderingContext2D, w: number, h: number, c: Ink, font: string, th: boolean) {
  const spec = w / h < 0.95 ? TALL : WIDE;
  const s = Math.min(w / spec.w, h / spec.h) * 0.94;
  const ox = (w - spec.w * s) / 2;
  const oy = (h - spec.h * s) / 2;

  // Paper + a faint dot grid, so the reveal reads as a drawing sheet.
  ctx.fillStyle = c.ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c.rule;
  ctx.globalAlpha = 0.6;
  const g = 24;
  for (let y = g / 2; y < h; y += g) ctx.fillRect(0, Math.round(y), w, 1);
  for (let x = g / 2; x < w; x += g) ctx.fillRect(Math.round(x), 0, 1, h);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  const hair = 1 / s;
  ctx.lineWidth = hair;
  ctx.strokeStyle = c.ink2;
  ctx.textBaseline = "alphabetic";

  // Sheet frame.
  ctx.strokeRect(6, 6, spec.w - 12, spec.h - 12);

  if (spec.boundary) {
    const b = spec.boundary;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    ctx.fillStyle = c.ink2;
    ctx.font = `13px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(tx(b.label, th), b.x + 10, b.y + 20);
  }

  for (const n of spec.nodes) {
    ctx.fillStyle = c.surface;
    ctx.fillRect(n.x, n.y, n.w, n.h);
    ctx.strokeStyle = c.ink2;
    ctx.strokeRect(n.x, n.y, n.w, n.h);
    if (n.emphasis) {
      ctx.strokeStyle = c.gold;
      ctx.strokeRect(n.x + 5, n.y + 5, n.w - 10, n.h - 10);
      ctx.strokeStyle = c.ink2;
    }
    const cx = n.x + n.w / 2;
    const lines = n.sub ? 2 : 1;
    const top = n.y + n.h / 2 - (lines === 2 ? 4 : -6);
    ctx.textAlign = "center";
    ctx.fillStyle = c.ink;
    ctx.font = `600 15px ${font}`;
    ctx.fillText(tx(n.label, th), cx, top, n.w - 12);
    if (n.sub) {
      ctx.fillStyle = c.ink2;
      ctx.font = `13px ${font}`;
      ctx.fillText(tx(n.sub, th), cx, top + 19, n.w - 12);
    }
  }

  for (const e of spec.edges) {
    ctx.strokeStyle = c.ink2;
    ctx.beginPath();
    e.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    if (e.arrow !== false) {
      const [x1, y1] = e.pts[e.pts.length - 1];
      const [x0, y0] = e.pts[e.pts.length - 2];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const dx = (x1 - x0) / len;
      const dy = (y1 - y0) / len;
      const a = 8;
      ctx.beginPath();
      ctx.moveTo(x1 - dx * a - dy * a * 0.55, y1 - dy * a + dx * a * 0.55);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 - dx * a + dy * a * 0.55, y1 - dy * a - dx * a * 0.55);
      ctx.stroke();
    }
    if (e.label && e.at) {
      ctx.fillStyle = c.ink2;
      ctx.font = `13px ${font}`;
      ctx.textAlign = e.anchor ?? "left";
      ctx.fillText(tx(e.label, th), e.at[0], e.at[1]);
    }
  }

  // Title block.
  const t = spec.tb;
  ctx.strokeStyle = c.ink2;
  ctx.strokeRect(t.x, t.y, t.w, t.h);
  ctx.beginPath();
  ctx.moveTo(t.x, t.y + t.h / 2);
  ctx.lineTo(t.x + t.w, t.y + t.h / 2);
  ctx.moveTo(t.x + 100, t.y);
  ctx.lineTo(t.x + 100, t.y + t.h);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = c.ink3;
  ctx.font = `10px ${font}`;
  ctx.fillText(th ? "แบบเลขที่" : "DRAWING", t.x + 8, t.y + 13);
  ctx.fillText(th ? "มาตราส่วน" : "SCALE", t.x + 8, t.y + t.h / 2 + 13);
  ctx.fillStyle = c.ink;
  ctx.font = `600 14px ${font}`;
  ctx.fillText("KZ-LAB", t.x + 8, t.y + t.h / 2 - 7);
  ctx.fillText(th ? "ข้างใต้หน้าจอ" : "Under the hood", t.x + 110, t.y + t.h / 2 - 12);
  ctx.fillStyle = c.ink2;
  ctx.font = `12px ${font}`;
  ctx.fillText(th ? "ไม่ตามมาตราส่วน" : "not to scale", t.x + 8, t.y + t.h - 10);
  ctx.fillText(th ? "คลินิกสมมติ" : "fictional clinic", t.x + 110, t.y + t.h - 10);
  ctx.restore();
}
