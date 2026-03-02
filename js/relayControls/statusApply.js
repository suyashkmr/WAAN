// @ts-check

import { setAppShellRelayStatus } from "../state.js";

/**
 * @typedef {Object} RelayStatus
 * @property {string} [status]
 * @property {string} [account]
 * @property {string} [lastQr]
 * @property {number} [chatCount]
 * @property {boolean} [syncingChats]
 * @property {string} [syncPath]
 * @property {string} [lastSyncPathReason]
 * @property {number} [lastSyncDurationMs]
 * @property {string} [lastError]
 */

/**
 * @typedef {Object} RelayUiState
 * @property {RelayStatus | null} [status]
 * @property {string | null} [lastAppliedStateKind]
 * @property {string | null} [lastStatusKind]
 * @property {boolean} controlsLocked
 */

/**
 * @param {{
 *  relayUiState: RelayUiState,
 *  elements: Record<string, any>,
 *  deps: Record<string, any>,
 * }} params
 */
export function createRelayStatusApplyController({
  relayUiState,
  elements,
  deps,
}) {
  const {
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
    relayBannerEl,
    relayBannerMessage,
    relayBannerMeta,
    relayBannerActions,
    relayRecoveryReconnectButton,
    relayRecoveryResyncButton,
    relayRecoveryExportButton,
    relayOnboardingSteps,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayClearStorageButton,
  } = elements;

  const {
    brandName,
    relayServiceName,
    remoteChatRefreshIntervalMs,
    formatNumber,
    formatDisplayDate,
    formatRelativeTime,
    describeRelayStatusForUi,
    formatRelayAccountLabel,
    electronAPI,
    updateHeroRelayStatus,
    updateRelayBanner,
    updateRelayOnboarding,
    applyRelayPrimaryAction,
    updateFirstRunSetup,
    updateSyncProgressFromStatus,
    getRemoteChatList,
    getRemoteChatsLastFetchedAt,
    setRemoteChatList,
    refreshChatSelector,
    setDashboardLoadingState,
    setDatasetEmptyMessage,
    setDataAvailabilityState,
    refreshRemoteChats,
    updateStatus,
    getDataAvailable,
  } = deps;
  const SLOW_SYNC_THRESHOLD_MS = 12_000;

  /**
   * @param {RelayStatus | null | undefined} status
   */
  function shouldShowRecoveryActions(status) {
    if (!status) return true;
    if (status.status === "error" || status.status === "offline" || status.status === "stopped") {
      return true;
    }
    if (status.status !== "running") return false;
    if (status.syncPath === "fallback") return true;
    return Number(status.lastSyncDurationMs) >= SLOW_SYNC_THRESHOLD_MS;
  }

  /**
   * @param {RelayStatus | null | undefined} status
   */
  function updateRecoveryActions(status) {
    if (!relayBannerActions) return;
    const show = shouldShowRecoveryActions(status);
    if (show) relayBannerActions.removeAttribute("hidden");
    else relayBannerActions.setAttribute("hidden", "");

    if (relayRecoveryReconnectButton) {
      relayRecoveryReconnectButton.disabled = Boolean(relayUiState.controlsLocked) || status?.status === "starting";
      relayRecoveryReconnectButton.title = "Restart relay connection and request a fresh status check.";
    }
    if (relayRecoveryResyncButton) {
      const running = status?.status === "running";
      relayRecoveryResyncButton.disabled =
        Boolean(relayUiState.controlsLocked) || !running || Boolean(status?.syncingChats);
      relayRecoveryResyncButton.title = "Run an immediate chat sync to refresh loaded conversations.";
    }
    if (relayRecoveryExportButton) {
      relayRecoveryExportButton.disabled = false;
      relayRecoveryExportButton.title = "Download relay diagnostics JSON for support or bug reports.";
    }
  }

  /**
   * @param {RelayStatus | null | undefined} status
   */
  function applyRelayStatus(status) {
    setAppShellRelayStatus(status);
    const stateKind = status?.status || "offline";
    const previousStateKind = relayUiState.lastAppliedStateKind;
    const isStateTransition = previousStateKind === null || previousStateKind !== stateKind;

    updateHeroRelayStatus(status);
    electronAPI?.updateRelayStatus?.(status);
    applyRelayPrimaryAction(status);
    if (!relayStatusEl) return;
    updateRelayBanner({
      status,
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn: describeRelayStatusForUi,
      formatRelayAccountFn: formatRelayAccountLabel,
      formatRelativeTime,
      formatDisplayDate,
      formatNumber,
    });
    updateRelayOnboarding({ status, relayOnboardingSteps });
    if (!status) {
      updateFirstRunSetup({ status: null, hasData: Boolean(getDataAvailable?.()) });
      updateSyncProgressFromStatus(null);
      relayStatusEl.textContent = `Relay offline. Open the desktop relay to connect ${brandName}.`;
      if (relayAccountEl) relayAccountEl.textContent = "";
      if (relayQrContainer) relayQrContainer.classList.add("hidden");
      if (relayQrImage) relayQrImage.removeAttribute("src");
      if (relayHelpText) {
        relayHelpText.textContent =
          "Press Connect, scan the QR code from Linked Devices, then choose a chat from “Loaded chats”.";
      }
      if (relayStopButton) relayStopButton.disabled = true;
      if (relayReloadAllButton) relayReloadAllButton.disabled = true;
      if (relayClearStorageButton) relayClearStorageButton.disabled = false;
      if (isStateTransition) {
        setRemoteChatList([]);
        relayUiState.lastStatusKind = "offline";
        refreshChatSelector();
        setDashboardLoadingState(true);
        setDatasetEmptyMessage(
          "No chat is selected yet.",
          "Open Relay Controls, scan the QR code, then choose a chat from “Loaded chats”.",
        );
        setDataAvailabilityState(false);
      }
      relayUiState.lastAppliedStateKind = stateKind;
      updateRecoveryActions(status);
      return;
    }

    const description = describeRelayStatusForUi(status);
    relayStatusEl.textContent = description.message;
    if (relayAccountEl) {
      relayAccountEl.textContent = status.account
        ? `Logged in as ${formatRelayAccountLabel(status.account)}`
        : "";
    }
    if (relayHelpText) {
      relayHelpText.textContent =
        status.status === "running"
          ? `Your mirrored ${brandName} chats appear under “Loaded chats”. Pick one to view insights.`
          : "Open Linked Devices on your phone and scan the QR code shown here.";
    }
    if (status.lastQr && relayQrContainer && relayQrImage) {
      relayQrImage.src = status.lastQr;
      relayQrContainer.classList.remove("hidden");
    } else if (relayQrContainer) {
      relayQrContainer.classList.add("hidden");
    }

    const running = status.status === "running";
    const waiting = status.status === "waiting_qr" || status.status === "starting";
    const canLogout = running || waiting || Boolean(status.account);
    if (relayStopButton) {
      relayStopButton.disabled = !running && !waiting;
    }
    if (relayClearStorageButton) {
      relayClearStorageButton.disabled = relayUiState.controlsLocked;
    }
    if (relayLogoutButton) {
      relayLogoutButton.disabled = !canLogout;
    }
    if (relayReloadAllButton) {
      relayReloadAllButton.disabled = !running;
    }
    if (!getRemoteChatList().length) {
      if (running) {
        setDatasetEmptyMessage(
          "Pick a chat",
          "Select any conversation from “Loaded chats” to see its insights.",
        );
      } else if (waiting) {
        setDatasetEmptyMessage("Scan the QR code", "Link your phone to start mirroring messages.");
      }
    }
    updateFirstRunSetup({ status, hasData: Boolean(getDataAvailable?.()) });

    if (running) {
      const lastFetchedAt = typeof getRemoteChatsLastFetchedAt === "function"
        ? getRemoteChatsLastFetchedAt()
        : 0;
      const needsRefresh =
        !getRemoteChatList().length ||
        (lastFetchedAt && Date.now() - lastFetchedAt > remoteChatRefreshIntervalMs);
      if (needsRefresh) {
        refreshRemoteChats({ silent: true });
      }
      if (relayUiState.lastStatusKind !== "running") {
        const accountLabel = formatRelayAccountLabel(status.account) || "your account";
        updateStatus(`Connected as ${accountLabel}.`, "success");
        relayUiState.lastStatusKind = "running";
      }
    } else {
      if (isStateTransition) {
        setRemoteChatList([]);
        refreshChatSelector();
        setDashboardLoadingState(true);
      }
      if (waiting && relayUiState.lastStatusKind !== "waiting") {
        updateStatus("Scan the QR code to finish linking your phone.", "info");
        relayUiState.lastStatusKind = "waiting";
      } else if (status.status === "starting" && relayUiState.lastStatusKind !== "starting") {
        updateStatus(`Starting ${relayServiceName}…`, "info");
        relayUiState.lastStatusKind = "starting";
      }
    }

    updateSyncProgressFromStatus(status);
    relayUiState.lastAppliedStateKind = stateKind;
    updateRecoveryActions(status);
  }

  return {
    applyRelayStatus,
    syncRecoveryActions() {
      updateRecoveryActions(relayUiState.status);
    },
  };
}
