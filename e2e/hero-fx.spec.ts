import { expect, test, type Page } from "@playwright/test";

// The hero field is an enhancement. These check the contract that holds on every device:
// the server-rendered wordmark is the LCP element, ?fx=off never loads the field, and when the
// field is off (software GL in CI, Save-Data, ?fx=off) the wordmark stays fully visible. The gold
// dust is emissive light: it runs on the dark ground only, never in the light theme and never
// under reduced motion.

type FxDebug = { engine?: { isRunning: boolean } | null };
const running = (page: Page) =>
  page.evaluate(() => (window as Window & { __kzFx?: FxDebug }).__kzFx?.engine?.isRunning ?? false);

/** Load home on the dark ground and wait for the field's tier; skips when the GPU is off. */
async function darkHome(page: Page) {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-fx-tier", /^(off|still|lite|full)$/, { timeout: 10_000 });
  test.skip((await hero.getAttribute("data-fx-tier")) === "off", "field is off on this renderer");
  return hero;
}

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
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const lcp = await page.evaluate(() => (window as Window & { __lcp?: string[] }).__lcp ?? []);
    expect(lcp.at(-1)).toBe("wordmark");
  });

  test("?fx=off keeps the wordmark and never mounts a canvas", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/?fx=off");
    await expect(page.locator("[data-hero]")).toHaveAttribute("data-fx-tier", "off");
    await page.waitForTimeout(1600);
    await expect(page.locator(".fx-stage canvas")).toHaveCount(0);
    await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
  });

  test("reduced motion has no field at all: the static wordmark only", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-hero]")).toHaveAttribute("data-fx-tier", "off");
    await page.waitForTimeout(1600);
    await expect(page.locator(".fx-stage canvas")).toHaveCount(0);
    await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
  });

  test("the light theme never loads the field: crisp ink wordmark, no canvas", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForTimeout(2500);
    await expect(page.locator(".fx-stage canvas")).toHaveCount(0);
    await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
  });

  test("the hero is never blank: off tier keeps the wordmark, any other tier draws the field", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const hero = page.locator("[data-hero]");
    await expect(hero).toHaveAttribute("data-fx-tier", /^(off|still|lite|full)$/, { timeout: 10_000 });
    const tier = await hero.getAttribute("data-fx-tier");
    if (tier === "off") {
      await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
    } else {
      await expect(page.locator(".fx-stage[data-ready][data-show]")).toHaveCount(1, { timeout: 10_000 });
    }
  });

  test("theme switch: light stops the field and restores the wordmark, dark brings it back settled", async ({
    page,
  }) => {
    const hero = await darkHome(page);
    await expect(hero).toHaveAttribute("data-fx", "on", { timeout: 10_000 });
    await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
    await expect(page.locator(".fx-stage[data-show]")).toHaveCount(0);
    await expect(hero).not.toHaveAttribute("data-fx", "on");
    await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
    await expect(page.locator(".fx-canvas")).toHaveCSS("opacity", "0");
    expect(await running(page)).toBe(false);
    await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
    // Back settled: shown at once (no second opening), the field running again.
    await expect(hero).toHaveAttribute("data-fx", "on");
    await expect(page.locator(".fx-stage[data-show]")).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __kzFx?: { phase: string } }).__kzFx?.phase))
      .toBe("calm");
    expect(await running(page)).toBe(true);
  });

  test("a resize never shows a stale frame: the last frame is frozen onto the new text, then the field refits", async ({
    page,
  }) => {
    const hero = await darkHome(page);
    await expect(hero).toHaveAttribute("data-fx", "on", { timeout: 10_000 });
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.height, height: size.width });
    const right = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>(".fx-canvas")!;
      const st = document.querySelector(".fx-stage")!;
      return {
        refit: st.hasAttribute("data-refit"),
        show: st.hasAttribute("data-show"),
        pinned: c.style.transform !== "",
      };
    });
    // Frozen, mapped onto the new text and fading out; the DOM wordmark fading in.
    expect(right).toEqual({ refit: true, show: false, pinned: true });
    await expect(page.locator(".fx-stage[data-refit]")).toHaveCount(0, { timeout: 5_000 });
    await expect(hero).toHaveAttribute("data-fx", "on");
    await expect(page.locator(".fx-stage[data-show]")).toHaveCount(1);
    expect(await page.evaluate(() => document.querySelector<HTMLElement>(".fx-canvas")!.style.transform)).toBe("");
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
