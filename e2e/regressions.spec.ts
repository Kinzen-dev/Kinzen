import { expect, test } from "@playwright/test";

// Bugs found by the fresh-eyes review on 2026-10-06. Each one stays fixed.

test("clicking a header control mid-page does not jump the scroll position", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: /theme/i }).click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("the phone menu closes after following a section link", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone menu only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Main" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Experience" }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/#experience$/);
});

test("the phone menu is modal and Esc returns focus to its button", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone menu only");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Main" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("a header section link moves keyboard focus into that section", async ({ page, isMobile }) => {
  test.skip(isMobile, "the desktop header nav is hidden on phones");
  await page.goto("/");
  const link = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Contact" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contact$/);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("contact");
  // The next Tab continues inside Contact instead of jumping back to the top of the page.
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("#contact"))).toBe(true);
});

test("switching language keeps the reading position", async ({ page, isMobile }) => {
  test.skip(isMobile, "uses the header switch");
  await page.goto("/cv");
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(200);
  await page.getByRole("link", { name: /TH/ }).first().click();
  await expect(page).toHaveURL(/\/th\/cv$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
});

test("Back from a project page restores home after a section jump", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Main" }).getByRole("link", { name: "Experience" }).click();
  } else {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Experience" }).click();
  }
  await expect(page).toHaveURL(/#experience$/);
  // v3: home shows project cards (the ledger moved to /work).
  const card = page.locator("#work .mw-link", { hasText: "Ronglen" });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/\/work\/ronglen$/);
  await page.goBack();
  await expect(page).toHaveURL(/#experience$/);
  // The home page is back on screen, not the project page under a home URL.
  await expect(page.locator("#work")).toBeAttached();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Ronglen");
});

test("opening a works row never squeezes the name column (tablet and landscape widths)", async ({ page, isMobile }) => {
  test.skip(isMobile, "sets its own viewport");
  // Start each width from a closed ledger (the open row is otherwise restored for Back).
  await page.addInitScript(() => sessionStorage.clear());
  for (const width of [844, 1024]) {
    await page.setViewportSize({ width, height: 600 });
    await page.goto("/work");
    const name = page.locator("#index tbody th").first();
    await name.scrollIntoViewIfNeeded();
    const before = (await name.boundingBox())!.width;
    await page.getByRole("button", { name: "Helm", exact: true }).click();
    await expect(page.locator('#index [aria-expanded="true"]')).toHaveCount(1);
    expect(Math.abs((await name.boundingBox())!.width - before)).toBeLessThan(2);
  }
});

// v3: home has no ledger rows to open any more; the history entries themselves stay covered.
test("Back to an earlier section entry shows that section", async ({ page, isMobile }) => {
  test.skip(isMobile, "uses the desktop header");
  const nav = page.getByRole("navigation", { name: "Main" });
  await page.goto("/");
  await nav.getByRole("link", { name: "Experience", exact: true }).click();
  await expect(page).toHaveURL(/#experience$/);
  await nav.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await page.goBack();
  await expect(page).toHaveURL(/#experience$/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const r = document.getElementById("experience")!.getBoundingClientRect();
        return r.bottom > 100 && r.top < innerHeight - 48;
      }),
    )
    .toBe(true);
});
