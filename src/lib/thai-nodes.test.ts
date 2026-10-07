import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { nobr } from "./thai-nodes";

const textOf = (node: unknown): string =>
  Array.isArray(node)
    ? node.map(textOf).join("")
    : isValidElement(node)
      ? textOf((node as ReactElement<{ children: unknown }>).props.children)
      : String(node ?? "");

describe("nobr", () => {
  it("passes non-Thai text and non-strings through untouched", () => {
    expect(nobr("Shopify and LINE")).toBe("Shopify and LINE");
    expect(nobr(undefined)).toBeUndefined();
  });

  it("wraps known compounds in nowrap spans without changing the text", () => {
    const text = "ระบบถอดเสียงแบบเรียลไทม์ให้คลินิกทันตกรรม";
    const wrapper = nobr(text) as ReactElement<{ children: unknown[] }>;
    // A single wrapper element, so flex/grid parents see one item.
    expect(isValidElement(wrapper)).toBe(true);
    const out = wrapper.props.children;
    const spans = out.filter(isValidElement) as ReactElement<{ className: string; children: string }>[];
    expect(spans.map((s) => s.props.children)).toEqual(expect.arrayContaining(["เรียลไทม์", "คลินิกทันตกรรม"]));
    expect(spans.every((s) => s.props.className === "nobr")).toBe(true);
    expect(textOf(out)).toBe(text);
  });

  it("keeps a number with its Thai unit and a Thai lead word with the Latin word after it", () => {
    const flat = (n: unknown): string => textOf(n);
    expect(flat(nobr("ทำระบบที่ใช้งานจริงมา 7 ปี"))).toContain("7\u00a0ปี");
    expect(flat(nobr("ทุก 6 ชั่วโมง"))).toContain("6\u00a0");
    expect(flat(nobr("เป็นนักพัฒนา full-stack ที่ ZyGen"))).toContain("ที่\u00a0ZyGen");
    // Ordinary spaces between Thai phrases still break.
    expect(flat(nobr("รับสาย ตอบแชท"))).toContain("รับสาย ตอบแชท");
  });

  it("keeps a polite ending with the word before it", () => {
    const out = nobr("ฟันคุดบวม เคี้ยวแล้วเจ็บมากค่ะ") as ReactElement<{ children: unknown[] }>;
    const spans = (out.props.children as unknown[]).filter(isValidElement) as ReactElement<{ children: string }>[];
    expect(spans.some((s) => s.props.children.endsWith("ค่ะ") && s.props.children.length > 3)).toBe(true);
    expect(textOf(out)).toBe("ฟันคุดบวม เคี้ยวแล้วเจ็บมากค่ะ");
  });
});
