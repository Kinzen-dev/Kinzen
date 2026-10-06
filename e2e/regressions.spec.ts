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
