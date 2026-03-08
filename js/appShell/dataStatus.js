// @ts-check

import { createHeroViewState, setHeroBadgeState, setHeroMilestones } from "./dataStatusHeroState.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
export function createDataStatusController({ elements, deps }) {
  const {
    dashboardRoot,
    heroStatusBadge,
    heroStatusCopy,
    heroStatusMetaCopy,
    heroSyncDot,
    heroMilestoneSteps,
    datasetEmptyStateManager,
  } = elements;

  const {
    setDatasetEmptyMessage,
    savedViewsController,
    formatRelayAccount,
    formatNumber,
    notifyRelayReady,
    formatStatusTime: formatStatusTimeFn = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    setTimeoutRef = setTimeout,
    clearTimeoutRef = clearTimeout,
    heroStatusRenderer = null,
  } = deps;

  let dataAvailable = false;
  let readyCelebrated = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let celebrationTimer = null;
  const heroViewState = createHeroViewState();
  const canRenderMilestones = typeof heroStatusRenderer?.renderMilestones === "function";
  const canSetDashboardLoadingState = typeof heroStatusRenderer?.setDashboardLoadingState === "function";
  const canRenderSyncMeta = typeof heroStatusRenderer?.renderSyncMeta === "function";
  const canSetDashboardSyncState = typeof heroStatusRenderer?.setDashboardSyncState === "function";
  const canRenderBadge = typeof heroStatusRenderer?.renderBadge === "function";
  const canRenderCopy = typeof heroStatusRenderer?.renderCopy === "function";

  /**
   * @param {{ text: string, state: string, readyCelebrating?: boolean }} params
   */
  function renderHeroBadge({ text, state, readyCelebrating = false }) {
    heroViewState.badgeText = text;
    setHeroBadgeState(heroViewState, heroStatusBadge, state);
    if (canRenderBadge) {
      heroStatusRenderer.renderBadge({ text, state, readyCelebrating });
      return;
    }
    if (heroStatusBadge) {
      heroStatusBadge.textContent = text;
    }
  }

  /**
   * @param {string} text
   */
  function renderHeroCopy(text) {
    heroViewState.copyText = text;
    if (canRenderCopy) {
      heroStatusRenderer.renderCopy(text);
      return;
    }
    if (heroStatusCopy) {
      heroStatusCopy.textContent = text;
    }
  }

  /**
   * @param {{ connect?: string, sync?: string, ready?: string }} [params]
   */
  function applyHeroMilestones({ connect = "pending", sync = "pending", ready = "pending" } = {}) {
    setHeroMilestones(heroViewState, { connect, sync, ready });
    if (canRenderMilestones) {
      heroStatusRenderer.renderMilestones({ connect, sync, ready, readyCelebrating: heroViewState.readyCelebrating });
    } else {
      if (!heroMilestoneSteps?.length) return;
      heroMilestoneSteps.forEach(/** @param {HTMLElement} step */ step => {
        const id = step.dataset.step;
        if (id === "connect") step.dataset.state = connect;
        if (id === "sync") step.dataset.state = sync;
        if (id === "ready") step.dataset.state = ready;
      });
    }
  }

  /**
   * @param {boolean} isLoading
   */
  function setDashboardLoadingState(isLoading) {
    if (canSetDashboardLoadingState) {
      heroStatusRenderer.setDashboardLoadingState(Boolean(isLoading));
    } else {
      if (!dashboardRoot) return;
      dashboardRoot.classList.toggle("is-loading", Boolean(isLoading));
    }
  }

  /**
   * @param {{ state?: string, message?: string }} [params]
   */
  function updateHeroSyncMeta({ state = "idle", message = "Awaiting relay." } = {}) {
    heroViewState.syncMetaState = state;
    heroViewState.syncMetaMessage = message;
    if (canRenderSyncMeta) {
      heroStatusRenderer.renderSyncMeta({ state, message });
    } else {
      if (heroSyncDot) {
        heroSyncDot.dataset.state = state;
      }
      if (heroStatusMetaCopy) {
        heroStatusMetaCopy.textContent = message;
      }
    }
  }

  /**
   * @param {boolean} isSyncing
   */
  function setDashboardSyncState(isSyncing) {
    if (canSetDashboardSyncState) {
      heroStatusRenderer.setDashboardSyncState(Boolean(isSyncing));
    } else {
      if (!dashboardRoot) return;
      dashboardRoot.classList.toggle("is-syncing", Boolean(isSyncing));
    }
  }

  /**
   * @param {{ rearm?: boolean }} [params]
   */
  function clearReadyCelebration({ rearm = true } = {}) {
    if (celebrationTimer) {
      clearTimeoutRef(celebrationTimer);
      celebrationTimer = null;
    }
    heroViewState.readyCelebrating = false;
    if (canRenderBadge) {
      heroStatusRenderer.renderBadge({
        text: heroViewState.badgeText,
        state: heroViewState.badgeState,
        readyCelebrating: false,
      });
    }
    if (canRenderMilestones) {
      heroStatusRenderer.renderMilestones({
        connect: heroViewState.milestones.connect,
        sync: heroViewState.milestones.sync,
        ready: heroViewState.milestones.ready,
        readyCelebrating: false,
      });
    }
    if (!canRenderBadge || !canRenderMilestones) {
      heroStatusBadge?.classList.remove("hero-status-badge-ready");
      heroMilestoneSteps?.forEach(/** @param {HTMLElement} step */ step => {
        if (step.dataset.step === "ready") {
          step.classList.remove("is-ready-celebration");
        }
      });
    }
    if (rearm) {
      readyCelebrated = false;
    }
  }

  function triggerReadyCelebration() {
    heroViewState.readyCelebrating = true;
    if (canRenderBadge) {
      heroStatusRenderer.renderBadge({
        text: heroViewState.badgeText,
        state: heroViewState.badgeState,
        readyCelebrating: true,
      });
    }
    if (canRenderMilestones) {
      heroStatusRenderer.renderMilestones({
        connect: heroViewState.milestones.connect,
        sync: heroViewState.milestones.sync,
        ready: heroViewState.milestones.ready,
        readyCelebrating: true,
      });
    }
    if (!canRenderBadge || !canRenderMilestones) {
      heroStatusBadge?.classList.add("hero-status-badge-ready");
      heroMilestoneSteps?.forEach(/** @param {HTMLElement} step */ step => {
        if (step.dataset.step === "ready") {
          step.classList.add("is-ready-celebration");
        }
      });
    }
    celebrationTimer = setTimeoutRef(() => {
      clearReadyCelebration({ rearm: false });
    }, 1200);
  }

  /**
   * @param {boolean} hasData
   */
  function setDataAvailabilityState(hasData) {
    dataAvailable = Boolean(hasData);
    datasetEmptyStateManager.setAvailability(dataAvailable);
    if (!dataAvailable) {
      setDatasetEmptyMessage(
        "No chat is selected yet.",
        "Open Relay Controls, scan the QR code, then choose a chat from \"Loaded chats\".",
      );
    }
    savedViewsController.setDataAvailability(Boolean(hasData));
    savedViewsController.refreshUI();
  }

  /**
   * @param {{ status?: string, account?: AnyRecord, chatCount?: number, syncingChats?: boolean, lastQr?: string } | null | undefined} status
   */
  function updateHeroRelayStatus(status) {
    if (!heroStatusBadge || !heroStatusCopy) return;
    if (!status) {
      renderHeroBadge({ text: "Not connected", state: "offline" });
      renderHeroCopy("Open Relay Controls, then press Connect.");
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Awaiting relay." });
      setDashboardSyncState(false);
      clearReadyCelebration();
      return;
    }

    if (status.status === "running") {
      const chatCount = Number(status.chatCount ?? 0);
      const isSyncing = Boolean(status.syncingChats) || chatCount === 0;
      const badgeText = status.account
        ? `Connected • ${formatRelayAccount(status.account)}`
        : "Relay connected";
      renderHeroBadge({
        text: badgeText,
        state: chatCount > 0 && !isSyncing ? "ready" : "syncing",
      });
      setDashboardSyncState(isSyncing);
      if (chatCount > 0 && !isSyncing) {
        renderHeroBadge({ text: badgeText, state: "ready" });
        renderHeroCopy(`${formatNumber(chatCount)} chats indexed. Insights are ready.`);
        applyHeroMilestones({ connect: "complete", sync: "complete", ready: "complete" });
        updateHeroSyncMeta({ state: "ready", message: `Last updated ${formatStatusTimeFn()}` });
        if (!readyCelebrated) {
          triggerReadyCelebration();
          if (typeof notifyRelayReady === "function") {
            notifyRelayReady(`Insights ready. ${formatNumber(chatCount)} chats indexed.`);
          }
          readyCelebrated = true;
        }
      } else {
        const copyText = chatCount > 0
          ? `${formatNumber(chatCount)} chats indexed. Syncing updates…`
          : "Connected. Syncing chats…";
        renderHeroBadge({ text: badgeText, state: "syncing" });
        renderHeroCopy(copyText);
        applyHeroMilestones({ connect: "complete", sync: "active", ready: "pending" });
        updateHeroSyncMeta({
          state: "syncing",
          message: chatCount > 0
            ? `Syncing now • ${formatNumber(chatCount)} chats found`
            : "Syncing now • preparing chats",
        });
        clearReadyCelebration({ rearm: chatCount === 0 });
      }
      return;
    }

    if (status.status === "waiting_qr") {
      renderHeroBadge({ text: "Scan the QR code", state: "waiting" });
      if (status.lastQr) {
        renderHeroCopy("On your phone: Linked Devices -> Link a device -> scan this code.");
      } else {
        renderHeroCopy("Press Connect to show a new QR code.");
      }
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Waiting for phone link." });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    if (status.status === "starting") {
      renderHeroBadge({ text: "Starting relay", state: "starting" });
      renderHeroCopy("Starting relay…");
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Starting session…" });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    renderHeroBadge({ text: "Not connected", state: "offline" });
    renderHeroCopy("Open Relay Controls, then press Connect.");
    applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
    updateHeroSyncMeta({ state: "idle", message: "Awaiting relay." });
    setDashboardSyncState(false);
    clearReadyCelebration({ rearm: true });
  }

  return {
    setDashboardLoadingState,
    setDataAvailabilityState,
    updateHeroRelayStatus,
    getDataAvailable: () => dataAvailable,
  };
}
