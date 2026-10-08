import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// v4 play section: four lab scenes (night desk, gold toss, thock, one drop) behind a tab switcher,
// one live WebGL scene at a time. Auto-advance runs only while the section is in view and idle and
// stops for the visit after a pick or a touch inside a scene. Sound is on by default and heard
// after the first gesture; the toggle's choice persists. `?play-advance=<s>` shortens the 30 s period.

const SCENES = ["night-desk", "gold-toss", "thock", "one-drop"] as const;

// Headless CI draws WebGL in software (SwiftShader): the scenes then run as stills, but building
// each one (shaders, shadow maps, environment maps) still blocks for seconds. Generous waits.
test.describe.configure({ timeout: 180_000 });
const SLOW = { timeout: 45_000, intervals: [100] };

const tab = (page: Page, id: string) => page.locator(`#play [role=tab][data-scene-id="${id}"]`);
const selected = (page: Page) => page.locator('#play [role=tab][aria-selected="true"]').getAttribute("data-scene-id");
const pane = (page: Page) => page.locator("#play .iv-pane");

async function toSection(page: Page) {
  // Centred, so the fixed header never sits over the switcher.
  await page.locator("#play .iv").evaluate((el) => el.scrollIntoView({ block: "center" }));
  // Nobody pointing inside the section.
  await page.mouse.move(2, 2).catch(() => {});
}

/**
 * `id` is the scene on stage: its pane is up and it drew, either live (a canvas) or, where the
 * browser only has a software renderer (headless CI), as its picture.
 */
async function live(page: Page, id: string) {
  await expect(pane(page)).toHaveAttribute("data-scene-id", id, { timeout: 45_000 });
  await expect(pane(page).locator("canvas, .iv-picture img").first()).toBeAttached({ timeout: 45_000 });
}

/**
 * Counts live WebGL contexts made in the play section: every context the page creates is tracked,
 * a lost one (scene teardown) leaves the count, and a canvas still attached outside #play (the
 * hero's) is not this section's. A detached canvas whose context was never lost counts: a leak.
 */
async function trackContexts(page: Page) {
  await page.addInitScript(() => {
    const made: { canvas: HTMLCanvasElement; lost: boolean }[] = [];
    (window as unknown as { __gl: typeof made }).__gl = made;
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const ctx = (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      if (ctx && /webgl/.test(type) && !made.some((m) => m.canvas === this)) {
        const rec = { canvas: this, lost: false };
        made.push(rec);
        this.addEventListener("webglcontextlost", () => (rec.lost = true));
        // A teardown loses the context on purpose: count it gone at the call, not at the event.
        const gl = ctx as WebGLRenderingContext;
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) {
          const lose = ext.loseContext.bind(ext);
          ext.loseContext = () => {
            rec.lost = true;
            lose();
          };
        }
      }
      return ctx;
    } as typeof orig;
  });
}
const sectionContexts = (page: Page) =>
  page.evaluate(() => {
    const made = (window as unknown as { __gl: { canvas: HTMLCanvasElement; lost: boolean }[] }).__gl;
    const play = document.querySelector("#play");
    return made.filter((m) => !m.lost && (!m.canvas.isConnected || play?.contains(m.canvas))).length;
  });

test.describe("server render", () => {
  test("without JavaScript: heading, intro, four tabs, the night desk's still and its hint", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    const section = page.locator("#play");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Play");
    await expect(section.getByRole("tab")).toHaveCount(4);
    await expect(section.getByRole("tab", { selected: true })).toHaveText("Night desk");
    const still = section.locator(".iv-poster img");
    await expect(still).toHaveAttribute("alt", /hand-drawn 3D desk at night/);
    await expect(section.locator(".iv-hint[data-on]")).toContainText("fictional");
    await ctx.close();
  });

  test("the stills are served", async ({ request }) => {
    for (const f of SCENES.flatMap((id) => [`${id}-desk.webp`, `${id}-phone.webp`])) {
      const res = await request.get(`/play/${f}`);
      expect(res.ok(), f).toBe(true);
      expect(res.headers()["content-type"]).toContain("image/webp");
    }
  });

  test("Thai: the same section in Thai", async ({ request }) => {
    const html = await (await request.get("/th")).text();
    const body = html.slice(html.indexOf('id="play"'));
    expect(body).toContain("ลองเล่น");
    expect(body).toContain("โต๊ะตอนดึก");
    expect(body).toContain("ตัวอย่างสมมติ");
  });

  test("the play section sits after the tools and before about and contact", async ({ page }) => {
    await page.goto("/");
    const order = await page.locator("main section[id]").evaluateAll((els) => els.map((e) => e.id));
    const at = (id: string) => order.indexOf(id);
    expect(at("play")).toBeGreaterThan(at("skills"));
    expect(at("play")).toBeLessThan(at("contact"));
  });
});

test.describe("scenes", () => {
  test("the night desk is the default scene; no scene loads before the section nears", async ({ page }) => {
    await page.goto("/?play-advance=2");
    await page.waitForTimeout(2_500);
    expect(await selected(page)).toBe("night-desk");
    await expect(pane(page).locator("canvas")).toHaveCount(0);
    await toSection(page);
    await live(page, "night-desk");
  });

  test("tabs: arrows, Home and End pick a scene in order; one tab stop; the panel follows", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "keyboard path is a desktop concern");
    await page.goto("/");
    await toSection(page);
    const tabs = page.locator("#play [role=tab]");
    await expect(tabs).toHaveCount(4);
    expect(await tabs.evaluateAll((els) => els.map((e) => e.getAttribute("data-scene-id")))).toEqual([...SCENES]);
    await expect(page.locator("#play [role=tablist]")).toHaveAccessibleName("Scenes to play");
    await tab(page, "night-desk").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "gold-toss")).toBeFocused();
    await expect(tab(page, "gold-toss")).toHaveAttribute("aria-selected", "true");
    await live(page, "gold-toss");
    await expect(page.locator("#play [role=tabpanel]")).toHaveAttribute(
      "aria-labelledby",
      (await tab(page, "gold-toss").getAttribute("id"))!,
    );
    await page.keyboard.press("End");
    await live(page, "one-drop");
    await page.keyboard.press("ArrowRight");
    await live(page, "night-desk");
    await page.keyboard.press("ArrowLeft");
    await live(page, "one-drop");
    await page.keyboard.press("Home");
    await live(page, "night-desk");
    expect(await tabs.evaluateAll((els) => els.map((e) => e.getAttribute("tabindex")))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
    ]);
  });

  test("auto-advance visits the scenes in order, only while in view and nobody points at it", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "hover holds: desktop");
    await page.goto("/?play-advance=3");
    await page.waitForTimeout(4_000);
    expect(await selected(page)).toBe("night-desk");
    await toSection(page);
    await expect(page.locator("#play .iv-progress")).toHaveCount(1);
    await expect.poll(() => selected(page), SLOW).toBe("gold-toss");
    await expect(page.locator('#play [aria-live="polite"]').first()).toHaveText("Now showing: Gold toss");
    // Hovering inside holds it.
    await page.locator("#play .iv-hints").hover();
    await page.waitForTimeout(4_500);
    expect(await selected(page)).toBe("gold-toss");
    await page.mouse.move(2, 2);
    await expect.poll(() => selected(page), SLOW).toBe("thock");
    await expect.poll(() => selected(page), SLOW).toBe("one-drop");
    await expect.poll(() => selected(page), SLOW).toBe("night-desk");
    // Scrolled away (and the observer has seen it): it holds.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("#play .iv")).not.toHaveAttribute("data-in-view", { timeout: 30_000 });
    const away = await selected(page);
    await page.waitForTimeout(4_500);
    expect(await selected(page)).toBe(away);
  });

  test("a pick stops auto-advance for the visit", async ({ page }) => {
    await page.goto("/?play-advance=1");
    await toSection(page);
    await tab(page, "thock").click();
    await page.mouse.move(2, 2).catch(() => {});
    await live(page, "thock");
    await expect(page.locator("#play .iv-progress")).toHaveCount(0);
    await page.waitForTimeout(2_500);
    expect(await selected(page)).toBe("thock");
    await page.reload();
    await toSection(page);
    await page.waitForTimeout(2_500);
    expect(await selected(page)).toBe("night-desk");
    await expect(page.locator("#play .iv-progress")).toHaveCount(0);
  });

  test("playing inside a scene stops auto-advance for the visit", async ({ page }) => {
    await page.goto("/?play-advance=6");
    await toSection(page);
    await live(page, "night-desk");
    const box = (await page.locator("#play .iv-stage").boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6);
    await page.mouse.move(2, 2);
    await expect(page.locator("#play .iv-progress")).toHaveCount(0, { timeout: 30_000 });
    const played = await selected(page);
    await page.waitForTimeout(8_000);
    expect(await selected(page)).toBe(played);
    expect(await page.evaluate(() => sessionStorage.getItem("kp-play-picked"))).toBe("1");
  });

  test("never more than one live WebGL context in the section, through a full cycle", async ({ page, isMobile }) => {
    test.skip(isMobile, "one run is enough");
    await trackContexts(page);
    await page.goto("/?play-advance=2.5");
    await toSection(page);
    let max = 0;
    const seen = new Set<string>();
    const end = Date.now() + 120_000;
    while (Date.now() < end && seen.size < 4) {
      max = Math.max(max, await sectionContexts(page));
      const s = await selected(page);
      if (s) seen.add(s);
      await page.waitForTimeout(80);
    }
    expect([...seen].sort()).toEqual([...SCENES].sort());
    // 1 on a GPU; 0 under a software renderer (each scene gives its context back at once).
    expect(max).toBeLessThanOrEqual(1);
    // Scrolled far away, the live scene goes and frees its context.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => sectionContexts(page), { timeout: 30_000 }).toBe(0);
  });

  test("reduced motion: no auto-advance, the server still stays until the scene draws, scenes still pick", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?play-advance=1");
    await toSection(page);
    await expect(page.locator("#play .iv-progress")).toHaveCount(0);
    await expect(pane(page)).not.toHaveAttribute("data-state");
    await page.waitForTimeout(2_000);
    expect(await selected(page)).toBe("night-desk");
    for (const id of ["one-drop", "thock", "gold-toss", "night-desk"]) {
      await tab(page, id).click();
      await live(page, id);
    }
  });
});

test.describe("sound", () => {
  /** Every AudioContext the page makes, so the test can read its state. */
  async function trackAudio(page: Page) {
    await page.addInitScript(() => {
      const made: AudioContext[] = [];
      (window as unknown as { __ac: AudioContext[] }).__ac = made;
      const Orig = window.AudioContext;
      window.AudioContext = class extends Orig {
        constructor(o?: AudioContextOptions) {
          super(o);
          made.push(this);
        }
      } as typeof AudioContext;
    });
  }
  const states = (page: Page) =>
    page.evaluate(() => (window as unknown as { __ac: AudioContext[] }).__ac.map((c) => c.state));

  test("the toggle starts on, and its choice persists across a reload", async ({ page }) => {
    await page.goto("/");
    await toSection(page);
    const toggle = page.locator("#play .iv-sound");
    await expect(toggle).toHaveAccessibleName("Sound");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await toSection(page);
    await live(page, "night-desk");
    await expect(page.locator("#play .iv-sound")).toHaveAttribute("aria-pressed", "false");
    await page.locator("#play .iv-sound").click();
    await expect(page.locator("#play .iv-sound")).toHaveAttribute("aria-pressed", "true");
  });

  test("the audio context runs after a gesture and pauses off screen", async ({ page }) => {
    await trackAudio(page);
    await page.goto("/");
    await toSection(page);
    await live(page, "night-desk");
    // A gesture anywhere on the page (here the section's own hint text).
    await page.locator("#play .iv-hints").click();
    await expect.poll(async () => (await states(page)).includes("running"), { timeout: 30_000 }).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await states(page)).includes("running"), { timeout: 30_000 }).toBe(false);
    await toSection(page);
    await expect.poll(async () => (await states(page)).includes("running"), { timeout: 30_000 }).toBe(true);
  });
});

test.describe("layout and accessibility", () => {
  test("no horizontal overflow at 320, 390, 768 and 1440", async ({ browser }) => {
    for (const width of [320, 390, 768, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      for (const lang of ["en", "th"]) {
        await page.goto(`/${lang}`);
        await toSection(page);
        await live(page, "night-desk");
        const m = await page.evaluate(() => {
          const r = document.querySelector("#play .iv")!.getBoundingClientRect();
          const tabs = document.querySelector("#play .iv-tabs")!.getBoundingClientRect();
          return { sw: document.documentElement.scrollWidth, vw: innerWidth, right: r.right, tabs: tabs.right };
        });
        expect(m.sw, `${width} ${lang} page`).toBeLessThanOrEqual(m.vw);
        expect(m.right, `${width} ${lang} section`).toBeLessThanOrEqual(m.vw);
        expect(m.tabs, `${width} ${lang} tabs on one line inside`).toBeLessThanOrEqual(m.vw);
      }
      await ctx.close();
    }
  });

  for (const theme of ["light", "dark"]) {
    test(`axe is clean on every scene (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await toSection(page);
      for (const id of SCENES) {
        await tab(page, id).click();
        await live(page, id);
        const results = await new AxeBuilder({ page }).include("#play").analyze();
        expect(results.violations, id).toEqual([]);
      }
    });
  }
});
