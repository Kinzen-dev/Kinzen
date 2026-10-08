import { stripJoiners } from "./thai-plain";

export { plain, stripJoiners } from "./thai-plain";

/**
 * Thai line breaking. Browsers split Thai with a dictionary (ICU) that cuts compound
 * words at their parts ("ทันต|กรรม", "ใช้|งาน"), which native readers read as broken
 * words. CSS cannot fix it portably (Chromium ignores `word-break: keep-all` for Thai).
 *
 * One model, two renderings. A Thai run (text between spaces) becomes a list of
 * unbreakable ATOMS:
 * - the run is split at dictionary word boundaries (Intl.Segmenter, the same ICU data
 *   browsers use), except inside known compounds, which stay whole.
 * Gluing whole phrases was tried and rejected: a phrase wider than its line forced
 * emergency breaks in the middle of words (review round 3).
 * Then:
 * - HTML: `nobr` (thai-nodes.ts) wraps known compounds in white-space:nowrap spans. No
 *   characters are added, so the browser's dictionary still sees the whole sentence and
 *   neighbouring words break normally (proven on a fixture in Chromium and WebKit, 2026-10-07;
 *   U+2060 joiners in the text did the opposite and broke neighbours mid-syllable);
 * - `thaiBreaks` (OG images, where satori has no Thai dictionary) puts U+200B between
 *   atoms, so the card wraps only where the page would.
 */
const ZWSP = "\u200b";
const THAI_RUN = /[\u0E00-\u0E7F]+/g;

/** Compounds the dictionary splits; extend when a break shows up in QA. */
export const COMPOUNDS = [
  "ทันตกรรม",
  "ทุกข้อ",
  "หน้าร้าน",
  "รวมถึง",
  "ตัวกรอง",
  "ขั้นตอน",
  "คำตอบ",
  "เครื่องมือ",
  "เรียลไทม์",
  "เอนจิน",
  "ความปลอดภัย",
  "คลินิก",
  "ผลิตภัณฑ์",
  "แพลตฟอร์ม",
  "อีคอมเมิร์ซ",
  "วิศวกรรม",
  "วิศวกร",
  "ซอฟต์แวร์",
  "โทรศัพท์",
  "สตูดิโอ",
  "ประสบการณ์",
  "รับผิดชอบ",
  "ตรวจสอบ",
  "เทคโนโลยี",
  "คอมพิวเตอร์",
  "คอมไพล์",
  "ผู้ช่วย",
  "ผู้ให้บริการ",
  "บริการ",
  "องค์ประกอบ",
  "น่าจะ",
  "ใช้งาน",
  "พนักงาน",
  "เคียงข้าง",
  "กลับมา",
  "ตัวไหน",
  "การตรวจ",
  "การพูด",
  "ประมวลผล",
  "ผู้ก่อตั้ง",
  "ผู้ใช้",
  "ออนไลน์",
  "การเติม",
  "ไบนารี",
  "คนไข้",
  "ทันที",
  "ข้อความ",
  "ระบบ",
  "อัปเกรด",
  "เท่าไหร่",
  "เชื่อมต่อ",
  "ผลงาน",
  "หลักฐาน",
  "ต่างๆ",
  "จัดฟัน",
  "ราคา",
  "ปัจจุบัน",
  "ตั้งแต่",
  "ติดตาม",
  "จนถึง",
  "ทำงาน",
  "ข้อมูล",
  "โปรเจกต์",
  "ออกแบบ",
  "สถาปัตยกรรม",
  "ลูกค้า",
  "ภาษา",
  "มาตรฐาน",
  "อัตโนมัติ",
  "นักพัฒนา",
  "ในฐานะ",
  "หนึ่งเดียว",
  "ห้องเสียง",
  "คลินิกทันตกรรม",
  "รันซ้ำ",
  "ช่วงเงียบ",
  "เครื่องเดียว",
  "รักษาหาย",
  "ชั้นไหน",
  "พื้นฐาน",
  "หน้าจอ",
  "ยาแก้ปวด",
  "เจ้าคุณทหาร",
  "ลาดกระบัง",
  "ย้อนกลับ",
  "เว้นระยะ",
  "ก่อนหน้า",
  "ชุดตรวจ",
  "บังคับ",
  "full-stack",
  "ส่วนใหญ่",
  "ยังไง",
  "คำอวดอ้าง",
  "สมมติ",
  "ชั่วโมง",
  "e-commerce",
  "ระยะ",
  "ตัวอย่าง",
  "บทสนทนา",
  "ข้อมูลสมมติ",
  "หลังบ้าน",
  "ระบบหลังบ้าน",
  "วินิจฉัยโรค",
  "วินิจฉัย",
  "ตอบแชท",
  "รับสาย",
  "เรียกชื่อ",
  "ทุกช่อง",
  "ที่สุด",
  "เท่าที่",
  "จำเป็น",
  "ข้อความจริง",
  "ผู้ตรวจอิสระ",
  "ตรวจอิสระ",
  "ครบชุด",
  "เข้าออฟฟิศ",
  "หน้าเดียว",
  "ความปลอดภัยทางคลินิก",
  "ได้ไหม",
  "Claude Code",
  "EC Platform",
  "app proxy",
  "app proxies",
  "speech-to-text",
  "Real-time",
  "ตัวบังคับ",
  "เท่าที่จำเป็น",
  "เขียนไว้",
  "ที่สำคัญ",
  "หลงทาง",
  "เครือข่าย",
  "ติดเชื้อ",
  "คุณหมอ",
  "เมื่อคืน",
  "ผู้แนะนำ",
  "เบอร์โทร",
  "ผู้ตรวจ",
  "ด่านตรวจ",
  "ส่งต่อ",
  "หัวหน้าทีม",
  "หัวหน้า",
  "ก่อนหน้านั้น",
  "สายโทรเข้า",
  "คิวว่าง",
  "เลือดออก",
  "หรือเปล่า",
  "พื้นที่ทำงาน",
  "ผิดกฎ",
  "รันเทสต์",
  "ชุดตรวจความปลอดภัย",
  "ความเป็นส่วนตัว",
  "ไม่ใช้คุกกี้",
  // Audit round a-01 (2026-10-07): breaks seen in the rewritten copy.
  "ทดสอบซ้ำ",
  "การประเมิน",
  "การย้าย",
  "การอัปเกรด",
  "ด้านบน",
  "ไม่ต่ำกว่า",
  // Blind review r1: splits seen in the About lede and the case facts.
  "ส่วนใหญ่",
  "ทั้งระบบ",
  "ด้วยตนเอง",
  "เป็นเวลา",
  "เป็นอิสระ",
  "ฝั่งตะวันตก",
  "ผ่านกฎ",
  "เข้าชม",
  "ตอบกลับ",
  "คำตอบสุดท้าย",
  "อวดอ้าง",
  "ในการทดสอบนี้",
].sort((a, b) => b.length - a.length);

const segmenter = new Intl.Segmenter("th", { granularity: "word" });

/** Split one Thai run into atoms that must not break inside. */
function atoms(run: string): string[] {
  // Character ranges covered by known compounds (longest first, no overlaps).
  const covered: [number, number][] = [];
  for (const word of COMPOUNDS) {
    let from = 0;
    for (;;) {
      const at = run.indexOf(word, from);
      if (at < 0) break;
      const end = at + word.length;
      if (!covered.some(([s, e]) => at < e && end > s)) covered.push([at, end]);
      from = at + 1;
    }
  }

  const out: string[] = [];
  for (const { segment, index } of segmenter.segment(run)) {
    // A boundary at `index` is forbidden if it falls strictly inside a compound.
    const inside = covered.some(([s, e]) => index > s && index < e);
    if (inside && out.length) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}

/**
 * Visible HTML text: returned unchanged, on purpose. Every attempt to steer the browser's Thai
 * line breaking with U+2060 joiners (whole phrases, then words, then only compounds) made it
 * worse: any joiner hides the surrounding text from the browser's own Thai dictionary, so it
 * breaks NEIGHBOURING words mid-syllable ("ขอ|งองค์ประกอบ"), separates SARA AM in fallback fonts,
 * and leaks into copied text. Native dictionary breaking (what every Thai site gets) is the
 * best result; an occasional compound split at a line end ("ทันต|กรรม") is the accepted cost.
 * Kept as a single seam so a future engine feature (e.g. phrase-level breaking for Thai) can
 * be adopted in one place.
 */
export function thaiGlue(text: string): string {
  return text;
}

/** Image text (satori): explicit break opportunities between atoms only. */
export function thaiBreaks(text: string): string {
  return stripJoiners(text).replace(THAI_RUN, (run) => atoms(run).join(ZWSP));
}
