import type { LabProps } from "../types";

type Concept = { id: string; en: [string, string]; th: [string, string] };

/** Concept frames (Codex imagegen, 2026-10-08) for the interactive section. Images only, nothing playable. */
export const CONCEPTS: Concept[] = [
  {
    id: "night-desk",
    en: ["Night Desk", "The ink desk becomes a small 3D room. The window follows real Bangkok time; tap the monitor to watch agents at work, tap the phone to hear a short greeting from the voice agent; props on the desk roll when nudged."],
    th: ["Night Desk", "โต๊ะลายมือกลายเป็นห้อง 3D ที่สำรวจได้ หน้าต่างเปลี่ยนตามเวลาจริงของกรุงเทพฯ แตะจอเห็น agent กำลังทำงาน แตะโทรศัพท์ได้ยินเสียงทักทายจาก voice agent ของบนโต๊ะเขี่ยแล้วกลิ้งได้"],
  },
  {
    id: "gold-toss",
    en: ["Gold Toss", "Fling the heavy brushed-gold KINZEN letters: they tumble and clink, splash into ink water, bloom into gold ink, then rise back into place."],
    th: ["Gold Toss", "ปาตัวอักษร KINZEN ทองที่มีน้ำหนักจริง หมุนกลิ้ง ชนกันมีเสียง ตกลงน้ำหมึกแล้วบานเป็นหมึกทอง แล้วลอยกลับเข้าที่"],
  },
  {
    id: "soi-of-agents",
    en: ["Soi of Agents", "An ink Bangkok soi at dusk. Drop a gold coin (a task): tiny agents hand it on, one is stopped at a gold gate (a guardrail), a temple bell rings and a lantern stays lit for everyone who visits that day."],
    th: ["Soi of Agents", "ซอยกรุงเทพฯ ยามค่ำวาดด้วยหมึก หย่อนเหรียญทอง (งานหนึ่งชิ้น) คนตัวเล็กส่งต่อกัน บางคนโดนประตูทองกันไว้ (ชุดตรวจ) งานเสร็จแล้วระฆังดังและโคมติดค้างไว้ให้ทุกคนที่เข้ามาวันนั้นเห็น"],
  },
  {
    id: "one-drop",
    en: ["One Drop", "A bowl of dark water. Touch to drop gold that blooms slowly; the drops of everyone who came today drift beneath. Quiet and elegant."],
    th: ["One Drop", "ชามน้ำมืดหนึ่งใบ แตะแล้วหยดทองบานช้าๆ หยดของทุกคนที่มาวันนี้ลอยอยู่ข้างใต้ เรียบ หรู เงียบ"],
  },
  {
    id: "thock",
    en: ["Thock", "A playable keycap field with springy keys and real key sounds; hold space for a gold ripple; type ship. Best as a garnish inside another section."],
    th: ["Thock", "ทุ่งคีย์แคปที่กดเล่นได้จริงพร้อมเสียงคีย์บอร์ด กด space ค้างให้เกิดคลื่นทอง พิมพ์คำว่า ship ได้ เหมาะเป็นลูกเล่นเสริมในเซกชันอื่น"],
  },
];

export function makeFrame(id: string) {
  const c = CONCEPTS.find((x) => x.id === id)!;
  function Frame({ locale }: LabProps) {
    const [title, body] = locale === "th" ? c.th : c.en;
    return (
      <section className="shell grid gap-4 pt-24 pb-8">
        <h1 className="text-2xl tracking-[-0.03em]">{title}</h1>
        <p className="max-w-[60ch] text-ink-2">{body}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/lab-concepts/${c.id}.jpg`} alt={`${title} concept frame`} className="w-full rounded-[var(--radius-card)] border border-rule" />
      </section>
    );
  }
  return Frame;
}
