import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// p-03 field HUD: ?perf=1 shows a small perf overlay for this tab (sessionStorage), ?perf=0 or Hide
// turns it off. Off, the HUD chunk is never fetched and nothing of it runs.

const hud = (page: Page) => page.locator("[data-perf-hud]");

/** The JS chunk that carries the HUD, found by its content among the scripts the page loaded. */
async function hudChunks(page: Page) {
  const urls = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((n) => n.endsWith(".js")),
  );
  const bodies = await Promise.all(urls.map(async (url) => [url, await (await page.request.get(url)).text()] as const));
  return bodies.filter(([, body]) => body.includes("Performance monitor")).map(([url]) => new URL(url).pathname);
}

/** Counts every requestAnimationFrame the page asks for, from before any page script runs. */
async function countRaf(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __rafCalls?: number };
    w.__rafCalls = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__rafCalls!++;
      return raf(cb);
    };
  });
}
const rafCalls = (page: Page) => page.evaluate(() => (window as Window & { __rafCalls?: number }).__rafCalls ?? 0);

test.describe("perf HUD (p-03)", () => {
  test("off by default: no overlay, the HUD chunk is never fetched", async ({ page }) => {
    // Reads every script the page loaded to find the HUD's: slow on a loaded machine.
    test.setTimeout(60_000);
    await page.goto("/cv?perf=1");
    await expect(hud(page)).toBeVisible();
    const chunks = await hudChunks(page);
    expect(chunks.length).toBeGreaterThan(0);

    const fresh = await page.context().browser()!.newContext();
    const visitor = await fresh.newPage();
    const requested: string[] = [];
    visitor.on("request", (r) => requested.push(new URL(r.url()).pathname));
    await visitor.goto(new URL("/cv", page.url()).href);
    await visitor.waitForLoadState("networkidle");
    await visitor.waitForTimeout(1500);
    await expect(visitor.locator("[data-perf-hud]")).toHaveCount(0);
    expect(requested.filter((p) => chunks.includes(p))).toEqual([]);
    await fresh.close();
  });

  test("off, the gate adds no rAF; on, the HUD runs one loop; ?perf=0 stops it", async ({ page }) => {
    await countRaf(page);
    // The privacy page has no motion of its own, so any rAF there is the HUD's.
    await page.goto("/privacy");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const off0 = await rafCalls(page);
    await page.waitForTimeout(1500);
    expect(await rafCalls(page)).toBe(off0);

    await page.goto("/privacy?perf=1");
    await expect(hud(page)).toBeVisible();
    const on0 = await rafCalls(page);
    await page.waitForTimeout(1000);
    expect(await rafCalls(page)).toBeGreaterThan(on0 + 10);

    await page.goto("/privacy?perf=0");
    await page.waitForLoadState("networkidle");
    await expect(hud(page)).toHaveCount(0);
    const back0 = await rafCalls(page);
    await page.waitForTimeout(1500);
    expect(await rafCalls(page)).toBe(back0);
  });

  test("?perf=1 persists for the tab, ?perf=0 and Hide turn it off", async ({ page }) => {
    await page.goto("/cv?perf=1");
    await expect(hud(page)).toBeVisible();
    await expect(hud(page)).toContainText(/\d+ fps · p95 [\d.-]+ ms/);
    await expect(hud(page)).toContainText(/anims \d+ \(\d+ on screen\) · canvases \d+/);
    await expect(hud(page)).toContainText("gov n/a");

    await page.goto("/th");
    await expect(hud(page)).toBeVisible();

    await page.goto("/?perf=0");
    await page.waitForLoadState("networkidle");
    await expect(hud(page)).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(hud(page)).toHaveCount(0);

    await page.goto("/?perf=1");
    await hud(page).getByRole("button", { name: "Hide" }).click();
    await expect(hud(page)).toHaveCount(0);
    await page.goto("/cv");
    await page.waitForLoadState("networkidle");
    await expect(hud(page)).toHaveCount(0);
  });

  test("shows the frame governor's mode and drawing loops when the page publishes them", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __kzFrames?: object }).__kzFrames = {
        cls: "phone",
        mode: "light",
        cap: 60,
        loops: {
          "play/night-desk": { state: "running", fps: 30, drawn: 30, cap: 30, scale: 0.75 },
          hero: { state: "settled", fps: 0, drawn: 0, cap: 60, scale: 1 },
        },
      };
    });
    await page.goto("/cv?perf=1");
    await expect(hud(page)).toContainText("phone · DPR");
    await expect(hud(page)).toContainText("gov light cap 60");
    await expect(hud(page)).toContainText("loops 1 run 1 settled 0 paused: night-desk 30 x0.75");
  });

  test("the overlay is accessible and leaves the page axe clean", async ({ page }) => {
    await page.goto("/?perf=1");
    await expect(hud(page)).toContainText("fps");
    await expect(page.getByRole("complementary", { name: "Performance monitor" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include("[data-perf-hud]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
