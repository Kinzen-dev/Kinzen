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
});
