import { describe, expect, it } from "vitest";
import { placeThaiMarks } from "./thai-marks";

const cp = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16));

describe("placeThaiMarks (share cards)", () => {
  it("stacks a tone over an upper vowel", () => {
    // ที่: ท + (ี + ่) -> U+F710 + 2 * 5 + 0
    expect(cp(placeThaiMarks("ที่"))).toEqual(["e17", "f71a"]);
  });
  it("moves marks clear of a tall consonant, with or without a lower vowel", () => {
    expect(cp(placeThaiMarks("ปั้น"))).toEqual(["e1b", "f751", "e19"]);
    expect(cp(placeThaiMarks("ปุ่น"))).toEqual(["e1b", "e38", "f736", "e19"]);
    expect(cp(placeThaiMarks("ฟ้า"))).toEqual(["e1f", "f737", "e32"]);
  });
  it("leaves text without those sequences alone", () => {
    for (const s of ["ผู้ช่วย", "น้ำ", "Clinic AI receptionist", "กฎ", ""]) expect(placeThaiMarks(s)).toBe(s);
  });
});
