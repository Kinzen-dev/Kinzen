import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// v4 item 3: the home hero is one looping sequence on one stage: the ink desk draws itself, then
// gold dust, gold metal, gold ink in water and keycaps, and back to the desk, forever. These run
// the real GPU path where the machine has one (the launch flags below give headless Chromium the
// GPU on a Mac); on a software renderer (CI) the stage rightly plays the desk alone, and the
// GPU-only checks skip. `?fx-speed` runs the scene clock faster (debug only).

test.use({ launchOptions: { args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } });

type Stage = {
  scene: string;
  next: string | null;
  t: number;
  order: string[];
  history: string[];
  skipped: string[];
  gpu: boolean;
  running: boolean;
  renderer: string;
};
const stage = (page: Page) => page.evaluate(() => (window as Window & { __kzStage?: Stage }).__kzStage ?? null);
const ORDER = ["desk", "particles", "gold3d", "fluid", "keycaps"];

/** Count every WebGL context the page creates (the stage must make exactly one). */
async function countContexts(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __gl?: number };
    w.__gl = 0;
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const known = (this as HTMLCanvasElement & { __kzGl?: boolean }).__kzGl;
      const g = (orig as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      if (g && /^(webgl|webgl2|experimental-webgl)$/.test(type) && !known) {
        (this as HTMLCanvasElement & { __kzGl?: boolean }).__kzGl = true;
        w.__gl!++;
      }
      return g;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

/** Start the stage and skip when this browser has no hardware GPU (the desk then plays alone). */
async function gpuStage(page: Page, path = "/?fx-speed=8") {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  await page.goto(path);
  await expect.poll(async () => (await stage(page))?.running ?? false, { timeout: 10_000 }).toBe(true);
  // The GPU joins as the drawing finishes.
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __kzStage?: Stage }).__kzStage;
      return !!s && (s.gpu || s.renderer !== "");
    },
    null,
    { timeout: 20_000 },
  );
  const s = (await stage(page))!;
  test.skip(!s.gpu, `software renderer (${s.renderer || "no WebGL2"}): the desk plays alone`);
  return s;
}

test.describe("v4 hero sequence", () => {
  test("plays desk, dust, metal, ink in water, keycaps, then the desk again, in that order", async ({ page }) => {
    test.setTimeout(90_000);
    await gpuStage(page);
    await expect
      .poll(async () => (await stage(page))!.history.length, { timeout: 70_000, intervals: [500] })
      .toBeGreaterThanOrEqual(7);
    const s = (await stage(page))!;
    const expected = ORDER.filter((id) => !s.skipped.includes(id));
    // From the start: every scene once in order, then round again.
    expect(s.history.slice(0, expected.length + 2)).toEqual([...expected, ...expected.slice(0, 2)]);
  });

  test("one canvas and one WebGL context for every scene", async ({ page }) => {
    test.setTimeout(90_000);
    await countContexts(page);
    await gpuStage(page);
    await expect
      .poll(async () => (await stage(page))!.history.length, { timeout: 70_000, intervals: [500] })
      .toBeGreaterThanOrEqual(6);
    expect(await page.evaluate(() => (window as Window & { __gl?: number }).__gl)).toBe(1);
    await expect(page.locator("[data-hero] canvas")).toHaveCount(1);
  });

  test("the clock stops while the hero is off screen and resumes where it was", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect.poll(async () => (await stage(page))?.running ?? false, { timeout: 10_000 }).toBe(true);
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => (await stage(page))!.running).toBe(false);
    const away = (await stage(page))!.t;
    await page.waitForTimeout(1500);
    expect((await stage(page))!.t).toBe(away);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await stage(page))!.running).toBe(true);
    await expect.poll(async () => (await stage(page))!.t).toBeGreaterThan(away);
    // Resumed from where it stopped, not restarted.
    expect((await stage(page))!.t).toBeLessThan(away + 3);
  });

  test("the pause button stops the sequence and plays it again (keyboard)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const toggle = page.locator("[data-hero-controls] button");
    await expect(toggle).toHaveAttribute("aria-label", "Pause the animation", { timeout: 10_000 });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-label", "Play the animation");
    await expect.poll(async () => (await stage(page))!.running).toBe(false);
    const held = (await stage(page))!.t;
    await page.waitForTimeout(1000);
    expect((await stage(page))!.t).toBe(held);
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await stage(page))!.t).toBeGreaterThan(held);
  });

  test("reduced motion: the finished ink desk, still; no stage, no canvas, no controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const svg = page.locator("[data-ink-desk]");
    await expect(svg).toHaveCSS("opacity", "1");
    await expect(svg.locator(".ink-flood")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-hero] canvas")).toHaveCount(0);
    await expect(page.locator("[data-hero-controls]")).toHaveCount(0);
    expect(await stage(page)).toBeNull();
  });

  test("without scripting the band is the finished drawing", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("[data-ink-desk]")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-ink-desk] .ink-flood")).toHaveCSS("opacity", "1");
    await ctx.close();
  });

  test("the drawing carries no brand: a generic chat bubble, no LINE tag", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-ink-desk] text")).toHaveCount(0);
    expect(await page.locator("[data-ink-desk]").textContent()).toBe("");
  });

  test("LCP is real DOM text below the band, painted at once", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { __lcp?: { el: string; t: number }[] };
      w.__lcp = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { element?: Element | null })[]) {
          const el = e.element;
          const name = el?.closest("[data-ink-desk]")
            ? "desk"
            : el?.closest("[data-hero-kinetic]")
              ? "kinetic"
              : el?.matches("[data-hero] p")
                ? "hero-line"
                : (el?.tagName ?? "none");
          w.__lcp!.push({ el: name, t: e.startTime });
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const lcp = await page.evaluate(() => (window as Window & { __lcp?: { el: string; t: number }[] }).__lcp ?? []);
    expect(["kinetic", "hero-line"]).toContain(lcp.at(-1)?.el);
    expect(lcp.at(-1)!.t).toBeLessThan(1500);
  });

  test("the KINZEN text keeps the band's box but is never painted", async ({ page }) => {
    await page.goto("/");
    const text = page.locator("[data-hero-wordmark] .hero-wordmark-text");
    await expect(text).toHaveCSS("visibility", "hidden");
    const box = await page.locator("[data-hero-wordmark]").boundingBox();
    expect(box!.height).toBeGreaterThan(60);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`hero with the stage controls is axe clean (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
      await page.goto("/");
      await expect(page.locator("[data-hero-controls] button")).toBeVisible({ timeout: 10_000 });
      const results = await new AxeBuilder({ page })
        .include("[data-hero]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  for (const [width, height] of [
    [390, 844],
    [375, 667],
  ] as const) {
    test(`portrait phone ${width}x${height}: the band grows for the desk, the Email CTA stays in the first screen`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      for (const path of ["/", "/th"]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const g = await page.evaluate(() => {
          const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
          return {
            cta: r(".hero-cta-primary").bottom,
            desk: r("[data-ink-desk]"),
            controlsRow: r("[data-hero-wordmark]").top + 48,
            over: document.documentElement.scrollWidth - innerWidth,
          };
        });
        expect(g.cta, path).toBeLessThanOrEqual(height);
        // A readable picture: at least about two thirds of the phone's width.
        expect(g.desk.width, path).toBeGreaterThan(width * 0.6);
        // The drawing starts under the controls' row.
        expect(g.desk.top, path).toBeGreaterThanOrEqual(g.controlsRow - 1);
        expect(g.over, path).toBeLessThanOrEqual(0);
      }
    });
  }

  test("the active dot always shows the scene the viewer sees, through a full cycle", async ({ page }) => {
    test.setTimeout(120_000);
    await gpuStage(page, "/?fx-speed=6");
    // One sample per animation frame callback: what the stage shows and what the dots say, read
    // together in the same frame.
    await page.evaluate(() => {
      type Sample = { vis: string; dot: string; scene: string; next: string; svg: number; canvas: boolean };
      const w = window as Window & { __sync?: Sample[] };
      w.__sync = [];
      const hero = document.querySelector<HTMLElement>("[data-hero]")!;
      const svg = document.querySelector<SVGSVGElement>("[data-ink-desk]")!;
      const stageBox = document.querySelector<HTMLElement>(".fx-stage")!;
      let n = 0;
      const tick = () => {
        if (n++ % 6 === 0) {
          w.__sync!.push({
            vis: hero.dataset.stageVisible ?? "",
            dot: document.querySelector<HTMLElement>("[data-hero-controls] li[data-on]")?.dataset.scene ?? "",
            scene: hero.dataset.stageScene ?? "",
            next: hero.dataset.stageNext ?? "",
            svg: parseFloat(svg.style.opacity || "1"),
            canvas: stageBox.hasAttribute("data-show"),
          });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await expect
      .poll(async () => (await stage(page))!.history.length, { timeout: 90_000, intervals: [500] })
      .toBeGreaterThanOrEqual(7);
    type Sample = { vis: string; dot: string; scene: string; next: string; svg: number; canvas: boolean };
    const samples = await page.evaluate(() => (window as Window & { __sync?: Sample[] }).__sync ?? []);
    expect(samples.length).toBeGreaterThan(100);
    const bad = samples.filter((x) => x.dot !== x.vis);
    expect(bad.slice(0, 5), `${bad.length} of ${samples.length} frames out of sync`).toEqual([]);
    for (const x of samples) {
      // The visible scene is one of the two on stage, and the frame agrees with it.
      expect([x.scene, x.next]).toContain(x.vis);
      if (x.vis === "desk" && x.scene === "desk") expect(x.svg).toBeGreaterThanOrEqual(0.45);
      if (x.vis !== "desk") expect(x.canvas).toBe(true);
      if (x.vis !== "desk" && x.scene === "desk") expect(x.svg).toBeLessThanOrEqual(0.55);
    }
    // Every scene was seen, in order, and the dot switched inside each hand-over, not at its edges.
    const seen = samples.map((x) => x.vis).filter((v, i, a) => i === 0 || v !== a[i - 1]);
    expect(seen.slice(0, 6)).toEqual(["desk", "particles", "gold3d", "fluid", "keycaps", "desk"]);
    const switches = samples.filter((x, i) => i > 0 && x.vis !== samples[i - 1].vis);
    for (const x of switches) expect(x.next, `switch to ${x.vis}`).toBe(x.vis);
  });

  test("the dot stays with the visible scene across pause, tab hide and off-screen", async ({ page }) => {
    await gpuStage(page, "/?fx-speed=6");
    const same = () =>
      page.evaluate(() => {
        const vis = document.querySelector<HTMLElement>("[data-hero]")!.dataset.stageVisible;
        const dot = document.querySelector<HTMLElement>("[data-hero-controls] li[data-on]")?.dataset.scene;
        return { vis, dot };
      });
    const check = async () => {
      const s = await same();
      expect(s.dot).toBe(s.vis);
    };
    // Pause (in whatever hand-over or scene it lands), then play.
    const toggle = page.locator("[data-hero-controls] button");
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(700);
      await toggle.click();
      await check();
      await page.waitForTimeout(300);
      await check();
      await toggle.click();
      await check();
    }
    // Tab hidden and shown.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(async () => (await stage(page))!.running).toBe(false);
    await check();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(async () => (await stage(page))!.running).toBe(true);
    await check();
    // Off screen and back.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => (await stage(page))!.running).toBe(false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await stage(page))!.running).toBe(true);
    await check();
  });

  test("a scene skipped on a slow device reads as skipped in the dots", async ({ page }) => {
    // The session memory the slow-device rule writes: water skipped.
    await page.addInitScript(() => sessionStorage.setItem("kz-hero-skip", JSON.stringify(["fluid"])));
    await gpuStage(page, "/?fx-speed=6");
    await expect(page.locator('[data-hero-controls] li[data-scene="fluid"]')).toHaveAttribute("data-skipped", "");
    await expect(page.locator("[data-hero-controls] li[data-skipped]")).toHaveCount(1);
    await expect(page.locator("[data-hero-controls] li")).toHaveCount(5);
    await expect
      .poll(async () => (await stage(page))!.history.length, { timeout: 60_000, intervals: [500] })
      .toBeGreaterThanOrEqual(5);
    expect((await stage(page))!.history.slice(0, 5)).toEqual(["desk", "particles", "gold3d", "keycaps", "desk"]);
  });
});
