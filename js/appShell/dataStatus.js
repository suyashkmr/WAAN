// @ts-check

import { createHeroViewState, setHeroBadgeState, setHeroMilestones } from "./dataStatusHeroState.js";
import { UI_COPY } from "../uiCopy.js";

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
    getRemoteChatsLastFetchedAt = () => 0,
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
  function updateHeroSyncMeta({ state = "idle", message = UI_COPY.relay.offlineMeta } = {}) {
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
        UI_COPY.dataset.emptyHeading,
        UI_COPY.dataset.emptyMessage,
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
      renderHeroBadge({ text: "Relay offline", state: "offline" });
      renderHeroCopy(UI_COPY.relay.offlineHero);
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: UI_COPY.relay.offlineMeta });
      setDashboardSyncState(false);
      clearReadyCelebration();
      return;
    }

    if (status.status === "running") {
      const chatCount = Number(status.chatCount ?? 0);
      const isSyncing = Boolean(status.syncingChats);
      const hasCompletedRemoteChatFetch = Boolean(getRemoteChatsLastFetchedAt());
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
        renderHeroCopy(UI_COPY.relay.runningReadyHero(formatNumber(chatCount)));
        applyHeroMilestones({ connect: "complete", sync: "complete", ready: "complete" });
        updateHeroSyncMeta({ state: "ready", message: UI_COPY.relay.runningReadyMeta(formatStatusTimeFn()) });
        setDataAvailabilityState(true);
        if (!readyCelebrated) {
          triggerReadyCelebration();
          if (typeof notifyRelayReady === "function") {
            notifyRelayReady(`${formatNumber(chatCount)} chats ready.`);
          }
          readyCelebrated = true;
        }
      } else if (!isSyncing && hasCompletedRemoteChatFetch) {
        renderHeroBadge({ text: badgeText, state: "ready" });
        renderHeroCopy(UI_COPY.relay.runningEmptyHero);
        applyHeroMilestones({ connect: "complete", sync: "complete", ready: "pending" });
        updateHeroSyncMeta({ state: "ready", message: UI_COPY.relay.runningEmptyMeta });
        setDashboardSyncState(false);
        clearReadyCelebration({ rearm: true });
      } else {
        const copyText = chatCount > 0
          ? UI_COPY.relay.runningRefreshingHero(formatNumber(chatCount))
          : UI_COPY.relay.runningLoadingHero;
        renderHeroBadge({ text: badgeText, state: "syncing" });
        renderHeroCopy(copyText);
        applyHeroMilestones({ connect: "complete", sync: "active", ready: "pending" });
        updateHeroSyncMeta({
          state: "syncing",
          message: chatCount > 0
            ? UI_COPY.relay.runningRefreshingMeta(formatNumber(chatCount))
            : UI_COPY.relay.runningLoadingMeta,
        });
        if (chatCount > 0) setDataAvailabilityState(true);
        clearReadyCelebration({ rearm: chatCount === 0 });
      }
      return;
    }

    if (status.status === "waiting_qr") {
      renderHeroBadge({ text: UI_COPY.relay.waitingPhoneStatus.replace(/\.$/, ""), state: "waiting" });
      if (status.lastQr) {
        renderHeroCopy(UI_COPY.relay.waitingPhoneHero);
      } else {
        renderHeroCopy(UI_COPY.relay.waitingPhoneFallbackHero);
      }
      applyHeroMilestones({ connect: "complete", sync: "active", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: UI_COPY.relay.waitingPhoneMeta });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    if (status.status === "starting") {
      renderHeroBadge({ text: UI_COPY.relay.startingStatus.replace(/\.$/, ""), state: "starting" });
      renderHeroCopy(UI_COPY.relay.startingHero);
      applyHeroMilestones({ connect: "active", sync: "active", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: UI_COPY.relay.startingMeta });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    renderHeroBadge({ text: "Relay offline", state: "offline" });
    renderHeroCopy(UI_COPY.relay.offlineHero);
    applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
    updateHeroSyncMeta({ state: "idle", message: UI_COPY.relay.offlineMeta });
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
