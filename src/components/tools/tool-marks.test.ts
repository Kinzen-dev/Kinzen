import { describe, expect, it } from "vitest";
import { site } from "@/content/site";
import { logos } from "./logos.generated";
import { TEXT_ONLY, toolMark } from "./tool-marks";

const names = [
  ...site.skills.flatMap((g) => g.items.map((item) => (typeof item === "string" ? item : item.en))),
  ...site.projects.flatMap((p) => p.stack),
];

describe("tool marks", () => {
  it("every tool on the site has a mark or is text-only on purpose", () => {
    const undecided = names.filter((n) => !toolMark(n) && !TEXT_ONLY.has(n));
    expect(undecided).toEqual([]);
  });

  it("never gives a text-only tool a mark", () => {
    for (const name of TEXT_ONLY) expect(toolMark(name), name).toBeUndefined();
  });

  it("only black marks are drawn in currentColor; every other mark keeps its brand colour", () => {
    for (const [slug, logo] of Object.entries(logos)) expect(logo.color, slug).toMatch(/^(currentColor|#[0-9A-F]{6})$/);
  });
});
