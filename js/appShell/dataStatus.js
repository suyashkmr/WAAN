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
  let celebrationTimer = null;

  function applyHeroMilestones({ connect = "pending", sync = "pending", ready = "pending" } = {}) {
    if (!heroMilestoneSteps?.length) return;
    heroMilestoneSteps.forEach(step => {
      const id = step.dataset.step;
      if (id === "connect") step.dataset.state = connect;
      if (id === "sync") step.dataset.state = sync;
      if (id === "ready") step.dataset.state = ready;
    });
  }

  function setDashboardLoadingState(isLoading) {
    if (!dashboardRoot) return;
    dashboardRoot.classList.toggle("is-loading", Boolean(isLoading));
  }

  function formatStatusTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function updateHeroSyncMeta({ state = "idle", message = "Waiting for relay activity." } = {}) {
    if (heroSyncDot) {
      heroSyncDot.dataset.state = state;
    }
    if (heroStatusMetaCopy) {
      heroStatusMetaCopy.textContent = message;
    }
  }

  function setDashboardSyncState(isSyncing) {
    if (!dashboardRoot) return;
    dashboardRoot.classList.toggle("is-syncing", Boolean(isSyncing));
  }

  function clearReadyCelebration({ rearm = true } = {}) {
    if (celebrationTimer) {
      clearTimeout(celebrationTimer);
      celebrationTimer = null;
    }
    heroStatusBadge?.classList.remove("hero-status-badge-ready");
    heroMilestoneSteps?.forEach(step => {
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
    heroMilestoneSteps?.forEach(step => {
      if (step.dataset.step === "ready") {
        step.classList.add("is-ready-celebration");
      }
    });
    celebrationTimer = setTimeout(() => {
      clearReadyCelebration({ rearm: false });
    }, 1200);
  }

  function setDataAvailabilityState(hasData) {
    dataAvailable = Boolean(hasData);
    datasetEmptyStateManager.setAvailability(dataAvailable);
    if (!dataAvailable) {
      setDatasetEmptyMessage(
        "No chat is selected yet.",
        "Start the relay desktop app, press Connect, scan the QR code, then choose a mirrored chat from \"Loaded chats\".",
      );
    }
    savedViewsController.setDataAvailability(Boolean(hasData));
    savedViewsController.refreshUI();
  }

  function updateHeroRelayStatus(status) {
    if (!heroStatusBadge || !heroStatusCopy) return;
    if (!status) {
      heroStatusBadge.textContent = "Not connected";
      heroStatusCopy.textContent = "Start the relay desktop app, then press Connect.";
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Waiting for relay activity." });
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
        heroStatusCopy.textContent = chatCount > 0
          ? `${formatNumber(chatCount)} chats indexed. Finishing sync…`
          : "Connected. Syncing chats now…";
        applyHeroMilestones({ connect: "complete", sync: "active", ready: "pending" });
        updateHeroSyncMeta({
          state: "syncing",
          message: chatCount > 0
            ? `Syncing now • ${formatNumber(chatCount)} chats discovered`
            : "Syncing now • preparing chat list",
        });
        clearReadyCelebration({ rearm: chatCount === 0 });
      }
      return;
    }

    if (status.status === "waiting_qr") {
      heroStatusBadge.textContent = "Scan the QR code";
      if (status.lastQr) {
        heroStatusCopy.textContent =
          "On your phone: chat app -> Linked Devices -> Link a device -> scan this code.";
      } else {
        heroStatusCopy.textContent = "Press Connect to reopen the relay browser and show a QR code.";
      }
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Waiting for phone link." });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    if (status.status === "starting") {
      heroStatusBadge.textContent = "Starting relay";
      heroStatusCopy.textContent = "Launching the relay browser...";
      applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
      updateHeroSyncMeta({ state: "idle", message: "Starting relay session…" });
      setDashboardSyncState(false);
      clearReadyCelebration({ rearm: true });
      return;
    }

    heroStatusBadge.textContent = "Not connected";
    heroStatusCopy.textContent = "Start the relay desktop app, then press Connect.";
    applyHeroMilestones({ connect: "active", sync: "pending", ready: "pending" });
    updateHeroSyncMeta({ state: "idle", message: "Waiting for relay activity." });
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
