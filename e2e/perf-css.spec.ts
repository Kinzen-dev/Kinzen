import { expect, test, type Page } from "@playwright/test";

/**
 * p-01 (perf-css): the motion governor. Infinite CSS loops never run off screen, rest on a hidden
 * tab and after 45 s without input, and wake on the next input; reduced motion keeps them off.
 */

type Loop = { name: string; target: string; top: number; bottom: number };

/** Running infinite CSS loops on the document timeline (scroll-driven animations are not loops). */
function runningLoops(page: Page): Promise<Loop[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (a): a is CSSAnimation =>
          a instanceof CSSAnimation &&
          a.timeline === document.timeline &&
          a.playState === "running" &&
          a.effect?.getTiming().iterations === Infinity,
      )
      .map((a) => {
        const t = (a.effect as KeyframeEffect).target as Element;
        const r = t.getBoundingClientRect();
        return { name: a.animationName, target: `${t.tagName.toLowerCase()}.${t.classList[0] ?? ""}`, top: r.top, bottom: r.bottom };
      }),
  );
}

async function scrollTo(page: Page, id: string) {
  await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: "start" }), id);
  // Intersection observers report on the next frames; give the governor a moment.
  await page.waitForTimeout(700);
}

test.describe("motion governor (perf-css)", () => {
  test("no CSS loop runs off screen", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    for (const id of ["top", "numbers", "work", "experience", "practice", "skills", "play", "about", "contact"]) {
      await scrollTo(page, id);
      const vh = await page.evaluate(() => innerHeight);
      // 48 px is the governor's margin; allow a little more for the observer's rounding. A loop a
      // demo switches on just now runs for the frame or two before its host's first in-view
      // report, so this checks the settled state.
      await expect
        .poll(async () => (await runningLoops(page)).filter((l) => l.bottom < -80 || l.top > vh + 80), { message: `#${id}` })
        .toEqual([]);
    }
  });

  test("on screen at #contact the loops run, and section roots carry data-inview", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollTo(page, "contact");
    const names = (await runningLoops(page)).map((l) => l.name);
    expect(names).toEqual(expect.arrayContaining(["beam", "sweep-window", "sweep-copy", "contact-live"]));
    await expect(page.locator("#contact")).toHaveAttribute("data-inview", "true");
    await expect(page.locator("#practice")).toHaveAttribute("data-inview", "false");
  });

  test("loops rest after 45 s without input and wake on the next input", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollTo(page, "contact");
    const html = page.locator("html");
    await expect(html).not.toHaveAttribute("data-idle");
    expect((await runningLoops(page)).length).toBeGreaterThan(0);

    await page.clock.fastForward(30_000);
    await expect(html).not.toHaveAttribute("data-idle");

    await page.clock.fastForward(16_000);
    await expect(html).toHaveAttribute("data-idle", "");
    // Each loop finishes the pass it is in (a few seconds at most), then stops: no time-driven CSS
    // animation runs (a scroll-driven one only moves when the page scrolls).
    const anyRunning = () =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) => a instanceof CSSAnimation && a.timeline === document.timeline && a.playState === "running")
            .map((a) => `${(a as CSSAnimation).animationName} ${a.effect?.getTiming().iterations}`),
      );
    await expect.poll(anyRunning, { timeout: 16_000 }).toEqual([]);

    await page.keyboard.press("Shift");
    await expect(html).not.toHaveAttribute("data-idle");
    await expect.poll(async () => (await runningLoops(page)).length).toBeGreaterThan(0);

    // The countdown restarts from that input.
    await page.clock.fastForward(40_000);
    await expect(html).not.toHaveAttribute("data-idle");
    await page.clock.fastForward(6_000);
    await expect(html).toHaveAttribute("data-idle", "");
  });

  test("a hidden tab pauses the loops", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollTo(page, "contact");
    expect((await runningLoops(page)).length).toBeGreaterThan(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator("html")).toHaveAttribute("data-page-hidden", "");
    await expect.poll(async () => (await runningLoops(page)).length).toBe(0);
  });

  test("the sweep and beam copies stay out of the text and the accessibility tree", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#helm-title")).toHaveText("Helm");
    await expect(page.locator(".sweep-hl").first()).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".beam-ring").first()).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#contact-title")).toHaveText(/work\?$/);
  });
});

test.describe("motion governor under reduced motion", () => {
  test("the sweep, beam and live dots stay still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    for (const id of ["top", "experience", "contact"]) {
      await scrollTo(page, id);
      const mine = (await runningLoops(page)).filter((l) =>
        ["sweep-window", "sweep-copy", "beam", "contact-live", "era-live", "hero-live"].includes(l.name),
      );
      expect(mine, `#${id}`).toEqual([]);
    }
    await expect(page.locator(".sweep-hl").first()).toBeHidden();
  });
});
