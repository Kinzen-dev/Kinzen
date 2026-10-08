import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { thai } from "./thai";

// Ticket v3-09: project pages in the v3 card language.

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length}`);
}

/** Left and right inset of a box's content (child boxes), in CSS px. */
function insets(page: Page, box: string, inner: string) {
  return page.evaluate(
    ([b, i]) => {
      const el = document.querySelector(b)!;
      const r = el.getBoundingClientRect();
      const kids = [...el.querySelectorAll(i)].map((k) => k.getBoundingClientRect()).filter((k) => k.width > 0);
      return {
        left: Math.min(...kids.map((k) => k.left)) - r.left,
        right: r.right - Math.max(...kids.map((k) => k.right)),
      };
    },
    [box, inner],
  );
}

for (const { route, name, back, outcomes, plate } of [
  { route: "/work/clinic-receptionist", name: "Clinic AI receptionist", back: "All work", outcomes: 3, plate: true },
  { route: "/th/work/helm", name: "Helm", back: "ผลงานทั้งหมด", outcomes: 1, plate: true },
  { route: "/work/ronglen", name: "Ronglen", back: "All work", outcomes: 1, plate: false },
]) {
  test(`${route}: pastel hero, fact chips, numbered outcomes, pills, next card`, async ({ page }) => {
    await page.goto(route);
    const hero = page.locator(".pj-hero");
    await expect(hero.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(hero.locator(".pj-hero-art svg")).toBeAttached();
    const backLink = hero.getByRole("link", { name: thai(back) });
    await expect(backLink).toHaveAttribute("href", route.startsWith("/th") ? "/th/work" : "/work");

    await expect(page.locator(".pj-facts .pj-fact")).toHaveCount(4);
    await expect(page.locator("ol.pj-outcomes > li")).toHaveCount(outcomes);
    await expect(page.locator(".pj-outcomes .pj-num").first()).toHaveText("01");
    expect(await page.locator(".pj-pills .pj-pill").count()).toBeGreaterThan(1);
    await expect(page.locator(".pj-plate figure.plate")).toHaveCount(plate ? 1 : 0);
    await expect(page.locator("nav .pj-next")).toHaveCount(1);

    // Symmetric insets on every card (1px border tolerance).
    for (const [box, inner] of [
      [".pj-hero", ":scope > *"],
      [".pj-outcome", ":scope > *"],
      [".pj-next", ":scope > *"],
      ...(plate ? [[".pj-plate", ".plate-scroll"]] : []),
    ]) {
      const m = await insets(page, box, inner);
      expect(m.left, box).toBeGreaterThanOrEqual(16);
      expect(Math.abs(m.left - m.right), box).toBeLessThanOrEqual(1);
    }

    // The wide plate scrolls inside its card; the page never widens (real viewport width).
    const width = page.viewportSize()!.width;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test("the next-project card is one link to the next page", async ({ page }) => {
  await page.goto("/work/clinic-receptionist");
  const next = page.locator(".pj-next");
  await expect(next).toHaveAttribute("href", "/work/anymind-ec-platform");
  await next.click();
  await expect(page).toHaveURL(/\/work\/anymind-ec-platform$/);
  await expect(page.getByRole("heading", { level: 1, name: "AnyMind EC Platform" })).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`project page is accessible in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/th/work/clinic-receptionist");
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("reduced motion: the next card does not lift on hover", async ({ page, isMobile }) => {
  test.skip(isMobile, "hover");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/work/helm");
  const next = page.locator(".pj-next");
  await next.scrollIntoViewIfNeeded();
  await next.hover();
  await page.waitForTimeout(300);
  expect(await next.evaluate((el) => getComputedStyle(el).translate)).toBe("none");
});

test("phones: Thai ledes and fact chips stay inside their padding; status and area share a row", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phone widths");
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ["/th/work/cadence", "/th/work/helm", "/th/work/visual-qa-harness"]) {
      await page.goto(route);
      const m = await page.evaluate(() => {
        const inside = (box: Element, text: Element) => {
          const b = box.getBoundingClientRect();
          const cs = getComputedStyle(box);
          const r = document.createRange();
          r.selectNodeContents(text);
          const rects = [...r.getClientRects()].filter((x) => x.width > 0);
          return (
            Math.min(...rects.map((x) => x.left)) - b.left >= parseFloat(cs.paddingLeft) - 0.5 &&
            b.right - Math.max(...rects.map((x) => x.right)) >= parseFloat(cs.paddingRight) - 0.5
          );
        };
        const hero = document.querySelector(".pj-hero")!;
        const facts = [...document.querySelectorAll(".pj-fact")];
        const tops = facts.map((f) => Math.round(f.querySelector("dd")!.getBoundingClientRect().top));
        return {
          lede: inside(hero, hero.querySelector(".pj-tagline")!),
          chips: facts.map((f) => inside(f, f.querySelector("dd")!)),
          // Phones: period and role take a full row each; status and area share the last row.
          rows: [tops[0] < tops[1] && tops[1] < tops[2], tops[2] === tops[3]],
        };
      });
      expect(m.lede, `${route} @${width} lede`).toBe(true);
      expect(m.chips, `${route} @${width} chips`).toEqual([true, true, true, true]);
      expect(m.rows, `${route} @${width} rows`).toEqual([true, true]);
    }
  }
});

test("phones: the plate first fits the card whole, View full size pans it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone presentation");
  await page.goto("/work/clinic-receptionist");
  const scroller = page.locator(".pj-plate .plate-scroll");
  await scroller.scrollIntoViewIfNeeded();
  const fit = await scroller.evaluate((s) => ({ scrolls: s.scrollWidth > s.clientWidth + 1, h: s.clientHeight }));
  expect(fit.scrolls).toBe(false);
  const zoom = page.getByRole("button", { name: "View full size" });
  await zoom.click();
  await expect(page.getByRole("button", { name: "Fit to screen" })).toBeVisible();
  await expect.poll(() => scroller.evaluate((s) => s.scrollWidth > s.clientWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "Fit to screen" }).click();
  await expect.poll(() => scroller.evaluate((s) => s.scrollWidth > s.clientWidth + 1)).toBe(false);
});
