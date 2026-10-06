import { describe, expect, it } from "vitest";
import { stripJoiners, thaiBreaks, thaiGlue } from "./thai";

const WJ = "⁠";
const ZWSP = "​";

describe("thaiGlue (visible HTML text)", () => {
  it("returns Thai text unchanged, so the browser's own dictionary decides line breaks", () => {
    // Review rounds 1 to 5: any joiner hid neighbouring words from the browser's Thai
    // dictionary and caused mid-syllable breaks ("ขอ|งองค์ประกอบ"), broken SARA AM in
    // fallback fonts and invisible characters in copied text.
    for (const text of ["ให้คลินิกทันตกรรม", "ขนาดขององค์ประกอบ", "ผ่านการตรวจ", "ทำงาน", "Shopify and LINE"]) {
      expect(thaiGlue(text)).toBe(text);
    }
  });
});

describe("thaiBreaks (OG images, where satori has no Thai dictionary)", () => {
  it("adds break points between words but never inside a known compound", () => {
    const out = thaiBreaks("ผู้ช่วยรับสายให้คลินิกทันตกรรมทุกวันตลอดเวลาโดยไม่มีวันหยุดเลย");
    expect(out).toContain(ZWSP);
    expect(out).toContain("ทันตกรรม");
    expect(out.replaceAll(ZWSP, "")).toBe("ผู้ช่วยรับสายให้คลินิกทันตกรรมทุกวันตลอดเวลาโดยไม่มีวันหยุดเลย");
  });

  it("never splits a grapheme (no break point before a combining mark or SARA AM)", () => {
    const out = thaiBreaks("ประจำการทำงานกำกับดูแลทั้งระบบที่ใช้งานจริงทุกวัน");
    expect(out).not.toMatch(new RegExp(`${ZWSP}[\\u0E31\\u0E33-\\u0E3A\\u0E47-\\u0E4E]`));
  });

  it("strips page joiners from its input", () => {
    expect(thaiBreaks(`ทันต${WJ}กรรม`)).not.toContain(WJ);
  });
});

describe("stripJoiners", () => {
  it("removes word joiners and nothing else", () => {
    expect(stripJoiners(`ก${WJ}ข ค`)).toBe("กข ค");
  });
});
