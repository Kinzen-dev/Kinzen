import { thai } from "./thai";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PHONE = /\+66|0\d{2}[- ]?\d{3}[- ]?\d{4}/;

async function openPalette(page: Page) {
  await page
    .getByRole("button", { name: new RegExp(`^Open command palette$|${thai("เปิดช่องค้นหา").source}`) })
    .click();
  const dialog = page.getByRole("dialog", { name: new RegExp(`^Command palette$|${thai("เมนูคำสั่ง").source}`) });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("command palette", () => {
  test("opens from the trigger and Esc closes it, returning focus to the trigger", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open command palette" });
    const dialog = await openPalette(page);
    await expect(dialog.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("filters, moves with the arrow keys and runs with Enter", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("combobox");
    await input.fill("cv");
    const selected = dialog.locator('[role="option"][aria-selected="true"]');
    await expect(selected).toHaveText(/Open CV/);
    await expect(input).toHaveAttribute("aria-activedescendant", (await selected.getAttribute("id")) ?? "");
    await page.keyboard.press("ArrowDown");
    await expect(selected).toHaveText(/Print CV/);
    await page.keyboard.press("ArrowUp");
    await expect(selected).toHaveText(/Open CV/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/cv$/);
    await expect(dialog).toBeHidden();
  });

  test('Cmd/Ctrl+K opens the palette; "/" is not a shortcut (WCAG 2.1.4)', async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await page.keyboard.press("/");
    await page.waitForTimeout(200);
    await expect(dialog).toBeHidden();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "probe";
      input.setAttribute("aria-label", "probe");
      document.querySelector("main")?.prepend(input);
    });
    await page.locator("#probe").focus();
    await page.keyboard.type("a/b");
    await expect(page.locator("#probe")).toHaveValue("a/b");
    await expect(dialog).toBeHidden();
  });

  test("switching language keeps the current page", async ({ page }) => {
    await page.goto("/cv");
    const dialog = await openPalette(page);
    await dialog.getByRole("combobox").fill("thai");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/th\/cv$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
  });

  test("toggles the theme and copies the email", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    let dialog = await openPalette(page);
    await dialog.getByRole("combobox").fill("light theme");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    dialog = await openPalette(page);
    await dialog.getByRole("combobox").fill("copy email");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Email copied" })).toHaveCount(1);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/@/);
  });

  test("lists every project and is axe clean while open", async ({ page }) => {
    await page.goto("/th");
    const dialog = await openPalette(page);
    await expect(dialog.getByRole("option", { name: /Helm/ })).toBeVisible();
    const results = await new AxeBuilder({ page }).include("dialog").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe("cv", () => {
  const cases = [
    { route: "/cv", name: "Kittipong Khonthong", lang: "en" },
    { route: "/th/cv", name: "กฤติพงษ์ ก้อนทอง", lang: "th" },
  ];

  for (const { route, name, lang } of cases) {
    test(`${route} renders the CV in ${lang} with no phone number`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(thai(name));
      await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
      await expect(page.locator('a[href*="linkedin.com"]').first()).toBeVisible();
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(PHONE);
      const html = await page.content();
      expect(html).toContain(`rel="canonical" href="https://www.kinzen.dev${route}"`);
      expect(html).toContain('hreflang="th"');
    });

    test(`${route} has no serious accessibility violations and no sideways scroll`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("print media drops the site chrome and prints black on white, even in dark theme", async ({ page }) => {
    await page.goto("/cv");
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("[data-site-header]")).toBeHidden();
    await expect(page.locator("body > footer")).toBeHidden();
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const colors = await page.evaluate(() => ({
      ground: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(document.querySelector("h1")!).color,
    }));
    expect(colors).toEqual({ ground: "rgb(255, 255, 255)", ink: "rgb(0, 0, 0)" });
  });
});

test.describe("era timeline", () => {
  test("the thread is measured from the era nodes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".era-thread path")).toHaveAttribute("d", /^M/);
    const nodes = await page.locator("[data-era-node]").count();
    expect(nodes).toBeGreaterThan(0);
    await expect(page.locator(".era-thread circle")).toHaveCount(nodes);
  });

  test("reduced motion shows the fully drawn thread", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".era-thread path")).toHaveAttribute("d", /^M/);
    const style = await page
      .locator(".era-thread")
      .evaluate((el) => ({ clip: getComputedStyle(el).clipPath, animation: getComputedStyle(el).animationName }));
    expect(style).toEqual({ clip: "none", animation: "none" });
  });
});
