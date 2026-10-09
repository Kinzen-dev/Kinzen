import { describe, expect, it } from "vitest";
import { deviceClass, percentile } from "./monitor";

describe("percentile", () => {
  it("is the nearest-rank value of an ascending list", () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(xs, 95)).toBe(95);
    expect(percentile(xs, 50)).toBe(50);
    expect(percentile(xs, 100)).toBe(100);
    expect(percentile([16.7], 95)).toBe(16.7);
  });

  it("has no value for no frames", () => {
    expect(percentile([], 95)).toBeNull();
  });
});

describe("deviceClass", () => {
  it("is a phone for a coarse pointer on a short side under 600 px", () => {
    expect(deviceClass(true, 390)).toBe("phone");
    expect(deviceClass(true, 430)).toBe("phone");
  });

  it("is a tablet for a coarse pointer on a larger screen, a desktop for a fine pointer", () => {
    expect(deviceClass(true, 820)).toBe("tablet");
    expect(deviceClass(false, 390)).toBe("desktop");
    expect(deviceClass(false, 900)).toBe("desktop");
  });
});
