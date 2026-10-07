import { describe, expect, it } from "vitest";
import { locales } from "@/content/schema";
import { LOCALES } from "./site-url";

describe("LOCALES", () => {
  it("is the content schema's locale list (client code reads it without zod)", () => {
    expect([...LOCALES]).toEqual([...locales]);
  });
});
