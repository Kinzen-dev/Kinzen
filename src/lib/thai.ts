/**
 * Thai line breaking. Browsers split Thai with a dictionary (ICU) that cuts compound
 * words at their parts ("ทันต|กรรม", "ใช้|งาน"), which native readers read as broken
 * words. CSS cannot fix it portably (Chromium ignores `word-break: keep-all` for Thai).
 *
 * One model, two renderings. A Thai run (text between spaces) becomes a list of
 * unbreakable ATOMS:
 * - a run up to SHORT_RUN characters is one atom (Thai writers already put spaces
 *   between phrases, so lines break at those spaces);
 * - a longer run is split at dictionary word boundaries, except inside known compounds.
 * Then:
 * - `thaiGlue` (HTML) puts U+2060 WORD JOINER inside every atom, which every engine
 *   honours as "no break here";
 * - `thaiBreaks` (OG images, where satori has no Thai dictionary) puts U+200B between
 *   atoms, so the card wraps only where the page would.
 * Use `thaiGlue` only for VISIBLE text. Metadata, aria values and images get plain text.
 */
const WJ = "⁠";
const ZWSP = "​";
const THAI_RUN = /[฀-๿]+/g;
const COMBINING = /[ัิ-ฺ็-๎]/;

/** Phrases up to this many characters never break inside. */
const SHORT_RUN = 24;

/** Compounds the dictionary splits; extend when a break shows up in QA. */
const COMPOUNDS = [
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
  "ปัจจุบัน",
].sort((a, b) => b.length - a.length);

const segmenter = new Intl.Segmenter("th", { granularity: "word" });

/** Split one Thai run into atoms that must not break inside. */
function atoms(run: string): string[] {
  if ([...run].length <= SHORT_RUN) return [run];

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

function joinInside(atom: string): string {
  let out = "";
  for (const ch of atom) out += out && !COMBINING.test(ch) ? WJ + ch : ch;
  return out;
}

/** Visible HTML text: no line break inside any atom. */
export function thaiGlue(text: string): string {
  return text.replace(THAI_RUN, (run) => atoms(run).map(joinInside).join(""));
}

/** Image text (satori): explicit break opportunities between atoms only. */
export function thaiBreaks(text: string): string {
  return stripJoiners(text).replace(THAI_RUN, (run) => atoms(run).join(ZWSP));
}

/** Remove the joiners again (metadata, aria, copied text, comparisons). */
export function stripJoiners(text: string): string {
  return text.replaceAll(WJ, "");
}

/** Attribute values (aria-label, title, alt) must be plain text. */
export function plain<T extends string | undefined>(text: T): T {
  return (text === undefined ? text : stripJoiners(text)) as T;
}
