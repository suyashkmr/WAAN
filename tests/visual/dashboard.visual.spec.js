import { test, expect } from "@playwright/test";

test.describe("WAAN Dashboard Visual Baselines", () => {
  async function prepareStableFrame(page) {
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
  }

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("waan-reduce-motion", "true");
      window.localStorage.setItem("waan-high-contrast", "false");
      window.localStorage.setItem("waan-compact-mode", "false");
      window.localStorage.setItem("waan-onboarding-dismissed", "done");
    });
  });

  test("matches dashboard baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);

    await expect(page).toHaveScreenshot(`dashboard-${testInfo.project.name}.png`, {
      fullPage: false,
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches interactive states baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    await page.addStyleTag({
      content: `.ghost-button.visual-hover-state {
  background: color-mix(in srgb, var(--accent) 15%, transparent) !important;
  border-color: color-mix(in srgb, var(--accent) 45%, transparent) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 14px 28px color-mix(in srgb, var(--accent) 20%, rgba(6, 8, 18, 0.45)) !important;
}
.ghost-button.visual-focus-state {
  outline: 3px solid color-mix(in srgb, var(--accent) 20%, transparent) !important;
  outline-offset: 2px !important;
}`,
    });

    await page.evaluate(() => {
      const toggle = document.querySelector('.card-toggle[data-target="participants-content"]');
      const content = document.getElementById("participants-content");
      const card = document.getElementById("participants");
      const focusButton = document.getElementById("reduce-motion-toggle");
      const hoverButton = document.getElementById("download-pdf");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (content) content.style.display = "none";
      if (card) card.classList.add("collapsed");
      focusButton?.classList.add("visual-focus-state");
      hoverButton?.classList.add("visual-hover-state");
    });
    await expect(page.locator("#reduce-motion-toggle")).toBeVisible();
    await expect(page.locator("#download-pdf")).toBeVisible();

    await expect(page).toHaveScreenshot(`dashboard-interactive-${testInfo.project.name}.png`, {
      fullPage: false,
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches highlights section baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    const section = page.locator("#insight-highlights");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-highlights-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches participants section baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    const section = page.locator("#participants");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-participants-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches time-of-day section baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    const section = page.locator("#timeofday-trend");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-timeofday-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });
});
