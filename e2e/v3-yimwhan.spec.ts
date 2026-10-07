import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const LABEL = { "/": "Illustration with sample data", "/th": "ภาพประกอบ ใช้ข้อมูลตัวอย่าง" } as const;

/** Scroll to a point inside the sticky track: 0 = first beat, 1 = last. */
async function scrollTrack(page: Page, at: number) {
  await page.evaluate((f) => {
    const t = document.querySelector<HTMLElement>("#yimwhan .yw-track")!;
    const top = t.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + (t.offsetHeight - innerHeight) * f);
  }, at);
}

test.describe("v3 Yimwhan scene", () => {
  for (const route of ["/", "/th"] as const) {
    test(`${route} renders the dark scene card with a labelled, decorative mockup`, async ({ page }) => {
      await page.goto(route);
      const scene = page.locator("#yimwhan");
      await expect(scene).toHaveAttribute("data-scene", "dark");
      await expect(scene.getByRole("heading", { level: 3 })).toHaveText("Yimwhan AI");
      await scene.locator(".yw-track").scrollIntoViewIfNeeded();
      await expect(scene.getByText(LABEL[route], { exact: true })).toBeVisible();
      await expect(scene.locator(".yw-mock")).toHaveAttribute("aria-hidden", "true");
      await expect(scene.locator(".yw-intro-art")).toHaveAttribute("aria-hidden", "true");
      // Five beats, all real text in the accessibility tree.
      await expect(scene.locator(".yw-beat h4")).toHaveCount(5);
    });
  }

  test("scrolling walks the five beats and the mockup follows", async ({ page }) => {
    await page.goto("/");
    const grid = page.locator("#yimwhan .yw-stage-grid");
    // The runtime loads after hydration; until then the stage shows its last beat.
    const points = [0.05, 0.3, 0.5, 0.7, 0.95];
    for (const [i, at] of points.entries()) {
      await expect
        .poll(async () => {
          await scrollTrack(page, at);
          return grid.getAttribute("data-step");
        })
        .toBe(String(i));
    }
    // Last beat: the active beat is the logged reply, the case row is in the queue.
    await expect(page.locator("#yimwhan .yw-beat[data-on] h4")).toHaveText("A safe reply goes out, and is logged");
    await expect(page.locator("#yimwhan .yw-rows")).toHaveAttribute("data-on", "");
    await scrollTrack(page, 0.02);
    await expect(grid).toHaveAttribute("data-step", "0");
    // Both compositions follow the beat: the full one cumulatively, the compact one card by card.
    await expect(page.locator("#yimwhan .yw-full .yw-msg-reply")).not.toHaveAttribute("data-on", "");
    await expect(page.locator("#yimwhan .yw-panel").first()).toHaveAttribute("data-on", "true");
    await expect(page.locator("#yimwhan .yw-panel[data-on]")).toHaveCount(1);
  });

  test("reduced motion shows all five beats as a static sequence", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const scene = page.locator("#yimwhan");
    const track = scene.locator(".yw-track");
    await track.scrollIntoViewIfNeeded();
    for (const title of await scene.locator(".yw-beat h4").all()) {
      await title.scrollIntoViewIfNeeded();
      await expect(title).toBeVisible();
      await expect(title).toHaveCSS("opacity", "1");
    }
    await expect(scene.locator(".yw-stage-grid")).toHaveAttribute("data-step", "4");
    // The track is normal flow, not a tall scroll runway.
    const h = await track.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(h).toBeLessThan(page.viewportSize()!.height * 3);
  });

  test("scrolling through the scene shifts no layout", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      (window as unknown as { __yw: number }).__yw = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
          sources: { node?: Node }[];
        }[]) {
          if (e.hadRecentInput) continue;
          const inScene = e.sources.some((s) => s.node instanceof Element && s.node.closest("#yimwhan"));
          if (inScene) (window as unknown as { __yw: number }).__yw += e.value;
        }
      }).observe({ type: "layout-shift", buffered: false });
    });
    for (let at = 0; at <= 1.0001; at += 0.125) {
      await scrollTrack(page, at);
      await page.waitForTimeout(250);
    }
    const cls = await page.evaluate(() => (window as unknown as { __yw: number }).__yw);
    expect(cls).toBeLessThan(0.001);
  });

  test("keyboard reaches the guard demo after the scene", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard path is a desktop concern");
    await page.goto("/");
    await page.locator("#yimwhan .yw-more").focus();
    let reached = false;
    for (let i = 0; i < 6 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => !!document.activeElement?.closest("#yimwhan .agent-demo"));
    }
    expect(reached).toBe(true);
    await expect(page.locator(":focus")).toHaveClass(/agent-demo-choice/);
  });

  // Review round 3: the copy column is never empty between beats, and the mockup keeps moving
  // inside a beat (scroll-linked), not only at the beat changes.
  test("beat copy crossfades without an empty frame", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(async () => {
        await scrollTrack(page, 0.18);
        return page.locator("#yimwhan .yw-stage-grid").getAttribute("data-step");
      })
      .toBe("0");
    await page.waitForTimeout(600);
    const dip = await page.evaluate(async () => {
      const t = document.querySelector<HTMLElement>("#yimwhan .yw-track")!;
      const top = t.getBoundingClientRect().top + scrollY;
      const beats = [...document.querySelectorAll<HTMLElement>("#yimwhan .yw-beat")];
      scrollTo(0, top + (t.offsetHeight - innerHeight) * 0.22);
      let min = 1;
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const tick = () => {
          min = Math.min(min, Math.max(+getComputedStyle(beats[0]).opacity, +getComputedStyle(beats[1]).opacity));
          if (performance.now() - t0 < 700) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
      return min;
    });
    expect(dip).toBeGreaterThan(0.2);
  });

  test("the mockup moves with the scroll inside a beat", async ({ page }) => {
    await page.goto("/");
    const typed = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll<HTMLElement>("#yimwhan .yw-mock .yw-w")].filter(
            (w) => w.getClientRects().length && +getComputedStyle(w).opacity > 0.5,
          ).length,
      );
    await expect
      .poll(async () => {
        await scrollTrack(page, 2.05 / 5);
        return page.locator("#yimwhan .yw-stage-grid").getAttribute("data-step");
      })
      .toBe("2");
    await page.waitForTimeout(300);
    const early = await typed();
    await scrollTrack(page, 2.6 / 5);
    await page.waitForTimeout(300);
    const later = await typed();
    expect(later).toBeGreaterThan(early);
  });

  test("leaving the guard demo mid-run finishes it: blocked draft and safe reply", async ({ page }) => {
    await page.goto("/");
    const demo = page.locator("#yimwhan .agent-demo");
    await demo.locator(".agent-demo-window").scrollIntoViewIfNeeded();
    await demo.getByRole("group").getByRole("button").first().click();
    // Mid-run: the draft is not blocked yet.
    await expect(demo.locator(".agent-demo-live del")).toHaveCount(0);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(demo.locator(".agent-demo-live del")).toHaveCount(1);
    await expect(demo.locator(".agent-demo-live .agent-demo-reply .agent-demo-bubble")).toHaveCount(1);
  });

  // Review round 1: mockup text on phones stays readable (the compact composition, not a shrunk one).
  for (const [w, h] of [
    [390, 844],
    [360, 780],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ] as const) {
    test(`mockup text is at least 10.5px at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/th");
      await scrollTrack(page, 0.95);
      await expect(page.locator("#yimwhan .yw-stage-grid")).toHaveAttribute("data-step", "4");
      const smallest = await page.evaluate(() => {
        let min = Infinity;
        const walker = document.createTreeWalker(document.querySelector("#yimwhan .yw-mock")!, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement!;
          if (!n.textContent!.trim() || !el.getClientRects().length) continue;
          if (getComputedStyle(el).visibility === "hidden") continue;
          min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
        }
        return min;
      });
      expect(smallest).toBeGreaterThanOrEqual(10.5);
    });
  }

  for (const theme of ["light", "dark"] as const) {
    test(`the scene is axe clean in the ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/th");
      await page.locator("#yimwhan .yw-finale").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include("#yimwhan")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
