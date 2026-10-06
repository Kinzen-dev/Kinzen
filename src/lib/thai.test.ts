import { describe, expect, it } from "vitest";
import { stripJoiners, thaiGlue } from "./thai";

const WJ = "\u2060";

describe("thaiGlue", () => {
  it("leaves non-Thai text untouched", () => {
    expect(thaiGlue("Shopify and LINE")).toBe("Shopify and LINE");
  });

  it("keeps a dictionary-split compound whole", () => {
    // หน้าร้าน is a known compound: 6 base letters + 2 combining marks, so 5 joiners.
    const word = thaiGlue("หน้าร้าน แอป").split(" ")[0];
    expect(stripJoiners(word)).toBe("หน้าร้าน");
    expect(word.split(WJ)).toHaveLength(6);
  });

  it("never puts a joiner before a combining mark", () => {
    expect(thaiGlue("ผู้ช่วยรับสาย")).not.toMatch(new RegExp(`${WJ}[\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E]`));
  });

  it("glues known compounds inside long runs", () => {
    const out = thaiGlue("ผู้ช่วยรับสายให้คลินิกทันตกรรมทุกวันตลอดเวลา");
    const glued = thaiGlue("ทันตกรรม");
    expect(out).toContain(glued);
    expect(glued.split(WJ)).toHaveLength(7);
  });

  it("leaves ordinary words to the browser's dictionary (joiners only inside compounds)", () => {
    // Review round 4: joiners inside ordinary words hid them from the browser's Thai
    // dictionary and caused mid-word breaks everywhere.
    expect(thaiGlue("รับสายและตอบแชท")).toBe("รับสายและตอบแชท");
    const out = thaiGlue("ผู้ช่วยรับสาย");
    expect(out.slice(out.lastIndexOf(WJ) + 1)).toContain("รับสาย");
  });

  it("never separates SARA AM from its consonant", () => {
    // A joiner before ำ renders a dotted circle in fallback fonts.
    for (const text of ["ทำงาน", "กำกับ", "ประจำ", "ใช้งานจำลอง"]) {
      expect(thaiGlue(text)).not.toContain(`${WJ}\u0E33`);
    }
  });

  it("round-trips through stripJoiners", () => {
    const text = "นำทีมวิศวกรรม EC Platform ทำหน้าร้าน แอป และระบบ headless บน Shopify รวมถึง Mizuno Thailand";
    expect(stripJoiners(thaiGlue(text))).toBe(text);
  });
});
