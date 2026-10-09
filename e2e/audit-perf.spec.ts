import { expect, test } from "@playwright/test";

/**
 * a-03 (TECH-05): the command palette ships as a trigger only; the dialog loads on the first
 * open request and still opens fast. Behaviour is covered by timeline-cv-palette.spec.ts.
 */
test.describe("lazy command palette (TECH-05)", () => {
  for (const route of ["/", "/th", "/cv", "/work/clinic-receptionist"]) {
    test(`${route}: the server HTML has the trigger but no palette dialog`, async ({ request }) => {
      const html = await (await request.get(route)).text();
      expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
      expect(html).not.toContain('class="palette"');
      expect(html).not.toContain('role="combobox"');
    });
  }

  test("the dialog is created on the first open request, not on load", async ({ page }) => {
    await page.goto("/cv");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("dialog.palette")).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox")).toBeFocused();
  });

  test("first Cmd/Ctrl+K on a warm page opens the dialog in under 100 ms", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut path");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Time from the K keydown to the dialog being open, measured inside the page.
    await page.evaluate(() => {
      const w = window as Window & { __kDown?: number; __opened?: number };
      document.addEventListener(
        "keydown",
        (e) => {
          if (e.key.toLowerCase() === "k" && w.__kDown === undefined) w.__kDown = performance.now();
        },
        { capture: true },
      );
      new MutationObserver(() => {
        if (w.__opened === undefined && document.querySelector("dialog.palette[open]")) w.__opened = performance.now();
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    });
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    const ms = await page.evaluate(() => {
      const w = window as Window & { __kDown?: number; __opened?: number };
      return (w.__opened ?? Infinity) - (w.__kDown ?? 0);
    });
    // The 100 ms target holds on a real machine (local runs, lab perf runs). GitHub's 2-vCPU, no-GPU
    // runners measured 267-401 ms for the same build, so CI only guards against a gross regression.
    expect(ms).toBeLessThan(process.env.CI ? 600 : 100);
  });

  test("Cmd/Ctrl+K closes an open palette and reopens it with a fresh query", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut path");
    await page.goto("/work/clinic-receptionist");
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await page.keyboard.press("ControlOrMeta+k");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill("helm");
    await page.keyboard.press("ControlOrMeta+k");
    await expect(dialog).toBeHidden();
    await page.keyboard.press("ControlOrMeta+k");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox")).toHaveValue("");
    await expect(dialog.getByRole("combobox")).toBeFocused();
  });

  test("the trigger opens the palette on a phone too", async ({ page }) => {
    await page.goto("/th/cv");
    await page.getByRole("button", { name: /เปิดช่องค้นหา|Open command palette/ }).click();
    await expect(page.locator("dialog.palette[open]")).toBeVisible();
  });
});
