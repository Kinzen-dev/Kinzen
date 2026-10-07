import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { thai } from "./thai";

/**
 * Audit track a-02 (platform): TECH-01/02 footer, TECH-03 og:url, TECH-06 privacy page,
 * TECH-08 CSP, TECH-09 content dates, TECH-10 shortcuts, TECH-11 marquee pause.
 */

const SLUGS = ["yimwhan-ai", "anymind-ec-platform", "helm", "ronglen", "visual-qa-harness", "cadence"];
const NEUTRAL = ["/", "/work", "/cv", ...SLUGS.map((s) => `/work/${s}`), "/privacy"];
const th = (path: string) => (path === "/" ? "/th" : `/th${path}`);
/** The 18 content pages, the privacy page in both languages, and the 404 in both. */
const ROUTES = [...NEUTRAL.flatMap((p) => [p, th(p)]), "/no-such-page", "/th/no-such-page"];

/**
 * Locally there is no Vercel edge, so the analytics scripts 404. Stand in for them with scripts
 * that do what the real ones do at the CSP level: load from a first-party path and report to a
 * first-party endpoint (fetch keepalive and sendBeacon), so connect-src is exercised too.
 */
async function standInAnalytics(page: Page) {
  const intake: string[] = [];
  await page.route("**/_vercel/insights/script.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'fetch("/_vercel/insights/view",{method:"POST",keepalive:true,body:"{}"}).catch(()=>{})',
    }),
  );
  await page.route("**/_vercel/speed-insights/script.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'navigator.sendBeacon("/_vercel/speed-insights/vitals","{}")',
    }),
  );
  await page.route(/\/_vercel\/(insights\/view|speed-insights\/vitals)$/, (route) => {
    intake.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 204 });
  });
  return intake;
}

/** Every CSP violation, enforced or report-only, from the DOM event and from the console. */
async function watchCsp(page: Page) {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (/Content[ -]Security[ -]Policy|\[Report Only\]/i.test(msg.text())) messages.push(msg.text());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      const w = window as unknown as { __csp?: string[] };
      (w.__csp ??= []).push(`${e.disposition} ${e.effectiveDirective} ${e.blockedURI}`);
    });
  });
  return async () => [...messages, ...((await page.evaluate(() => (window as { __csp?: string[] }).__csp)) ?? [])];
}

async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(600);
}

test.describe("CSP (TECH-08)", () => {
  test("headers: enforced baseline plus the report-only origin policy", async ({ request }) => {
    for (const path of ["/", "/th/privacy", "/no-such-page"]) {
      const headers = (await request.get(path)).headers();
      expect(headers["content-security-policy"]).toBe(
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      );
      const report = headers["content-security-policy-report-only"];
      expect(report).toContain("default-src 'self'");
      expect(report).toContain("connect-src 'self'");
      expect(report).not.toMatch(/https?:|\*/);
      expect(headers["x-frame-options"]).toBe("DENY");
    }
  });

  for (const theme of ["light", "dark"] as const) {
    for (const route of ROUTES) {
      test(`${route} (${theme}): no CSP violation, no third-party request`, async ({ page, baseURL }) => {
        test.setTimeout(60_000);
        await page.emulateMedia({ colorScheme: theme });
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        const violations = await watchCsp(page);
        const intake = await standInAnalytics(page);
        const foreign: string[] = [];
        page.on("request", (req) => {
          const url = req.url();
          if (!url.startsWith(baseURL!) && !/^(data|blob):/.test(url)) foreign.push(url);
        });

        const res = await page.goto(route);
        expect(res?.status()).toBe(route.includes("no-such-page") ? 404 : 200);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await scrollThrough(page);

        expect(await violations()).toEqual([]);
        expect(foreign).toEqual([]);
        // The analytics stand-ins really ran under the policy (not on the 404, which has no layout).
        if (!route.includes("no-such-page")) {
          await expect.poll(() => intake.length).toBeGreaterThanOrEqual(1);
        }
      });
    }
  }

  test("client navigation, language and theme switches stay clean", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop header path");
    const violations = await watchCsp(page);
    await standInAnalytics(page);
    await page.goto("/work");
    await page.locator('main a[href="/work/helm"]').first().click();
    await expect(page).toHaveURL(/\/work\/helm$/);
    await page.locator('header a[href="/th/work/helm"]').first().click();
    await expect(page).toHaveURL(/\/th\/work\/helm$/);
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/cv");
    await scrollThrough(page);
    expect(await violations()).toEqual([]);
  });
});

test.describe("footer (TECH-01, TECH-02, TECH-06)", () => {
  for (const route of ["/", "/th", "/work/helm", "/th/cv"]) {
    test(`${route}: real commit or none, no page-weight readout, privacy link`, async ({ page }) => {
      await page.goto(route);
      const footer = page.getByRole("contentinfo");
      const commit = footer.locator('a[href*="/commit/"]');
      if ((await commit.count()) > 0) {
        await expect(commit).toHaveAttribute("href", /^https:\/\/github\.com\/Kinzen-dev\/Kinzen\/commit\/[0-9a-f]{7,40}$/);
        await expect(commit).toHaveText(/^[0-9a-f]{7}$/);
      }
      await expect(footer).not.toContainText(/local|weighs|measuring|หน้านี้หนัก|กำลังวัด|KB/);
      await expect(footer).toContainText(route.startsWith("/th") ? /ต\.ค\. 2026/ : /Oct 2026/);
      const privacy = footer.getByRole("link", {
        name: route.startsWith("/th") ? thai("ความเป็นส่วนตัว") : "Privacy",
      });
      await expect(privacy).toHaveAttribute("href", route.startsWith("/th") ? "/th/privacy" : "/privacy");
      await privacy.click();
      await expect(page).toHaveURL(route.startsWith("/th") ? /\/th\/privacy$/ : /\/privacy$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});

test.describe("privacy page (TECH-06)", () => {
  for (const route of ["/privacy", "/th/privacy"]) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} (${theme}) is readable, cites Vercel and passes axe`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("lang", route.startsWith("/th") ? "th" : "en");
        await expect(page.getByRole("heading", { level: 2 })).toHaveCount(3);
        await expect(page.locator('a[href="https://vercel.com/docs/analytics/privacy-policy"]')).toBeVisible();
        await expect(page.locator('a[href="https://vercel.com/docs/speed-insights/privacy-policy"]')).toBeVisible();
        await expect(page.locator('a[href^="mailto:"]').last()).toBeVisible();
        await expect(page.locator("main")).not.toContainText(/zero tracking|GDPR|PDPA|compliant/i);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      });
    }
  }
});

test.describe("metadata (TECH-03, TECH-09)", () => {
  for (const path of ["/", "/work", "/cv", "/privacy"]) {
    for (const route of [path, th(path)]) {
      test(`${route}: exactly one og:url, equal to the canonical`, async ({ request }) => {
        const html = await (await request.get(route)).text();
        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        const ogUrls = [...html.matchAll(/<meta property="og:url" content="([^"]+)"/g)].map((m) => m[1]);
        expect(canonical).toBeTruthy();
        expect(ogUrls).toEqual([canonical]);
        const type = html.match(/<meta property="og:type" content="([^"]+)"/)?.[1];
        expect(type).toBe(path === "/work" || path === "/privacy" ? "website" : "profile");
      });
    }
  }

  test("sitemap lastmod is the content date, never a build timestamp", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(dates.length).toBe(20);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
    expect(xml).toContain("<loc>https://www.kinzen.dev/th/privacy</loc>");
  });

  test("ProfilePage dateModified is a full date or absent", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const value = html.match(/"dateModified":"([^"]+)"/)?.[1];
    if (value !== undefined) expect(value).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

test.describe("shortcuts (TECH-10)", () => {
  test("digits typed outside the demo never change it, even with the demo on screen", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/th");
    const demo = page.locator("#yimwhan .agent-demo");
    const choices = demo.getByRole("group").getByRole("button");
    await demo.scrollIntoViewIfNeeded();
    const before = await choices.evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")));
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    for (const key of ["1", "2", "3", "/"]) await page.keyboard.press(key);
    await page.waitForTimeout(200);
    expect(await choices.evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")))).toEqual(before);
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("marquee pause (TECH-11)", () => {
  const playState = (page: Page) =>
    page.locator(".tools-marquee .marquee-track").first().evaluate((el) => getComputedStyle(el).animationPlayState);

  test("pause holds when focus and pointer leave, survives a reload, resumes on demand", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Pause motion" });
    await button.scrollIntoViewIfNeeded();
    expect(await playState(page)).toBe("running");
    await button.click();
    await expect(page.getByRole("button", { name: "Resume motion" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.mouse.move(1, 1);
    expect(await playState(page)).toBe("paused");

    await page.reload();
    await page.getByRole("button", { name: "Resume motion" }).scrollIntoViewIfNeeded();
    expect(await playState(page)).toBe("paused");
    await page.getByRole("button", { name: "Resume motion" }).press("Enter");
    await expect(page.getByRole("button", { name: "Pause motion" })).toBeVisible();
    expect(await playState(page)).toBe("running");
  });

  test("Thai labels; hidden under reduced motion, where the rows are still", async ({ page }) => {
    await page.goto("/th");
    await expect(page.getByRole("button", { name: thai("หยุดภาพเคลื่อนไหว") })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByRole("button", { name: thai("หยุดภาพเคลื่อนไหว") })).toBeHidden();
    expect(
      await page.locator(".tools-marquee .marquee-track").first().evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
  });
});
