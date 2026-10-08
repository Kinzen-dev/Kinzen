import { describe, expect, it } from "vitest";
import { site } from "./site";
import { experience, getProject, links, projects, t, yearsInProduction } from "./index";
import { FORBIDDEN } from "./forbidden";
import { stripJoiners } from "@/lib/thai";

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

  it("orders experience Vesperwerk, contract, AnyMind, ZyGen (King, 2026-10-08)", () => {
    expect(experience.map((e) => e.id)).toEqual(["exp-founder", "exp-contract", "exp-anymind", "exp-zygen"]);
  });

  it("names the contract client only by the approved descriptor", () => {
    const contract = experience.find((e) => e.id === "exp-contract")!;
    expect(contract.org.confidential).toBe(true);
    expect(contract.summary.en).toContain("transactional platform with wallet and ledger (confidential client, NDA)");
    expect(contract.highlights.some((h) => /co-led/i.test(h.text.en))).toBe(true);
  });

  it("labels the clinic product a pilot, never live", () => {
    expect(getProject("clinic-receptionist")?.status).toBe("pilot");
    expect(allText).not.toMatch(/in production with clinics|serving patients|paying clinics/i);
  });

  it("drops hidden entries from everything the pages read", () => {
    expect(links.some((l) => l.kind === "github")).toBe(false);
    expect(projects.every((p) => p.visibility === "public")).toBe(true);
  });

  it("falls back to English when a translation is missing", () => {
    expect(t({ en: "Hello" }, "th")).toBe("Hello");
    expect(stripJoiners(t({ en: "Hello", th: "สวัสดี" }, "th"))).toBe("สวัสดี");
  });

  it("finds projects by slug", () => {
    expect(getProject("clinic-receptionist")?.name).toBe("Clinic AI receptionist");
    expect(getProject("nope")).toBeUndefined();
  });

  it("computes years in production from the career start", () => {
    expect(yearsInProduction(new Date("2026-10-06"))).toBe(7);
    expect(yearsInProduction(new Date("2026-09-06"))).toBe(6);
  });
});
