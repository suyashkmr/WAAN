import { test, expect } from "@playwright/test";

test.describe("WAAN Dashboard Visual Baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("waan-reduce-motion", "true");
      window.localStorage.setItem("waan-high-contrast", "false");
      window.localStorage.setItem("waan-compact-mode", "false");
      window.localStorage.setItem("waan-onboarding-dismissed", "done");
    });
  });

  test("matches dashboard baseline", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible();
    await page.addStyleTag({
      content: `*,
*::before,
*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
    });

    await page.evaluate(() => {
      const status = document.getElementById("data-status");
      if (status) status.classList.remove("is-active", "is-exiting");
    });

    await expect(page).toHaveScreenshot(`dashboard-${testInfo.project.name}.png`, {
      fullPage: false,
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches interactive states baseline", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible();
    await page.addStyleTag({
      content: `*,
*::before,
*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
    });

    await page.evaluate(() => {
      const status = document.getElementById("data-status");
      if (status) status.classList.remove("is-active", "is-exiting");
    });

    await page.evaluate(() => {
      const toggle = document.querySelector('.card-toggle[data-target="participants-content"]');
      const content = document.getElementById("participants-content");
      const card = document.getElementById("participants");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (content) content.style.display = "none";
      if (card) card.classList.add("collapsed");
    });

    const focusTarget = page.locator("#reduce-motion-toggle");
    await expect(focusTarget).toBeVisible();
    await focusTarget.focus();

    const hoverTarget = page.locator("#download-pdf");
    await expect(hoverTarget).toBeVisible();
    await hoverTarget.hover();

    await expect(page).toHaveScreenshot(`dashboard-interactive-${testInfo.project.name}.png`, {
      fullPage: false,
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });
});
