import { describe, expect, it } from "vitest";
import { judge, repair, repairedText, RULES } from "./rules";

const fired = (text: string) => judge(text).fired;

describe("lab reply guard", () => {
  it("passes plain, safe replies in both languages", () => {
    for (const text of [
      "Thanks for your message. A dentist can check it on Tuesday at 10. What is the best time to call you?",
      "Open Saturday 9:00 to 17:00",
      "ขอบคุณที่ทักมานะคะ ทันตแพทย์ตรวจให้ได้วันอังคาร 10 โมงค่ะ",
      "เปิดวันเสาร์ 9:00 ถึง 17:00",
    ]) {
      expect(judge(text).pass, text).toBe(true);
    }
  });

  it("names each rule it catches", () => {
    expect(fired("Sounds like a cavity. Take 400 mg ibuprofen every 6 hours.")).toEqual(["no_diagnose", "dosing-gate"]);
    expect(fired("Our whitening cures sensitivity 100%, guaranteed!")).toEqual(["efficacy_claim"]);
    expect(fired("We're the best clinic in Bangkok and you're a perfect candidate for implants.")).toEqual([
      "superlative_claim",
      "eligibility_promise",
    ]);
    expect(fired("น่าจะเป็นฟันผุค่ะ กินยาพาราเซตามอล 500 มก. ทุก 6 ชั่วโมง")).toEqual(["no_diagnose", "dosing-gate"]);
    expect(fired("รักษาหายขาด 100% รับประกันผล")).toEqual(["efficacy_claim"]);
    expect(fired("คลินิกที่ดีที่สุดในกรุงเทพฯ ทำได้แน่นอนค่ะ")).toEqual(["superlative_claim", "eligibility_promise"]);
  });

  it("joins one rule's neighbouring hits into one phrase", () => {
    const th = judge("น่าจะเป็นฟันผุค่ะ กินยาไอบูโพรเฟน 400 มก. ทุก 6 ชั่วโมงก็ดีขึ้นค่ะ").hits.filter((h) => h.rule === "dosing-gate");
    expect(th.map((h) => h.text)).toEqual(["กินยาไอบูโพรเฟน 400 มก. ทุก 6 ชั่วโมง"]);
    const en = judge("Take 400 mg ibuprofen every 6 hours.").hits.map((h) => h.text);
    expect(en).toEqual(["400 mg ibuprofen every 6 hours"]);
  });

  it("returns exact spans", () => {
    const text = "Take 2 painkillers now.";
    for (const h of judge(text).hits) expect(text.slice(h.start, h.end)).toBe(h.text);
  });

  it("every fix sentence passes its own guard", () => {
    for (const rule of RULES) {
      expect(judge(rule.fix.en).pass, rule.fix.en).toBe(true);
      expect(judge(rule.fix.th).pass, rule.fix.th).toBe(true);
    }
  });

  it("a repaired reply always passes", () => {
    for (const text of [
      "Sounds like a cavity. Take 400 mg ibuprofen every 6 hours. See you soon!",
      "น่าจะเป็นฟันผุค่ะ กินยาแก้ปวด 2 เม็ด แล้วมาหาเราได้เลยค่ะ",
      "We're the best clinic in Bangkok. Painless, guaranteed.",
    ]) {
      const fixed = repairedText(repair(text));
      expect(judge(fixed).pass, fixed).toBe(true);
    }
  });

  it("the toys' ready-made phrases land on the intended side", () => {
    expect(fired("รักษาอาการเสียวฟันหายขาด 100% รับประกันผล ไม่เจ็บเลยค่ะ")).toEqual(["efficacy_claim"]);
    expect(fired("คลินิกเราดีที่สุดในกรุงเทพฯ และคุณเหมาะกับการทำรากเทียมแน่นอนค่ะ")).toEqual([
      "superlative_claim",
      "eligibility_promise",
    ]);
    for (const bad of [
      "Cures sensitivity 100%",
      "Best clinic in Bangkok",
      "Painless, guaranteed",
      "#1 whitening in Thailand",
      "Take 2 painkillers tonight",
      "รักษาเสียวฟันหายขาด 100%",
      "คลินิกที่ดีที่สุดในกรุงเทพฯ",
      "ไม่เจ็บเลย รับประกัน",
      "ฟอกสีฟันอันดับ 1 ในไทย",
      "กินยาแก้ปวด 2 เม็ดก่อนนอน",
    ]) {
      expect(judge(bad).pass, bad).toBe(false);
    }
    for (const ok of [
      "Open Saturday 9:00 to 17:00",
      "A dentist will check it first",
      "Free parking behind the clinic",
      "We can book you Tuesday at 10",
      "ทันตแพทย์จะตรวจให้ก่อนค่ะ",
      "มีที่จอดรถหลังคลินิกค่ะ",
      "จองคิววันอังคาร 10 โมงได้ค่ะ",
    ]) {
      expect(judge(ok).pass, ok).toBe(true);
    }
  });
});
