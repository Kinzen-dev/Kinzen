import { expect, test } from "@playwright/test";

// Regressions from the audit round's blind review (2026-10-07). Each test is a bug a reviewer found.

test.describe("audit review regressions", () => {
  test("the phone menu closes when the page widens past its breakpoint (page never goes inert)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/work");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("dialog.mobile-nav")).toHaveAttribute("open", "");
    await page.setViewportSize({ width: 1180, height: 820 });
    await expect(page.locator("dialog.mobile-nav")).not.toHaveAttribute("open", "");
    // The page behind is usable again: a header link takes a click.
    await page.getByRole("navigation").getByRole("link", { name: "CV", exact: true }).first().click();
    await expect(page).toHaveURL(/\/cv$/);
  });

  for (const [route, name] of [
    ["/work", "Work"],
    ["/cv", "CV"],
    ["/th/work", "ผลงาน"],
    ["/th/cv", "CV"],
  ] as const) {
    test(`${route}: the header marks the current page`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      const current = page.locator('header a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(name);
    });
  }

  test("phones get a link into the Helm case from the home page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const link = page.locator('a[href="/work/helm"]').filter({ visible: true });
    await expect(link.first()).toBeVisible();
  });

  test("the Thai repeat mark never starts a line (no plain space before ๆ)", async ({ request }) => {
    for (const route of ["/th", "/th/cv", "/th/work", "/th/work/anymind-ec-platform"]) {
      const html = await (await request.get(route)).text();
      // Visible markup only: the RSC payload in <script> keeps the source strings.
      const body = html.slice(html.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "");
      expect(body, route).not.toMatch(/ ๆ/);
    }
  });
});
