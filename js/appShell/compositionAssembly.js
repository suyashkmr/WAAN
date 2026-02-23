import {
  createExportOrchestrator,
  createDatasetRelayOrchestrator,
  createSelectionOrchestrator,
} from "./compositionAssembly/orchestrators.js";

export function createAppCompositionAssembly({
  dom,
  state,
  utils,
  analytics,
  constants,
  wiring,
  electronAPI = window.electronAPI,
}) {
  const exportRuntime = createExportOrchestrator({
    state,
    utils,
    analytics,
    constants,
    wiring,
  });

  const relayRuntime = createDatasetRelayOrchestrator({
    dom,
    state,
    utils,
    constants,
    wiring,
    electronAPI,
  });
  const handleChatSelectionChange = createSelectionOrchestrator({
    wiring,
    loadRemoteChat: relayRuntime.loadRemoteChat,
    updateStatus: state.updateStatus,
  });

  return {
    ...exportRuntime,
    startRelaySession: relayRuntime.startRelaySession,
    stopRelaySession: relayRuntime.stopRelaySession,
    syncRelayChats: relayRuntime.syncRelayChats,
    isLogDrawerOpen: relayRuntime.isLogDrawerOpen,
    openLogDrawer: relayRuntime.openLogDrawer,
    closeLogDrawer: relayRuntime.closeLogDrawer,
    initRelayControls: relayRuntime.initRelayControls,
    handleChatSelectionChange,
  };
}
