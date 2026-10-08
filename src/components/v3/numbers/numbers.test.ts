import { describe, expect, it } from "vitest";
import { numbers, STAT_KEYS } from "@/i18n/v3/numbers";
import { VIEW_IDS } from "./types";

describe("numbers section copy", () => {
  it("carries the four approved figures, the same in both languages", () => {
    for (const copy of [numbers.en, numbers.th]) {
      expect(STAT_KEYS.map((k) => copy.stats[k].figure)).toEqual(["7", "10+", "6,000+", "500"]);
      expect(copy.stats.replay.caught).toBe("37");
    }
  });

  it("names the clinic product only with the approved phrase", () => {
    expect(numbers.en.stats.replay.product).toBe("AI phone and LINE receptionist for dental clinics");
    expect(numbers.en.stats.users.note).toBe("confidential client");
  });

  it("has a tab name and a hint for every view, and no em or en dashes", () => {
    for (const copy of [numbers.en, numbers.th]) {
      for (const id of VIEW_IDS) {
        expect(copy.views[id]).toBeTruthy();
        expect(copy.hints[id]).toBeTruthy();
      }
      expect(JSON.stringify(copy)).not.toMatch(/[\u2013\u2014\u2060]/);
    }
  });
});
