import { expect, test } from "@playwright/test";

// The hero field is an enhancement. These check the contract that holds on every device:
// the server-rendered wordmark is the LCP element, ?fx=off never loads the field, and when the
// field is off (software GL in CI, Save-Data, ?fx=off) the wordmark stays fully visible.

test.describe("hero fx", () => {
  test("the LCP element is the server-rendered wordmark", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { __lcp?: string[] };
      w.__lcp = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { element?: Element | null })[]) {
          w.__lcp!.push(e.element?.hasAttribute("data-hero-wordmark") ? "wordmark" : (e.element?.tagName ?? "none"));
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const lcp = await page.evaluate(() => (window as Window & { __lcp?: string[] }).__lcp ?? []);
    expect(lcp.at(-1)).toBe("wordmark");
  });

  test("?fx=off keeps the wordmark and never mounts a canvas", async ({ page }) => {
    await page.goto("/?fx=off");
    await expect(page.locator("[data-hero]")).toHaveAttribute("data-fx-tier", "off");
    await page.waitForTimeout(1600);
    await expect(page.locator(".fx-stage canvas")).toHaveCount(0);
    await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
  });

  test("the hero is never blank: off tier keeps the wordmark, any other tier draws the field", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("[data-hero]");
    await expect(hero).toHaveAttribute("data-fx-tier", /^(off|still|lite|full)$/, { timeout: 10_000 });
    const tier = await hero.getAttribute("data-fx-tier");
    if (tier === "off") {
      await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
    } else {
      await expect(page.locator(".fx-stage[data-ready]")).toHaveCount(1, { timeout: 10_000 });
    }
  });

  test("a resize never shows a stale frame: the canvas hides at once, then the field refits", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("[data-hero]");
    await expect(hero).toHaveAttribute("data-fx-tier", /^(off|still|lite|full)$/, { timeout: 10_000 });
    test.skip((await hero.getAttribute("data-fx-tier")) === "off", "field is off on this renderer");
    await expect(hero).toHaveAttribute("data-fx", "on", { timeout: 10_000 });
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.height, height: size.width });
    const right = await page.evaluate(() => ({
      canvas: getComputedStyle(document.querySelector(".fx-canvas")!).opacity,
      wordmark: getComputedStyle(document.querySelector("[data-hero-wordmark]")!).opacity,
    }));
    expect(right).toEqual({ canvas: "0", wordmark: "1" });
    await expect(page.locator(".fx-stage[data-refit]")).toHaveCount(0, { timeout: 5_000 });
    await expect(hero).toHaveAttribute("data-fx", "on");
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

  test("is simply visible under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(mark)).toHaveCSS("opacity", "1");
  });

  test("is visible on pages without a hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/cv");
    await expect(page.locator(mark)).toHaveCSS("opacity", "1");
  });
});
