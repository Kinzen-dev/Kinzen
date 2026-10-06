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
