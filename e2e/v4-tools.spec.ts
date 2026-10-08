import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// v4 tools: one section, four switchable views of the same stack (bento of loops, logo wall,
// orbit, pipeline). A quiet tab switcher auto-advances while the section is in view and idle,
// stops for the visit after a pick, and keeps one stage height per breakpoint.
// `?tools-advance=<s>` shortens the 20 s period (debug only) so these run in seconds.

const VIEWS = ["bento", "spotlight", "orbit", "pipeline"] as const;
/** Each view's root inside its pane. */
const ROOT = { bento: ".bl", spotlight: ".ls", orbit: ".lo", pipeline: ".sp" } as const;

/** Every tool name in site.ts (EN), as the server must render it. */
const TOOLS = [
  "TypeScript",
  "Node.js",
  "NestJS",
  "Fastify",
  "GraphQL",
  "Kafka",
  "Python",
  "Hexagonal and event-driven design",
  "React",
  "Next.js",
  "Vite",
  "Tailwind CSS",
  "Tauri",
  "MongoDB",
  "PostgreSQL",
  "Redis",
  "SQLite",
  "Docker",
  "Kubernetes (GKE)",
  "Fly.io",
  "Cloudflare",
  "Azure",
  "Playwright",
  "Vitest",
  "Jest",
  "GitHub Actions",
  "GitLab CI/CD",
  "Shopify Admin and Storefront APIs",
  "Liquid",
  "LINE Messaging API",
  "LIFF",
  "Twilio Media Streams",
  "Claude Code",
  "Codex",
  "Gemini on Vertex AI",
  "Anthropic API",
  "Real-time speech-to-text",
  "LLM evals",
];

const tab = (page: Page, view: string) => page.locator(`#skills [role=tab][data-view="${view}"]`);
const selected = (page: Page) => page.locator('#skills [role=tab][aria-selected="true"]').getAttribute("data-view");
const activePane = (page: Page) => page.locator("#skills .tv-pane:not([data-state=out])");

async function toSection(page: Page) {
  // Centred, so the fixed header never sits over the switcher.
  await page.locator("#skills .tv").evaluate((el) => el.scrollIntoView({ block: "center" }));
  // Nobody pointing inside the section.
  await page.mouse.move(2, 2).catch(() => {});
}

/** Wait until `view` is the only pane on stage (its crossfade finished). */
async function settled(page: Page, view: string) {
  await expect(page.locator("#skills .tv-pane")).toHaveCount(1);
  await expect(activePane(page)).toHaveAttribute("data-view", view);
  await expect(activePane(page).locator(ROOT[view as keyof typeof ROOT])).toBeVisible();
}

test.describe("server render", () => {
  test("without JavaScript the first view is complete: every group and every tool name", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    const section = page.locator("#skills");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Tools I reach for");
    await expect(section.getByRole("tablist")).toBeVisible();
    await expect(section.getByRole("tab")).toHaveCount(4);
    await expect(section.locator(".bl-tile h3")).toHaveCount(6);
    const text = await section.innerText();
    for (const name of TOOLS) expect(text, name).toContain(name);
    await ctx.close();
  });

  test("Thai: the same stack, labels in Thai", async ({ request }) => {
    const html = await (await request.get("/th")).text();
    const body = html.slice(html.indexOf('id="skills"'));
    expect(body).toContain("ระบบหลังบ้าน");
    expect(body).toContain("สถาปัตยกรรม hexagonal และ event-driven");
    expect(body).toContain("Shopify Admin API และ Storefront API");
  });
});

test.describe("switcher", () => {
  test("tabs: arrows, Home and End pick a view; one tab stop; the panel follows", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard path is a desktop concern");
    await page.goto("/");
    await toSection(page);
    const tabs = page.locator("#skills [role=tab]");
    await expect(tabs).toHaveCount(4);
    await expect(page.locator("#skills [role=tablist]")).toHaveAccessibleName("Ways to show the tools");
    await tab(page, "bento").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "spotlight")).toBeFocused();
    await expect(tab(page, "spotlight")).toHaveAttribute("aria-selected", "true");
    await settled(page, "spotlight");
    await expect(page.locator("#skills [role=tabpanel]")).toHaveAttribute(
      "aria-labelledby",
      (await tab(page, "spotlight").getAttribute("id"))!,
    );
    await page.keyboard.press("End");
    await settled(page, "pipeline");
    await page.keyboard.press("ArrowRight");
    await settled(page, "bento");
    await page.keyboard.press("ArrowLeft");
    await settled(page, "pipeline");
    await page.keyboard.press("Home");
    await settled(page, "bento");
    // Roving tab stop: only the selected tab is in the tab order.
    expect(await tabs.evaluateAll((els) => els.map((e) => e.getAttribute("tabindex")))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
    ]);
  });

  test("auto-advance runs only while the section is in view and nobody points at it", async ({ page, isMobile }) => {
    test.skip(isMobile, "hover holds: desktop");
    await page.goto("/?tools-advance=3");
    // Out of view: no advance.
    await page.waitForTimeout(4_000);
    expect(await selected(page)).toBe("bento");
    await toSection(page);
    await expect(page.locator("#skills .tv-progress")).toHaveCount(1);
    await expect.poll(() => selected(page), { timeout: 8_000, intervals: [100] }).toBe("spotlight");
    // Hovering inside holds it.
    await page.locator("#skills .tv-stage").hover();
    // The change was announced.
    await expect(page.locator('#skills [aria-live="polite"]')).toHaveText("Now showing: Logo wall");
    await settled(page, "spotlight");
    await page.waitForTimeout(4_500);
    expect(await selected(page)).toBe("spotlight");
    // Pointer leaves: it carries on.
    await page.mouse.move(2, 2);
    await expect.poll(() => selected(page), { timeout: 8_000, intervals: [100] }).toBe("orbit");
    // Scrolled away: it holds again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(4_500);
    expect(await selected(page)).toBe("orbit");
  });

  test("a pick stops auto-advance for the rest of the visit", async ({ page }) => {
    await page.goto("/?tools-advance=1");
    await toSection(page);
    await tab(page, "orbit").click();
    await page.mouse.move(2, 2).catch(() => {});
    await settled(page, "orbit");
    await expect(page.locator("#skills .tv-progress")).toHaveCount(0);
    await page.waitForTimeout(3_000);
    expect(await selected(page)).toBe("orbit");
    expect(await page.evaluate(() => sessionStorage.getItem("kp-tools-view-picked"))).toBe("1");
    // A reload in the same visit opens on the first view and stays there.
    await page.reload();
    await toSection(page);
    await page.waitForTimeout(3_000);
    expect(await selected(page)).toBe("bento");
    await expect(page.locator("#skills .tv-progress")).toHaveCount(0);
  });

  test("touch inside holds the timer", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto("/?tools-advance=2");
    await toSection(page);
    await page.locator("#skills .tv-hints").tap();
    await page.waitForTimeout(3_500);
    expect(await selected(page)).toBe("bento");
    await ctx.close();
  });

  test("reduced motion: no auto-advance, no crossfade, the switcher still works", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?tools-advance=1");
    await toSection(page);
    await expect(page.locator("#skills .tv-progress")).toHaveCount(0);
    await page.waitForTimeout(2_500);
    expect(await selected(page)).toBe("bento");
    for (const view of ["pipeline", "orbit", "spotlight", "bento"]) {
      await tab(page, view).click();
      // Straight swap: never two panes, never a fading one.
      await expect(page.locator("#skills .tv-pane[data-state]")).toHaveCount(0);
      await settled(page, view);
    }
    // The orbit still: no pause control (nothing moves), every group in the legend.
    await tab(page, "orbit").click();
    await settled(page, "orbit");
    await expect(activePane(page).getByRole("button", { name: "Pause motion" })).toHaveCount(0);
    await expect(activePane(page).locator(".lo-row-btn")).toHaveCount(6);
  });
});

test.describe("layout", () => {
  for (const width of [320, 390, 768, 1440]) {
    test(`${width}px: every view fits its stage and nothing scrolls sideways`, async ({ browser, isMobile }) => {
      test.skip(isMobile, "one run covers every width");
      test.setTimeout(90_000);
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      for (const route of ["/", "/th"]) {
        await page.goto(route);
        await toSection(page);
        const stageH = await page.locator("#skills .tv-stage").evaluate((el) => el.getBoundingClientRect().height);
        for (const view of VIEWS) {
          await tab(page, view).click();
          await page.mouse.move(2, 2);
          await settled(page, view);
          await page.waitForTimeout(300);
          const m = await activePane(page).evaluate((pane) => {
            const root = pane.firstElementChild as HTMLElement;
            return {
              content: root.scrollHeight,
              stage: (pane.parentElement as HTMLElement).getBoundingClientRect().height,
              sw: document.documentElement.scrollWidth,
              vw: document.documentElement.clientWidth,
            };
          });
          expect(m.stage, `${route} ${view}: stage height`).toBe(stageH);
          expect(m.content, `${route} ${view}: content height`).toBeLessThanOrEqual(m.stage + 1);
          expect(m.sw, `${route} ${view}: page width`).toBeLessThanOrEqual(m.vw);
        }
      }
      await ctx.close();
    });
  }

  test("switching views never moves what comes after the section", async ({ page }) => {
    await page.goto("/");
    await toSection(page);
    const top = () => page.locator("#about").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const before = await top();
    for (const view of ["spotlight", "orbit", "pipeline", "bento"]) {
      await tab(page, view).click();
      await settled(page, view);
      expect(await top(), view).toBe(before);
    }
  });
});

test.describe("views", () => {
  test("only the active view is mounted; its canvases leave with it", async ({ page }) => {
    await page.goto("/");
    await toSection(page);
    await tab(page, "orbit").click();
    await settled(page, "orbit");
    await expect(page.locator("#skills canvas")).toHaveCount(2);
    await expect(activePane(page).locator("canvas")).toHaveCount(2);
    await tab(page, "pipeline").click();
    await settled(page, "pipeline");
    await expect(page.locator("#skills canvas")).toHaveCount(0);
    await expect(page.locator("#skills .lo")).toHaveCount(0);
  });

  test("each view loads as its own chunk, on demand", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "script") scripts.push(r.url());
    });
    await page.goto("/");
    const before = scripts.length;
    await toSection(page);
    await tab(page, "spotlight").click();
    await settled(page, "spotlight");
    await tab(page, "orbit").click();
    await settled(page, "orbit");
    expect(scripts.length).toBeGreaterThan(before);
  });

  test("the bento lights a tool in its brand colour on its beat", async ({ page }) => {
    await page.goto("/");
    await toSection(page);
    await expect(page.locator("#skills .bl-chip[data-lit]").first()).toBeAttached({ timeout: 10_000 });
    const lit = page.locator("#skills .bl-chip[data-lit]:has(svg.tool-mark:not(.tool-mark-practice))").first();
    await expect(lit).toBeAttached({ timeout: 10_000 });
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
        const results = await new AxeBuilder({ page }).include("#skills").analyze();
        const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(bad, view).toEqual([]);
      }
    });
  }
});

// Tool marks (carried over from the marquee era): official brand marks, decorative next to
// real-text names, in the label's tone at rest and the brand colour on hover, focus or tap.
test.describe("tool marks", () => {
  test("bento chips carry a decorative mark or a deliberate text-only name", async ({ page }) => {
    await page.goto("/");
    const chips = page.locator("#skills .bl-chip");
    await expect(chips).toHaveCount(38);
    const ts = chips.filter({ hasText: /^TypeScript$/ });
    await expect(ts.locator("svg.tool-mark")).toHaveAttribute("aria-hidden", "true");
    await expect(ts.locator("svg.tool-mark use")).toHaveAttribute("href", /\/tool-logos\.svg\?v=\w+#typescript$/);
    await expect(ts.locator("svg.tool-mark")).toHaveAttribute("style", /--brand:\s*#3178C6/);
    await expect(chips.filter({ hasText: /^Next\.js$/ }).locator("svg")).toHaveAttribute(
      "style",
      /--brand:\s*currentColor/,
    );
    for (const name of ["Azure", "Codex", "Playwright", "Tauri", "Twilio Media Streams"]) {
      await expect(chips.filter({ hasText: new RegExp(`^${name}$`) }).locator("svg")).toHaveCount(0);
    }
    await expect(chips.filter({ hasText: "Hexagonal" }).locator("svg")).toHaveClass(/tool-mark-practice/);
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

  test("marks rest in the label's tone and show the brand colour on hover", async ({ page, isMobile }) => {
    test.skip(isMobile, "no hover on touch; the tap test covers phones");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const chip = page.locator("#skills .bl-chip").filter({ hasText: /^TypeScript$/ });
    const fill = () => chip.locator("svg.tool-mark").evaluate((el) => getComputedStyle(el).fill);
    const rest = await fill();
    expect(rest).not.toBe("rgb(49, 120, 198)");
    expect(rest).toMatch(/\/ 0\.72\)$/);
    await chip.hover();
    await expect.poll(fill).toBe("rgb(49, 120, 198)");
  });

  test("a tap shows the brand colour, another tap moves it, and it clears by itself", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const chips = page.locator("#skills .bl-t-ai .bl-chip[data-tool-host]");
    const claude = chips.filter({ hasText: /^Claude Code$/ });
    const gemini = chips.filter({ hasText: /^Gemini on Vertex AI$/ });
    await claude.scrollIntoViewIfNeeded();
    await claude.tap();
    await expect(claude).toHaveAttribute("data-tool-on", "");
    await expect
      .poll(() => claude.locator("svg").evaluate((el) => getComputedStyle(el).fill))
      .toBe("rgb(217, 119, 87)");
    await gemini.tap();
    await expect(claude).not.toHaveAttribute("data-tool-on");
    await expect(gemini).toHaveAttribute("data-tool-on", "");
    await expect(gemini).not.toHaveAttribute("data-tool-on", { timeout: 4_000 });
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
    test(`axe is clean on a case page's pills (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/work/yimwhan-ai");
      const results = await new AxeBuilder({ page }).include(".pj-pills").analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
