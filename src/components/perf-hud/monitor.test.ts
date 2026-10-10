import { describe, expect, it } from "vitest";
import { deviceClass, percentile, readGovernor } from "./monitor";

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

describe("readGovernor", () => {
  it("is nothing until the governor publishes a mode", () => {
    expect(readGovernor(undefined)).toBeNull();
    expect(readGovernor({ loops: {} })).toBeNull();
  });

  it("names the busiest running loops and counts the rest", () => {
    const g = readGovernor({
      cls: "phone",
      mode: "light",
      cap: 60,
      loops: {
        hero: { state: "settled", fps: 0, scale: 1 },
        "play/night-desk": { state: "running", fps: 60, scale: 0.75 },
        "numbers/gold-numerals": { state: "running", fps: 30, scale: 1 },
        "tools/orbit": { state: "paused", fps: 0, scale: 1 },
      },
    });
    expect(g).toEqual({
      cls: "phone",
      mode: "light cap 60",
      loops: "2 run 1 settled 1 paused: night-desk 60 x0.75, gold-numerals 30",
    });
  });

  it("falls back to window.__kzGovernor for mode, cap and class", () => {
    expect(readGovernor(undefined, { mode: "full", deviceClass: "tablet", fpsCap: 60, active: 0 })).toEqual({
      cls: "tablet",
      mode: "full cap 60",
      loops: "none",
    });
    expect(readGovernor({ loops: { hero: { state: "running", fps: 60 } } }, { mode: "light" })?.loops).toBe(
      "1 run 0 settled 0 paused: hero 60",
    );
  });

  it("says none when no loop is registered", () => {
    expect(readGovernor({ mode: "full", loops: {} })?.loops).toBe("none");
  });
});
