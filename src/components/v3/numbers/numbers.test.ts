import { describe, expect, it } from "vitest";
import { numberFacts } from "./facts";

describe("numbers strip facts", () => {
  it("reads every number from content", () => {
    const facts = numberFacts(new Date("2026-10-06"));
    expect(Object.fromEntries(facts.map((f) => [f.key, f.value]))).toEqual({
      production: 7,
      techLead: 4,
      replayed: 500,
      caught: 37,
    });
  });
});
