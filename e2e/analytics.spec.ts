import { expect, test, type Page } from "@playwright/test";

// Who is counted: the beforeSend filter the site hands Vercel Web Analytics and Speed Insights.
// Locally the analytics scripts 404, so their queues (window.vaq, window.siq) still hold the
// filter the components registered; the test calls it the way the scripts would.

type Ev = { type: string; url: string };

async function decide(page: Page, queue: "vaq" | "siq"): Promise<Ev | null> {
  await expect
    .poll(() =>
      page.evaluate(
        (q) => ((window as unknown as Record<string, unknown[][]>)[q] ?? []).some((e) => e[0] === "beforeSend"),
        queue,
      ),
    )
    .toBe(true);
  return page.evaluate((q) => {
    const entry = ((window as unknown as Record<string, unknown[][]>)[q] ?? []).find((e) => e[0] === "beforeSend")!;
    return (entry[1] as (e: Ev) => Ev | null)({ type: "pageview", url: location.href });
  }, queue);
}

/** A person's browser: Playwright's own navigator.webdriver flag hidden. */
async function asPerson(page: Page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
}

test.describe("analytics: who is counted", () => {
  test("an automated browser is never counted", async ({ page }) => {
    await page.goto("/");
    expect(await decide(page, "vaq")).toBeNull();
    expect(await decide(page, "siq")).toBeNull();
  });

  test("a visitor is counted", async ({ page }) => {
    await asPerson(page);
    await page.goto("/");
    expect(await decide(page, "vaq")).not.toBeNull();
    expect(await decide(page, "siq")).not.toBeNull();
  });

  test("?notrack=1 leaves this browser out from that page view on; ?notrack=0 counts it again", async ({ page }) => {
    await asPerson(page);
    await page.goto("/?notrack=1");
    await expect(page.getByRole("status").filter({ hasText: "no longer counted" })).toBeVisible();
    expect(await decide(page, "vaq")).toBeNull();

    await page.goto("/work");
    expect(await page.evaluate(() => localStorage.getItem("kz-notrack"))).toBe("1");
    expect(await decide(page, "vaq")).toBeNull();

    await page.goto("/?notrack=0");
    await expect(page.getByRole("status").filter({ hasText: "counted again" })).toBeVisible();
    expect(await decide(page, "vaq")).not.toBeNull();
    // The note goes away by itself.
    await expect(page.getByRole("status").filter({ hasText: "counted again" })).toHaveCount(0, { timeout: 8000 });
  });
});
