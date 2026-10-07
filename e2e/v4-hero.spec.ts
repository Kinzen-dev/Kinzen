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
});
