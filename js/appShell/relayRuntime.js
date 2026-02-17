import { createRelayController } from "../relayControls.js";
import { createRelayBootstrapController } from "./relayBootstrap.js";

export function createRelayRuntime({
  relayElements,
  relayHelpers,
  electronAPI,
  bootstrapElements,
  fetchJson,
  apiBase,
  setRemoteChatList,
  refreshChatSelector,
  updateStatus,
}) {
  const relayController = createRelayController({
    elements: relayElements,
    helpers: relayHelpers,
    electronAPI,
  });

  const {
    startRelaySession,
    handlePrimaryActionClick: handleRelayPrimaryActionClick,
    stopRelaySession,
    logoutRelaySession,
    handleReloadAllChats,
    syncRelayChats,
    loadRemoteChat,
    refreshRelayStatus,
    startStatusPolling,
    handleLogClear,
    handleExportDiagnostics,
    handleReportIssue,
    openLogDrawer,
    closeLogDrawer,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
    handleFirstRunOpenRelay,
    handleFirstRunPrimaryAction,
    initLogStream,
    isLogDrawerOpen,
  } = relayController;

  const relayBootstrapController = createRelayBootstrapController({
    elements: bootstrapElements,
    handlers: {
      handleRelayPrimaryActionClick,
      stopRelaySession,
      logoutRelaySession,
      handleReloadAllChats,
      openLogDrawer,
      closeLogDrawer,
      handleExportDiagnostics,
      handleReportIssue,
      handleLogClear,
      handleLogDrawerDocumentClick,
      handleLogDrawerKeydown,
      handleFirstRunOpenRelay,
      handleFirstRunPrimaryAction,
      refreshRelayStatus,
      startStatusPolling,
      initLogStream,
    },
    deps: {
      fetchJson,
      apiBase,
      setRemoteChatList,
      refreshChatSelector,
      updateStatus,
    },
  });

  return {
    startRelaySession,
    stopRelaySession,
    syncRelayChats,
    loadRemoteChat,
    isLogDrawerOpen,
    openLogDrawer,
    closeLogDrawer,
    initRelayControls: relayBootstrapController.initRelayControls,
  };
}
