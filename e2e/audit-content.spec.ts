import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { thai } from "./thai";

/**
 * Audit round, ticket a-01 (content): scoped claims, the AnyMind case, the case-end contact block,
 * the studio route on the home contact, and Thai register fixes. Copy assertions only where the
 * audit fixed a meaning; layout is covered by the section specs.
 */

const SLUGS = ["yimwhan-ai", "anymind-ec-platform", "helm", "ronglen", "visual-qa-harness", "cadence"];
const ROUTES = [
  "/",
  "/th",
  "/work",
  "/th/work",
  "/cv",
  "/th/cv",
  ...SLUGS.flatMap((s) => [`/work/${s}`, `/th/work/${s}`]),
];

/** Phrases the audit retired (C02, C03, TH-01..16 and their EN twins). None may ship, visible or not. */
const RETIRED = [
  "every one passed",
  "only a safe reply",
  "A safe reply goes out",
  "safe answer",
  "Watch the guard work",
  "Safe reply sent",
  "clinical-safety guard",
  "safety guard",
  "in every patient-facing reply",
  "no deterministic layer could",
  "passed all checks after",
  "ลองดูชุดตรวจทำงานจริง",
  "คำตอบที่ปลอดภัย",
  "ชุดตรวจความปลอดภัย",
  "ในทุกคำตอบที่ถึงคนไข้",
  "ผ่านครบทุกข้อความ",
  "ผ่านการตรวจครบทุกข้อ",
  "ประโยคที่ไม่ปลอดภัย",
  "ชั้นไหนจับได้",
  "ถอดข้อความสด",
  "ระบบทั้งหมด",
  "ระบบที่คัดมา",
  "ยังยืนยันได้เต็มปาก",
];

/** Page source as one searchable string: tags dropped, entities and word joiners normalised. */
function flatten(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replaceAll("⁠", "")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

test.describe("audit content: claims", () => {
  test.skip(({ isMobile }) => isMobile, "server HTML is the same on every device");

  for (const route of ROUTES) {
    test(`${route} ships none of the retired claims (body, metadata, ARIA, SVG)`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
      const raw = await res.text();
      // Attribute values (meta, aria-label, alt) are searched raw; text is searched flattened.
      const text = `${flatten(raw)}\n${raw.replaceAll("⁠", "")}`;
      for (const phrase of RETIRED) expect(text, phrase).not.toContain(phrase);
    });
  }

  test("the published numbers are unchanged: 500 / 37 and 35 of 38", async ({ request }) => {
    const yimwhan = flatten(await (await request.get("/work/yimwhan-ai")).text());
    expect(yimwhan).toContain("replay of 500 real customer messages");
    expect(yimwhan).toContain("37 violations in the raw model drafts");
    const qa = flatten(await (await request.get("/work/visual-qa-harness")).text());
    expect(qa).toContain("35 of 38 seeded bugs");
    const qaTh = flatten(await (await request.get("/th/work/visual-qa-harness")).text());
    // Thai glue may put a no-break space beside the numbers.
    expect(qaTh).toMatch(/35\s*จาก\s*38/);
  });
});

test.describe("audit content: guard demo", () => {
  for (const route of ["/", "/th"] as const) {
    test(`${route} says the demo is scripted before any choice`, async ({ page }) => {
      await page.goto(route);
      const demo = page.locator("#yimwhan .agent-demo");
      await demo.scrollIntoViewIfNeeded();
      const intro = demo.locator("p").first();
      await expect(intro).toContainText(
        route === "/th" ? thai("ข้อความที่เตรียมไว้", { exact: false }) : "replays prepared text",
      );
      // The statement comes before the patient-message choices in reading order.
      const before = await intro.evaluate((p) => {
        const choice = p.closest(".agent-demo")!.querySelector("[aria-pressed]")!;
        return Boolean(p.compareDocumentPosition(choice) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(before).toBe(true);
    });
  }
});

test.describe("audit content: case pages", () => {
  for (const slug of SLUGS) {
    for (const lang of ["en", "th"] as const) {
      const path = lang === "th" ? `/th/work/${slug}` : `/work/${slug}`;
      test(`${path} ends with email and CV before Next project`, async ({ page }) => {
        await page.goto(path);
        const cta = page.locator("[data-case-cta]");
        await expect(cta).toHaveCount(1);
        const email = cta.getByRole("link", { name: lang === "th" ? thai("ส่งอีเมลหาคิง") : "Email King" });
        await expect(email).toHaveAttribute("href", "mailto:ktpz.dev@gmail.com");
        const cv = cta.getByRole("link", { name: lang === "th" ? thai("ดู CV") : "View CV" });
        await expect(cv).toHaveAttribute("href", lang === "th" ? "/th/cv" : "/cv");
        // Block sits before the Next project link in reading order.
        const order = await cta.evaluate((el) => {
          const next = document.querySelector(".pj-next-wrap");
          return next ? Boolean(el.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING) : true;
        });
        expect(order).toBe(true);
        // Keyboard reaches both actions.
        await email.focus();
        await expect(email).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(cv).toBeFocused();
      });
    }
  }

  for (const lang of ["en", "th"] as const) {
    test(`AnyMind case (${lang}) shows role, delivery, validation, results and limits`, async ({ page }) => {
      const path = lang === "th" ? "/th/work/anymind-ec-platform" : "/work/anymind-ec-platform";
      await page.goto(path);
      const study = page.locator("[data-case-study]");
      await expect(study).toBeVisible();
      const labels =
        lang === "th"
          ? ["ที่มา", "บทบาทของผม", "วิธีทำงาน", "การตรวจงาน", "ผลลัพธ์", "ข้อจำกัด"]
          : ["Context", "My role", "How the work ran", "Validation", "Results", "Limits"];
      for (const label of labels) {
        await expect(study.getByRole("heading", { level: 3, name: lang === "th" ? thai(label) : label })).toBeVisible();
      }
      await expect(study).toContainText("Mizuno Thailand");
      await expect(study).toContainText("20");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }

  test("AnyMind social image names the lead role, not sole construction", async ({ request }) => {
    const en = await (await request.get("/work/anymind-ec-platform")).text();
    expect(en).toContain("AnyMind EC Platform, work Kittipong Khonthong led as Tech Lead");
    const th = await (await request.get("/th/work/anymind-ec-platform")).text();
    expect(th).toContain("AnyMind EC Platform: ผลงานที่กฤติพงษ์ ก้อนทอง ดูแลในฐานะ Tech Lead");
  });
});

test.describe("audit content: home contact routes", () => {
  for (const route of ["/", "/th"] as const) {
    test(`${route} separates role enquiries (email) from project enquiries (Vesperwerk)`, async ({ page }) => {
      await page.goto(route);
      const doors = page.locator("#contact .contact-doors");
      await doors.scrollIntoViewIfNeeded();
      const studio = doors.getByRole("link", { name: /vesperwerk\.com/ });
      await expect(studio).toHaveAttribute("href", route === "/th" ? "https://vesperwerk.com/th" : "https://vesperwerk.com/en");
      await expect(studio).toHaveAttribute("target", "_blank");
      await expect(studio).toHaveAccessibleName(route === "/th" ? /เปิดในแท็บใหม่/ : /opens in a new tab/);
      await expect(doors).toContainText(
        route === "/th" ? thai("ส่งอีเมลหาผมโดยตรง", { exact: false }) : "For a role, email me directly.",
      );
    });
  }
});
