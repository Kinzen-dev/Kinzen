import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// v4 numbers: one section, the four stats shown five ways (split-flap board, honest pictures to
// scale, a story, gold dust, editorial print). A quiet tab switcher auto-advances while the
// section is in view and idle, stops for the visit after a pick, and keeps one stage height per
// breakpoint. `?numbers-advance=<s>` shortens the 20 s period (debug only) so these run in seconds.

const VIEWS = ["split-flap", "honest-viz", "scrolly-stats", "gold-numerals", "editorial-numerals"] as const;
/** Each view's root inside its pane. */
const ROOT = {
  "split-flap": ".sf",
  "honest-viz": ".hv",
  "scrolly-stats": ".ss",
  "gold-numerals": ".gn",
  "editorial-numerals": ".ed",
} as const;

const FIGURES = ["7", "10+", "6,000+", "500", "37"];
const EN_CAPTIONS = [
  "years building production systems",
  "brands at AnyMind Group, leading a team of 5 to 8 engineers",
  "daily active users on the real-time transactional platform I work on",
  "real customer messages through the LINE reply pipeline",
  "rule violations in raw model drafts caught by the code checks, mostly overstated claims",
  "Every final reply passed those checks in this test set.",
];

const section = (page: Page) => page.locator("[data-numbers]");
const tab = (page: Page, view: string) => page.locator(`[data-numbers] [role=tab][data-view="${view}"]`);
const selected = (page: Page) =>
  page.locator('[data-numbers] [role=tab][aria-selected="true"]').getAttribute("data-view");
const activePane = (page: Page) => page.locator("[data-numbers] .nv-pane:not([data-state=out])");

async function toSection(page: Page) {
  // Centred, so the fixed header never sits over the switcher.
  await page.locator("[data-numbers] .nv").evaluate((el) => el.scrollIntoView({ block: "center" }));
  // Nobody pointing inside the section.
  await page.mouse.move(2, 2).catch(() => {});
}

/** Wait until `view` is the only pane on stage (its crossfade finished). */
async function settled(page: Page, view: string) {
  await expect(page.locator("[data-numbers] .nv-pane")).toHaveCount(1);
  await expect(activePane(page)).toHaveAttribute("data-view", view);
  await expect(activePane(page).locator(ROOT[view as keyof typeof ROOT])).toBeVisible();
}

/** Text with whitespace (incl. no-break spaces) collapsed. */
const flat = (s: string) => s.replace(/\s+/g, " ");

test.describe("server render", () => {
  test("without JavaScript the board is complete: every figure and caption is real text", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    const s = section(page);
    await expect(s.getByRole("heading", { level: 2 })).toHaveText("In numbers");
    await expect(s.getByRole("tab")).toHaveCount(5);
    await expect(s.locator(".sf-row")).toHaveCount(4);
    expect(await s.locator(".sf-fig > .sr-only").allTextContents()).toEqual(FIGURES);
    const text = flat(await s.innerText());
    for (const caption of EN_CAPTIONS) expect(text, caption).toContain(caption);
    expect(text).toContain("confidential client".toUpperCase());
    await ctx.close();
  });

  test("Thai: the same figures, captions in Thai, no joiners or long dashes", async ({ request }) => {
    const html = await (await request.get("/th")).text();
    // Captions type in word by word, so the markup splits them: compare the text alone.
    const html0 = html.slice(html.indexOf("data-numbers"), html.indexOf('id="work"'));
    const body = html0.replace(/<[^>]+>/g, "");
    expect(body).toContain("ปีที่สร้างระบบใช้งานจริง");
    expect(body).toContain("ลูกค้าที่ขอไม่เปิดเผยชื่อ");
    const figures = [...html0.matchAll(/<p class="sf-fig[^"]*"><span class="sr-only">([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(figures).toEqual(FIGURES);
    expect(body).not.toMatch(/\u2060|\u2014|\u2013/);
  });
});

test.describe("switcher", () => {
  test("tabs: arrows, Home and End pick a view; one tab stop; the panel follows", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard path is a desktop concern");
    await page.goto("/");
    await toSection(page);
    const tabs = page.locator("[data-numbers] [role=tab]");
    await expect(tabs).toHaveCount(5);
    await expect(page.locator("[data-numbers] [role=tablist]")).toHaveAccessibleName("Ways to show the numbers");
    await tab(page, "split-flap").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "honest-viz")).toBeFocused();
    await expect(tab(page, "honest-viz")).toHaveAttribute("aria-selected", "true");
    await settled(page, "honest-viz");
    await expect(page.locator("[data-numbers] [role=tabpanel]")).toHaveAttribute(
      "aria-labelledby",
      (await tab(page, "honest-viz").getAttribute("id"))!,
    );
    await page.keyboard.press("End");
    await settled(page, "editorial-numerals");
    await page.keyboard.press("ArrowRight");
    await settled(page, "split-flap");
    await page.keyboard.press("ArrowLeft");
    await settled(page, "editorial-numerals");
    await page.keyboard.press("Home");
    await settled(page, "split-flap");
    expect(await tabs.evaluateAll((els) => els.map((e) => e.getAttribute("tabindex")))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
  });

  test("auto-advance runs only while the section is in view and nobody points at it", async ({ page, isMobile }) => {
    test.skip(isMobile, "hover holds: desktop");
    await page.goto("/?numbers-advance=3");
    // The section opens just under the hero: scroll it out of view first.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(4_000);
    expect(await selected(page)).toBe("split-flap");
    await toSection(page);
    await expect(page.locator("[data-numbers] .nv-progress")).toHaveCount(1);
    await expect.poll(() => selected(page), { timeout: 8_000, intervals: [100] }).toBe("honest-viz");
    await expect(page.locator('[data-numbers] [aria-live="polite"]')).toHaveText("Showing: To scale");
    // Hovering inside holds it.
    await page.locator("[data-numbers] .nv-stage").hover();
    await settled(page, "honest-viz");
    await page.waitForTimeout(4_500);
    expect(await selected(page)).toBe("honest-viz");
    // Pointer leaves: it carries on.
    await page.mouse.move(2, 2);
    await expect.poll(() => selected(page), { timeout: 8_000, intervals: [100] }).toBe("scrolly-stats");
    // Scrolled away: it holds again.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(4_500);
    expect(await selected(page)).toBe("scrolly-stats");
  });

  test("a pick stops auto-advance for the rest of the visit", async ({ page }) => {
    await page.goto("/?numbers-advance=1");
    await toSection(page);
    await tab(page, "scrolly-stats").click();
    await page.mouse.move(2, 2).catch(() => {});
    await settled(page, "scrolly-stats");
    await expect(page.locator("[data-numbers] .nv-progress")).toHaveCount(0);
    await page.waitForTimeout(3_000);
    expect(await selected(page)).toBe("scrolly-stats");
    expect(await page.evaluate(() => sessionStorage.getItem("kp-numbers-view-picked"))).toBe("1");
    // A reload in the same visit opens on the first view and stays there.
    await page.reload();
    await toSection(page);
    await page.waitForTimeout(3_000);
    expect(await selected(page)).toBe("split-flap");
    await expect(page.locator("[data-numbers] .nv-progress")).toHaveCount(0);
  });

  test("touch inside holds the timer", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto("/?numbers-advance=2");
    await toSection(page);
    await page.locator("[data-numbers] .nv-hints").tap();
    await page.waitForTimeout(3_500);
    expect(await selected(page)).toBe("split-flap");
    await ctx.close();
  });

  test("reduced motion: no auto-advance, no crossfade, the switcher and the steps still work", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?numbers-advance=1");
    await toSection(page);
    await expect(page.locator("[data-numbers] .nv-progress")).toHaveCount(0);
    await page.waitForTimeout(2_500);
    expect(await selected(page)).toBe("split-flap");
    // The board is the finished one: every flap shows its figure, no blank waiting to flip.
    expect(await section(page).locator(".sf-tile").first().getAttribute("data-target")).not.toBeNull();
    for (const view of [...VIEWS].reverse()) {
      await tab(page, view).click();
      // Straight swap: never two panes, never a fading one.
      await expect(page.locator("[data-numbers] .nv-pane[data-state]")).toHaveCount(0);
      await settled(page, view);
    }
    // A story view holds its step (nothing moves), and its rail still switches.
    await tab(page, "scrolly-stats").click();
    await settled(page, "scrolly-stats");
    const rail = activePane(page).locator(".ss-rail button");
    await expect(rail.nth(0)).toHaveAttribute("aria-current", "step");
    await page.waitForTimeout(5_000);
    await expect(rail.nth(0)).toHaveAttribute("aria-current", "step");
    await rail.nth(2).click();
    await expect(rail.nth(2)).toHaveAttribute("aria-current", "step");
    await expect(activePane(page).locator(".ss-panel[data-i='2']")).toHaveAttribute("data-on", "");
  });
});

test.describe("layout", () => {
  for (const width of [320, 390, 768, 1440]) {
    test(`${width}px: every view fits its stage and nothing scrolls sideways`, async ({ browser, isMobile }) => {
      test.skip(isMobile, "one run covers every width");
      test.setTimeout(120_000);
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      for (const route of ["/", "/th"]) {
        await page.goto(route);
        await toSection(page);
        const stageH = await page.locator("[data-numbers] .nv-stage").evaluate((el) => el.getBoundingClientRect().height);
        for (const view of VIEWS) {
          await tab(page, view).click();
          await page.mouse.move(2, 2);
          await settled(page, view);
          await page.waitForTimeout(300);
          const m = await activePane(page).evaluate((pane) => {
            const stage = (pane.parentElement as HTMLElement).getBoundingClientRect();
            // Anything seen that sticks out of the stage (the editorial canvas reaches the screen
            // edges on purpose and is not counted).
            const out = [...pane.querySelectorAll<HTMLElement>("*")].filter((el) => {
              if (el.closest(".ed-stage, .sr-only")) return false;
              const r = el.getBoundingClientRect();
              if (!r.width || !r.height || getComputedStyle(el).opacity === "0") return false;
              return r.bottom > stage.bottom + 1 || r.top < stage.top - 1;
            });
            return {
              stage: stage.height,
              out: out.slice(0, 3).map((el) => el.className),
              sw: document.documentElement.scrollWidth,
              vw: document.documentElement.clientWidth,
            };
          });
          expect(m.stage, `${route} ${view}: stage height`).toBe(stageH);
          expect(m.out, `${route} ${view}: content outside the stage`).toEqual([]);
          expect(m.sw, `${route} ${view}: page width`).toBeLessThanOrEqual(m.vw);
        }
      }
      await ctx.close();
    });
  }

  test("switching views never moves what comes after the section", async ({ page }) => {
    await page.goto("/");
    await toSection(page);
    const top = () => page.locator("#work").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const before = await top();
    for (const view of ["honest-viz", "scrolly-stats", "gold-numerals", "editorial-numerals", "split-flap"]) {
      await tab(page, view).click();
      await settled(page, view);
      expect(await top(), view).toBe(before);
    }
  });
});

test.describe("views", () => {
  test("every view carries all four stats as real text", async ({ page }) => {
    await page.goto("/");
    await toSection(page);
    for (const view of VIEWS) {
      await tab(page, view).click();
      await settled(page, view);
      const text = flat((await activePane(page).textContent()) ?? "");
      for (const f of FIGURES) expect(text, `${view}: ${f}`).toContain(f);
      for (const caption of EN_CAPTIONS) expect(text, `${view}: ${caption}`).toContain(caption);
    }
  });

  test("never more than one live WebGL context in the section, and none once its view leaves", async ({ page }) => {
    // Count contexts the numbers views create, minus the ones they lose (dispose).
    await page.addInitScript(() => {
      const w = window as unknown as { __gl: { live: number; peak: number } };
      w.__gl = { live: 0, peak: 0 };
      const get = HTMLCanvasElement.prototype.getContext;
      const seen = new WeakSet<object>();
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        const ctx = (get as (...a: unknown[]) => unknown).call(this, type, ...rest) as WebGL2RenderingContext | null;
        if (ctx && type === "webgl2" && this.closest("[data-numbers]") && !seen.has(ctx)) {
          seen.add(ctx);
          w.__gl.live++;
          w.__gl.peak = Math.max(w.__gl.peak, w.__gl.live);
          const ext = ctx.getExtension("WEBGL_lose_context");
          if (ext) {
            const lose = ext.loseContext.bind(ext);
            let lost = false;
            ext.loseContext = () => {
              if (!lost) w.__gl.live--;
              lost = true;
              lose();
            };
          }
        }
        return ctx;
      } as typeof get;
    });
    await page.goto("/");
    await toSection(page);
    const gl = () => page.evaluate(() => (window as unknown as { __gl: { live: number; peak: number } }).__gl);
    await tab(page, "gold-numerals").click();
    await page.waitForTimeout(1_500);
    // Straight to the ink view while the dust is still fading out.
    await tab(page, "editorial-numerals").click();
    await page.waitForTimeout(200);
    await tab(page, "gold-numerals").click();
    await page.waitForTimeout(200);
    await tab(page, "editorial-numerals").click();
    await settled(page, "editorial-numerals");
    await page.waitForTimeout(1_500);
    expect((await gl()).peak).toBeLessThanOrEqual(1);
    await tab(page, "split-flap").click();
    await settled(page, "split-flap");
    await expect.poll(async () => (await gl()).live).toBe(0);
    await expect(section(page).locator("canvas")).toHaveCount(0);
  });

  test("each view loads as its own chunk, on demand", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "script") scripts.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const before = scripts.length;
    await toSection(page);
    await tab(page, "gold-numerals").click();
    await settled(page, "gold-numerals");
    expect(scripts.length).toBeGreaterThan(before);
  });

  test("the story steps on by itself while seen, and its rail jumps", async ({ page }) => {
    await page.goto("/?numbers-advance=60");
    await toSection(page);
    await tab(page, "scrolly-stats").click();
    await page.mouse.move(2, 2);
    await settled(page, "scrolly-stats");
    const rail = activePane(page).locator(".ss-rail button");
    await expect(rail.nth(1)).toHaveAttribute("aria-current", "step", { timeout: 7_000 });
    await rail.nth(3).click();
    await page.mouse.move(2, 2);
    await expect(activePane(page).locator(".ss-panel[data-i='3']")).toHaveAttribute("data-on", "");
    await expect(activePane(page).locator(".ss-panel-replay[data-verdict]")).toHaveCount(1, { timeout: 8_000 });
  });

  for (const theme of ["light", "dark"]) {
    test(`axe is clean on every view (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await toSection(page);
      for (const view of VIEWS) {
        await tab(page, view).click();
        await settled(page, view);
        const results = await new AxeBuilder({ page }).include("[data-numbers]").analyze();
        const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(
          bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
          view,
        ).toEqual([]);
      }
    });
  }
});
