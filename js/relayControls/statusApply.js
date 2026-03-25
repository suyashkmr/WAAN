// @ts-check

import { setAppShellRelayStatus } from "../state.js";
import { UI_COPY } from "../uiCopy.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

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
  /**
   * @param {HTMLElement | null | undefined} el
   * @param {boolean} shouldShow
   */
  function setElementVisibility(el, shouldShow) {
    if (!el) return;
    el.classList.toggle("hidden", !shouldShow);
    if (shouldShow) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

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
    relayOnboardingStepDetails,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayClearStorageButton,
  } = elements;

  const {
    remoteChatRefreshIntervalMs,
    globalScope = globalThis,
    now = () => Date.now(),
    formatNumber,
    formatDisplayDate,
    formatRelativeTime,
    describeRelayStatusForUi,
    formatRelayAccountLabel,
    electronAPI,
    updateHeroRelayStatus,
    updateRelayBanner,
    updateRelayOnboarding,
    relayStatusViewRenderer = null,
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
    relayStatusRenderer = null,
  } = deps;
  const SLOW_SYNC_THRESHOLD_MS = 12_000;
  const canRenderStatusSurface = typeof relayStatusRenderer?.renderStatusSurface === "function";

  function resolveShellBridge() {
    return /** @type {{ updateRelayRecoveryActions?: (payload: any) => void, updateRelayControlButtons?: (payload: any) => void } | null} */ (
      resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope })
    );
  }

  /**
   * @param {{ statusText?: string, accountText?: string, helpText?: string, qrSrc?: string | null }} [payload]
   */
  function renderRelayStatusSurface({ statusText = "", accountText = "", helpText = "", qrSrc = null } = {}) {
    if (canRenderStatusSurface) {
      relayStatusRenderer.renderStatusSurface({ statusText, accountText, helpText, qrSrc });
      return;
    }
    relayStatusEl.textContent = statusText;
    if (relayAccountEl) relayAccountEl.textContent = accountText;
    if (relayHelpText) relayHelpText.textContent = helpText;
    if (relayQrImage) {
      if (qrSrc) relayQrImage.src = qrSrc;
      else relayQrImage.removeAttribute("src");
    }
    setElementVisibility(relayQrContainer, Boolean(qrSrc));
  }

  /**
   * @param {{ stopDisabled: boolean, clearStorageDisabled?: boolean, logoutDisabled?: boolean, reloadAllDisabled: boolean }} payload
   */
  function applyRelayControlButtons({
    stopDisabled,
    clearStorageDisabled = false,
    logoutDisabled = false,
    reloadAllDisabled,
  }) {
    const shellBridge = resolveShellBridge();
    if (shellBridge?.updateRelayControlButtons) {
      shellBridge.updateRelayControlButtons({
        stopDisabled,
        clearStorageDisabled,
        logoutDisabled,
        reloadAllDisabled,
      });
      return;
    }
    if (relayStopButton) relayStopButton.disabled = stopDisabled;
    if (relayClearStorageButton) relayClearStorageButton.disabled = clearStorageDisabled;
    if (relayLogoutButton) relayLogoutButton.disabled = logoutDisabled;
    if (relayReloadAllButton) relayReloadAllButton.disabled = reloadAllDisabled;
  }

  /**
   * @param {RelayStatus | null | undefined} status
   */
  function shouldShowRecoveryActions(status) {
    if (!status) return true;
    if (status.status === "error" || status.status === "offline" || status.status === "stopped") return true;
    if (status.status !== "running") return false;
    if (status.syncPath === "fallback") return true;
    return Number(status.lastSyncDurationMs) >= SLOW_SYNC_THRESHOLD_MS;
  }

  /**
   * @param {RelayStatus | null | undefined} status
   */
  function updateRecoveryActions(status) {
    const show = shouldShowRecoveryActions(status);
    const running = status?.status === "running";
    const reconnectDisabled = Boolean(relayUiState.controlsLocked) || status?.status === "starting";
    const reconnectTitle = "Restart relay connection and request a fresh status check.";
    const resyncDisabled = Boolean(relayUiState.controlsLocked) || !running || Boolean(status?.syncingChats);
    const resyncTitle = "Run an immediate chat sync to refresh loaded conversations.";
    const exportDisabled = false;
    const exportTitle = "Download relay diagnostics JSON for support or bug reports.";

    const shellBridge = resolveShellBridge();
    if (shellBridge?.updateRelayRecoveryActions) {
      shellBridge.updateRelayRecoveryActions({ show, reconnectDisabled, reconnectTitle, resyncDisabled, resyncTitle, exportDisabled, exportTitle });
      return;
    }

    if (!relayBannerActions) return;
    if (show) relayBannerActions.removeAttribute("hidden");
    else relayBannerActions.setAttribute("hidden", "");
    if (relayRecoveryReconnectButton) {
      relayRecoveryReconnectButton.disabled = reconnectDisabled;
      relayRecoveryReconnectButton.title = reconnectTitle;
    }
    if (relayRecoveryResyncButton) {
      relayRecoveryResyncButton.disabled = resyncDisabled;
      relayRecoveryResyncButton.title = resyncTitle;
    }
    if (relayRecoveryExportButton) {
      relayRecoveryExportButton.disabled = exportDisabled;
      relayRecoveryExportButton.title = exportTitle;
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
    const lastFetchedAt = typeof getRemoteChatsLastFetchedAt === "function" ? getRemoteChatsLastFetchedAt() : 0;
    const hasCompletedRemoteChatFetch = Boolean(lastFetchedAt);

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
      hasCompletedRemoteChatFetch,
      relayStatusViewRenderer,
    });
    updateRelayOnboarding({ status, relayOnboardingSteps, relayOnboardingStepDetails, hasCompletedRemoteChatFetch, relayStatusViewRenderer });
    if (!status) {
      updateFirstRunSetup({ status: null, hasData: Boolean(getDataAvailable?.()) });
      updateSyncProgressFromStatus(null);
      const offlineHelpText = UI_COPY.relay.offlineNextStep;
      renderRelayStatusSurface({ statusText: UI_COPY.relay.offlineStatus, accountText: "", helpText: offlineHelpText, qrSrc: null });
      applyRelayControlButtons({ stopDisabled: true, reloadAllDisabled: true });
      if (isStateTransition) {
        setRemoteChatList([]);
        relayUiState.lastStatusKind = "offline";
        refreshChatSelector();
        setDashboardLoadingState(true);
        setDatasetEmptyMessage(
          UI_COPY.dataset.offlineHeading,
          UI_COPY.dataset.offlineMessage,
        );
        setDataAvailabilityState(false);
      }
      relayUiState.lastAppliedStateKind = stateKind;
      updateRecoveryActions(status);
      return;
    }

    const description = describeRelayStatusForUi(status);
    const accountText = status.account
      ? `Logged in as ${formatRelayAccountLabel(status.account)}`
      : "";
    const chatCount = Number(status.chatCount ?? 0);
    const syncingChats = Boolean(status.syncingChats);
    const isConfirmedEmptyAccount =
      status.status === "running" &&
      chatCount <= 0 &&
      !syncingChats &&
      hasCompletedRemoteChatFetch;
    const helpText =
      status.status === "running"
        ? (chatCount > 0
          ? UI_COPY.dataset.emptyMessage
          : syncingChats || !hasCompletedRemoteChatFetch
            ? UI_COPY.dataset.loadingMessage
            : UI_COPY.dataset.noChatsMessage)
        : UI_COPY.relay.waitingPhoneHero;
    renderRelayStatusSurface({ statusText: description.message, accountText, helpText, qrSrc: status.lastQr || null });

    const running = status.status === "running";
    const waiting = status.status === "waiting_qr" || status.status === "starting";
    const canLogout = running || waiting || Boolean(status.account);
    const stopDisabled = !running && !waiting;
    const clearStorageDisabled = relayUiState.controlsLocked;
    const logoutDisabled = !canLogout;
    const reloadAllDisabled = !running;
    applyRelayControlButtons({ stopDisabled, clearStorageDisabled, logoutDisabled, reloadAllDisabled });
    if (!getRemoteChatList().length) {
      if (running) {
        if (chatCount > 0) {
          setDatasetEmptyMessage(UI_COPY.dataset.readyHeading, UI_COPY.dataset.readyMessage);
        } else if (syncingChats || !hasCompletedRemoteChatFetch) {
          setDatasetEmptyMessage(UI_COPY.dataset.loadingHeading, UI_COPY.dataset.loadingMessage);
        } else if (isConfirmedEmptyAccount) {
          setDatasetEmptyMessage(UI_COPY.dataset.noChatsHeading, UI_COPY.dataset.noChatsMessage);
        }
      } else if (waiting) {
        setDatasetEmptyMessage(UI_COPY.dataset.waitingHeading, UI_COPY.dataset.waitingMessage);
      }
    }
    updateFirstRunSetup({ status, hasData: Boolean(getDataAvailable?.()) });

    if (running) {
      const remoteChatList = getRemoteChatList();
      const needsRefresh =
        (chatCount > 0 && !remoteChatList.length) ||
        (!remoteChatList.length && !lastFetchedAt) ||
        (lastFetchedAt && now() - lastFetchedAt > remoteChatRefreshIntervalMs);
      if (needsRefresh) {
        refreshRemoteChats({ silent: true });
      }
      if (relayUiState.lastStatusKind !== "running") {
        const accountLabel = formatRelayAccountLabel(status.account) || "your account";
        updateStatus(`Connected: ${accountLabel}.`, "success");
        relayUiState.lastStatusKind = "running";
      }
    } else {
      if (isStateTransition) {
        setRemoteChatList([]);
        refreshChatSelector();
        setDashboardLoadingState(true);
      }
      if (waiting && relayUiState.lastStatusKind !== "waiting") {
        updateStatus(UI_COPY.relay.waitingPhoneHero, "info");
        relayUiState.lastStatusKind = "waiting";
      } else if (status.status === "starting" && relayUiState.lastStatusKind !== "starting") {
        updateStatus(UI_COPY.relay.startingHero, "info");
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
