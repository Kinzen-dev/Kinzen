import { expect, test, type Page } from "@playwright/test";

// The hero stage is an enhancement (v4: the ink desk, then the gold KINZEN in four materials).
// These check the contract that holds on every device: the band is the server-rendered ink desk
// (finished as served, so it is the still picture without scripting and under reduced motion);
// with motion the drawing waits for its controller and draws itself, and a CSS safety net reveals
// it finished by 2.8 s if the controller never comes. Nothing is decided before paint: no WebGL
// probe, no html[data-fx]. The KINZEN text keeps the band's layout box and is never painted.
// The full sequence (order, single context, pause) is covered by v4-hero.spec.ts.

type Stage = { running: boolean; t: number; slot: { x: number; y: number; w: number; h: number } };
const stage = (page: Page) => page.evaluate(() => (window as Window & { __kzStage?: Stage }).__kzStage ?? null);
const desk = (page: Page) => page.locator("[data-ink-desk]");

test.describe("hero stage", () => {
  test("nothing is decided before paint: no data-fx, no WebGL probe in the head", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { __early?: number };
      w.__early = 0;
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (/webgl/.test(type) && document.readyState === "loading") w.__early!++;
        return (orig as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    expect(await page.locator("html").getAttribute("data-fx")).toBeNull();
    expect(await page.evaluate(() => (window as Window & { __early?: number }).__early)).toBe(0);
  });

  test("with motion the drawing is claimed and drawn by its controller", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(desk(page)).toHaveAttribute("data-state", "drawing", { timeout: 10_000 });
    await expect(desk(page)).toHaveCSS("opacity", "1");
    await expect.poll(async () => (await stage(page))?.running ?? false).toBe(true);
  });

  test("a sequence chunk that never loads still shows the finished drawing (safety net)", async ({ page }) => {
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (body.includes("kz-hero-skip")) return route.abort();
      return route.fulfill({ response: res, body });
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    // Held back while the controller is expected, then revealed finished by the CSS net.
    await expect(desk(page)).toHaveCSS("opacity", "1", { timeout: 6_000 });
    await expect(desk(page).locator(".ink-flood")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-hero] canvas")).toHaveCount(0);
  });

  test("?fx=off keeps the finished drawing and never mounts a canvas", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/?fx=off");
    await expect(desk(page)).toHaveAttribute("data-state", "done");
    await page.waitForTimeout(1600);
    await expect(page.locator("[data-hero] canvas")).toHaveCount(0);
    await expect(desk(page)).toHaveCSS("opacity", "1");
  });

  test("reduced motion switched on mid-visit stops on the finished drawing", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect.poll(async () => (await stage(page))?.running ?? false, { timeout: 10_000 }).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(desk(page)).toHaveAttribute("data-state", "done");
    await expect(desk(page).locator(".ink-flood")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-hero] canvas")).toHaveCount(0);
  });

  test("the light theme runs the stage too: the hero is a dark scene in both themes (D6)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await page.goto("/");
    await expect.poll(async () => (await stage(page))?.running ?? false, { timeout: 10_000 }).toBe(true);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
      const t0 = (await stage(page))!.t;
      await expect.poll(async () => (await stage(page))!.t).toBeGreaterThan(t0);
    }
  });

  test("a resize refits the scenes onto the wordmark's new ink box", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect.poll(async () => (await stage(page))?.running ?? false, { timeout: 10_000 }).toBe(true);
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: Math.round(size.width * 0.8), height: size.height });
    const measured = () =>
      page.evaluate(() => {
        const wm = document.querySelector<HTMLElement>("[data-hero-wordmark]")!;
        const st = document.querySelector<HTMLElement>(".fx-stage")!;
        const cs = getComputedStyle(wm);
        return {
          x: wm.getBoundingClientRect().left - st.getBoundingClientRect().left + parseFloat(cs.paddingLeft),
          fs: parseFloat(cs.fontSize),
        };
      });
    await expect
      .poll(async () => {
        const s = await stage(page);
        const m = await measured();
        // The slot is the baked ink box: a few em wide, starting just inside the wordmark box.
        const em = s!.slot.w / m.fs;
        return em > 2.5 && em < 3.6 && s!.slot.x >= m.x - 1 && s!.slot.x < m.x + 0.3 * m.fs;
      })
      .toBe(true);
  });
});

test.describe("masthead", () => {
  const mark = "[data-masthead-mark]";

  test("switches state with the hero wordmark, never scrubbed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator(mark)).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(page.locator("html")).toHaveAttribute("data-hero-passed", "");
    await expect(page.locator(mark)).toHaveCSS("opacity", "1");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("html")).not.toHaveAttribute("data-hero-passed", "");
    await expect(page.locator(mark)).toHaveCSS("opacity", "0");
  });

  test("under reduced motion it still switches, instantly, and never doubles the name at the top", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(mark)).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(page.locator("html")).toHaveAttribute("data-hero-passed", "");
    // No transition: the computed value is final as soon as the state flips.
    expect(await page.locator(mark).evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("html")).not.toHaveAttribute("data-hero-passed", "");
    expect(await page.locator(mark).evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  });

  test("is visible on pages without a hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/cv");
    await expect(page.locator(mark)).toHaveCSS("opacity", "1");
  });
});
