import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { thai } from "./thai";

// Ticket v3-06: the home card collage (phone carousel) and the /work index page.

async function seriousViolations(page: Page) {
  await page
    .waitForFunction(
      () => document.getAnimations().every((a) => !(a instanceof CSSTransition) || a.playState !== "running"),
      undefined,
      { timeout: 3000 },
    )
    .catch(() => {});
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length}`);
}

const cards = (page: Page) => page.locator("#work .mw-card");

test.describe("more work on home", () => {
  test("four project cards link to their pages, All systems leads to /work, no ledger", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page)).toHaveCount(4);
    const hrefs = await page.locator("#work .mw-link").evaluateAll((a) => a.map((el) => el.getAttribute("href")));
    expect(hrefs).toEqual(["/work/anymind-ec-platform", "/work/visual-qa-harness", "/work/cadence", "/work/ronglen"]);
    await expect(page.locator("table.ledger-table")).toHaveCount(0);

    await page.getByRole("link", { name: "All systems" }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByRole("heading", { level: 1, name: "All systems" })).toBeVisible();
  });

  test("the whole card is the link to its project", async ({ page }) => {
    await page.goto("/");
    const card = cards(page).filter({ hasText: "Cadence" });
    await card.scrollIntoViewIfNeeded();
    const box = (await card.boundingBox())!;
    // Click the art, far from the name.
    await page.mouse.click(box.x + box.width / 2, box.y + 40);
    await expect(page).toHaveURL(/\/work\/cadence$/);
  });

  test("desktop: cards settle into an even bento once scrolled in", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop layout");
    await page.goto("/");
    const grid = page.locator("#work .mw-grid");
    await grid.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const g = document.querySelector("#work .mw-grid")!.getBoundingClientRect();
      window.scrollBy(0, g.bottom - innerHeight + 40);
    });
    // Scrubbed: give the scrub a moment to catch up, then every card is at rest in its slot.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            [...document.querySelectorAll("#work .mw-card")].map((c) => {
              const t = getComputedStyle(c).transform;
              return t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)";
            }),
          ),
        { timeout: 5000 },
      )
      .toEqual([true, true, true, true]);
    const boxes = await cards(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    // Two rows of two; widths alternate wide/narrow then narrow/wide.
    expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(2);
    expect(Math.abs(boxes[2].top - boxes[3].top)).toBeLessThan(2);
    expect(boxes[0].width).toBeGreaterThan(boxes[1].width);
    expect(boxes[3].width).toBeGreaterThan(boxes[2].width);
    // Rows line up on both sides.
    expect(Math.abs(boxes[0].left - boxes[2].left)).toBeLessThan(1);
    expect(Math.abs(boxes[1].right - boxes[3].right)).toBeLessThan(1);
  });

  test("phone: a swipeable carousel with a peeking card, dots and arrow keys", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout");
    await page.goto("/");
    const grid = page.locator("#work .mw-grid");
    await grid.scrollIntoViewIfNeeded();
    const m = await grid.evaluate((ul) => ({
      scrolls: ul.scrollWidth > ul.clientWidth,
      first: ul.children[0].getBoundingClientRect().toJSON(),
      second: ul.children[1].getBoundingClientRect().toJSON(),
    }));
    expect(m.scrolls).toBe(true);
    expect(m.first.width).toBeLessThan(390);
    expect(m.second.left).toBeLessThan(390); // the next card peeks in

    const dots = page.getByRole("group", { name: "Choose a system" }).getByRole("button");
    await expect(dots).toHaveCount(4);
    await expect(dots.first()).toHaveAttribute("aria-current", "true");
    await dots.nth(2).click();
    await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");
    await expect.poll(() => grid.evaluate((ul) => ul.scrollLeft)).toBeGreaterThan(200);

    // Swipe back to the start: the first dot follows the scroll.
    await grid.evaluate((ul) => ul.scrollTo({ left: 0 }));
    await expect(dots.first()).toHaveAttribute("aria-current", "true");

    const links = page.locator("#work .mw-link");
    await links.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(links.nth(1)).toBeFocused();
  });

  test("reduced motion: the cards never move", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop scatter");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator("#work .mw-grid").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const transforms = await cards(page).evaluateAll((els) => els.map((e) => getComputedStyle(e).transform));
    expect(transforms).toEqual(["none", "none", "none", "none"]);
  });
});

test.describe("/work index", () => {
  for (const { route, lang, h1, index } of [
    { route: "/work", lang: "en", h1: "All systems", index: "Index" },
    { route: "/th/work", lang: "th", h1: "ระบบทั้งหมด", index: "ตารางรวม" },
  ]) {
    test(`${route} is prerendered with cards, the ledger and alternates`, async ({ page, request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<html lang="${lang}"`);
      expect(html).toContain(`rel="canonical" href="https://www.kinzen.dev${route}"`);
      expect(html).toContain('hrefLang="th" href="https://www.kinzen.dev/th/work"');

      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: thai(h1) })).toBeVisible();
      await expect(page.locator("#systems .mw-card")).toHaveCount(6);
      await expect(page.getByRole("heading", { level: 2, name: thai(index) })).toBeAttached();
      await expect(page.locator("#index tbody tr.ledger-row")).toHaveCount(6);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const colorScheme of ["light", "dark"] as const) {
    test(`/work is accessible in the ${colorScheme} theme, with a row open`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/work");
      // Let every staggered card finish its entrance before measuring contrast.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 80));
        }
      });
      await page.getByRole("button", { name: "Helm", exact: true }).click();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("sitemap lists /work in both languages", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("<loc>https://www.kinzen.dev/work</loc>");
    expect(xml).toContain("<loc>https://www.kinzen.dev/th/work</loc>");
  });

  test("project pages link back to /work", async ({ page }) => {
    await page.goto("/th/work/ronglen");
    await expect(page.getByRole("link", { name: thai("ผลงานทั้งหมด") })).toHaveAttribute("href", "/th/work");
  });
});
