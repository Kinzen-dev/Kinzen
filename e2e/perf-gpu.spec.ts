import { expect, test, type Page } from "@playwright/test";

// p-02 frame governor (src/motion/frame-governor.ts): one scheduler for every canvas, WebGL and
// rAF view. Heavy scenes are paced to 60 fps on phones, nothing off screen draws, a settled scene
// stops drawing, a slow drift rests at 30 fps, and after 45 s without input every loop drops to
// light mode (half rate) until the next input. Read through window.__kzFrames and a draw counter.

// Headless Chromium gets a real GPU through Metal on a Mac; CI runs on a software renderer, where
// the GPU-only test skips itself.
test.use({ launchOptions: { args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } });

type Entry = { state: "running" | "settled" | "paused"; fps: number; drawn: number; cap: number; scale: number };
type Frames = { cls: string; mode: "full" | "light"; cap: number; loops: Record<string, Entry> };

/** Counts frames in which a canvas in the page drew (WebGL draw/clear, 2D paint), per canvas class. */
async function countDraws(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __draws: Record<string, number>; __drawFrame: number };
    w.__draws = {};
    w.__drawFrame = 0;
    const seen = new WeakMap<HTMLCanvasElement, number>();
    const mark = (c: HTMLCanvasElement | OffscreenCanvas) => {
      if (!(c instanceof HTMLCanvasElement) || !c.isConnected) return;
      // One count per canvas per task burst: a frame's many calls count once.
      const f = w.__drawFrame;
      if (seen.get(c) === f) return;
      seen.set(c, f);
      const key = c.className || c.parentElement?.className || "canvas";
      w.__draws[key] = (w.__draws[key] ?? 0) + 1;
    };
    const bump = () => {
      w.__drawFrame++;
      setTimeout(bump, 4);
    };
    bump();
    const wrap = (proto: object | undefined, names: string[]) => {
      if (!proto) return;
      for (const n of names) {
        const p = proto as Record<string, unknown>;
        const f = p[n];
        if (typeof f !== "function") continue;
        p[n] = function (this: { canvas: HTMLCanvasElement }, ...a: unknown[]) {
          mark(this.canvas);
          return (f as (...x: unknown[]) => unknown).apply(this, a);
        };
      }
    };
    const gl = ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "clear"];
    wrap(window.WebGLRenderingContext?.prototype, gl);
    wrap(window.WebGL2RenderingContext?.prototype, gl);
    wrap(window.CanvasRenderingContext2D?.prototype, ["clearRect", "fillRect", "drawImage", "fill", "stroke"]);
  });
}

const frames = (page: Page) => page.evaluate(() => (window as unknown as { __kzFrames?: Frames }).__kzFrames ?? null);
const draws = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __draws: Record<string, number> };
    const out = { ...w.__draws };
    w.__draws = {};
    return out;
  });
const total = (d: Record<string, number>) => Object.values(d).reduce((a, b) => a + b, 0);

async function loop(page: Page, name: string): Promise<Entry | undefined> {
  return (await frames(page))?.loops[name];
}

async function showView(page: Page, section: string, attr: string, id: string) {
  await page.locator(section).scrollIntoViewIfNeeded();
  await page.locator(`${section} [role=tab][${attr}="${id}"]`).click();
}

test.describe("frame governor", () => {
  test("paces heavy scenes to 60 fps on a phone's 120 Hz screen (display rate on desktop)", async ({ page }, info) => {
    // A 120 Hz display, whatever the machine: rAF callbacks every 8.33 ms on vsync timestamps.
    await page.addInitScript(() => {
      const period = 1000 / 120;
      let id = 0;
      const timers = new Map<number, ReturnType<typeof setTimeout>>();
      window.requestAnimationFrame = (cb) => {
        const n = ++id;
        const now = performance.now();
        const at = (Math.floor(now / period + 1e-6) + 1) * period;
        timers.set(
          n,
          setTimeout(() => {
            timers.delete(n);
            cb(at);
          }, at - now),
        );
        return n;
      };
      window.cancelAnimationFrame = (n) => {
        clearTimeout(timers.get(n));
        timers.delete(n);
      };
    });
    await page.goto("/en");
    await expect.poll(async () => (await loop(page, "hero"))?.state, { timeout: 15_000 }).toBe("running");
    await page.waitForTimeout(2500);
    const f = (await frames(page))!;
    const hero = f.loops.hero;
    if (info.project.name === "mobile") {
      expect(f.cls).toBe("phone");
      expect(f.cap).toBe(60);
      expect(hero.cap).toBe(60);
      expect(hero.fps).toBeLessThanOrEqual(62);
      expect(hero.fps).toBeGreaterThan(30);
    } else {
      expect(f.cls).toBe("desktop");
      expect(hero.cap).toBeGreaterThan(60);
      expect(hero.fps).toBeGreaterThan(70);
    }
  });

  test("nothing off screen draws", async ({ page }) => {
    await countDraws(page);
    await page.goto("/en");
    await expect.poll(async () => (await loop(page, "hero"))?.state, { timeout: 15_000 }).toBe("running");
    // Let the play section mount its scene on the way down, then rest at the bottom of the page.
    await page.locator("#play").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(2000);
    await draws(page);
    await page.waitForTimeout(2000);
    expect(total(await draws(page))).toBe(0);
    const f = (await frames(page))!;
    for (const [name, e] of Object.entries(f.loops)) expect(e.state, name).not.toBe("running");
  });

  test("a settled scene stops drawing and draws again when it moves", async ({ page }) => {
    await countDraws(page);
    await page.goto("/en");
    await showView(page, "#skills", "data-view", "orbit");
    await expect.poll(async () => (await loop(page, "tools/orbit"))?.state, { timeout: 10_000 }).toBe("running");
    await page.locator(".lo-pause").click();
    // The rings ease to a stop, then the scene is settled: no frames, no draws.
    await expect.poll(async () => (await loop(page, "tools/orbit"))?.state, { timeout: 5_000 }).toBe("settled");
    await draws(page);
    await page.waitForTimeout(1500);
    const still = await draws(page);
    expect(still["lo-canvas lo-back"] ?? 0).toBe(0);
    expect(still["lo-canvas lo-front"] ?? 0).toBe(0);
    expect((await loop(page, "tools/orbit"))!.fps).toBe(0);
    await page.locator(".lo-pause").click();
    await expect.poll(async () => (await loop(page, "tools/orbit"))?.state).toBe("running");
    await page.waitForTimeout(800);
    expect((await draws(page))["lo-canvas lo-back"] ?? 0).toBeGreaterThan(5);
  });

  test("drops to light mode after 45 s without input and back to full on the next input", async ({ page }) => {
    await page.clock.install();
    await page.goto("/en");
    await expect.poll(async () => (await loop(page, "hero"))?.state, { timeout: 15_000 }).toBe("running");
    expect((await frames(page))!.mode).toBe("full");
    const full = (await loop(page, "hero"))!.cap;
    // The idle window starts at the last input.
    await page.mouse.move(20, 20);
    await page.clock.fastForward(44_000);
    expect((await frames(page))!.mode).toBe("full");
    await page.clock.fastForward(2_000);
    await expect.poll(async () => (await frames(page))!.mode).toBe("light");
    expect((await loop(page, "hero"))!.cap).toBe(Math.round(full / 2));
    await page.clock.runFor(2_000);
    const light = (await loop(page, "hero"))!.fps;
    expect(light).toBeLessThanOrEqual(Math.round(full / 2) + 2);
    expect(light).toBeGreaterThan(0);
    // Any input: full at once, the very next frame on the full pace.
    await page.mouse.move(200, 200);
    await page.mouse.move(210, 205);
    expect((await frames(page))!.mode).toBe("full");
    expect((await loop(page, "hero"))!.cap).toBe(full);
    const before = (await loop(page, "hero"))!.drawn;
    await page.clock.runFor(1000 / full + 1);
    expect((await loop(page, "hero"))!.drawn).toBeGreaterThan(before);
  });
});

// WebGL scenes need a GPU (see the launch options at the top): on a software renderer the play
// scenes rightly show their pictures, so there is nothing to pace.
test.describe("frame governor, GPU scenes", () => {
  test("a slow drift rests at 60 fps and reacts at full pace", async ({ page }, info) => {
    await page.goto("/en");
    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
      return gl ? String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "";
    });
    test.skip(!renderer || /swiftshader|llvmpipe|software/i.test(renderer), `software renderer (${renderer})`);
    await showView(page, "#play", "data-scene-id", "thock");
    await page.locator("#play .iv-stage").first().scrollIntoViewIfNeeded();
    await expect.poll(async () => (await loop(page, "play/thock"))?.state, { timeout: 20_000 }).toBe("running");
    // Untouched (once warm): only the camera's slow breath moves, drawn at the 60 fps rest rate (a phone's heavy pace is 60 anyway; desktop's is 120).
    await expect
      .poll(
        async () => {
          const fps = (await loop(page, "play/thock"))?.fps ?? 0;
          return fps >= 45 && fps <= 63;
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    // A press: the cap dips and the water carries the wave, at the full pace.
    const key = await page.evaluate(() => (window as unknown as { __thock: (c: string) => { x: number; y: number } }).__thock("KeyG"));
    await page.mouse.click(key.x, key.y);
    await page.waitForTimeout(500);
    expect((await loop(page, "play/thock"))!.fps).toBeGreaterThan(info.project.name === "desktop" ? 70 : 45);
  });
});
