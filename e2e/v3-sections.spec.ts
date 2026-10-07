import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { thai } from "./thai";

// v3-07: Experience, How I work (notes), Tools, About, Contact.

/** Inline insets of a box: from its border box to the union of its visible children. */
async function insets(box: Locator) {
  return box.evaluate((el) => {
    const b = el.getBoundingClientRect();
    let left = Infinity;
    let right = -Infinity;
    const walk = (n: Element) => {
      for (const c of Array.from(n.children)) {
        const cs = getComputedStyle(c);
        if (cs.position === "absolute" || cs.visibility === "hidden" || cs.display === "none") continue;
        const r = c.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
      }
    };
    walk(el);
    return { left: Math.round(left - b.left), right: Math.round(b.right - right) };
  });
}

async function noteOffset(note: Locator) {
  return note.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { x: parseFloat(cs.getPropertyValue("--x")) || 0, y: parseFloat(cs.getPropertyValue("--y")) || 0 };
  });
}

async function scrollTo(page: Page, id: string) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
}

test.describe("experience", () => {
  test("every era has a card with an icon, its dates and a labelled stack list", async ({ page }) => {
    await page.goto("/");
    const eras = page.locator("#experience [data-era]");
    const n = await eras.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < n; i++) {
      const era = eras.nth(i);
      await expect(era.locator(".era-card .era-icon .doodle")).toHaveCount(1);
      await expect(era.locator(".era-icon")).toHaveAttribute("aria-hidden", "true");
      await expect(era.getByRole("list", { name: "Stack" })).toBeVisible();
    }
    await expect(page.locator(".era-thread path")).toHaveAttribute("d", /^M/);
  });

  test("era card insets are symmetric", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#experience .era-card").first();
    const { left, right } = await insets(card);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(left).toBeGreaterThanOrEqual(16);
  });
});

test.describe("how I work notes", () => {
  test("the agent demo no longer lives in this section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#practice .agent-demo")).toHaveCount(0);
    await expect(page.locator("#practice [data-note]")).toHaveCount(3);
  });

  test("arrow keys nudge the focused note, Tab moves on, Reset puts it back", async ({ page }) => {
    await page.goto("/");
    await scrollTo(page, "practice");
    const notes = page.locator("#practice [data-note]");
    const first = notes.first();
    await first.focus();
    await expect(first).toHaveAccessibleDescription("Arrow keys move this note.");
    const y0 = await page.evaluate(() => scrollY);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    const moved = await noteOffset(first);
    expect(moved.y).toBe(16);
    // 32px, or less where the board edge stops it (phones: the note is nearly board-wide).
    expect(moved.x).toBeGreaterThan(0);
    expect(moved.x).toBeLessThanOrEqual(32);
    // The arrows moved the note, not the page (an arrow scroll is 40px; allow late layout settling).
    expect(Math.abs((await page.evaluate(() => scrollY)) - y0)).toBeLessThan(20);
    // Keyboard is never trapped: Tab goes to the next note.
    await page.keyboard.press("Tab");
    await expect(notes.nth(1)).toBeFocused();
    await page.getByRole("button", { name: "Put the notes back" }).click();
    expect(await noteOffset(first)).toEqual({ x: 0, y: 0 });
  });

  test("a mouse drags a note and the board keeps it", async ({ page, isMobile }) => {
    test.skip(isMobile, "touch keeps the notes still so the page scrolls");
    await page.goto("/");
    await scrollTo(page, "practice");
    const note = page.locator("#practice [data-note]").nth(1);
    const box = (await note.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await noteOffset(note)).x).toBeLessThan(-100);

    // Dragged far past the board's edge, it stops inside the board.
    const b2 = (await note.boundingBox())!;
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await page.mouse.down();
    await page.mouse.move(b2.x + 3000, b2.y + 3000, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    const board = (await page.locator("#practice .notes-board").boundingBox())!;
    const end = (await note.boundingBox())!;
    expect(end.x + end.width).toBeLessThanOrEqual(board.x + board.width + 12);
    expect(end.y + end.height).toBeLessThanOrEqual(board.y + board.height + 12);
  });

  test("note insets are symmetric", async ({ page }) => {
    await page.goto("/");
    for (const note of await page.locator("#practice [data-note]").all()) {
      const pad = await note.evaluate((el) => {
        const cs = getComputedStyle(el);
        return [cs.paddingLeft, cs.paddingRight];
      });
      expect(pad[0]).toBe(pad[1]);
    }
  });
});

test.describe("tools", () => {
  test("two marquee rows run in opposite directions; the groups carry the content", async ({ page }) => {
    await page.goto("/");
    const marquees = page.locator("#skills .marquee");
    await expect(marquees).toHaveCount(2);
    await expect(page.locator("#skills .tools-marquees")).toHaveAttribute("aria-hidden", "true");
    await expect(marquees.nth(1)).toHaveAttribute("data-reverse", "true");
    await expect(page.locator("#skills dl dt")).toHaveCount(6);
  });

  test("reduced motion: still chips that wrap inside the page", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await scrollTo(page, "skills");
    const track = page.locator("#skills .marquee-track").first();
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    const width = page.viewportSize()!.width;
    const overflow = await page
      .locator("#skills .marquee-row:not([aria-hidden]) .tool-chip")
      .evaluateAll((els, w) => els.filter((e) => e.getBoundingClientRect().right > w).length, width);
    expect(overflow).toBe(0);
  });
});

test.describe("about", () => {
  test("the portrait slot is decorative art and the bio is real text", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#about .about-portrait")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#about .about-portrait .doodle")).toHaveCount(1);
    await expect(page.locator("#about")).toContainText("King to most people");
  });
});

test.describe("contact", () => {
  test("is a dark scene card with a kinetic heading, beam CTA and the Bangkok clock", async ({ page }) => {
    await page.goto("/?at=2026-10-07T07:42:00Z");
    const card = page.locator('#contact [data-scene="dark"].scene-card');
    await expect(card).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: "Have a system that has to work?" })).toBeVisible();
    await expect(card.locator("a.beam")).toHaveAttribute("href", /^mailto:/);
    await expect(card.locator(".contact-clock time")).toHaveText("14:42");
    await expect(card.locator(".contact-plane")).toHaveAttribute("aria-hidden", "true");
  });

  test("Thai heading keeps whole words", async ({ page }) => {
    await page.goto("/th");
    await expect(page.locator("#contact-title")).toHaveText(thai("มีระบบที่ต้องทำงานได้จริงไหม"));
    const units = await page.locator("#contact-title .kin-unit").allTextContents();
    expect(units.map((u) => u.replace(/⁠/g, ""))).toEqual(["มีระบบ", "ที่ต้อง", "ทำงานได้จริง", "ไหม"]);
  });

  test("buttons share one inset and the copy button is symmetric in every state", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await scrollTo(page, "contact");
    const buttons = page.locator("#contact .contact-btn, #contact .contact-cta, #contact button");
    for (const b of await buttons.all()) {
      const pad = await b.evaluate((el) => [getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight]);
      expect(pad).toEqual(["20px", "20px"]);
    }
    const copy = page.getByRole("button", { name: "Copy email" });
    for (const state of ["idle", "copied"]) {
      if (state === "copied") {
        await copy.click();
        await expect(page.getByRole("status").filter({ hasText: "Email copied" })).toHaveCount(1);
      }
      const { left, right } = await insets(copy);
      expect(Math.abs(left - right), state).toBeLessThanOrEqual(1);
    }
    for (const box of await page.locator("#contact .contact-door, #contact .contact-clock").all()) {
      const pad = await box.evaluate((el) => [getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight]);
      expect(pad[0]).toBe(pad[1]);
    }
  });
});

test.describe("sections a11y and layout", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const route of ["/", "/th"]) {
      test(`${route} ${scheme}: my sections are axe clean`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(route);
        const results = await new AxeBuilder({ page })
          .include(["#experience", "#practice", "#skills", "#about", "#contact"])
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  }

  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    test(`no sideways scroll at ${width}`, async ({ page, isMobile }) => {
      test.skip(isMobile, "viewport set explicitly");
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/th");
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
});
