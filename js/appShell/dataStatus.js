export function createDataStatusController({ elements, deps }) {
  const {
    dashboardRoot,
    heroStatusBadge,
    heroStatusCopy,
    datasetEmptyStateManager,
  } = elements;

  const {
    setDatasetEmptyMessage,
    savedViewsController,
    formatRelayAccount,
    formatNumber,
  } = deps;

  let dataAvailable = false;

  function setDashboardLoadingState(isLoading) {
    if (!dashboardRoot) return;
    dashboardRoot.classList.toggle("is-loading", Boolean(isLoading));
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
      return;
    }

    if (status.status === "running") {
      heroStatusBadge.textContent = status.account
        ? `Connected • ${formatRelayAccount(status.account)}`
        : "Relay connected";
      heroStatusCopy.textContent = status.chatCount
        ? `${formatNumber(status.chatCount)} chats indexed.`
        : "Syncing chats now...";
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
      return;
    }

    if (status.status === "starting") {
      heroStatusBadge.textContent = "Starting relay";
      heroStatusCopy.textContent = "Launching the relay browser...";
      return;
    }

    heroStatusBadge.textContent = "Not connected";
    heroStatusCopy.textContent = "Start the relay desktop app, then press Connect.";
  }

  return {
    setDashboardLoadingState,
    setDataAvailabilityState,
    updateHeroRelayStatus,
    getDataAvailable: () => dataAvailable,
  };
}
