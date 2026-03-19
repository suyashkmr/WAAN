import { test, expect } from "@playwright/test";

test.describe("WAAN Dashboard Visual Baselines", () => {
  function shouldCaptureSectionBaseline(projectName) {
    return projectName === "desktop-1440";
  }

  function shouldCaptureRelayStateBaseline(projectName) {
    return projectName === "desktop-1440" || projectName === "mobile-390";
  }

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
        if (heroBadge) heroBadge.textContent = "Link your phone";
        if (heroCopy) heroCopy.textContent = "Scan the QR code.";
        if (heroMeta) heroMeta.textContent = "Waiting for phone link.";
        if (heroSyncDot) heroSyncDot.dataset.state = "idle";
        milestones.forEach(step => {
          if (step.dataset.step === "connect") step.dataset.state = "active";
          if (step.dataset.step === "sync") step.dataset.state = "pending";
          if (step.dataset.step === "ready") step.dataset.state = "pending";
        });
        if (relayBanner) relayBanner.dataset.status = "waiting_qr";
        if (relayBannerMessage) relayBannerMessage.textContent = "Link your phone.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Start relay.";
        return;
      }

      if (state === "running_syncing") {
        if (heroBadge) heroBadge.textContent = "Connected • Alice";
        if (heroCopy) heroCopy.textContent = "24 chats loaded. Refreshing.";
        if (heroMeta) heroMeta.textContent = "Refreshing · 24 chats loaded";
        if (heroSyncDot) heroSyncDot.dataset.state = "syncing";
        milestones.forEach(step => {
          if (step.dataset.step === "connect") step.dataset.state = "complete";
          if (step.dataset.step === "sync") step.dataset.state = "active";
          if (step.dataset.step === "ready") step.dataset.state = "pending";
        });
        if (relayBanner) relayBanner.dataset.status = "running";
        if (relayBannerMessage) relayBannerMessage.textContent = "Connected.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Alice · Sync pending · 24 chats";
        return;
      }

      if (state === "running_ready") {
        if (heroBadge) {
          heroBadge.textContent = "Connected • Alice";
          heroBadge.classList.add("hero-status-badge-ready");
        }
        if (heroCopy) heroCopy.textContent = "24 chats ready.";
        if (heroMeta) heroMeta.textContent = "Updated 09:41 PM";
        if (heroSyncDot) heroSyncDot.dataset.state = "ready";
        milestones.forEach(step => {
          if (step.dataset.step === "connect") step.dataset.state = "complete";
          if (step.dataset.step === "sync") step.dataset.state = "complete";
          if (step.dataset.step === "ready") step.dataset.state = "complete";
        });
        if (relayBanner) relayBanner.dataset.status = "running";
        if (relayBannerMessage) relayBannerMessage.textContent = "Connected.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Alice · Synced a moment ago · 24 chats";
      }
    }, scenario);
  }

  async function applyLowerLaneScenario(page) {
    await page.evaluate(() => {
      const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      };

      const messageTypeSummary = document.getElementById("message-type-summary");
      if (messageTypeSummary) {
        messageTypeSummary.innerHTML =
          '<p class="message-type-share-summary">Text: 58.4% · Media: 21.7% · Links: 13.2% · Polls: 6.7%.</p>';
      }

      const messageTypeNote = document.getElementById("message-type-note");
      if (messageTypeNote) {
        messageTypeNote.textContent =
          "Text still drives the conversation, while media and links cluster around recap and planning moments.";
      }

      setText("avg-chars", "86");
      setText("avg-words", "16");
      setText("media-count", "184");
      setText("link-count", "112");
      setText("poll-count", "14");

      const pollsTotal = document.getElementById("polls-total");
      if (pollsTotal) pollsTotal.textContent = "14";

      const pollsCreators = document.getElementById("polls-creators");
      if (pollsCreators) pollsCreators.textContent = "5";

      const pollsNote = document.getElementById("polls-note");
      if (pollsNote) {
        pollsNote.textContent = "14 polls recorded · Most polls: Alice (6)";
      }

      const pollsList = document.getElementById("polls-list");
      if (pollsList) {
        pollsList.innerHTML = `
          <li class="poll-item">
            <div class="poll-item-title">Which launch window should we lock for the client recap?</div>
            <div class="poll-item-meta">By Alice · Mar 18, 2026 09:12 PM</div>
            <div class="poll-item-options">
              <span>Monday morning</span>
              <span>Tuesday afternoon</span>
              <span>Wednesday evening</span>
            </div>
          </li>
          <li class="poll-item">
            <div class="poll-item-title">What format should the weekly digest use?</div>
            <div class="poll-item-meta">By Priya · Mar 17, 2026 08:05 PM</div>
            <div class="poll-item-options">
              <span>Bullet recap</span>
              <span>Annotated timeline</span>
              <span>Voice note summary</span>
            </div>
          </li>
          <li class="poll-item">
            <div class="poll-item-title">Who should present the findings?</div>
            <div class="poll-item-meta">By Marco · Mar 16, 2026 07:41 PM</div>
            <div class="poll-item-options">
              <span>Ops lead</span>
              <span>Product manager</span>
              <span>Joint walkthrough</span>
            </div>
          </li>
        `;
      }
    });
  }

  async function applyDeepDiveScenario(page) {
    await page.evaluate(() => {
      const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element instanceof HTMLInputElement) element.value = value;
      };

      setValue("search-keyword", "launch");
      setValue("search-start", "2026-03-01");
      setValue("search-end", "2026-03-18");

      const searchSummary = document.getElementById("search-results-summary");
      if (searchSummary) {
        searchSummary.textContent = "12 matches across planning, recap, and launch-check messages.";
      }

      const searchInsights = document.getElementById("search-insights");
      if (searchInsights) {
        searchInsights.classList.remove("hidden");
        searchInsights.innerHTML = `
          <div class="search-insight-card">
            <h4>Top sender</h4>
            <strong>Alice</strong>
            <span>5 matching messages</span>
          </div>
          <div class="search-insight-card">
            <h4>Peak day</h4>
            <strong>Mar 18</strong>
            <span>Launch recap and follow-up</span>
          </div>
          <div class="search-insight-card">
            <h4>Common phrase</h4>
            <strong>launch window</strong>
            <span>Appears across recap and next-step notes</span>
          </div>
        `;
      }

      const resultsList = document.getElementById("search-results-list");
      if (resultsList) {
        resultsList.innerHTML = `
          <article class="search-result">
            <div class="search-result-header">
              <span class="search-result-sender">Alice</span>
              <span>Mar 18, 2026 09:12 PM</span>
            </div>
            <div class="search-result-message">We should lock the <mark>launch</mark> window before the client recap tomorrow.</div>
          </article>
          <article class="search-result">
            <div class="search-result-header">
              <span class="search-result-sender">Priya</span>
              <span>Mar 17, 2026 08:05 PM</span>
            </div>
            <div class="search-result-message">Posting the revised <mark>launch</mark> checklist now so everyone can confirm owners.</div>
          </article>
          <article class="search-result">
            <div class="search-result-header">
              <span class="search-result-sender">Marco</span>
              <span>Mar 16, 2026 07:41 PM</span>
            </div>
            <div class="search-result-message">Once the <mark>launch</mark> plan is locked, I can prep the handoff summary for ops.</div>
          </article>
        `;
      }

      const gallery = document.getElementById("saved-view-gallery");
      if (gallery) {
        gallery.innerHTML = `
          <article class="saved-view-card is-active" data-view-id="launch-last-30">
            <header class="saved-view-card-header">
              <div>
                <p class="saved-view-card-title">Launch last 30 days</p>
                <p class="saved-view-card-range">Mar 1, 2026 to Mar 18, 2026</p>
              </div>
              <div class="saved-view-card-meta">
                <span class="saved-view-chip saved-view-chip-active">Active</span>
                <span class="saved-view-card-used">Used 2m ago</span>
              </div>
            </header>
            <div class="saved-view-card-metrics">
              <div class="saved-view-stat"><span class="stat-label">Messages</span><span class="stat-value">2,148</span></div>
              <div class="saved-view-stat"><span class="stat-label">Top participant</span><span class="stat-value">Alice</span></div>
            </div>
            <div class="saved-view-card-foot">
              <div class="saved-view-detail">
                <span class="detail-label">Range</span>
                <span class="detail-value">Last 30 days</span>
                <span class="detail-meta">Weekdays + work hours</span>
              </div>
              <div class="saved-view-detail">
                <span class="detail-label">Share</span>
                <span class="detail-value">42%</span>
                <div class="saved-view-share-bar"><span style="width:42%"></span></div>
              </div>
            </div>
          </article>
          <article class="saved-view-card" data-view-id="recap-evenings">
            <header class="saved-view-card-header">
              <div>
                <p class="saved-view-card-title">Recap evenings</p>
                <p class="saved-view-card-range">Feb 10, 2026 to Mar 18, 2026</p>
              </div>
              <div class="saved-view-card-meta">
                <span class="saved-view-card-created">Saved Mar 18</span>
              </div>
            </header>
            <div class="saved-view-card-metrics">
              <div class="saved-view-stat"><span class="stat-label">Messages</span><span class="stat-value">1,062</span></div>
              <div class="saved-view-stat"><span class="stat-label">Top participant</span><span class="stat-value">Priya</span></div>
            </div>
            <div class="saved-view-card-foot">
              <div class="saved-view-detail">
                <span class="detail-label">Range</span>
                <span class="detail-value">Custom window</span>
                <span class="detail-meta">Evenings only</span>
              </div>
              <div class="saved-view-detail">
                <span class="detail-label">Share</span>
                <span class="detail-value">31%</span>
                <div class="saved-view-share-bar"><span style="width:31%"></span></div>
              </div>
            </div>
          </article>
        `;
      }

      const compareSummary = document.getElementById("compare-summary");
      if (compareSummary) {
        compareSummary.classList.remove("empty");
        compareSummary.innerHTML = `
          <div class="compare-summary-grid">
            <article class="compare-column">
              <h3>Launch last 30 days</h3>
              <div class="compare-metric"><span class="compare-label">Messages</span><span class="compare-value">2,148</span></div>
              <div class="compare-metric"><span class="compare-label">Top participant</span><span class="compare-value">Alice</span></div>
            </article>
            <article class="compare-column">
              <h3>Recap evenings</h3>
              <div class="compare-metric"><span class="compare-label">Messages</span><span class="compare-value">1,062</span></div>
              <div class="compare-metric"><span class="compare-label">Top participant</span><span class="compare-value">Priya</span></div>
            </article>
            <article class="compare-column">
              <h3>Difference</h3>
              <div class="compare-metric"><span class="compare-label">Volume</span><span class="compare-diff positive">+1,086</span></div>
              <div class="compare-metric"><span class="compare-label">Peak window</span><span class="compare-value">Weekday evenings</span></div>
            </article>
          </div>
        `;
      }
    });
  }

  async function applySupportScenario(page) {
    await page.evaluate(() => {
      const drawer = document.getElementById("relay-log-drawer");
      const list = document.getElementById("relay-log-list");
      const connection = document.getElementById("relay-log-connection");
      if (drawer) drawer.setAttribute("aria-hidden", "false");
      if (connection) connection.textContent = "Live relay log";
      if (list) {
        list.innerHTML = `
          <p class="relay-log-entry"><strong>[sync]</strong> Resync requested for Alice workspace.</p>
          <p class="relay-log-entry"><strong>[sync]</strong> Pulled 24 chats and refreshed timeline summaries.</p>
          <p class="relay-log-entry"><strong>[status]</strong> Connection recovered after a transient disconnect.</p>
        `;
      }
    });
  }

  async function prepareStableFrame(page) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await page.waitForLoadState("load");
    await page.waitForTimeout(200);
    await page.addStyleTag({
      content: `*,
*::before,
*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
#data-status,
#toast-container { display: none !important; opacity: 0 !important; pointer-events: none !important; }`,
    });
    await page.evaluate(() => {
      const status = document.getElementById("data-status");
      if (status) status.classList.remove("is-active", "is-exiting");
      const toastContainer = document.getElementById("toast-container");
      if (toastContainer) toastContainer.replaceChildren();

      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const heroMilestones = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));
      if (heroBadge) heroBadge.textContent = "Relay offline";
      if (heroCopy) heroCopy.textContent = "Start relay.";
      if (heroMeta) heroMeta.textContent = "Waiting.";
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
        relayBannerMeta.textContent = "Start relay.";
      }

      const syncProgress = document.getElementById("relay-sync-progress");
      if (syncProgress) syncProgress.classList.add("hidden");
    });
    await page.waitForTimeout(100);
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
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
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
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
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

  test("matches search panel baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await applyDeepDiveScenario(page);
    const section = page.locator("#search-panel");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-search-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches saved views section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await applyDeepDiveScenario(page);
    const section = page.locator("#saved-views-card");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-saved-views-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches time-of-day section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
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

  test("matches message-types section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await applyLowerLaneScenario(page);
    const section = page.locator("#message-types");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-message-types-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches polls section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await applyLowerLaneScenario(page);
    const section = page.locator("#polls-card");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-polls-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches support section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    const section = page.locator("#faq-card");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-support-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches diagnostics drawer baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await applySupportScenario(page);
    const drawer = page.locator("#relay-log-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveScreenshot(`section-diagnostics-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches relay offline state baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureRelayStateBaseline(testInfo.project.name)) return;
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
    if (!shouldCaptureRelayStateBaseline(testInfo.project.name)) return;
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
    if (!shouldCaptureRelayStateBaseline(testInfo.project.name)) return;
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
    if (!shouldCaptureRelayStateBaseline(testInfo.project.name)) return;
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
