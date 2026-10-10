import { describe, expect, it, vi } from "vitest";
import { WORDMARK } from "./baked/wordmark";
import { WORDMARK_EM } from "./baked/geometry";
import { decodeMask, indexMask } from "./targets/mask";
import { sampleWordmark, scatterSeed } from "./targets/sample-mask";
import { FrameCap } from "./engine/frame-cap";
import { Governor } from "./engine/governor";
import { isSoftwareRenderer, pickTier, TIER_CONFIG, type Env } from "./engine/capability";
import { cubicBezier, easeOut } from "./engine/ease";

describe("baked wordmark mask", () => {
  it("decodes to exactly the baked ink count and a plausible geometry", () => {
    const bits = decodeMask(WORDMARK);
    expect(bits.length).toBe(WORDMARK.w * WORDMARK.h);
    expect(bits.reduce((a, b) => a + b, 0)).toBe(WORDMARK.ink);
    // Six capitals: wide and short, cap height about 0.7em.
    expect(WORDMARK_EM.w / WORDMARK_EM.h).toBeGreaterThan(3.5);
    expect(WORDMARK_EM.h).toBeGreaterThan(0.6);
    expect(WORDMARK_EM.h).toBeLessThan(0.8);
  });

  it("indexes edges as a minority subset of ink", () => {
    const m = indexMask(WORDMARK);
    expect(m.ink.length).toBe(WORDMARK.ink);
    expect(m.edge.length).toBeGreaterThan(0);
    expect(m.edge.length).toBeLessThan(m.ink.length * 0.2);
  });
});

describe("target sampling", () => {
  const mask = indexMask(WORDMARK);
  const ink = { x: 20, y: 60, w: 1300, h: 300 };
  const k = 0.02;
  const t = sampleWordmark(mask, {
    N: 4096,
    cw: 1440,
    ch: 600,
    ink,
    k,
    gold: [214, 168, 90],
    dustShare: 0.1,
    edgeShare: 0.3,
  });

  it("puts glyph particles inside the ink box and tags roles", () => {
    let glyphs = 0;
    for (let i = 0; i < 4096; i++) {
      const o = i * 4;
      const role = t.pos[o + 3];
      expect(role === 0 || role === 1).toBe(true);
      if (role !== 1) continue;
      glyphs++;
      const px = t.pos[o] / k + 720;
      const py = -t.pos[o + 1] / k + 300;
      expect(px).toBeGreaterThanOrEqual(ink.x - 1e-6);
      expect(px).toBeLessThanOrEqual(ink.x + ink.w + 1e-6);
      expect(py).toBeGreaterThanOrEqual(ink.y - 1e-6);
      expect(py).toBeLessThanOrEqual(ink.y + ink.h + 1e-6);
    }
    expect(glyphs).toBe(t.glyphs);
    expect(glyphs / 4096).toBeGreaterThan(0.85);
    expect(t.glyphArea).toBeGreaterThan(0);
  });

  it("never emits white or black particles", () => {
    for (let i = 0; i < 4096; i++) {
      const [r, g, b] = [t.col[i * 4], t.col[i * 4 + 1], t.col[i * 4 + 2]];
      expect(Math.min(r, g, b)).toBeLessThan(240);
      expect(Math.max(r, g, b)).toBeGreaterThan(20);
    }
  });

  it("scatters the opening dust evenly over the box: no core, nearly at rest", () => {
    const box = { x0: -12, y0: -4, x1: 12, y1: 5 };
    const n = 20000;
    // Seeded: the assertions are statistical, a fixed draw makes them deterministic (it flaked).
    let seed = 42;
    const rand = vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    });
    const b = scatterSeed({ N: n, box });
    rand.mockRestore();
    // A 6 x 3 grid of cells: an even field puts about n / 18 in each, a burst would pile into one.
    const cells = new Array(18).fill(0);
    // One assertion per property, not per particle: 120k expect() calls took ~8 s and timed out.
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      maxV = 0;
    for (let i = 0; i < n; i++) {
      const x = b.pos[i * 4],
        y = b.pos[i * 4 + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      maxV = Math.max(maxV, Math.hypot(b.vel[i * 4], b.vel[i * 4 + 1]));
      const cx = Math.min(5, Math.floor(((x - box.x0) / (box.x1 - box.x0)) * 6));
      const cy = Math.min(2, Math.floor(((y - box.y0) / (box.y1 - box.y0)) * 3));
      cells[cy * 6 + cx]++;
    }
    expect(minX).toBeGreaterThanOrEqual(box.x0);
    expect(maxX).toBeLessThanOrEqual(box.x1);
    expect(minY).toBeGreaterThanOrEqual(box.y0);
    expect(maxY).toBeLessThanOrEqual(box.y1);
    expect(maxV).toBeLessThan(0.3);
    expect(Math.max(...cells) / (n / 18)).toBeLessThan(1.25);
    expect(Math.min(...cells) / (n / 18)).toBeGreaterThan(0.75);
  });
});

describe("frame cap", () => {
  it("a jittery 120 Hz stream: a 120 cap draws every frame, a 60 cap every other one", () => {
    // Real rAF gaps on a busy machine swing between about 6.6 and 10.4 ms around 8.33.
    const stamps: number[] = [];
    for (let i = 0, t = 0; i < 240; i++) stamps.push((t += 8.333 + (i % 2 ? 1.9 : -1.7)));
    const count = (fps: number) => {
      const cap = new FrameCap(fps);
      return stamps.filter((t) => cap.accept(t) >= 0).length;
    };
    expect(count(120)).toBeGreaterThanOrEqual(236);
    expect(count(60)).toBeGreaterThanOrEqual(118);
    expect(count(60)).toBeLessThanOrEqual(122);
  });

  it("caps a 240 Hz stream to about 120 fps and reports raw deltas", () => {
    const cap = new FrameCap(120);
    let rendered = 0;
    const raws: number[] = [];
    for (let i = 0; i <= 240; i++) {
      const raw = cap.accept(i * (1000 / 240));
      if (raw >= 0) {
        rendered++;
        if (raw > 0) raws.push(raw);
      }
    }
    expect(rendered).toBeGreaterThanOrEqual(119);
    expect(rendered).toBeLessThanOrEqual(122);
    expect(Math.max(...raws)).toBeLessThan(9);
  });
});

describe("governor", () => {
  const feed = (g: Governor, ms: number, frames: number, t0 = 0) => {
    let now = t0;
    let last: ReturnType<Governor["sample"]> = null;
    const out: NonNullable<ReturnType<Governor["sample"]>>[] = [];
    for (let i = 0; i < frames; i++) {
      now += ms;
      last = g.sample(ms, now);
      if (last) out.push(last);
    }
    return { out, now };
  };

  it("kills the field when the first frames are slow (software GL)", () => {
    const g = new Governor({ maxShift: 2 });
    const { out } = feed(g, 60, 40);
    expect(out.some((v) => "kill" in v)).toBe(true);
  });

  it("sees below 20 fps (raw deltas, not the clamped sim dt)", () => {
    const g = new Governor({ maxShift: 2 });
    feed(g, 8.33, 60);
    g.locked = false;
    const { out } = feed(g, 80, 60, 1000);
    expect(g.fps).toBeLessThan(20);
    expect(out.some((v) => "level" in v)).toBe(true);
  });

  it("degrades resolution first, then particle rows, then recovers", () => {
    const g = new Governor({ maxShift: 2 });
    let { now } = feed(g, 16.7, 60);
    g.locked = false;
    ({ now } = feed(g, 30, 600, now));
    expect(g.level.scale).toBe(0.5);
    expect(g.level.shift).toBeGreaterThan(0);
    feed(g, 16.7, 3000, now);
    expect(g.level).toEqual({ scale: 1, shift: 0 });
  });

  it("ignores one stall in the probe (someone else's long task)", () => {
    const g = new Governor({ maxShift: 2 });
    feed(g, 16.7, 5);
    expect(g.sample(400, 500)).toBeNull();
    const { out } = feed(g, 16.7, 40, 500);
    expect(out.some((v) => "kill" in v)).toBe(false);
    expect(g.probe).toBe("ok");
  });
});

describe("capability tiers", () => {
  const env: Env = { fx: null, saveData: false, reducedMotion: false, coarse: false, memory: 8, cores: 10 };

  it("detects software renderers", () => {
    expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))")).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(isSoftwareRenderer("ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro)")).toBe(false);
  });

  it("forces off without a GPU context, on fx=off and on Save-Data", () => {
    expect(pickTier(env, null).tier).toBe("off");
    expect(pickTier({ ...env, fx: "off" }, null).tier).toBe("off");
    expect(pickTier({ ...env, saveData: true }, null).tier).toBe("off");
  });

  it("never runs the field under reduced motion unless a tier is forced", () => {
    const gpu = {
      getExtension: (n: string) => (n === "EXT_color_buffer_float" ? {} : null),
      getParameter: () => "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro)",
      RENDERER: 0x1f01,
    } as unknown as WebGL2RenderingContext;
    const rm = { ...env, reducedMotion: true };
    expect(pickTier(rm, gpu).tier).toBe("off");
    expect(pickTier({ ...rm, fx: "still" }, gpu).tier).toBe("still");
    expect(pickTier({ ...env, coarse: true }, gpu).tier).toBe("lite");
  });

  it("lite renders at DPR up to 2, like full", () => {
    expect(TIER_CONFIG.lite.maxDpr).toBe(2);
  });
});

describe("pacing", () => {
  it("easeOut follows the CSS --ease-out curve: monotonic, pinned ends, front-loaded", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = easeOut(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
    // cubic-bezier(.16,1,.3,1) is past 80% at a quarter of the duration.
    expect(easeOut(0.25)).toBeGreaterThan(0.8);
    expect(cubicBezier(0, 0, 1, 1)(0.37)).toBeCloseTo(0.37, 5);
  });

  it("a frame cap lowered mid-run (idle drift) takes effect at once", () => {
    const cap = new FrameCap(120);
    let fast = 0;
    for (let t = 0; t < 1000; t += 1000 / 240) if (cap.accept(t) >= 0) fast++;
    cap.fps = 30;
    let slow = 0;
    for (let t = 1000; t < 2000; t += 1000 / 240) if (cap.accept(t) >= 0) slow++;
    expect(fast).toBeGreaterThan(110);
    expect(slow).toBeGreaterThanOrEqual(29);
    expect(slow).toBeLessThanOrEqual(31);
  });
});
