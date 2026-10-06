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
    const out = nobr(text) as unknown[];
    expect(Array.isArray(out)).toBe(true);
    const spans = out.filter(isValidElement) as ReactElement<{ className: string; children: string }>[];
    expect(spans.map((s) => s.props.children)).toEqual(expect.arrayContaining(["เรียลไทม์", "คลินิก", "ทันตกรรม"]));
    expect(spans.every((s) => s.props.className === "nobr")).toBe(true);
    expect(textOf(out)).toBe(text);
  });
});
