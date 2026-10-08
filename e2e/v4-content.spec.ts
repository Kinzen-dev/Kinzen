import { expect, test } from "@playwright/test";

// v4b content (resume v1.7, King's decisions of 2026-10-08): renamed clinic product, pilot status,
// the contract role as a supporting entry, AnyMind scope numbers and the AI-assisted practice.

const flatten = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const DESCRIPTOR = "Real-time transactional platform with wallet and ledger (confidential client, NDA)";

test.describe("v4 content", () => {
  test("the clinic case lives at /work/clinic-receptionist and says pilot", async ({ request }) => {
    for (const path of ["/work/clinic-receptionist", "/th/work/clinic-receptionist"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const text = flatten(await res.text());
      expect(text).toContain("Clinic AI receptionist");
      expect(text).not.toMatch(/In production|ใช้งานจริงตั้งแต่/);
    }
    const en = flatten(await (await request.get("/work/clinic-receptionist")).text());
    expect(en).toContain("Pilot");
    expect(en).toContain("go-live expected October 2026");
  });

  test("experience runs Vesperwerk, contract, AnyMind, ZyGen with the approved descriptor", async ({ page }) => {
    await page.goto("/");
    const orgs = await page.locator("#experience [data-era] h3").allTextContents();
    expect(orgs).toEqual(["Vesperwerk Co., Ltd.", "Confidential client", "AnyMind Group", "ZyGen Co., Ltd."]);
    const contract = page.locator("#experience [data-era]").nth(1);
    await expect(contract).toContainText(DESCRIPTOR);
    await expect(contract).toContainText("Senior Full-Stack Developer");
    await expect(contract).toContainText("Co-led the 2026 back-office rebuild");
    await expect(contract.locator("img, svg, .era-icon")).toHaveCount(0);
    await expect(page.locator("#experience [data-era]").nth(2)).toContainText("5 to 8 engineers");
  });

  test("the CV shows the headline and the contract by its descriptor", async ({ page }) => {
    await page.goto("/cv");
    await expect(page.locator(".cv-role")).toHaveText(
      "Senior Full-Stack Engineer · TypeScript, Node.js, Next.js · event-driven systems on AWS",
    );
    const entries = page.locator("#cv-experience + .cv-body .cv-entry");
    await expect(entries).toHaveCount(4);
    await expect(entries.nth(1).locator(".cv-meta")).toContainText(DESCRIPTOR);
  });

  test("no page mentions the dropped AnyMind figures", async ({ request }) => {
    for (const path of ["/", "/th", "/cv", "/work/anymind-ec-platform", "/th/work/anymind-ec-platform"]) {
      const text = flatten(await (await request.get(path)).text());
      expect(text, path).not.toMatch(/20\+ Shopify stores|ไม่ต่ำกว่า 20 ร้าน|Mamy\s?Poko/i);
    }
  });

  test("the practice section is AI-assisted engineering with four rows", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#practice-title")).toHaveText("AI-assisted engineering");
    await expect(page.locator("#practice [data-note] h3")).toHaveText([
      "Spec first",
      "Human gates",
      "Automate the reversible",
      "Evidence before merge",
    ]);
  });
});
