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
 * - `thaiGlue` (HTML) puts U+2060 WORD JOINER inside known compounds only, which every
 *   engine honours as "no break here"; ordinary words are left to the browser's dictionary;
 * - `thaiBreaks` (OG images, where satori has no Thai dictionary) puts U+200B between
 *   atoms, so the card wraps only where the page would.
 * Use `thaiGlue` only for VISIBLE text. Metadata, aria values and images get plain text.
 */
const WJ = "\u2060";
const ZWSP = "\u200b";
const THAI_RUN = /[\u0E00-\u0E7F]+/g;
/** Marks that belong to the character before them (incl. SARA AM): never put a joiner before these. */
const COMBINING = /[\u0E31\u0E33-\u0E3A\u0E47-\u0E4E]/;

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
  "ออนไลน์",
  "การเติม",
  "ไบนารี",
  "คนไข้",
  "ทันที",
  "ข้อความ",
  "ระบบ",
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

function joinInside(atom: string): string {
  let out = "";
  for (const ch of atom) out += out && !COMBINING.test(ch) ? WJ + ch : ch;
  return out;
}

/**
 * Visible HTML text: joiners ONLY inside known compounds. Everything else is left to the
 * browser's own Thai dictionary: joiners inside ordinary words hide them from that dictionary,
 * leaving too few break points (review round 4: mid-word breaks on every Thai route).
 */
export function thaiGlue(text: string): string {
  return text.replace(THAI_RUN, (run) => {
    let out = run;
    for (const word of COMPOUNDS) {
      if (out.includes(word)) out = out.split(word).join(joinInside(word));
    }
    return out;
  });
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
