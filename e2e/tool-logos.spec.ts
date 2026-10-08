import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Tool logos: official brand marks on plain chips, decorative next to real-text names.

test.describe("tool logos", () => {
  test("marquee chips are plain surface chips with a decorative mark or a deliberate text-only name", async ({
    page,
  }) => {
    await page.goto("/");
    const chips = page.locator("#skills .marquee-row:not([aria-hidden]) .tool-chip");
    expect(await chips.count()).toBeGreaterThan(30);
    const ts = chips.filter({ hasText: /^TypeScript$/ });
    await expect(ts.locator("svg.tool-mark")).toHaveAttribute("aria-hidden", "true");
    await expect(ts.locator("svg.tool-mark use")).toHaveAttribute("href", /\/tool-logos\.svg\?v=\w+#typescript$/);
    // The brand colour rides along as --brand; at rest the mark takes the label's tone.
    await expect(ts.locator("svg.tool-mark")).toHaveAttribute("style", /--brand:\s*#3178C6/);
    // Black marks follow the text colour so they read in the dark theme.
    await expect(chips.filter({ hasText: /^Next\.js$/ }).locator("svg")).toHaveAttribute("style", /--brand:\s*currentColor/);
    // Text-only on purpose.
    for (const name of ["Azure", "Codex", "Playwright", "Tauri", "Twilio Media Streams"]) {
      await expect(chips.filter({ hasText: new RegExp(`^${name}$`) }).locator("svg")).toHaveCount(0);
    }
    // No pastel chip fills any more: every chip sits on the plain surface.
    const grounds = await chips.evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).backgroundColor))]);
    expect(grounds).toHaveLength(1);
  });

  test("the sprite serves every mark the page references", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("#skills svg.tool-mark use")
      .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))]);
    const res = await request.get(hrefs[0].split("#")[0]);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
    const sprite = await res.text();
    for (const href of hrefs) expect(sprite, href).toContain(`<symbol id="${href.split("#")[1]}"`);
  });

  test("group cards list each tool as mark + name; the names stay real text", async ({ page }) => {
    await page.goto("/");
    const backend = page.locator("#skills dl > div").first();
    await expect(backend.locator("dd li")).toHaveCount(8);
    await expect(backend.locator("dd")).toContainText("TypeScript");
    await expect(backend.locator("dd li").filter({ hasText: "Hexagonal" }).locator("svg")).toHaveClass(
      /tool-mark-practice/,
    );
    for (const svg of await page.locator("#skills dd svg").all())
      await expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  test("marks rest in the label's tone and show the brand colour on hover", async ({ page, isMobile }) => {
    test.skip(isMobile, "no hover on touch; the tap test covers phones");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const item = page.locator("#skills dd li").filter({ hasText: /^TypeScript$/ });
    const fill = () => item.locator("svg.tool-mark").evaluate((el) => getComputedStyle(el).fill);
    // At rest: the label's colour mixed a step toward transparent, not the brand blue.
    const rest = await fill();
    expect(rest).not.toBe("rgb(49, 120, 198)");
    expect(rest).toMatch(/\/ 0\.72\)$/);
    await item.hover();
    await expect.poll(fill).toBe("rgb(49, 120, 198)");
  });

  test("a tap shows the brand colour, another tap moves it, and it clears by itself", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const items = page.locator("#skills dd li[data-tool-host]");
    const ts = items.filter({ hasText: /^TypeScript$/ });
    const node = items.filter({ hasText: /^Node\.js$/ });
    await ts.tap();
    await expect(ts).toHaveAttribute("data-tool-on", "");
    await expect.poll(() => ts.locator("svg").evaluate((el) => getComputedStyle(el).fill)).toBe("rgb(49, 120, 198)");
    await node.tap();
    await expect(ts).not.toHaveAttribute("data-tool-on");
    await expect(node).toHaveAttribute("data-tool-on", "");
    await expect(node).not.toHaveAttribute("data-tool-on", { timeout: 4_000 });
    await ctx.close();
  });

  test("case page stack pills carry the marks", async ({ page }) => {
    await page.goto("/work/yimwhan-ai");
    const pills = page.locator(".pj-pill");
    await expect(pills.filter({ hasText: "Fly.io" }).locator("svg.tool-mark")).toHaveAttribute("data-badge", "dark");
    await expect(pills.filter({ hasText: "Litestream" }).locator("svg")).toHaveCount(0);
  });

  for (const [route, note] of [
    ["/", "Logos are trademarks of their respective owners."],
    ["/th", "โลโก้ทั้งหมดเป็นเครื่องหมายการค้าของเจ้าของแต่ละราย"],
  ]) {
    test(`${route}: footer carries the trademark note`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("contentinfo")).toContainText(note);
    });
  }

  for (const theme of ["light", "dark"]) {
    test(`axe is clean on the tools section and a case page (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      for (const route of ["/", "/work/yimwhan-ai"]) {
        await page.goto(route);
        const results = await new AxeBuilder({ page }).include(route === "/" ? "#skills" : ".pj-pills").analyze();
        expect(results.violations, route).toEqual([]);
      }
    });
  }
});
