import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Ticket v3-03: the hero (kinetic line, pill CTAs, glass chips, scale-down exit) and the numbers
// strip. The stage (ink desk and the gold KINZEN scenes) is covered by hero-fx and v4-hero specs.

const hero = (page: Page) => page.locator("[data-hero]");
const scaleOf = (page: Page) =>
  hero(page).evaluate((el) => {
    const m = getComputedStyle(el).transform;
    return m === "none" ? 1 : new DOMMatrixReadOnly(m).a;
  });
const scrollTo = (page: Page, y: number) => page.evaluate((y) => window.scrollTo(0, y), y);
/** Where the hero's exit is fully played: its bottom edge at 40% of the viewport, plus margin. */
const pastHero = (page: Page) =>
  hero(page).evaluate((el: HTMLElement) => el.offsetTop + el.offsetHeight - 0.4 * window.innerHeight + 40);

test.describe("hero v3", () => {
  test("kinetic line: every phrase is real text once for screen readers; the visible one cycles", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const line = page.locator("[data-hero-kinetic]");
    await expect(line).toContainText("I build");
    for (const phrase of ["AI phone and LINE assistants", "Shopify platforms", "agent workspaces", "developer tools"]) {
      await expect(line.locator(".sr-only")).toContainText(phrase);
    }
    await expect(line.locator(".cycler-stack")).toHaveAttribute("aria-hidden", "true");
    await expect(line.locator(".hero-underline")).toHaveAttribute("aria-hidden", "true");
    const on = () => line.locator(".cycler-item[data-on]").textContent();
    const first = await on();
    await expect.poll(on, { timeout: 6_000 }).not.toBe(first);
    // The underline redraws under the new phrase.
    await expect(line.locator(".hero-underline .draw-path[data-on]")).toHaveCount(1);
  });

  test("the underline sits under the visible phrase: same left edge, its width, just under the baseline", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const g = await page.locator("[data-hero-kinetic]").evaluate((p) => {
      const on = p.querySelector(".cycler-item[data-on]")!;
      const r = document.createRange();
      r.selectNodeContents(on);
      // The phrase may wrap (phones): the underline belongs to its last line.
      const rects = [...r.getClientRects()].filter((x) => x.width > 0);
      const tb = Math.max(...rects.map((x) => x.bottom));
      const last = rects.filter((x) => x.bottom > tb - 4);
      const tl = Math.min(...last.map((x) => x.left));
      const tw = Math.max(...last.map((x) => x.right)) - tl;
      const u = p.querySelector(".hero-underline path")!.getBoundingClientRect();
      return { tl, tw, tb, ul: u.left, uw: u.width, ut: u.top, fs: parseFloat(getComputedStyle(p).fontSize) };
    });
    expect(Math.abs(g.ul - g.tl)).toBeLessThan(0.25 * g.fs);
    expect(Math.abs(g.uw - g.tw)).toBeLessThan(0.1 * g.tw);
    // The stroke crosses the descender zone: within half an em of the text's bottom.
    expect(Math.abs(g.ut - g.tb)).toBeLessThan(0.5 * g.fs);
  });

  test("reduced motion: first phrase held, underline drawn, no scale on scroll", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const line = page.locator("[data-hero-kinetic]");
    const first = await line.locator(".cycler-item[data-on]").textContent();
    await expect(line.locator(".hero-underline .draw-path[data-on]")).toHaveCount(1);
    await page.waitForTimeout(3_500);
    expect(await line.locator(".cycler-item[data-on]").textContent()).toBe(first);
    await scrollTo(page, await pastHero(page));
    await page.waitForTimeout(600);
    expect(await scaleOf(page)).toBe(1);
  });

  test("CTAs: pills in the Contact order (email, CV, LinkedIn), 44px, the email one with the beam", async ({
    page,
  }) => {
    await page.goto("/");
    const ctas = hero(page).locator(".hero-cta");
    await expect(ctas).toHaveCount(3);
    expect(await ctas.nth(0).getAttribute("href")).toMatch(/^mailto:/);
    expect(await ctas.nth(1).getAttribute("href")).toMatch(/\/cv$/);
    expect(await ctas.nth(2).getAttribute("href")).toMatch(/linkedin\.com/);
    await expect(ctas.nth(0)).toHaveClass(/\bbeam\b/);
    for (let i = 0; i < 3; i++) {
      const box = await ctas.nth(i).evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          h: el.getBoundingClientRect().height,
          pl: cs.paddingLeft,
          pr: cs.paddingRight,
          r: parseFloat(cs.borderTopLeftRadius),
        };
      });
      expect(box.h).toBeGreaterThanOrEqual(44);
      expect(box.pl).toBe(box.pr);
      expect(box.r).toBeGreaterThanOrEqual(22);
    }
  });

  test("fact chips are rounded glass boxes with symmetric insets, and repeat nothing from the strip", async ({
    page,
  }) => {
    await page.goto("/");
    const chips = hero(page).locator(".hero-chip");
    await expect(chips).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const c = await chips.nth(i).evaluate((el) => {
        const cs = getComputedStyle(el);
        return [
          cs.paddingTop,
          cs.paddingRight,
          cs.paddingBottom,
          cs.paddingLeft,
          parseFloat(cs.borderTopLeftRadius),
        ] as const;
      });
      expect(new Set(c.slice(0, 4)).size).toBe(1);
      expect(c[4]).toBeGreaterThan(8);
    }
    const text = (await hero(page).locator(".hero-facts").textContent()) ?? "";
    expect(text).not.toMatch(/Years in production|Systems in this index/);
  });

  for (const width of [360, 1024, 1280, 1440]) {
    test(`chip values never break inside a word at ${width}px (EN and TH)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/th"]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        // Latin words must sit on one line; Thai may break only where the browser finds a word
        // boundary, so only space-free Latin runs are checked.
        const broken = await hero(page)
          .locator(".hero-chip dd")
          .evaluateAll((dds) =>
            dds.flatMap((dd) => {
              const out: string[] = [];
              const walk = document.createTreeWalker(dd, NodeFilter.SHOW_TEXT);
              for (let n = walk.nextNode(); n; n = walk.nextNode()) {
                const t = n as Text;
                for (const m of t.data.matchAll(/[A-Za-z0-9:]+/g)) {
                  const r = document.createRange();
                  r.setStart(t, m.index!);
                  r.setEnd(t, m.index! + m[0].length);
                  if (new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1) out.push(m[0]);
                }
              }
              return out;
            }),
          );
        expect(broken, path).toEqual([]);
      }
    });
  }

  test("hidden phrases are fully invisible at rest, not a faint blurred copy", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    // At rest (outside the 520 ms of a phrase change) every hidden phrase is visibility: hidden.
    const vis = () =>
      page
        .locator("[data-hero-kinetic] .cycler-item:not([data-on])")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).visibility));
    await expect.poll(vis, { timeout: 8_000, intervals: [200] }).toEqual(["hidden", "hidden", "hidden"]);
  });

  test("the beam runs on the pill's own edge, never outside it", async ({ page }) => {
    await page.goto("/");
    // The ring (src/motion/loops.tsx) covers exactly the pill's border box.
    const inset = await hero(page)
      .locator(".hero-cta-primary")
      .evaluate((el) => {
        const a = el.getBoundingClientRect();
        const r = el.querySelector(".beam-ring")!.getBoundingClientRect();
        return [r.top - a.top, a.right - r.right, a.bottom - r.bottom, r.left - a.left].map((v) => Math.round(v));
      });
    expect(inset).toEqual([0, 0, 0, 0]);
  });

  test("phone CTA row: the primary takes the full row, the two secondaries share the next", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const path of ["/", "/th"]) {
      await page.goto(path);
      const boxes = await hero(page)
        .locator(".hero-cta")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
      const row = hero(page).locator(".hero-ctas");
      const rw = (await row.boundingBox())!.width;
      expect(Math.abs(boxes[0].width - rw), path).toBeLessThan(1);
      expect(Math.abs(boxes[1].top - boxes[2].top), path).toBeLessThan(1);
      expect(boxes[1].top, path).toBeGreaterThan(boxes[0].bottom);
      expect(Math.abs(boxes[1].width - boxes[2].width), path).toBeLessThan(1);
    }
  });

  test("scale-down: the hero shrinks into a rounded card as it leaves, and is whole again at the top", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    expect(await scaleOf(page)).toBe(1);
    await scrollTo(page, await pastHero(page));
    await expect.poll(() => scaleOf(page)).toBeLessThan(0.96);
    expect(await scaleOf(page)).toBeGreaterThanOrEqual(0.9);
    const radius = await hero(page).evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(radius).toBeGreaterThan(10);
    // The masthead switch still happens with the scaled hero.
    await expect(page.locator("html")).toHaveAttribute("data-hero-passed", "");
    await scrollTo(page, 0);
    await expect.poll(() => scaleOf(page)).toBe(1);
    await expect(page.locator("html")).not.toHaveAttribute("data-hero-passed", "");
  });

  test("Back to home mid-page: the scale matches the restored scroll, then returns to 1 at the top", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const y = await pastHero(page);
    await scrollTo(page, y);
    await expect.poll(() => scaleOf(page)).toBeLessThan(0.96);
    await page.goto("/cv");
    await page.goBack();
    await expect(hero(page)).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBeGreaterThan(y - 60);
    await expect.poll(() => scaleOf(page)).toBeLessThan(0.96);
    await scrollTo(page, 0);
    await expect.poll(() => scaleOf(page)).toBe(1);
  });

  test("a resize while the hero is scaled refits the stage onto the same layout box as at the top", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    type Slot = { x: number; y: number; w: number; h: number };
    const slot = () =>
      page.evaluate(
        () => (window as Window & { __kzStage?: { slot: Slot; running: boolean } }).__kzStage?.slot ?? null,
      );
    await expect
      .poll(() => page.evaluate(() => !!(window as Window & { __kzStage?: unknown }).__kzStage), { timeout: 10_000 })
      .toBe(true);
    const size = page.viewportSize()!;
    const b = { width: size.width - 40, height: size.height };

    // Scaled (mid exit), then resize: the stage measures while the hero is transformed.
    await scrollTo(page, Math.round((await pastHero(page)) * 0.6));
    await expect.poll(() => scaleOf(page)).toBeLessThan(0.99);
    await page.setViewportSize(b);
    await page.waitForTimeout(400);
    const scaled = await slot();

    // The same size at the top (scale 1).
    await scrollTo(page, 0);
    await expect.poll(() => scaleOf(page)).toBe(1);
    await page.setViewportSize(size);
    await page.waitForTimeout(400);
    await page.setViewportSize(b);
    await page.waitForTimeout(400);
    const top = await slot();

    for (const k of ["x", "y", "w", "h"] as const) expect(Math.abs(scaled![k] - top![k])).toBeLessThan(1);
  });

  test("no layout shift on load or while the phrases cycle", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { __cls?: number; __shifts?: string[] };
      w.__cls = 0;
      w.__shifts = [];
      type Shift = PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources: { node?: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[];
      };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as Shift[]) {
          if (e.hadRecentInput) continue;
          w.__cls! += e.value;
          for (const src of e.sources) {
            const el = src.node instanceof Element ? src.node : src.node?.parentElement;
            const r = (x: DOMRectReadOnly) => [x.x, x.y, x.width, x.height].map(Math.round).join(",");
            w.__shifts!.push(
              `${Math.round(e.startTime)}ms ${el?.className ?? "?"} ${r(src.previousRect)} -> ${r(src.currentRect)}`,
            );
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForTimeout(6_500);
    const { cls, shifts } = await page.evaluate(() => {
      const w = window as Window & { __cls?: number; __shifts?: string[] };
      return { cls: w.__cls, shifts: w.__shifts };
    });
    expect(cls, shifts?.join("\n")).toBe(0);
  });

  for (const [width, height] of [
    [844, 390],
    [932, 430],
  ] as const) {
    test(`landscape phone ${width}x${height}: wordmark left, name + kinetic line + CTAs right, all in the first screen`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      for (const path of ["/", "/th"]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const g = await page.evaluate(() => {
          const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
          const ctas = [...document.querySelectorAll(".hero-cta")].map((e) => e.getBoundingClientRect());
          const wm = r("[data-hero-wordmark]");
          const st = r(".fx-stage");
          return {
            wmRight: wm.right,
            wmBottom: wm.bottom,
            stageBottom: st.bottom,
            titleLeft: r(".hero-title").left,
            kineticLeft: r("[data-hero-kinetic]").left,
            ctaBottom: Math.max(...ctas.map((c) => c.bottom)),
            ctaTop: Math.min(...ctas.map((c) => c.top)),
            over: document.documentElement.scrollWidth - innerWidth,
          };
        });
        expect(g.titleLeft, path).toBeGreaterThan(g.wmRight);
        expect(g.kineticLeft, path).toBeGreaterThan(g.wmRight);
        expect(g.ctaBottom, path).toBeLessThanOrEqual(height);
        // The stage box covers the wordmark (the scenes measure the DOM wordmark inside it).
        expect(g.stageBottom, path).toBeGreaterThan(g.wmBottom);
        expect(g.over, path).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px (EN and TH)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/th"]) {
        await page.goto(path);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(over, path).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const theme of ["light", "dark"] as const) {
    test(`hero and numbers are axe clean (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      const results = await new AxeBuilder({ page })
        .include("[data-hero]")
        .include("[data-numbers]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test.describe("numbers section", () => {
  // The section itself (switcher, five views) is covered by e2e/v4-numbers.spec.ts; this checks
  // it still opens right after the hero with the approved figures as real text.
  test("right after the hero: the board with the four approved figures", async ({ page }) => {
    await page.goto("/");
    const numbers = page.locator("[data-numbers]");
    await expect(numbers.locator(".sf-row")).toHaveCount(4);
    expect(await numbers.locator(".sf-fig > .sr-only").allTextContents()).toEqual(["7", "10+", "6,000+", "500", "37"]);
    const heroBottom = await hero(page).evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
    const numbersTop = await numbers.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(numbersTop).toBeGreaterThanOrEqual(heroBottom - 1);
  });

  test("Thai labels render (no joiners), the figures stay the same", async ({ page }) => {
    await page.goto("/th");
    const numbers = page.locator("[data-numbers]");
    await expect(numbers.locator(".sf-row")).toHaveCount(4);
    expect(await numbers.locator(".sf-fig > .sr-only").allTextContents()).toEqual(["7", "10+", "6,000+", "500", "37"]);
    const text = (await numbers.textContent()) ?? "";
    expect(text.replace(/\s+/g, "")).toContain("ปีที่สร้างระบบใช้งานจริง");
    expect(text).not.toMatch(/\u2060|\u2014|\u2013/);
  });
});

