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

  test("reduced motion at 320px: no page scrolls sideways (still tool chips wrap)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    for (const route of ["/", "/th", "/th/cv", "/th/work/anymind-ec-platform"]) {
      await page.goto(route);
      const [sw, vw] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(sw, route).toBeLessThanOrEqual(vw);
    }
    await ctx.close();
  });

  test("320px: the Yimwhan demo's status chip never covers the LINE tag", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 700 } });
    const page = await ctx.newPage();
    for (const route of ["/", "/th"]) {
      await page.goto(route);
      await page.locator(".yw-cmp-bar").first().scrollIntoViewIfNeeded();
      const overlap = await page.evaluate(() => {
        const bar = document.querySelector(".yw-cmp-bar")!;
        const tag = bar.querySelector(".yw-tag")!.getBoundingClientRect();
        return [...bar.querySelectorAll(".yw-status-chip")].some((el) => {
          const c = el.getBoundingClientRect();
          return c.left < tag.right && c.right > tag.left && c.top < tag.bottom && c.bottom > tag.top;
        });
      });
      expect(overlap, route).toBe(false);
    }
    await ctx.close();
  });

  test("narrow phones: every demo choice label stays inside its button", async ({ browser }) => {
    for (const width of [320, 375]) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      for (const route of ["/", "/th"]) {
        await page.goto(route);
        await page.locator(".agent-demo-choices").first().scrollIntoViewIfNeeded();
        const overflowing = await page.evaluate(
          () =>
            [...document.querySelectorAll(".agent-demo-choice")].filter((btn) => {
              const b = btn.getBoundingClientRect();
              const label = btn.querySelector(".agent-demo-short")!.getBoundingClientRect();
              return label.left < b.left || label.right > b.right + 0.5 || btn.scrollWidth > btn.clientWidth + 1;
            }).length,
        );
        expect(overflowing, `${route} @${width}`).toBe(0);
      }
      await ctx.close();
    }
  });
});
