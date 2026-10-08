import { expect, test } from "@playwright/test";
import { stripJoiners } from "./thai";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = ["/", "/th"];

test.describe("shell", () => {
  for (const route of ROUTES) {
    test(`${route} is server-rendered with the right language`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(route === "/th" ? '<html lang="th"' : '<html lang="en"');
      expect(html).toContain("KINZEN");
    });

    test(`${route} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }

  test("hreflang alternates are correct on the Thai home", async ({ request }) => {
    const html = await (await request.get("/th")).text();
    expect(html).toContain('<link rel="canonical" href="https://www.kinzen.dev/th"');
    expect(html).toContain('hrefLang="th" href="https://www.kinzen.dev/th"');
    expect(html).toContain('hrefLang="en" href="https://www.kinzen.dev"');
    expect(html).not.toContain("/th/th");
  });

  // Mobile emulation grows the LAYOUT viewport to fit wide content, so comparing
  // scrollWidth with innerWidth is blind there: compare with the real viewport width.
  for (const path of ["/", "/th", "/cv", "/th/cv", "/work/clinic-receptionist", "/th/work/helm", "/missing-page"]) {
    test(`${path} never widens the layout or scrolls sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(800);
      const width = page.viewportSize()!.width;
      const m = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
      expect(m.inner).toBe(width);
      expect(m.scroll).toBeLessThanOrEqual(width);
    });
  }

  test("English is canonical without a prefix", async ({ request }) => {
    const res = await request.get("/en", { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()["location"]).toMatch(/\/$/);
  });

  test("unknown paths return a bilingual 404", async ({ request }) => {
    const res = await request.get("/definitely-not-here");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain("This page wandered off");
    expect(stripJoiners(html)).toContain("หน้านี้หลงทางไปแล้ว");
  });

  test("language switch keeps the current page", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /TH/ }).first().click();
    await expect(page).toHaveURL(/\/th$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    if (!isMobile) {
      await page.getByRole("link", { name: /EN/ }).first().click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("theme choice persists across reloads without a flash", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.getByRole("button", { name: /light theme|theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    // Set by the pre-paint script, before hydration.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
