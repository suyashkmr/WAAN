import { test, expect } from "@playwright/test";

test.describe("WAAN Accessibility Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("waan-onboarding-dismissed", "done");
      window.localStorage.removeItem("waan-reduce-motion");
      window.localStorage.removeItem("waan-high-contrast");
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
  });

  test("applies reduced-motion and high-contrast states", async ({ page }) => {
    await expect(page.locator("#reduce-motion-toggle")).toBeVisible();
    await expect(page.locator("#high-contrast-toggle")).toBeVisible();

    await page.click("#reduce-motion-toggle");
    await page.waitForFunction(() => document.body?.dataset.reduceMotion === "true");
    await page.waitForFunction(() => document.documentElement?.dataset.slMotion === "reduced");

    await page.click("#high-contrast-toggle");
    await page.waitForFunction(() => document.body?.dataset.contrast === "high");
    await page.waitForFunction(() => document.documentElement?.dataset.slContrast === "high");
  });

  test("keeps migrated Shoelace controls keyboard focusable", async ({ page }) => {
    const focusTargetGroups = [
      ["#search-keyword-sl", "#search-keyword"],
      ["#search-participant-sl", "#search-participant"],
      ["#search-start-sl", "#search-start"],
      ["#search-end-sl", "#search-end"],
      ["#run-search-sl", "#run-search"],
    ];

    for (const selectors of focusTargetGroups) {
      let selector = selectors[0];
      for (const candidate of selectors) {
        if (await page.locator(candidate).count()) {
          selector = candidate;
          break;
        }
      }
      const target = page.locator(selector);
      await expect(target).toBeVisible();
      await target.focus();
      await expect
        .poll(async () => page.evaluate(() => document.activeElement?.id || ""))
        .toBe(selector.slice(1));
    }
  });

  test("keeps dense data-surface metric help controls keyboard focusable", async ({ page }) => {
    const selectors = [
      '[aria-describedby="participants-share-note"]',
      '[aria-describedby="participants-avg-words-note"]',
    ];

    for (const selector of selectors) {
      const visibleTarget = page.locator(`${selector}:visible`).first();
      if (await visibleTarget.count()) {
        await expect(visibleTarget).toBeVisible();
        await visibleTarget.focus();
        await expect
          .poll(async () => page.evaluate(() => document.activeElement?.getAttribute("aria-describedby") || ""))
          .toBe((await visibleTarget.getAttribute("aria-describedby")) || "");
      } else {
        await expect(page.locator(selector).first()).toHaveCount(1);
      }
    }
  });
});
