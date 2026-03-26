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
      const setHiddenState = (element, isHidden) => {
        if (!element) return;
        element.hidden = isHidden;
        element.classList.toggle("hidden", isHidden);
      };

      const applyHeroState = ({
        badgeText,
        copyText,
        metaText,
        syncState = "idle",
        syncVisible = false,
        milestones = {},
        readyCelebrating = false,
      }) => {
        if (heroBadge) {
          heroBadge.textContent = badgeText;
          heroBadge.classList.toggle("hero-status-badge-ready", readyCelebrating);
        }
        if (heroCopy) heroCopy.textContent = copyText;
        if (heroMeta) heroMeta.textContent = metaText;
        if (heroSyncDot) {
          heroSyncDot.dataset.state = syncState;
          heroSyncDot.hidden = !syncVisible;
          heroSyncDot.classList.toggle("hidden", !syncVisible);
        }
        milestoneSteps.forEach(step => {
          const stepId = step.dataset.step;
          if (!stepId) return;
          step.dataset.state = milestones[stepId] || "pending";
          step.classList.toggle("is-ready-celebration", readyCelebrating && stepId === "ready");
        });
      };

      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const relayBanner = document.getElementById("relay-status-banner");
      const relayBannerMessage = document.getElementById("relay-connection-status");
      const relayBannerMeta = document.getElementById("relay-account-name");
      const relayQrContainer = document.getElementById("relay-qr-container");
      const relaySyncProgress = document.getElementById("relay-sync-progress");
      const milestoneSteps = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));

      applyHeroState({
        badgeText: "Offline",
        copyText: "Relay is offline",
        metaText: "Connect to start analysis",
        syncState: "idle",
        syncVisible: false,
        milestones: { connect: "active", sync: "pending", ready: "pending" },
      });

      if (state === "waiting_qr") {
        applyHeroState({
          badgeText: "Link your phone",
          copyText: "Scan the QR code.",
          metaText: "Waiting for phone link.",
          syncState: "idle",
          syncVisible: false,
          milestones: { connect: "active", sync: "pending", ready: "pending" },
        });
        setHiddenState(relayQrContainer, false);
        setHiddenState(relaySyncProgress, true);
        if (relayBanner) relayBanner.dataset.status = "waiting_qr";
        if (relayBannerMessage) relayBannerMessage.textContent = "Link your phone.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Start relay.";
        return;
      }

      if (state === "running_syncing") {
        applyHeroState({
          badgeText: "Connected • Alice",
          copyText: "24 chats loaded. Refreshing.",
          metaText: "Refreshing · 24 chats loaded",
          syncState: "syncing",
          syncVisible: true,
          milestones: { connect: "complete", sync: "active", ready: "pending" },
        });
        setHiddenState(relayQrContainer, true);
        setHiddenState(relaySyncProgress, false);
        if (relayBanner) relayBanner.dataset.status = "running";
        if (relayBannerMessage) relayBannerMessage.textContent = "Connected.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Alice · Sync pending · 24 chats";
        return;
      }

      if (state === "running_ready") {
        applyHeroState({
          badgeText: "Connected • Alice",
          copyText: "24 chats ready.",
          metaText: "Updated 09:41 PM",
          syncState: "ready",
          syncVisible: true,
          milestones: { connect: "complete", sync: "complete", ready: "complete" },
          readyCelebrating: true,
        });
        setHiddenState(relayQrContainer, true);
        setHiddenState(relaySyncProgress, true);
        if (relayBanner) relayBanner.dataset.status = "running";
        if (relayBannerMessage) relayBannerMessage.textContent = "Connected.";
        if (relayBannerMeta) relayBannerMeta.textContent = "Alice · Synced a moment ago · 24 chats";
        return;
      }

      setHiddenState(relayQrContainer, true);
      setHiddenState(relaySyncProgress, true);
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

      const messageTypeNote = document.getElementById("message-types-note");
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

      const savedViewName = document.getElementById("saved-view-name");
      if (savedViewName instanceof HTMLInputElement) {
        savedViewName.disabled = false;
        savedViewName.value = "";
      }

      const enableButton = id => {
        const button = document.getElementById(id);
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          button.removeAttribute("disabled");
        }
      };

      ["save-view", "apply-saved-view", "delete-saved-view", "compare-views"].forEach(enableButton);

      const seedSavedViewSelect = (id, options, value) => {
        const select = document.getElementById(id);
        if (!(select instanceof HTMLSelectElement)) return;
        select.disabled = false;
        select.innerHTML = options
          .map(option => `<option value="${option.value}">${option.label}</option>`)
          .join("");
        select.value = value;
      };

      seedSavedViewSelect(
        "saved-view-list",
        [
          { value: "", label: "Choose a saved view…" },
          { value: "launch-last-30", label: "Launch last 30 days · Mar 1, 2026 to Mar 18, 2026" },
          { value: "recap-evenings", label: "Recap evenings · Feb 10, 2026 to Mar 18, 2026" },
        ],
        "launch-last-30",
      );
      seedSavedViewSelect(
        "compare-view-a",
        [
          { value: "", label: "Select view A…" },
          { value: "launch-last-30", label: "Launch last 30 days · Mar 1, 2026 to Mar 18, 2026" },
          { value: "recap-evenings", label: "Recap evenings · Feb 10, 2026 to Mar 18, 2026" },
        ],
        "launch-last-30",
      );
      seedSavedViewSelect(
        "compare-view-b",
        [
          { value: "", label: "Select view B…" },
          { value: "launch-last-30", label: "Launch last 30 days · Mar 1, 2026 to Mar 18, 2026" },
          { value: "recap-evenings", label: "Recap evenings · Feb 10, 2026 to Mar 18, 2026" },
        ],
        "recap-evenings",
      );

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

  async function applyWorkspaceScenario(page) {
    await page.evaluate(() => {
      const setHiddenState = (element, isHidden) => {
        if (!element) return;
        element.hidden = isHidden;
        element.classList.toggle("hidden", isHidden);
      };

      const relayBanner = document.getElementById("relay-status-banner");
      const relayBannerMessage = document.getElementById("relay-connection-status");
      const relayBannerMeta = document.getElementById("relay-account-name");
      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const milestones = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));
      const relayQrContainer = document.getElementById("relay-qr-container");
      const relaySyncProgress = document.getElementById("relay-sync-progress");

      if (relayBanner) relayBanner.dataset.status = "running";
      if (relayBannerMessage) relayBannerMessage.textContent = "Connected: Suyash Kumar (916360465282).";
      if (relayBannerMeta) {
        relayBannerMeta.textContent = "Suyash Kumar (916360465282) · Synced 2 min ago · 784 chats · Last sync 779ms · Primary sync";
      }

      if (heroBadge) {
        heroBadge.textContent = "Connected • Suyash Kumar";
        heroBadge.classList.add("hero-status-badge-ready");
      }
      if (heroCopy) heroCopy.textContent = "784 chats ready.";
      if (heroMeta) heroMeta.textContent = "Updated 2 min ago";
      if (heroSyncDot) {
        heroSyncDot.dataset.state = "ready";
        heroSyncDot.hidden = false;
        heroSyncDot.classList.remove("hidden");
      }
      milestones.forEach(step => {
        step.dataset.state = "complete";
        step.classList.toggle("is-ready-celebration", step.dataset.step === "ready");
      });
      setHiddenState(relayQrContainer, true);
      setHiddenState(relaySyncProgress, true);

      const connection = document.getElementById("relay-connection-status");
      if (connection) connection.textContent = "Connected: Suyash Kumar (916360465282).";
      const account = document.getElementById("relay-account-name");
      if (account) account.textContent = "Logged in as Suyash Kumar (916360465282)";

      const start = document.getElementById("relay-start");
      const stop = document.getElementById("relay-stop");
      const logout = document.getElementById("relay-logout");
      if (start) start.textContent = "Refresh chats";
      if (stop) stop.disabled = false;
      if (logout) logout.disabled = false;

      const reloadAll = document.getElementById("relay-reload-all");
      const clearStorage = document.getElementById("relay-clear-storage");
      if (reloadAll) reloadAll.disabled = false;
      if (clearStorage) clearStorage.disabled = false;

      const chatSelector = document.getElementById("chat-selector");
      if (chatSelector instanceof HTMLSelectElement) {
        chatSelector.innerHTML = `
          <option value="recruitment-route-main" selected>Recruitment Route - Main · 2,056 msgs · Active 20-03-2026</option>
          <option value="launch-thread">Launch Thread · 784 msgs</option>
        `;
        chatSelector.disabled = false;
      }

      const range = document.getElementById("global-range");
      if (range instanceof HTMLSelectElement) {
        range.value = "custom";
      }

      const customControls = document.getElementById("custom-range-controls");
      if (customControls) customControls.classList.remove("hidden");
      const customStart = document.getElementById("custom-start");
      const customEnd = document.getElementById("custom-end");
      const customApply = document.getElementById("apply-custom-range");
      if (customStart instanceof HTMLInputElement) {
        customStart.disabled = false;
        customStart.value = "2025-09-03";
      }
      if (customEnd instanceof HTMLInputElement) {
        customEnd.disabled = false;
        customEnd.value = "2026-03-20";
      }
      if (customApply instanceof HTMLButtonElement) {
        customApply.disabled = false;
      }

      const emptyCallout = document.getElementById("dataset-empty-callout");
      const workspaceSplit = document.querySelector(".workspace-stage-grid");
      if (emptyCallout) {
        emptyCallout.classList.add("hidden");
        emptyCallout.setAttribute("hidden", "");
        emptyCallout.style.display = "none";
      }
      if (workspaceSplit) workspaceSplit.classList.remove("workspace-stage-grid--has-secondary");

      const utilityCluster = document.getElementById("workspace-utility-cluster");
      if (utilityCluster instanceof HTMLDetailsElement) utilityCluster.open = false;
    });
  }

  async function applyWorkspaceEmptyScenario(page) {
    await page.evaluate(() => {
      const setHiddenState = (element, isHidden) => {
        if (!element) return;
        element.hidden = isHidden;
        element.classList.toggle("hidden", isHidden);
      };

      const relayBanner = document.getElementById("relay-status-banner");
      const relayBannerMessage = document.getElementById("relay-connection-status");
      const relayBannerMeta = document.getElementById("relay-account-name");
      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const milestones = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));
      const relayQrContainer = document.getElementById("relay-qr-container");
      const relaySyncProgress = document.getElementById("relay-sync-progress");

      if (relayBanner) relayBanner.dataset.status = "running";
      if (relayBannerMessage) relayBannerMessage.textContent = "Connected.";
      if (relayBannerMeta) relayBannerMeta.textContent = "Synced a moment ago · 24 chats";
      if (heroBadge) {
        heroBadge.textContent = "Connected • Alice";
        heroBadge.classList.remove("hero-status-badge-ready");
      }
      if (heroCopy) heroCopy.textContent = "24 chats loaded. Pick a chat to unlock findings.";
      if (heroMeta) heroMeta.textContent = "Connected · Waiting for chat selection";
      if (heroSyncDot) {
        heroSyncDot.dataset.state = "ready";
        heroSyncDot.hidden = false;
        heroSyncDot.classList.remove("hidden");
      }
      milestones.forEach(step => {
        if (step.dataset.step === "connect") step.dataset.state = "complete";
        if (step.dataset.step === "sync") step.dataset.state = "complete";
        if (step.dataset.step === "ready") {
          step.dataset.state = "pending";
          step.classList.remove("is-ready-celebration");
        }
      });
      setHiddenState(relayQrContainer, true);
      setHiddenState(relaySyncProgress, true);

      const chatSelector = document.getElementById("chat-selector");
      if (chatSelector instanceof HTMLSelectElement) {
        chatSelector.disabled = false;
        chatSelector.innerHTML = `
          <option value="" selected>Select a chat to continue</option>
          <option value="launch-thread">Launch Thread · 784 msgs</option>
          <option value="ops-room">Ops Room · 321 msgs</option>
        `;
      }

      const range = document.getElementById("global-range");
      if (range instanceof HTMLSelectElement) range.value = "all";

      const customControls = document.getElementById("custom-range-controls");
      if (customControls) customControls.classList.add("hidden");

      const emptyCallout = document.getElementById("dataset-empty-callout");
      const workspaceSplit = document.querySelector(".workspace-stage-grid");
      if (emptyCallout) {
        emptyCallout.classList.remove("hidden");
        emptyCallout.removeAttribute("hidden");
        emptyCallout.style.removeProperty("display");
      }
      if (workspaceSplit) workspaceSplit.classList.add("workspace-stage-grid--has-secondary");

      const emptyHeading = document.getElementById("dataset-empty-heading");
      const emptyCopy = document.getElementById("dataset-empty-copy");
      if (emptyHeading) emptyHeading.textContent = "Pick a chat";
      if (emptyCopy) emptyCopy.textContent = "Choose one loaded chat to unlock findings and exports.";

      const utilityCluster = document.getElementById("workspace-utility-cluster");
      if (utilityCluster instanceof HTMLDetailsElement) utilityCluster.open = false;
    });
  }

  async function applyWorkspaceOfflineScenario(page) {
    await page.evaluate(() => {
      const setHiddenState = (element, isHidden) => {
        if (!element) return;
        element.hidden = isHidden;
        element.classList.toggle("hidden", isHidden);
      };

      const relayBanner = document.getElementById("relay-status-banner");
      const relayBannerMessage = document.getElementById("relay-connection-status");
      const relayBannerMeta = document.getElementById("relay-account-name");
      const heroBadge = document.getElementById("hero-status-badge");
      const heroCopy = document.getElementById("hero-status-copy");
      const heroMeta = document.getElementById("hero-status-meta-copy");
      const heroSyncDot = document.getElementById("hero-sync-dot");
      const milestones = Array.from(document.querySelectorAll("#hero-milestones .hero-milestone"));
      const relayQrContainer = document.getElementById("relay-qr-container");
      const relaySyncProgress = document.getElementById("relay-sync-progress");

      if (relayBanner) relayBanner.dataset.status = "offline";
      if (relayBannerMessage) relayBannerMessage.textContent = "Relay offline.";
      if (relayBannerMeta) relayBannerMeta.textContent = "Start relay to unlock workspace.";
      if (heroBadge) {
        heroBadge.textContent = "Offline";
        heroBadge.classList.remove("hero-status-badge-ready");
      }
      if (heroCopy) heroCopy.textContent = "Relay is offline";
      if (heroMeta) heroMeta.textContent = "Connect to start analysis";
      if (heroSyncDot) {
        heroSyncDot.dataset.state = "idle";
        heroSyncDot.hidden = true;
        heroSyncDot.classList.add("hidden");
      }
      milestones.forEach(step => {
        if (step.dataset.step === "connect") step.dataset.state = "active";
        if (step.dataset.step === "sync") step.dataset.state = "pending";
        if (step.dataset.step === "ready") {
          step.dataset.state = "pending";
          step.classList.remove("is-ready-celebration");
        }
      });
      setHiddenState(relayQrContainer, true);
      setHiddenState(relaySyncProgress, true);

      const chatSelector = document.getElementById("chat-selector");
      if (chatSelector instanceof HTMLSelectElement) {
        chatSelector.disabled = true;
        chatSelector.innerHTML = `<option value="">No chats loaded yet</option>`;
      }

      const range = document.getElementById("global-range");
      if (range instanceof HTMLSelectElement) {
        range.disabled = true;
        range.value = "all";
      }

      const customControls = document.getElementById("custom-range-controls");
      if (customControls) customControls.classList.add("hidden");
      const customStart = document.getElementById("custom-start");
      const customEnd = document.getElementById("custom-end");
      const customApply = document.getElementById("apply-custom-range");
      if (customStart instanceof HTMLInputElement) customStart.disabled = true;
      if (customEnd instanceof HTMLInputElement) customEnd.disabled = true;
      if (customApply instanceof HTMLButtonElement) customApply.disabled = true;

      const logout = document.getElementById("relay-logout");
      if (logout instanceof HTMLButtonElement) logout.disabled = true;

      const recoveryActions = document.getElementById("relay-status-actions");
      const reconnect = document.getElementById("relay-recovery-reconnect");
      const resync = document.getElementById("relay-recovery-resync");
      const exportDiagnostics = document.getElementById("relay-recovery-export");
      if (recoveryActions) {
        recoveryActions.hidden = false;
        recoveryActions.classList.remove("hidden");
      }
      if (reconnect instanceof HTMLButtonElement) reconnect.disabled = false;
      if (resync instanceof HTMLButtonElement) resync.disabled = true;
      if (exportDiagnostics instanceof HTMLButtonElement) exportDiagnostics.disabled = false;

      const emptyCallout = document.getElementById("dataset-empty-callout");
      const workspaceSplit = document.querySelector(".workspace-stage-grid");
      if (emptyCallout) {
        emptyCallout.classList.remove("hidden");
        emptyCallout.removeAttribute("hidden");
        emptyCallout.style.removeProperty("display");
      }
      if (workspaceSplit) workspaceSplit.classList.add("workspace-stage-grid--has-secondary");

      const emptyHeading = document.getElementById("dataset-empty-heading");
      const emptyCopy = document.getElementById("dataset-empty-copy");
      if (emptyHeading) emptyHeading.textContent = "Workspace locked";
      if (emptyCopy) emptyCopy.textContent = "Start relay to unlock chat selection, exports, and findings.";

      const utilityCluster = document.getElementById("workspace-utility-cluster");
      if (utilityCluster instanceof HTMLDetailsElement) utilityCluster.open = false;
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
    await page.waitForFunction(() => {
      const runtime = window.__WAAN_VUE_RUNTIME__;
      const shellBridgeReady = Boolean(runtime?.bridges?.shell);
      const relayPanelReady = Boolean(document.getElementById("relay-status-panel"));
      const relayActionsReady = Boolean(document.getElementById("relay-sidebar-live-actions"));
      const actionsToolbarReady = Boolean(document.getElementById("actions-toolbar"));
      const firstRunReady = Boolean(document.getElementById("first-run-open-relay"));
      const searchReady = Boolean(document.getElementById("search-keyword"));

      return shellBridgeReady
        && relayPanelReady
        && relayActionsReady
        && actionsToolbarReady
        && firstRunReady
        && searchReady;
    });
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    });
    await page.addStyleTag({
      content: `*,
*::before,
*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
#data-status,
#toast-container,
#relay-sidebar-live-actions,
#relay-status-actions { display: none !important; opacity: 0 !important; pointer-events: none !important; }`,
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
      const relayBannerMessage = document.getElementById("relay-connection-status");
      const relayBannerMeta = document.getElementById("relay-account-name");
      const relayLiveActions = document.getElementById("relay-sidebar-live-actions");
      const relayRecoveryActions = document.getElementById("relay-status-actions");
      const relayQrContainer = document.getElementById("relay-qr-container");
      if (relayBanner) relayBanner.dataset.status = "offline";
      if (relayBannerMessage) relayBannerMessage.textContent = "Relay offline.";
      if (relayBannerMeta) {
        relayBannerMeta.textContent = "Start relay.";
      }
      if (relayLiveActions) {
        relayLiveActions.replaceChildren();
        relayLiveActions.hidden = true;
        relayLiveActions.classList.add("hidden");
      }
      if (relayRecoveryActions) {
        relayRecoveryActions.hidden = true;
        relayRecoveryActions.classList.add("hidden");
      }
      if (relayQrContainer) {
        relayQrContainer.hidden = true;
        relayQrContainer.classList.add("hidden");
      }

      const syncProgress = document.getElementById("relay-sync-progress");
      if (syncProgress) {
        syncProgress.hidden = true;
        syncProgress.classList.add("hidden");
      }
    });
    await page.evaluate(async () => {
      const selectors = [
        "main",
        "#relay-status-panel",
        "#participants",
        "#search-panel",
        "#saved-views-card",
        "#message-types",
      ];
      const getSignature = () => {
        const values = [
          Math.round(document.body.scrollHeight),
          Math.round(document.documentElement.scrollHeight),
        ];
        selectors.forEach(selector => {
          const node = document.querySelector(selector);
          const rect = node?.getBoundingClientRect();
          values.push(rect ? Math.round(rect.height) : -1);
          values.push(rect ? Math.round(rect.top + window.scrollY) : -1);
        });
        return values.join("|");
      };

      let previousSignature = "";
      let stableFrames = 0;

      for (let iteration = 0; iteration < 30; iteration += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 100));
        const nextSignature = getSignature();
        if (nextSignature === previousSignature) {
          stableFrames += 1;
          if (stableFrames >= 3) break;
        } else {
          stableFrames = 0;
          previousSignature = nextSignature;
        }
      }
    });
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  async function settleScenario(page, ...applyFns) {
    for (const applyFn of applyFns) {
      await applyFn(page);
    }
    await page.waitForTimeout(350);
    await page.evaluate(async () => {
      const selectors = [
        "#workspace-stage",
        "#dataset-empty-callout",
        "#relay-status-banner",
        "#chat-selector",
        "#global-range",
        "#custom-range-controls",
        "#relay-qr-container",
        "#relay-sync-progress",
      ];
      const getSignature = () =>
        selectors.map(selector => {
          const node = document.querySelector(selector);
          if (!node) return `${selector}:missing`;
          const rect = node.getBoundingClientRect();
          const hiddenAttr = node.hasAttribute("hidden");
          const hiddenClass = node.classList.contains("hidden");
          const text = node.textContent?.trim().slice(0, 120) || "";
          const value = "value" in node ? String(node.value ?? "") : "";
          return [
            selector,
            Math.round(rect.width),
            Math.round(rect.height),
            hiddenAttr ? "attr-hidden" : "attr-visible",
            hiddenClass ? "class-hidden" : "class-visible",
            node.getAttribute("data-status") || "",
            value,
            text,
          ].join("|");
        }).join("::");

      let previousSignature = "";
      let stableFrames = 0;

      for (let iteration = 0; iteration < 20; iteration += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 100));
        const nextSignature = getSignature();
        if (nextSignature === previousSignature) {
          stableFrames += 1;
          if (stableFrames >= 3) break;
        } else {
          stableFrames = 0;
          previousSignature = nextSignature;
        }
      }
    });
    for (const applyFn of applyFns) {
      await applyFn(page);
    }
    await page.waitForTimeout(80);
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

  test("preserves full-width mobile section nav", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile-390") return;
    await prepareStableFrame(page);
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector(".section-nav");
      const rect = nav?.getBoundingClientRect();
      return rect
        ? { width: Math.round(rect.width), left: Math.round(rect.left), viewport: window.innerWidth }
        : null;
    });
    expect(metrics).toBeTruthy();
    expect(Math.abs(metrics.width - metrics.viewport)).toBeLessThanOrEqual(1);
    expect(metrics.left).toBe(0);
  });

  test("preserves corrected layout contracts", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyWorkspaceScenario, applyDeepDiveScenario);

    const metrics = await page.evaluate(() => {
      const customRangeRoot = document.getElementById("custom-range-controls");
      const rect = (node) => {
        const value = node?.getBoundingClientRect();
        return value
          ? {
              top: Math.round(value.top),
              bottom: Math.round(value.bottom),
              left: Math.round(value.left),
              right: Math.round(value.right),
              width: Math.round(value.width),
              height: Math.round(value.height),
            }
          : null;
      };

      return {
        customRangeRoot: rect(customRangeRoot),
        customInputs: Array.from(
          customRangeRoot?.querySelectorAll('input, .p-datepicker, .p-datepicker-input') ?? [],
        )
          .slice(0, 2)
          .map(node => rect(node)),
        customApply: rect(
          customRangeRoot?.querySelector('button, [role="button"], .ghost-button') ??
            document.getElementById("apply-custom-range"),
        ),
        utilityClusterOpen:
          document.getElementById("workspace-utility-cluster") instanceof HTMLDetailsElement
            ? document.getElementById("workspace-utility-cluster").open
            : null,
        workspaceSurface: rect(document.querySelector(".workspace-command-surface")),
        emptyCallout: {
          hidden:
            document.getElementById("dataset-empty-callout")?.classList.contains("hidden") ??
            null,
        },
      };
    });

    expect(metrics.customRangeRoot).toBeTruthy();
    expect(metrics.utilityClusterOpen).toBe(false);
    expect(metrics.customInputs).toHaveLength(2);
    expect(metrics.customInputs[0]).toBeTruthy();
    expect(metrics.customInputs[1]).toBeTruthy();
    expect(metrics.customApply).toBeTruthy();
    const latestInputBottom = Math.max(metrics.customInputs[0].bottom, metrics.customInputs[1].bottom);
    const inlineAligned = Math.abs(metrics.customApply.bottom - latestInputBottom) <= 4;
    const stackedBelow = metrics.customApply.top >= latestInputBottom - 1;
    expect(inlineAligned || stackedBelow).toBe(true);
    if (testInfo.project.name === "desktop-1440") {
      expect(metrics.emptyCallout.hidden).toBe(true);
      expect(metrics.workspaceSurface.width).toBeGreaterThan(750);
    }
  });

  test("matches long-form dashboard baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyDeepDiveScenario, applyLowerLaneScenario);

    await expect(page).toHaveScreenshot(`dashboard-longform-${testInfo.project.name}.png`, {
      fullPage: true,
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
      const utilityCluster = document.getElementById("workspace-utility-cluster");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (content) content.style.display = "none";
      if (card) card.classList.add("collapsed");
      if (utilityCluster instanceof HTMLDetailsElement) utilityCluster.open = true;
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

  test("matches workspace controls baseline", async ({ page }, testInfo) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyWorkspaceScenario);
    const section = page.locator("#workspace-stage");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-workspace-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches workspace offline stage baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyWorkspaceOfflineScenario);
    const section = page.locator("#workspace-stage");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`workspace-stage-offline-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches workspace waiting QR stage baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, async currentPage => {
      await applyRelayScenario(currentPage, "waiting_qr");
      await applyWorkspaceEmptyScenario(currentPage);
      await currentPage.evaluate(() => {
        const banner = document.getElementById("relay-status-banner");
        const message = document.getElementById("relay-connection-status");
        const meta = document.getElementById("relay-account-name");
        if (banner) banner.dataset.status = "waiting_qr";
        if (message) message.textContent = "Link your phone.";
        if (meta) meta.textContent = "Open Linked Devices to continue.";
      });
    });
    const section = page.locator("#workspace-stage");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`workspace-stage-waiting-qr-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches workspace syncing stage baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, async currentPage => {
      await applyRelayScenario(currentPage, "running_syncing");
      await applyWorkspaceEmptyScenario(currentPage);
      await currentPage.evaluate(() => {
        const emptyCallout = document.getElementById("dataset-empty-callout");
        if (emptyCallout) {
          emptyCallout.classList.add("hidden");
          emptyCallout.setAttribute("hidden", "");
          emptyCallout.style.display = "none";
        }
      });
    });
    const section = page.locator("#workspace-stage");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`workspace-stage-syncing-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches workspace no-chat-selected stage baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyWorkspaceEmptyScenario);
    const section = page.locator("#workspace-stage");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`workspace-stage-no-chat-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("keeps workspace no-chat-selected guidance and control state coherent", async ({ page }) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyWorkspaceEmptyScenario);

    const state = await page.evaluate(() => {
      const emptyCallout = document.getElementById("dataset-empty-callout");
      const emptyHeading = document.getElementById("dataset-empty-heading");
      const emptyCopy = document.getElementById("dataset-empty-copy");
      const chatSelector = document.getElementById("chat-selector");
      const range = document.getElementById("global-range");
      const customControls = document.getElementById("custom-range-controls");
      const utilityCluster = document.getElementById("workspace-utility-cluster");

      return {
        emptyCalloutVisible: Boolean(
          emptyCallout
            && !emptyCallout.hidden
            && !emptyCallout.classList.contains("hidden")
            && emptyCallout.style.display !== "none",
        ),
        emptyHeading: emptyHeading?.textContent || "",
        emptyCopy: emptyCopy?.textContent || "",
        chatDisabled: chatSelector instanceof HTMLSelectElement ? chatSelector.disabled : null,
        chatValue: chatSelector instanceof HTMLSelectElement ? chatSelector.value : null,
        rangeValue: range instanceof HTMLSelectElement ? range.value : null,
        customControlsHidden: Boolean(
          customControls?.classList.contains("hidden") || customControls?.hasAttribute("hidden"),
        ),
        utilityClusterOpen: utilityCluster instanceof HTMLDetailsElement ? utilityCluster.open : null,
      };
    });

    expect(state.emptyCalloutVisible).toBe(true);
    expect(state.emptyHeading).toBe("Pick a chat");
    expect(state.emptyCopy).toBe("Choose one loaded chat to unlock findings and exports.");
    expect(state.chatDisabled).toBe(false);
    expect(state.chatValue).toBe("");
    expect(state.rangeValue).toBe("all");
    expect(state.customControlsHidden).toBe(true);
    expect(state.utilityClusterOpen).toBe(false);
  });

  test("keeps workspace offline guidance and control state coherent", async ({ page }) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyWorkspaceOfflineScenario);

    const state = await page.evaluate(() => {
      const emptyHeading = document.getElementById("dataset-empty-heading");
      const emptyCopy = document.getElementById("dataset-empty-copy");
      const chatSelector = document.getElementById("chat-selector");
      const range = document.getElementById("global-range");
      const customControls = document.getElementById("custom-range-controls");
      const logout = document.getElementById("relay-logout");
      const reconnect = document.getElementById("relay-recovery-reconnect");
      const resync = document.getElementById("relay-recovery-resync");
      const exportDiagnostics = document.getElementById("relay-recovery-export");
      const recoveryActions = document.getElementById("relay-status-actions");

      return {
        emptyHeading: emptyHeading?.textContent || "",
        emptyCopy: emptyCopy?.textContent || "",
        chatDisabled: chatSelector instanceof HTMLSelectElement ? chatSelector.disabled : null,
        rangeDisabled: range instanceof HTMLSelectElement ? range.disabled : null,
        rangeValue: range instanceof HTMLSelectElement ? range.value : null,
        customControlsHidden: Boolean(
          customControls?.classList.contains("hidden") || customControls?.hasAttribute("hidden"),
        ),
        logoutDisabled: logout instanceof HTMLButtonElement ? logout.disabled : null,
        recoveryVisible: Boolean(
          recoveryActions
            && !recoveryActions.hidden
            && !recoveryActions.classList.contains("hidden"),
        ),
        reconnectDisabled: reconnect instanceof HTMLButtonElement ? reconnect.disabled : null,
        resyncDisabled: resync instanceof HTMLButtonElement ? resync.disabled : null,
        exportDisabled: exportDiagnostics instanceof HTMLButtonElement ? exportDiagnostics.disabled : null,
      };
    });

    expect(state.emptyHeading).toBe("Workspace locked");
    expect(state.emptyCopy).toBe("Start relay to unlock chat selection, exports, and findings.");
    expect(state.chatDisabled).toBe(true);
    expect(state.rangeDisabled).toBe(true);
    expect(state.rangeValue).toBe("all");
    expect(state.customControlsHidden).toBe(true);
    expect([true, null]).toContain(state.logoutDisabled);
    expect(state.recoveryVisible).toBe(true);
    expect(state.reconnectDisabled).toBe(false);
    expect(state.resyncDisabled).toBe(true);
    expect(state.exportDisabled).toBe(false);
  });

  test("keeps loaded search and saved-view controls reachable across breakpoints", async ({ page }) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyDeepDiveScenario);

    await page.locator("#search-panel").scrollIntoViewIfNeeded();
    await expect(page.locator("#search-panel")).toBeVisible();
    await expect(page.locator("#run-search")).toBeVisible();
    await expect(page.locator("#run-search")).toBeEnabled();
    await expect(page.locator("#reset-search")).toBeVisible();
    await expect(page.locator("#reset-search")).toBeEnabled();
    await expect(page.locator("#search-results-summary")).toContainText("12 matches");

    await page.locator("#saved-views-card").scrollIntoViewIfNeeded();
    await expect(page.locator("#saved-views-card")).toBeVisible();
    await expect(page.locator("#save-view")).toBeVisible();
    await expect(page.locator("#save-view")).toBeEnabled();
    await expect(page.locator("#apply-saved-view")).toBeVisible();
    await expect(page.locator("#apply-saved-view")).toBeEnabled();
    await expect(page.locator("#delete-saved-view")).toBeVisible();
    await expect(page.locator("#delete-saved-view")).toBeEnabled();
    await expect(page.locator("#compare-views")).toBeVisible();
    await expect(page.locator("#compare-views")).toBeEnabled();
    await expect(page.locator("#saved-view-gallery .saved-view-card")).toHaveCount(2);
    await expect(page.locator("#compare-summary .compare-summary-grid")).toBeVisible();

    const reachability = await page.evaluate(() => {
      const resolveBridgeOrNative = id =>
        document.getElementById(`${id}--mount`) || document.getElementById(id);
      const targets = [
        document.getElementById("run-search"),
        document.getElementById("reset-search"),
        resolveBridgeOrNative("saved-view-list"),
        document.getElementById("save-view"),
        document.getElementById("apply-saved-view"),
        document.getElementById("delete-saved-view"),
        resolveBridgeOrNative("compare-view-a"),
        resolveBridgeOrNative("compare-view-b"),
        document.getElementById("compare-views"),
      ].filter(Boolean);

      return targets.map(element => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          id: element.id || element.getAttribute("data-ui-owner") || "unknown",
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
          reachableHorizontally: rect.left >= 0 && rect.right <= window.innerWidth,
        };
      });
    });

    for (const target of reachability) {
      expect(target.visible, `${target.id} should be visible`).toBe(true);
      expect(target.reachableHorizontally, `${target.id} should stay within the viewport width`).toBe(true);
    }
  });

  test("keeps participants, search results, hourly heatmap, and saved-view gallery locally scroll-bounded", async ({ page }) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyDeepDiveScenario, applyLowerLaneScenario);

    const metrics = await page.evaluate(() => {
      const participantsContainer = document.querySelector("#participants .table-container.scrollable");
      const participantsBody = document.querySelector("#top-senders tbody");
      if (participantsBody) {
        const rows = Array.from({ length: 80 }, (_, index) => `
          <tr>
            <td class="p-3">${index + 1}</td>
            <td class="p-3">Participant ${index + 1}</td>
            <td class="p-3">${200 - index}</td>
            <td class="p-3">${(10 + (index % 50)) / 10}</td>
            <td class="p-3">${(5 + (index % 20)) / 10}</td>
          </tr>
        `).join("");
        participantsBody.innerHTML = rows;
      }

      const searchResultsList = document.getElementById("search-results-list");
      if (searchResultsList) {
        searchResultsList.innerHTML = Array.from({ length: 60 }, (_, index) => `
          <article class="search-result">
            <header class="search-result-header">
              <span class="search-result-sender">Sender ${index + 1}</span>
              <time>2026-03-2${index % 9}</time>
            </header>
            <p class="search-result-message">Result ${index + 1} with enough copy to keep the cards realistic.</p>
          </article>
        `).join("");
      }

      const savedViewGallery = document.getElementById("saved-view-gallery");
      if (savedViewGallery) {
        savedViewGallery.innerHTML = Array.from({ length: 30 }, (_, index) => `
          <article class="saved-view-card">
            <div class="saved-view-card-header">
              <strong>View ${index + 1}</strong>
            </div>
            <p class="saved-view-card-summary">Saved view ${index + 1} with enough content to grow the gallery.</p>
          </article>
        `).join("");
      }

      const hourlyChart = document.getElementById("hourly-chart");
      const hourlyHeatmap = hourlyChart?.querySelector(".hourly-heatmap");
      if (hourlyHeatmap instanceof HTMLElement) {
        hourlyHeatmap.style.minHeight = "1000px";
      } else if (hourlyChart instanceof HTMLElement) {
        const filler = document.createElement("div");
        filler.className = "hourly-heatmap";
        filler.style.minHeight = "1000px";
        hourlyChart.replaceChildren(filler);
      }

      const measure = element => {
        if (!(element instanceof HTMLElement)) return null;
        const styles = window.getComputedStyle(element);
        return {
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          overflow: styles.overflow,
          overflowY: styles.overflowY,
        };
      };

      return {
        viewportWidth: window.innerWidth,
        participants: measure(participantsContainer),
        searchResults: measure(searchResultsList),
        hourlyChart: measure(hourlyChart),
        savedViews: measure(savedViewGallery),
      };
    });

    expect(metrics.participants).toBeTruthy();
    expect(metrics.participants.clientHeight).toBeGreaterThan(0);
    expect(metrics.participants.scrollHeight).toBeGreaterThan(metrics.participants.clientHeight);
    expect(
      ["auto", "scroll"].includes(metrics.participants.overflowY)
      || ["auto", "scroll"].includes(metrics.participants.overflow),
    ).toBe(true);

    expect(metrics.searchResults).toBeTruthy();
    expect(metrics.searchResults.clientHeight).toBeGreaterThan(0);
    expect(metrics.searchResults.scrollHeight).toBeGreaterThan(metrics.searchResults.clientHeight);
    expect(
      ["auto", "scroll"].includes(metrics.searchResults.overflowY)
      || ["auto", "scroll"].includes(metrics.searchResults.overflow),
    ).toBe(true);

    expect(metrics.hourlyChart).toBeTruthy();
    expect(metrics.hourlyChart.clientHeight).toBeGreaterThan(0);
    expect(metrics.hourlyChart.scrollHeight).toBeGreaterThan(metrics.hourlyChart.clientHeight);
    expect(
      ["auto", "scroll"].includes(metrics.hourlyChart.overflowY)
      || ["auto", "scroll"].includes(metrics.hourlyChart.overflow),
    ).toBe(true);

    expect(metrics.savedViews).toBeTruthy();
    expect(metrics.savedViews.clientHeight).toBeGreaterThan(0);
    expect(metrics.savedViews.scrollHeight).toBeGreaterThan(metrics.savedViews.clientHeight);
    expect(
      ["auto", "scroll"].includes(metrics.savedViews.overflowY)
      || ["auto", "scroll"].includes(metrics.savedViews.overflow),
    ).toBe(true);
  });

  test("matches search panel baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyDeepDiveScenario);
    const section = page.locator("#search-panel");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-search-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: testInfo.project.name === "desktop-1440" ? 0.02 : 0.01,
      timeout: 15000,
    });
  });

  test("proves loaded export success paths for daily, weekly, weekday, time-of-day, message types, and sentiment", async ({ page }) => {
    await prepareStableFrame(page);
    await settleScenario(page, applyDeepDiveScenario, applyLowerLaneScenario);

    const exportResults = await page.evaluate(async () => {
      const { setDatasetEntries, setDatasetAnalytics, setCurrentRange } = await import("/js/state.js");
      const { computeAnalytics } = await import("/js/analytics.js");

      const entries = [
        { type: "message", sender: "Alice", message: "Great launch progress today", timestamp: "2026-03-01T09:15:00.000Z" },
        { type: "message", sender: "Priya", message: "Need a careful recap before launch", timestamp: "2026-03-02T18:30:00.000Z" },
        { type: "message", sender: "Marco", message: "Shared the launch deck link", timestamp: "2026-03-08T11:45:00.000Z", link: "https://example.com/deck" },
        { type: "message", sender: "Alice", message: "Poll says we launch Tuesday", timestamp: "2026-03-09T20:10:00.000Z", poll: { name: "Launch day" } },
        { type: "message", sender: "Priya", message: "Media recap uploaded for the team", timestamp: "2026-03-10T07:05:00.000Z", has_media: true },
      ];

      const analytics = computeAnalytics(entries);
      analytics.message_types = {
        ...(analytics.message_types || {}),
        summary: [
          { label: "Text", count: 3, share: 0.6 },
          { label: "Links", count: 1, share: 0.2 },
          { label: "Media", count: 1, share: 0.2 },
        ],
      };
      setDatasetEntries(entries);
      setDatasetAnalytics(analytics);
      setCurrentRange("all");

      const recordedDownloads = [];
      const originalCreateObjectURL = URL.createObjectURL.bind(URL);
      const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
      const originalAnchorClick = HTMLAnchorElement.prototype.click;

      URL.createObjectURL = blob => {
        recordedDownloads.push({ kind: "blob", size: blob?.size ?? 0, type: blob?.type ?? "" });
        return originalCreateObjectURL(blob);
      };
      URL.revokeObjectURL = url => originalRevokeObjectURL(url);
      HTMLAnchorElement.prototype.click = function clickPatched() {
        recordedDownloads.push({ kind: "download", filename: this.download || "", href: this.href || "" });
        return originalAnchorClick.call(this);
      };

      const buttonIds = [
        "download-daily",
        "download-weekly",
        "download-weekday",
        "download-timeofday",
        "download-message-types",
        "download-sentiment",
      ];

      const beforeStatus = document.getElementById("data-status")?.textContent || "";
      const results = [];

      try {
        buttonIds.forEach(id => {
          const button = document.getElementById(id);
          if (button instanceof HTMLButtonElement) {
            button.disabled = false;
            button.removeAttribute("disabled");
          }
        });

        for (const id of buttonIds) {
          const beforeCount = recordedDownloads.length;
          document.getElementById(id)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 0));
          results.push({
            id,
            downloadEvents: recordedDownloads.slice(beforeCount),
            status: document.getElementById("data-status")?.textContent || "",
          });
        }
      } finally {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        HTMLAnchorElement.prototype.click = originalAnchorClick;
      }

      return { beforeStatus, results };
    });

    for (const result of exportResults.results) {
      expect(result.downloadEvents.length, `${result.id} should trigger a download event`).toBeGreaterThan(0);
      expect(result.downloadEvents.some(event => event.kind === "download"), `${result.id} should click a download link`).toBe(true);
      expect(result.status).not.toContain("No ");
      expect(result.status).not.toContain("Load ");
    }
  });

  test("matches saved views section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyDeepDiveScenario);
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

  test("matches sentiment section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    const section = page.locator("#sentiment-overview");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-sentiment-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("matches message-types section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyLowerLaneScenario);
    const section = page.locator("#message-types");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`section-message-types-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: testInfo.project.name === "desktop-1440" ? 0.02 : 0.01,
      timeout: 15000,
    });
  });

  test("matches polls section baseline", async ({ page }, testInfo) => {
    if (!shouldCaptureSectionBaseline(testInfo.project.name)) return;
    await prepareStableFrame(page);
    await settleScenario(page, applyLowerLaneScenario);
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
    const panel = page.locator("#relay-status-panel");
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
    await settleScenario(page, currentPage => applyRelayScenario(currentPage, "waiting_qr"));
    const panel = page.locator("#relay-status-panel");
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
    await settleScenario(page, currentPage => applyRelayScenario(currentPage, "running_syncing"));
    const panel = page.locator("#relay-status-panel");
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
    await settleScenario(page, currentPage => applyRelayScenario(currentPage, "running_ready"));
    const panel = page.locator("#relay-status-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot(`relay-state-running-ready-${testInfo.project.name}.png`, {
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      timeout: 15000,
    });
  });

  test("keeps the workspace state panel visible through relay connection transitions", async ({ page }) => {
    await prepareStableFrame(page);

    const panel = page.locator("#relay-status-panel");
    const banner = page.locator("#relay-status-banner");

    const captureState = async (label, options = {}) => {
      const { requireMetaText = false } = options;
      await expect(panel, `${label}: workspace state panel should stay visible`).toBeVisible();
      await expect(banner, `${label}: relay status banner should stay visible`).toBeVisible();

      const metrics = await page.evaluate(() => {
        const panelEl = document.getElementById("relay-status-panel");
        const bannerEl = document.getElementById("relay-status-banner");
        const messageEl = document.getElementById("relay-connection-status");
        const metaEl = document.getElementById("relay-account-name");
        const summarize = element => {
          if (!(element instanceof HTMLElement)) return null;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return {
            hiddenAttr: element.hidden || element.hasAttribute("hidden"),
            hiddenClass: element.classList.contains("hidden"),
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            width: rect.width,
            height: rect.height,
          };
        };
        return {
          panel: summarize(panelEl),
          banner: summarize(bannerEl),
          statusText: messageEl?.textContent?.trim() ?? "",
          metaText: metaEl?.textContent?.trim() ?? "",
        };
      });

      expect(metrics.panel?.hiddenAttr, `${label}: panel should not carry hidden attr`).toBe(false);
      expect(metrics.panel?.hiddenClass, `${label}: panel should not carry hidden class`).toBe(false);
      expect(metrics.panel?.display, `${label}: panel display should stay visible`).not.toBe("none");
      expect(metrics.panel?.visibility, `${label}: panel visibility should stay visible`).not.toBe("hidden");
      expect(Number(metrics.panel?.width ?? 0), `${label}: panel width should stay meaningfully visible`).toBeGreaterThan(160);
      expect(Number(metrics.panel?.height ?? 0), `${label}: panel height should stay meaningfully visible`).toBeGreaterThan(80);
      expect(metrics.banner?.display, `${label}: banner display should stay visible`).not.toBe("none");
      expect(metrics.banner?.visibility, `${label}: banner visibility should stay visible`).not.toBe("hidden");
      expect(metrics.statusText, `${label}: status copy should stay populated`).not.toBe("");
      if (requireMetaText) {
        expect(metrics.metaText, `${label}: meta copy should stay populated`).not.toBe("");
      }
    };

    await captureState("offline");
    await settleScenario(page, currentPage => applyRelayScenario(currentPage, "waiting_qr"));
    await captureState("waiting_qr");
    await settleScenario(page, currentPage => applyRelayScenario(currentPage, "running_syncing"));
    await captureState("running_syncing", { requireMetaText: true });
    await settleScenario(page, currentPage => applyRelayScenario(currentPage, "running_ready"));
    await captureState("running_ready", { requireMetaText: true });
  });
});
