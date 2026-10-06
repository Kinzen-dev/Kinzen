import { describe, expect, it } from "vitest";
import { site } from "./site";
import { experience, getProject, links, projects, t, yearsInProduction } from "./index";
import { FORBIDDEN } from "./forbidden";

const allText = JSON.stringify(site);

describe("site content", () => {
  it("parses against the schema", () => {
    expect(site.profile.name).toBe("Kittipong Khonthong");
  });

  it("never contains forbidden strings", () => {
    for (const rule of FORBIDDEN) {
      expect(allText, rule.reason).not.toMatch(rule.pattern);
    }
  });

  it("drops hidden entries from everything the pages read", () => {
    expect(experience.some((e) => e.id === "exp-contract")).toBe(false);
    expect(links.some((l) => l.kind === "github")).toBe(false);
    expect(projects.every((p) => p.visibility === "public")).toBe(true);
  });

  it("falls back to English when a translation is missing", () => {
    expect(t({ en: "Hello" }, "th")).toBe("Hello");
    expect(t({ en: "Hello", th: "สวัสดี" }, "th")).toBe("สวัสดี");
  });

  it("finds projects by slug", () => {
    expect(getProject("yimwhan-ai")?.name).toBe("Yimwhan AI");
    expect(getProject("nope")).toBeUndefined();
  });

  it("computes years in production from the career start", () => {
    expect(yearsInProduction(new Date("2026-10-06"))).toBe(7);
    expect(yearsInProduction(new Date("2026-09-06"))).toBe(6);
  });
});
