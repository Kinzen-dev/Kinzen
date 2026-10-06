/**
 * Thai line breaking. Browsers split Thai with a dictionary (ICU) that cuts compound
 * words at their parts ("ทันต|กรรม", "หน้า|ร้าน"), which native readers read as broken
 * words. CSS cannot fix it portably (Chromium ignores `word-break: keep-all` for Thai).
 *
 * We insert U+2060 WORD JOINER, which every engine honours as "no break here":
 * - a short Thai run (one phrase between spaces) is kept whole, so lines break at the
 *   spaces Thai writers already put between phrases;
 * - in longer runs, known compounds are kept whole and the dictionary breaks the rest.
 * Combining marks stay attached to their base; joiners never sit before them.
 */
const WJ = "⁠";
const THAI_RUN = /[฀-๿]+/g;
const COMBINING = /[ัิ-ฺ็-๎]/;

/** Phrases up to this many characters never break inside. */
const SHORT_RUN = 16;

/** Compounds the dictionary splits; extend when a break shows up in QA. */
const COMPOUNDS = [
  "ทันตกรรม",
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
];

function joinAll(word: string): string {
  let out = "";
  for (const ch of word) out += out && !COMBINING.test(ch) ? WJ + ch : ch;
  return out;
}

const GLUED = COMPOUNDS.sort((a, b) => b.length - a.length).map((w) => [w, joinAll(w)] as const);

export function thaiGlue(text: string): string {
  return text.replace(THAI_RUN, (run) => {
    if ([...run].length <= SHORT_RUN) return joinAll(run);
    let out = run;
    for (const [plain, glued] of GLUED) out = out.split(plain).join(glued);
    return out;
  });
}

/** Remove the joiners again, e.g. for text that is copied or compared. */
export function stripJoiners(text: string): string {
  return text.replaceAll(WJ, "");
}
