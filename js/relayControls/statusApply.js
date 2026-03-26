// @ts-check

import { setAppShellRelayStatus } from "../state.js";
import { UI_COPY } from "../uiCopy.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
import { createStatusApplyUiHelpers } from "./statusApplyUiHelpers.js";

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

  function resolveShellBridge() {
    return /** @type {{ updateRelayRecoveryActions?: (payload: any) => void, updateRelayControlButtons?: (payload: any) => void, syncPageControls?: (payload: any) => boolean } | null} */ (
      resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope })
    );
  }
  const {
    syncWorkspaceReadinessControls,
    renderRelayStatusSurface,
    applyRelayControlButtons,
    updateRecoveryActions,
  } = createStatusApplyUiHelpers({
    globalScope,
    resolveShellBridge,
    relayUiState,
    relayStatusRenderer,
    elements: {
      relayStatusEl,
      relayAccountEl,
      relayQrContainer,
      relayQrImage,
      relayHelpText,
      relayBannerActions,
      relayRecoveryReconnectButton,
      relayRecoveryResyncButton,
      relayRecoveryExportButton,
      relayStopButton,
      relayLogoutButton,
      relayReloadAllButton,
      relayClearStorageButton,
    },
  });

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
    if (!status) {
      updateFirstRunSetup({ status: null, hasData: Boolean(getDataAvailable?.()) });
      updateSyncProgressFromStatus(null);
      const offlineHelpText = UI_COPY.relay.offlineNextStep;
      renderRelayStatusSurface({ statusText: UI_COPY.relay.offlineStatus, accountText: "", helpText: offlineHelpText, qrSrc: null });
      applyRelayControlButtons({ stopDisabled: true, logoutDisabled: true, reloadAllDisabled: true });
      if (isStateTransition) {
        setRemoteChatList([]);
        relayUiState.lastStatusKind = "offline";
        refreshChatSelector();
        setDashboardLoadingState(true);
        setDataAvailabilityState(false);
        syncWorkspaceReadinessControls({
          chatDisabled: true,
          rangeDisabled: true,
          customDisabled: true,
          customVisible: false,
          rangeValue: "all",
          customStart: "",
          customEnd: "",
        });
        setDatasetEmptyMessage(
          UI_COPY.dataset.offlineHeading,
          UI_COPY.dataset.offlineMessage,
        );
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
      syncWorkspaceReadinessControls({
        chatDisabled: !getRemoteChatList().length,
        rangeDisabled: false,
      });
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
        syncWorkspaceReadinessControls({
          chatDisabled: true,
          rangeDisabled: true,
          customDisabled: true,
          customVisible: false,
          rangeValue: "all",
          customStart: "",
          customEnd: "",
        });
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
