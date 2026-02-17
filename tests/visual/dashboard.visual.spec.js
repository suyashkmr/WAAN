import { test, expect } from "@playwright/test";

test.describe("WAAN Dashboard Visual Baselines", () => {
  async function applyRelayScenario(page, scenario) {
    await page.evaluate(state => {
      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const relayBanner = document.getElementById("relay-status-banner");
      const relayBannerMessage = document.getElementById("relay-status-message");
      const relayBannerMeta = document.getElementById("relay-status-meta");
      const milestones = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));

      if (heroBadge) heroBadge.classList.remove("hero-status-badge-ready");
      milestones.forEach(step => {
        step.classList.remove("is-ready-celebration");
      });

      if (state === "waiting_qr") {
        if (heroBadge) heroBadge.textContent = "Scan the QR code";
        if (heroCopy) heroCopy.textContent = "On your phone: Linked Devices -> Link a device -> scan this code.";
        if (heroMeta) heroMeta.textContent = "Waiting for phone link.";
        if (heroSyncDot) heroSyncDot.dataset.state = "idle";
        milestones.forEach(step => {
          if (step.dataset.step === "connect") step.dataset.state = "active";
          if (step.dataset.step === "sync") step.dataset.state = "pending";
          if (step.dataset.step === "ready") step.dataset.state = "pending";
        });
        if (relayBanner) relayBanner.dataset.status = "waiting_qr";
        if (relayBannerMessage) relayBannerMessage.textContent = "Scan the QR code to link your phone.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Open Linked Devices in your phone app and scan the code.";
        return;
      }

      if (state === "running_syncing") {
        if (heroBadge) heroBadge.textContent = "Connected • Alice";
        if (heroCopy) heroCopy.textContent = "24 chats indexed. Syncing updates…";
        if (heroMeta) heroMeta.textContent = "Syncing now • 24 chats found";
        if (heroSyncDot) heroSyncDot.dataset.state = "syncing";
        milestones.forEach(step => {
          if (step.dataset.step === "connect") step.dataset.state = "complete";
          if (step.dataset.step === "sync") step.dataset.state = "active";
          if (step.dataset.step === "ready") step.dataset.state = "pending";
        });
        if (relayBanner) relayBanner.dataset.status = "running";
        if (relayBannerMessage) relayBannerMessage.textContent = "Relay connected.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Sync pending";
        return;
      }

      if (state === "running_ready") {
        if (heroBadge) {
          heroBadge.textContent = "Connected • Alice";
          heroBadge.classList.add("hero-status-badge-ready");
        }
        if (heroCopy) heroCopy.textContent = "24 chats indexed. Insights are ready.";
        if (heroMeta) heroMeta.textContent = "Last updated 09:41 PM";
        if (heroSyncDot) heroSyncDot.dataset.state = "ready";
        milestones.forEach(step => {
          if (step.dataset.step === "connect") step.dataset.state = "complete";
          if (step.dataset.step === "sync") step.dataset.state = "complete";
          if (step.dataset.step === "ready") step.dataset.state = "complete";
        });
        if (relayBanner) relayBanner.dataset.status = "running";
        if (relayBannerMessage) relayBannerMessage.textContent = "Relay connected.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Chats synced and ready.";
      }
    }, scenario);
  }

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

      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const heroMilestones = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));
      if (heroBadge) heroBadge.textContent = "Not connected";
      if (heroCopy) heroCopy.textContent = "Open Relay Controls, then press Connect.";
      if (heroMeta) heroMeta.textContent = "Awaiting relay.";
      if (heroSyncDot) heroSyncDot.dataset.state = "idle";
      heroMilestones.forEach(step => {
        if (step.dataset.step === "connect") step.dataset.state = "active";
        if (step.dataset.step === "sync") step.dataset.state = "pending";
        if (step.dataset.step === "ready") step.dataset.state = "pending";
      });

      const relayBanner = document.getElementById("relay-status-banner");
      const relayBannerMessage = document.getElementById("relay-status-message");
      const relayBannerMeta = document.getElementById("relay-status-meta");
      if (relayBanner) relayBanner.dataset.status = "offline";
      if (relayBannerMessage) relayBannerMessage.textContent = "Relay offline.";
      if (relayBannerMeta) {
        relayBannerMeta.textContent = "Open the relay app, press Connect, then choose a chat.";
      }

      const syncProgress = document.getElementById("relay-sync-progress");
      if (syncProgress) syncProgress.classList.add("hidden");
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

  test("matches relay offline state baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    const panel = page.locator("#hero-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot(`relay-state-offline-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches relay waiting QR state baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    await applyRelayScenario(page, "waiting_qr");
    const panel = page.locator("#hero-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot(`relay-state-waiting-qr-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches relay running syncing state baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    await applyRelayScenario(page, "running_syncing");
    const panel = page.locator("#hero-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot(`relay-state-running-syncing-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches relay running ready state baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    await applyRelayScenario(page, "running_ready");
    const panel = page.locator("#hero-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot(`relay-state-running-ready-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });
});
