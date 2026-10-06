import { expect, test, type Page } from "@playwright/test";

// The hero field is an enhancement. These check the contract that holds on every device:
// the decision is made before first paint (html[data-fx="pending"] only when the field will run:
// dark, motion allowed, hardware WebGL2, no ?fx=off, no Save-Data). Pending hides the DOM wordmark
// so the dust condenses out of nothing; the field sets "on" on its first frame, "off" (wordmark
// back) when it gives up; a CSS safety net reveals the wordmark by 1.8 s if nothing answers.
// LCP stays a real text element painted at once: the hero line when the wordmark is held, the
// wordmark itself otherwise. The gold dust is emissive light: dark ground only, never in the light
// theme and never under reduced motion.

type FxDebug = { engine?: { isRunning: boolean } | null };
const running = (page: Page) =>
  page.evaluate(() => (window as Window & { __kzFx?: FxDebug }).__kzFx?.engine?.isRunning ?? false);
const html = (page: Page) => page.locator("html");
const wordmark = (page: Page) => page.locator("[data-hero-wordmark]");

/** Load home on the dark ground and wait for the field's tier; skips when the GPU is off. */
async function darkHome(page: Page) {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-fx-tier", /^(off|still|lite|full)$/, { timeout: 10_000 });
  test.skip((await hero.getAttribute("data-fx-tier")) === "off", "field is off on this renderer");
  return hero;
}

/**
 * Make the pre-paint gate see a hardware GPU (CI renders WebGL with SwiftShader, which the gate
 * rightly refuses). Only the gate's probe is fooled; the field itself gets the real renderer.
 */
async function fakeHardwareGate(page: Page) {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    let once = true;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const g = (orig as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      if (once && type === "webgl2" && g) {
        once = false;
        const gl = g as WebGL2RenderingContext;
        const get = gl.getParameter.bind(gl);
        // 0x9246 = UNMASKED_RENDERER_WEBGL, 0x1f01 = RENDERER
        gl.getParameter = (p: number) => (p === 0x9246 || p === 0x1f01 ? "Test Hardware GPU" : get(p));
      }
      return g;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

/** Record LCP entries as "element:ms", the element named by its role on this page. */
async function recordLcp(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __lcp?: { el: string; t: number }[] };
    w.__lcp = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { element?: Element | null })[]) {
        const el = e.element;
        const name = el?.hasAttribute("data-hero-wordmark")
          ? "wordmark"
          : el?.matches("[data-hero] h1 ~ p, [data-hero] h1 + p")
            ? "hero-line"
            : (el?.tagName ?? "none");
        w.__lcp!.push({ el: name, t: e.startTime });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
}
const lcpOf = (page: Page) =>
  page.evaluate(() => (window as Window & { __lcp?: { el: string; t: number }[] }).__lcp ?? []);

test.describe("hero fx", () => {
  test("LCP is a real text element painted at once: the hero line while the field holds the name", async ({ page }) => {
    await fakeHardwareGate(page);
    await recordLcp(page);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    const gated = (await html(page).getAttribute("data-fx")) !== null;
    test.skip(!gated, "no WebGL2 at all in this browser: the gate never opens");
    await page.waitForTimeout(1200);
    const lcp = await lcpOf(page);
    expect(lcp[0]?.el).toBe("hero-line");
    expect(lcp[0]!.t).toBeLessThan(1500);
  });

  test("LCP is the wordmark itself when the field will not run (light theme)", async ({ page }) => {
    await recordLcp(page);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForTimeout(1200);
    const lcp = await lcpOf(page);
    expect(lcp.at(-1)?.el).toBe("wordmark");
    expect(lcp.at(-1)!.t).toBeLessThan(1500);
  });

  test("pending holds the wordmark back, and the CSS safety net reveals it by 1.8 s if no script answers", async ({
    page,
  }) => {
    await fakeHardwareGate(page);
    // Every chunk blocked: only the inline pre-paint script runs.
    await page.route("**/_next/static/chunks/*.js", (r) => r.abort());
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    test.skip((await html(page).getAttribute("data-fx")) !== "pending", "no WebGL2 at all in this browser");
    expect(await wordmark(page).evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await page.waitForTimeout(900);
    expect(await wordmark(page).evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await expect(wordmark(page)).toHaveCSS("opacity", "1", { timeout: 2_500 });
  });

  test("a field chunk that fails to load hands the name back at once", async ({ page }) => {
    await fakeHardwareGate(page);
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (body.includes("uDimR")) return route.abort();
      return route.fulfill({ response: res, body });
    });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    test.skip((await html(page).getAttribute("data-fx")) !== "pending", "no WebGL2 at all in this browser");
    await expect(html(page)).toHaveAttribute("data-fx", "off", { timeout: 1_500 });
    await expect(wordmark(page)).toHaveCSS("opacity", "1");
  });

  test("a software renderer is refused before paint: no pending, the wordmark from the first frame", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    const renderer = await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl2");
      const x = g?.getExtension("WEBGL_debug_renderer_info");
      return g ? String(g.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : g.RENDERER)) : "none";
    });
    test.skip(!/swiftshader|llvmpipe|software/i.test(renderer), "hardware GPU: covered by the field tests");
    expect(await html(page).getAttribute("data-fx")).not.toBe("pending");
    await expect(wordmark(page)).toHaveCSS("opacity", "1");
  });

  test("the field takes the name on its first frame: data-fx on, wordmark hidden, canvas shown", async ({ page }) => {
    await darkHome(page);
    await expect(html(page)).toHaveAttribute("data-fx", "on", { timeout: 10_000 });
    await expect(wordmark(page)).toHaveCSS("opacity", "0");
    await expect(page.locator(".fx-stage[data-ready][data-show]")).toHaveCount(1);
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
      await expect(html(page)).not.toHaveAttribute("data-fx", /^(pending|on)$/);
      await expect(wordmark(page)).toHaveCSS("opacity", "1");
    } else {
      await expect(page.locator(".fx-stage[data-ready][data-show]")).toHaveCount(1, { timeout: 10_000 });
    }
  });

  test("theme switch: light stops the field and restores the wordmark, dark brings it back settled", async ({
    page,
  }) => {
    await darkHome(page);
    await expect(html(page)).toHaveAttribute("data-fx", "on", { timeout: 10_000 });
    await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
    await expect(page.locator(".fx-stage[data-show]")).toHaveCount(0);
    await expect(html(page)).toHaveAttribute("data-fx", "off");
    await expect(page.locator("[data-hero-wordmark]")).toHaveCSS("opacity", "1");
    await expect(page.locator(".fx-canvas")).toHaveCSS("opacity", "0");
    expect(await running(page)).toBe(false);
    await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
    // Back settled: shown at once (no second opening), the field running again.
    await expect(html(page)).toHaveAttribute("data-fx", "on");
    await expect(page.locator(".fx-stage[data-show]")).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __kzFx?: { phase: string } }).__kzFx?.phase))
      .toBe("calm");
    expect(await running(page)).toBe(true);
  });

  test("a resize never shows a stale frame: the last frame is frozen onto the new text, then the field refits", async ({
    page,
  }) => {
    await darkHome(page);
    await expect(html(page)).toHaveAttribute("data-fx", "on", { timeout: 10_000 });
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
    await expect(html(page)).toHaveAttribute("data-fx", "on");
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
