import {
  formatNumber,
  formatDisplayDate,
  formatRelativeTime,
} from "./utils.js";
import {
  API_BASE,
  RELAY_BASE,
  BRAND_NAME,
  RELAY_SERVICE_NAME,
  RELAY_CLIENT_LABEL,
  RELAY_POLL_INTERVAL_MS,
  REMOTE_CHAT_REFRESH_INTERVAL_MS,
  REMOTE_MESSAGE_LIMIT,
  ISSUE_REPORT_BASE_URL,
} from "./config.js";
import { createRelaySyncProgressController } from "./relayControls/syncProgress.js";
import { createRelayLogController } from "./relayControls/logStream.js";
import { createRelayActionsController } from "./relayControls/actions.js";
import { createFirstRunSetupController } from "./relayControls/firstRunSetup.js";
import { applyRelayPrimaryAction as applyRelayPrimaryActionUi } from "./relayControls/primaryAction.js";
import { createRelayStatusApplyController } from "./relayControls/statusApply.js";
import {
  describeRelayStatus,
  formatRelayAccount,
  updateRelayBanner,
  updateRelayOnboarding,
} from "./relayControls/statusView.js";

export function createRelayController({ elements, helpers, electronAPI = window.electronAPI }) {
  const {
    relayStartButton,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayClearStorageButton,
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
    relayBannerEl,
    relayBannerMessage,
    relayBannerMeta,
    relayOnboardingSteps,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relaySyncProgressEl,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    firstRunSetup,
    firstRunSetupSteps,
    firstRunPrimaryActionButton,
  } = elements;

  const {
    updateStatus,
    withGlobalBusy,
    fetchJson,
    setRemoteChatList,
    getRemoteChatList,
    getRemoteChatsLastFetchedAt,
    refreshChatSelector,
    setDashboardLoadingState,
    setDatasetEmptyMessage,
    setDataAvailabilityState,
    getDataAvailable,
    getDatasetLabel,
    updateHeroRelayStatus,
    applyEntriesToApp,
    encodeChatSelectorValue,
  } = helpers;

  const relayUiState = {
    status: null,
    controlsLocked: false,
    pollTimer: null,
    lastStatusKind: null,
    lastAppliedStateKind: null,
    lastErrorNotice: null,
    primaryAction: "connect",
  };
  const firstRunSetupController = createFirstRunSetupController({
    firstRunSetup,
    firstRunSetupSteps,
    firstRunPrimaryActionButton,
    relayStartButton,
    getControlsLocked: () => relayUiState.controlsLocked,
    getDataAvailable,
  });
  const {
    updateFirstRunSetup,
    handleFirstRunOpenRelay,
    handleFirstRunPrimaryAction,
  } = firstRunSetupController;
  const {
    beginManualSyncUi,
    markChatsFetched,
    markMessagesActive,
    updateSyncProgressFromStatus,
    handleSyncError,
  } = createRelaySyncProgressController({
    relaySyncProgressEl,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    formatNumber,
  });
  const {
    openLogDrawer,
    closeLogDrawer,
    isLogDrawerOpen,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
    handleLogClear,
    handleExportDiagnostics,
    handleReportIssue,
    initLogStream,
  } = createRelayLogController({
    brandName: BRAND_NAME,
    relayServiceName: RELAY_SERVICE_NAME,
    relayBase: RELAY_BASE,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    issueBaseUrl: ISSUE_REPORT_BASE_URL,
    getRelayStatus: () => relayUiState.status,
    getDatasetLabel,
    getDataAvailable,
    getRemoteChatCount: () => getRemoteChatList().length,
    fetchJson,
    updateStatus,
  });

  function setRelayControlsDisabled(disabled) {
    relayUiState.controlsLocked = disabled;
    [
      relayStartButton,
      relayStopButton,
      relayLogoutButton,
      relayReloadAllButton,
      relayClearStorageButton,
    ].forEach(button => {
      if (button) button.disabled = disabled;
    });
    if (!disabled) {
      applyRelayPrimaryAction(relayUiState.status);
    }
  }

  function applyRelayPrimaryAction(status) {
    applyRelayPrimaryActionUi({
      status,
      relayStartButton,
      relayUiState,
      relayServiceName: RELAY_SERVICE_NAME,
    });
  }
  const formatRelayAccountLabel = account => formatRelayAccount(account, RELAY_CLIENT_LABEL);
  const describeRelayStatusForUi = status =>
    describeRelayStatus(status, {
      relayServiceName: RELAY_SERVICE_NAME,
      brandName: BRAND_NAME,
      formatRelayAccount: formatRelayAccountLabel,
    });
  let applyRelayStatus = () => {};

  const {
    handlePrimaryActionClick,
    startRelaySession,
    stopRelaySession,
    logoutRelaySession,
    syncRelayChats,
    handleReloadAllChats,
    refreshRemoteChats,
    refreshRelayStatus,
    startStatusPolling,
    loadRemoteChat,
  } = createRelayActionsController({
    relayUiState,
    relayReloadAllButton,
    relayStatusEl,
    apiBase: API_BASE,
    relayBase: RELAY_BASE,
    brandName: BRAND_NAME,
    relayServiceName: RELAY_SERVICE_NAME,
    relayPollIntervalMs: RELAY_POLL_INTERVAL_MS,
    remoteMessageLimit: REMOTE_MESSAGE_LIMIT,
    electronAPI,
    formatNumber,
    fetchJson,
    updateStatus,
    withGlobalBusy,
    setRemoteChatList,
    refreshChatSelector,
    applyEntriesToApp,
    encodeChatSelectorValue,
    setRelayControlsDisabled,
    applyRelayStatus: status => applyRelayStatus(status),
    beginManualSyncUi,
    markChatsFetched,
    markMessagesActive,
    handleSyncError,
  });

  const relayStatusApplyController = createRelayStatusApplyController({
    relayUiState,
    elements: {
      relayStatusEl,
      relayAccountEl,
      relayQrContainer,
      relayQrImage,
      relayHelpText,
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      relayOnboardingSteps,
      relayStopButton,
      relayLogoutButton,
      relayReloadAllButton,
      relayClearStorageButton,
    },
    deps: {
      brandName: BRAND_NAME,
      relayServiceName: RELAY_SERVICE_NAME,
      remoteChatRefreshIntervalMs: REMOTE_CHAT_REFRESH_INTERVAL_MS,
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
    },
  });
  ({ applyRelayStatus } = relayStatusApplyController);
  return {
    startRelaySession,
    handlePrimaryActionClick,
    stopRelaySession,
    logoutRelaySession,
    handleReloadAllChats,
    syncRelayChats,
    refreshRemoteChats,
    loadRemoteChat,
    refreshRelayStatus,
    startStatusPolling,
    handleLogClear,
    openLogDrawer,
    closeLogDrawer,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
    initLogStream,
    handleExportDiagnostics,
    handleReportIssue,
    isLogDrawerOpen,
    handleFirstRunOpenRelay,
    handleFirstRunPrimaryAction,
    updateFirstRunSetup,
  };
}
