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
import { createRelayActionsController } from "./relayControls/actions.js";
import { applyRelayPrimaryAction as applyRelayPrimaryActionUi } from "./relayControls/primaryAction.js";
import { createRelayStatusApplyController } from "./relayControls/statusApply.js";
import { createRelayPlatformAdapter } from "./relayControls/platformAdapter.js";
import { createRelayUiState, setRelayControlsDisabled as applyRelayControlsDisabled } from "./relayControls/controllerState.js";
import { createRelaySupportControllers } from "./relayControls/controllerSupport.js";
import { createRelayStatusRenderer } from "./vue/relayStatusRenderer.js";
import { createRelayStatusViewRenderer } from "./vue/relayStatusViewRenderer.js";
import {
  describeRelayStatus,
  formatRelayAccount,
  updateRelayBanner,
} from "./relayControls/statusView.js";

export function createRelayController({ elements, helpers, electronAPI = null, platform = null, globalScope = globalThis }) {
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
    relayBannerActions,
    relayRecoveryReconnectButton,
    relayRecoveryResyncButton,
    relayRecoveryExportButton,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relaySyncProgressEl,
    relaySyncChatsStep,
    relaySyncMessagesStep,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    firstRunSetup,
    firstRunSetupSteps,
    firstRunPrimaryActionButton,
    chatSelector,
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
  const relayPlatform = platform ?? createRelayPlatformAdapter({ electronAPI });
  const vueRuntime = /** @type {any} */ (globalScope)?.Vue ?? null;
  const canRenderWithVue = Boolean(vueRuntime && typeof vueRuntime.h === "function" && typeof vueRuntime.render === "function");
  const relayStatusRenderer = canRenderWithVue
    ? createRelayStatusRenderer({
        elements: {
          relayStatusEl,
          relayAccountEl,
          relayQrContainer,
          relayQrImage,
          relayHelpText,
        },
        vueRuntime,
      })
    : null;
  const relayStatusViewRenderer = canRenderWithVue
    ? createRelayStatusViewRenderer({
        elements: {
          relayBannerMessage,
          relayBannerMeta,
        },
        vueRuntime,
      })
    : null;

  const relayUiState = createRelayUiState();
  let syncRecoveryActions = () => {};

  function setRelayControlsDisabled(disabled) {
    applyRelayControlsDisabled({
      relayUiState,
      disabled,
      buttons: [
        relayStartButton,
        relayStopButton,
        relayLogoutButton,
        relayReloadAllButton,
        relayClearStorageButton,
      ],
      applyRelayPrimaryAction,
    });
    syncRecoveryActions();
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
  const {
    firstRunSetupController,
    relaySyncProgressController,
    relayLogController,
  } = createRelaySupportControllers({
    elements: {
      firstRunSetup,
      firstRunSetupSteps,
      firstRunPrimaryActionButton,
      relayBannerEl,
      chatSelector,
      relayStartButton,
      relaySyncProgressEl,
      relaySyncChatsStep,
      relaySyncMessagesStep,
      relaySyncChatsMeta,
      relaySyncMessagesMeta,
      logDrawerToggleButton,
      logDrawerEl,
      logDrawerList,
      logDrawerConnectionLabel,
    },
    deps: {
      getControlsLocked: () => relayUiState.controlsLocked,
      getDataAvailable,
      getRemoteChatsLastFetchedAt,
      formatNumber,
      brandName: BRAND_NAME,
      relayServiceName: RELAY_SERVICE_NAME,
      relayBase: RELAY_BASE,
      issueBaseUrl: ISSUE_REPORT_BASE_URL,
      getRelayStatus: () => relayUiState.status,
      getDatasetLabel,
      getRemoteChatCount: () => getRemoteChatList().length,
      fetchJson,
      updateStatus,
      vueRuntime,
      globalScope,
    },
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
  } = relaySyncProgressController;
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
  } = relayLogController;
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
    electronAPI: relayPlatform.electronAPI,
    visibilityAdapter: relayPlatform.visibilityAdapter,
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
      relayBannerActions,
      relayRecoveryReconnectButton,
      relayRecoveryResyncButton,
      relayRecoveryExportButton,
      relayStopButton,
      relayLogoutButton,
      relayReloadAllButton,
      relayClearStorageButton,
    },
    deps: {
      brandName: BRAND_NAME,
      relayServiceName: RELAY_SERVICE_NAME,
      remoteChatRefreshIntervalMs: REMOTE_CHAT_REFRESH_INTERVAL_MS,
      globalScope,
      now: () => Date.now(),
      formatNumber,
      formatDisplayDate,
      formatRelativeTime,
      describeRelayStatusForUi,
      formatRelayAccountLabel,
      electronAPI: relayPlatform.electronAPI,
      updateHeroRelayStatus,
      updateRelayBanner,
      relayStatusViewRenderer,
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
      relayStatusRenderer,
    },
  });
  ({ applyRelayStatus } = relayStatusApplyController);
  syncRecoveryActions = relayStatusApplyController.syncRecoveryActions;

  async function handleRecoveryReconnect() {
    if (relayUiState.status?.status === "running") {
      await stopRelaySession();
    }
    await startRelaySession();
  }

  async function handleRecoveryResync() {
    await syncRelayChats({ silent: false });
  }

  function handleRecoveryExportDiagnostics() {
    openLogDrawer();
    handleExportDiagnostics();
  }

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
    handleRecoveryReconnect,
    handleRecoveryResync,
    handleRecoveryExportDiagnostics,
  };
}
