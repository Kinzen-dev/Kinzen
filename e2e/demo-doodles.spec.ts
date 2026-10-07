import { expect, test } from "@playwright/test";
import { thai } from "./thai";

const LABEL = {
  "/": "Scripted illustration. Not live patient data.",
  "/th": "ตัวอย่างจำลอง ไม่ใช่ข้อมูลคนไข้จริง",
} as const;

// The guard demo is the Yimwhan scene's finale (v3-04).
test.describe("agent demo", () => {
  for (const route of ["/", "/th"] as const) {
    test(`${route} labels the demo as a scripted illustration`, async ({ page }) => {
      await page.goto(route);
      const demo = page.locator("#yimwhan .agent-demo");
      await demo.scrollIntoViewIfNeeded();
      await expect(demo.getByText(thai(LABEL[route]))).toBeVisible();
    });
  }

  test("keys 1/2/3 choose a patient message only while the demo is in view", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const demo = page.locator("#yimwhan .agent-demo");
    const choices = demo.getByRole("group").getByRole("button");
    await expect(choices).toHaveCount(3);

    // Out of view: the shortcut must not steal the key.
    await page.keyboard.press("3");
    await expect(choices.nth(2)).toHaveAttribute("aria-pressed", "false");

    await demo.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        await page.keyboard.press("2");
        return choices.nth(1).getAttribute("aria-pressed");
      })
      .toBe("true");

    // Reduced motion shows the finished exchange at once: draft blocked, safe reply sent.
    const live = demo.locator(".agent-demo-live");
    await expect(live.locator("del")).toHaveText("That sounds like gingivitis, nothing serious.");
    await expect(live.getByText("no_diagnose", { exact: true })).toBeVisible();
    await expect(live.getByText(/Would you like me to book a check-up\?/)).toBeVisible();
    await expect(live.locator("li").last()).toHaveCSS("opacity", "1");
    await expect(demo.locator('[aria-live="polite"]')).toContainText("Makes a diagnosis");
  });

  test("choices work by click and Enter as plain buttons", async ({ page }) => {
    await page.goto("/th");
    const choices = page.locator("#yimwhan .agent-demo").getByRole("group").getByRole("button");
    await choices.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(choices.nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#yimwhan .agent-demo-live del")).toHaveText(thai("ที่นี่รับประกันฟันขาวถาวรตลอดชีวิต"), {
      timeout: 15_000,
    });
  });
});

test.describe("doodles", () => {
  test("every doodle on the home page is decorative", async ({ page }) => {
    await page.goto("/");
    const doodles = page.locator(".doodle");
    expect(await doodles.count()).toBeGreaterThanOrEqual(7);
    const exposed = await doodles.evaluateAll(
      (els) => els.filter((el) => el.getAttribute("aria-hidden") !== "true").length,
    );
    expect(exposed).toBe(0);
  });

  test("the 404 doodle is decorative", async ({ page }) => {
    await page.goto("/definitely-not-here");
    await expect(page.locator(".doodle")).toHaveCount(1);
    await expect(page.locator(".doodle")).toHaveAttribute("aria-hidden", "true");
  });
});
