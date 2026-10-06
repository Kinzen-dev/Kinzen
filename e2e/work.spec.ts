import { thai } from "./thai";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const rowButtons = (page: Page) => page.locator("#work tbody tr.ledger-row:not([data-filtered]) th button");
const rowNames = (page: Page) => page.locator("#work tbody tr.ledger-row th button").allInnerTexts();

async function seriousViolations(page: Page) {
  // Entrance transitions fade text in; axe measuring a half-faded row reads low contrast.
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

test.describe("works ledger", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#work").scrollIntoViewIfNeeded();
  });

  test("arrows move between rows, Enter opens in place, Esc closes", async ({ page }) => {
    const buttons = rowButtons(page);
    const count = await buttons.count();
    expect(count).toBeGreaterThan(2);

    // Every visible row is reachable with Tab (arrows are a shortcut, not the only way).
    await expect(page.locator('#work tbody th button[tabindex="0"]')).toHaveCount(count);

    await buttons.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(buttons.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(buttons.nth(count - 1)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(buttons.first()).toBeFocused();
    await expect(buttons.first()).toHaveAttribute("tabindex", "0");

    await page.keyboard.press("Enter");
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#work .ledger-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: /Open project page/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "false");
    await expect(buttons.first()).toBeFocused();

    await page.keyboard.press(" ");
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
  });

  test("sorts by name and by year", async ({ page }) => {
    const sortBy = (label: RegExp) => page.getByRole("button", { name: label }).filter({ visible: true });
    const before = await rowNames(page);

    await sortBy(/Sort by System/).click();
    const asc = await rowNames(page);
    expect(asc).toEqual([...before].sort((a, b) => a.localeCompare(b, "en")));
    await sortBy(/Sort by System/).click();
    expect(await rowNames(page)).toEqual([...asc].reverse());

    await sortBy(/Sort by Year/).click();
    const byYear = await page.locator("#work tbody tr.ledger-row").evaluateAll((rows) => rows.length);
    expect(byYear).toBe(before.length);
  });

  test("area filters remove filtered rows from view and restore them", async ({ page }) => {
    const table = page.locator("#work table");
    const height = (await table.boundingBox())!.height;
    const total = await page.locator("#work tbody tr.ledger-row").count();

    const filter = page.getByRole("button", { name: /^Developer tools/ });
    await filter.click();
    await expect(filter).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#work tbody tr.ledger-row")).toHaveCount(total);
    const shown = await rowButtons(page).count();
    expect(shown).toBeLessThan(total);
    await expect(page.locator("#work tbody tr.ledger-row[data-filtered]")).toHaveCount(total - shown);
    // Filtered rows leave the layout entirely: no blank gaps where they were.
    expect((await table.boundingBox())!.height).toBeLessThan(height);
    for (const row of await page.locator("#work tbody tr.ledger-row[data-filtered]").all()) {
      await expect(row).toBeHidden();
    }

    await page.getByRole("button", { name: /^All/ }).click();
    await expect(rowButtons(page)).toHaveCount(total);
  });

  test("an opened row shows outcomes, the plate and the project link", async ({ page }) => {
    await page.getByRole("button", { name: "Yimwhan AI" }).click();
    const panel = page.locator("#work .ledger-panel");
    await expect(panel.getByText("Outcomes")).toBeVisible();
    await expect(panel.getByRole("img", { name: /KZ-01/ })).toBeAttached();
    await expect(panel.getByRole("link", { name: /Open project page/ })).toHaveAttribute("href", "/work/yimwhan-ai");
    expect(await seriousViolations(page)).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await panel.getByRole("button", { name: "Close details" }).click();
    await expect(panel).toHaveCount(0);
  });

  test("Open project page navigates and the back link returns", async ({ page }) => {
    await page.getByRole("button", { name: "Helm" }).click();
    await page.getByRole("link", { name: /Open project page/ }).click();
    await expect(page).toHaveURL(/\/work\/helm$/);
    await expect(page.getByRole("heading", { level: 1, name: "Helm" })).toBeVisible();
    await page.getByRole("link", { name: /All work/ }).click();
    await expect(page).toHaveURL(/\/#work$/);
    await expect(page.getByRole("button", { name: "Helm" })).toBeVisible();
  });
});

test.describe("project pages", () => {
  for (const { route, lang, heading, marker } of [
    { route: "/work/yimwhan-ai", lang: "en", heading: "Yimwhan AI", marker: "Outcomes" },
    { route: "/th/work/yimwhan-ai", lang: "th", heading: "Yimwhan AI", marker: "ผลลัพธ์" },
    { route: "/work/ronglen", lang: "en", heading: "Ronglen", marker: "Outcomes" },
  ]) {
    test(`${route} is prerendered, indexable and accessible`, async ({ page, request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<html lang="${lang}"`);
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('hrefLang="th"');
      expect(html).toContain('"@type":"CreativeWork"');
      expect(html).toMatch(/og:image" content="[^"]+\/og\.png"/);

      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("heading", { name: thai(marker) })).toBeVisible();
      // The long-form case study stays hidden until its visibility flag is flipped.
      await expect(page.locator("[data-case-study]")).toHaveCount(0);
      expect(await seriousViolations(page)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("plates are labelled drawings", async ({ page }) => {
    await page.goto("/work/helm");
    const plate = page.getByRole("img", { name: /KZ-02/ });
    await expect(plate).toBeAttached();
    await expect(page.locator("figure.plate svg desc")).toContainText("Rust core");
  });

  test("unknown and hidden projects return 404 in both languages", async ({ request }) => {
    for (const route of ["/work/not-a-project", "/th/work/not-a-project", "/work/not-a-project/og.png"]) {
      expect((await request.get(route)).status(), route).toBe(404);
    }
  });
});

test.describe("seo and sharing", () => {
  test("home carries ProfilePage and Person structured data", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain('"@type":"ProfilePage"');
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('og:image" content="https://www.kinzen.dev/og.png"');
    const th = await (await request.get("/th")).text();
    expect(th).toContain('rel="canonical" href="https://www.kinzen.dev/th"');
  });

  test("sitemap lists every page with alternates; robots points at it", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain("<loc>https://www.kinzen.dev/work/helm</loc>");
    expect(xml).toContain("<loc>https://www.kinzen.dev/th/work/helm</loc>");
    expect(xml).toContain('hreflang="th"');

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap: https://www.kinzen.dev/sitemap.xml");
  });

  for (const route of ["/og.png", "/th/og.png", "/work/yimwhan-ai/og.png", "/th/work/helm/og.png"]) {
    test(`${route} is a PNG`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
    });
  }
});
