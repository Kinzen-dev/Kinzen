import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Scroll to a fraction of the Helm track (0 = stage pinned at the top, 1 = last frame). */
async function scrollTrack(page: Page, f: number) {
  await page.evaluate((frac) => {
    const track = document.querySelector<HTMLElement>(".helm-scene .sticky-track")!;
    const top = track.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + (track.offsetHeight - innerHeight) * frac);
  }, f);
}

test.describe("v3 Helm scene", () => {
  // Several viewports and full-track scrolls per test: give a loaded laptop room.
  test.describe.configure({ timeout: 90_000 });
  for (const route of ["/", "/th"]) {
    test(`${route}: real text equivalent, decorative mockup, case link`, async ({ page }) => {
      await page.goto(route);
      const scene = page.locator("section.helm-scene");
      await expect(scene.getByRole("heading", { level: 3, name: "Helm" })).toBeAttached();
      await expect(scene.locator("ol.helm-beats > li")).toHaveCount(5);
      await expect(scene.locator(".hw")).toHaveAttribute("aria-hidden", "true");
      await expect(scene.locator("figcaption")).toContainText(route === "/th" ? "ข้อมูลสมมติ" : "fictional");
      const href = await scene.locator("a.helm-cta").getAttribute("href");
      expect(href).toBe(route === "/th" ? "/th/work/helm" : "/work/helm");
      const text = await scene.innerText();
      expect(text).not.toMatch(/[—–⁠]/);
    });
  }

  test("scroll drives the five beats in order", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator(".helm-stage");
    const expected = [0, 1, 2, 3, 4];
    for (const [i, f] of [0.05, 0.3, 0.5, 0.7, 0.95].entries()) {
      await scrollTrack(page, f);
      await expect(stage).toHaveAttribute("data-step", String(expected[i]));
      await expect(page.locator(`.helm-beat[data-beat="${expected[i]}"]`)).toHaveCSS("opacity", "1");
    }
    // The stage stays inside the viewport while it is pinned.
    const box = await stage.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(-1);
    expect(box!.y).toBeLessThanOrEqual(1);
  });

  test("the hand-off beat shows the note and the merge beat the toast", async ({ page }) => {
    await page.goto("/");
    await scrollTrack(page, 0.7);
    await expect(page.locator(".helm-stage")).toHaveAttribute("data-step", "3");
    await expect(page.locator(".hw-flight")).toHaveCSS("opacity", "1");
    // Phones show the short wording of the same line.
    await expect(
      page.locator('.hw-pane[data-pane="sable"] .hw-line[data-at="3"]').filter({ visible: true }).first(),
    ).toBeVisible();
    await scrollTrack(page, 0.99);
    await expect(page.locator(".helm-stage")).toHaveAttribute("data-step", "4");
    await expect(page.locator(".hw-toast")).toHaveCSS("opacity", "1", { timeout: 3000 });
  });

  test("reduced motion: normal flow, every beat shown, finished window", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const stage = page.locator(".helm-stage");
    await expect(stage).toHaveAttribute("data-step", "4");
    await expect(stage).toHaveCSS("position", "relative");
    for (let i = 0; i < 5; i++) await expect(page.locator(`.helm-beat[data-beat="${i}"]`)).toHaveCSS("opacity", "1");
    await expect(page.locator(".hw-toast")).toHaveCSS("opacity", "1");
    await ctx.close();
  });

  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    test(`no sideways overflow at ${width}px in any beat`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto("/th");
      for (const f of [0.05, 0.5, 0.95]) {
        await scrollTrack(page, f);
        await page.waitForTimeout(150);
        const m = await page.evaluate(() => {
          const scene = document.querySelector(".helm-scene")!.getBoundingClientRect();
          return { scroll: document.documentElement.scrollWidth, left: scene.left, right: scene.right };
        });
        expect(m.scroll).toBeLessThanOrEqual(width);
        expect(m.left).toBeGreaterThanOrEqual(0);
        expect(m.right).toBeLessThanOrEqual(width);
      }
      await ctx.close();
    });
  }

  for (const theme of ["light", "dark"]) {
    test(`axe clean in the ${theme} theme, in every beat`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/");
      await expect(page.locator(".helm-stage")).toHaveAttribute("data-armed", "");
      // The settled end of each beat (scroll-scrubbed layers mid-fade are not a resting state).
      for (const f of [0.19, 0.39, 0.59, 0.79, 0.99]) {
        await scrollTrack(page, f);
        await page.waitForTimeout(1200);
        const results = await new AxeBuilder({ page })
          .include(".helm-scene")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${f} ${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
      }
    });
  }

  test("right after load (beat swap from the server's last beat) the scene is axe clean", async ({ page }) => {
    // The server paints beat 5; the runtime swaps to beat 1 instantly (no cross-fade an audit
    // could catch half-transparent), exactly what the shell smoke audit sees.
    for (const route of ["/", "/th"]) {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .include(".helm-scene")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${route} ${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    }
  });
});
