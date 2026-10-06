import { describe, expect, it } from "vitest";
import { fuzzyScore, rank } from "./fuzzy";

const items = [
  { label: "Work", keywords: "Work ผลงาน work" },
  { label: "Experience", keywords: "Experience ประสบการณ์ experience" },
  { label: "Open CV", keywords: "Open CV เปิด CV resume" },
  { label: "Print CV", keywords: "Print CV พิมพ์ CV pdf resume" },
  { label: "Copy email", keywords: "Copy email คัดลอกอีเมล mail contact" },
];

describe("fuzzy palette matcher", () => {
  it("matches subsequences and rejects out-of-order characters", () => {
    expect(fuzzyScore("exp", "Experience")).not.toBeNull();
    expect(fuzzyScore("pxe", "Experience")).toBeNull();
  });

  it("ignores whitespace in the query", () => {
    expect(rank(items, "printcv")[0].label).toBe("Print CV");
    expect(rank(items, "print cv")[0].label).toBe("Print CV");
  });

  it("returns everything in source order for an empty query", () => {
    expect(rank(items, "  ").map((i) => i.label)).toEqual(items.map((i) => i.label));
  });

  it("finds commands by keywords in the other language", () => {
    expect(rank(items, "พิมพ์")[0].label).toBe("Print CV");
    expect(rank(items, "mail")[0].label).toBe("Copy email");
  });

  it("does not scatter a short query across a long keyword sentence", () => {
    const party = { label: "Ronglen", keywords: "ronglen spoken party games on one device or in online voice rooms" };
    expect(rank([...items, party], "cv").map((i) => i.label)).not.toContain("Ronglen");
    expect(rank([...items, party], "voice")[0].label).toBe("Ronglen");
  });

  it("ranks a label hit above the same word in another item's keywords", () => {
    const lang = { label: "Read this page in Thai", keywords: "language English ไทย" };
    const party = { label: "Ronglen", keywords: "ronglen Thai-first spoken party games" };
    expect(rank([party, lang], "thai")[0].label).toBe("Read this page in Thai");
  });

  it("prefers a direct label hit", () => {
    expect(
      rank(items, "cv")
        .slice(0, 2)
        .map((i) => i.label),
    ).toEqual(["Open CV", "Print CV"]);
  });
});
