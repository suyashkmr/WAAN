// @ts-check

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
  } = deps;

  let dataAvailable = false;
  let readyCelebrated = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let celebrationTimer = null;

  /**
   * @param {{ connect?: string, sync?: string, ready?: string }} [params]
   */
  function applyHeroMilestones({ connect = "pending", sync = "pending", ready = "pending" } = {}) {
    if (!heroMilestoneSteps?.length) return;
    heroMilestoneSteps.forEach(/** @param {HTMLElement} step */ step => {
      const id = step.dataset.step;
      if (id === "connect") step.dataset.state = connect;
      if (id === "sync") step.dataset.state = sync;
      if (id === "ready") step.dataset.state = ready;
    });
  }

  /**
   * @param {boolean} isLoading
   */
  function setDashboardLoadingState(isLoading) {
    if (!dashboardRoot) return;
    dashboardRoot.classList.toggle("is-loading", Boolean(isLoading));
  }

  function formatStatusTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /**
   * @param {{ state?: string, message?: string }} [params]
   */
  function updateHeroSyncMeta({ state = "idle", message = "Awaiting relay." } = {}) {
    if (heroSyncDot) {
      heroSyncDot.dataset.state = state;
    }
    if (heroStatusMetaCopy) {
      heroStatusMetaCopy.textContent = message;
    }
  }

  /**
   * @param {boolean} isSyncing
   */
  function setDashboardSyncState(isSyncing) {
    if (!dashboardRoot) return;
    dashboardRoot.classList.toggle("is-syncing", Boolean(isSyncing));
  }

  /**
   * @param {{ rearm?: boolean }} [params]
   */
  function clearReadyCelebration({ rearm = true } = {}) {
    if (celebrationTimer) {
      clearTimeout(celebrationTimer);
      celebrationTimer = null;
    }
    heroStatusBadge?.classList.remove("hero-status-badge-ready");
    heroMilestoneSteps?.forEach(/** @param {HTMLElement} step */ step => {
      if (step.dataset.step === "ready") {
        step.classList.remove("is-ready-celebration");
      }
    });
    if (rearm) {
      readyCelebrated = false;
    }
  }

  function triggerReadyCelebration() {
    heroStatusBadge?.classList.add("hero-status-badge-ready");
    heroMilestoneSteps?.forEach(/** @param {HTMLElement} step */ step => {
      if (step.dataset.step === "ready") {
        step.classList.add("is-ready-celebration");
      }
    });
    celebrationTimer = setTimeout(() => {
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
    /** @param {string} state */
    const setHeroBadgeState = state => {
      if (!heroStatusBadge) return;
      heroStatusBadge.dataset.state = state;
    };
    if (!status) {
      setHeroBadgeState("offline");
      heroStatusBadge.textContent = "Not connected";
      heroStatusCopy.textContent = "Open Relay Controls, then press Connect.";
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Awaiting relay." });
      setDashboardSyncState(false);
      clearReadyCelebration();
      return;
    }

    if (status.status === "running") {
      heroStatusBadge.textContent = status.account
        ? `Connected • ${formatRelayAccount(status.account)}`
        : "Relay connected";
      const chatCount = Number(status.chatCount ?? 0);
      const isSyncing = Boolean(status.syncingChats) || chatCount === 0;
      setDashboardSyncState(isSyncing);
      if (chatCount > 0 && !isSyncing) {
        setHeroBadgeState("ready");
        heroStatusCopy.textContent = `${formatNumber(chatCount)} chats indexed. Insights are ready.`;
        applyHeroMilestones({ connect: "complete", sync: "complete", ready: "complete" });
        updateHeroSyncMeta({ state: "ready", message: `Last updated ${formatStatusTime()}` });
        if (!readyCelebrated) {
          triggerReadyCelebration();
          if (typeof notifyRelayReady === "function") {
            notifyRelayReady(`Insights ready. ${formatNumber(chatCount)} chats indexed.`);
          }
          readyCelebrated = true;
        }
      } else {
        setHeroBadgeState("syncing");
        heroStatusCopy.textContent = chatCount > 0
          ? `${formatNumber(chatCount)} chats indexed. Syncing updates…`
          : "Connected. Syncing chats…";
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
      setHeroBadgeState("waiting");
      heroStatusBadge.textContent = "Scan the QR code";
      if (status.lastQr) {
        heroStatusCopy.textContent =
          "On your phone: Linked Devices -> Link a device -> scan this code.";
      } else {
        heroStatusCopy.textContent = "Press Connect to show a new QR code.";
      }
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Waiting for phone link." });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    if (status.status === "starting") {
      setHeroBadgeState("starting");
      heroStatusBadge.textContent = "Starting relay";
      heroStatusCopy.textContent = "Starting relay…";
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Starting session…" });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    setHeroBadgeState("offline");
    heroStatusBadge.textContent = "Not connected";
    heroStatusCopy.textContent = "Open Relay Controls, then press Connect.";
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
