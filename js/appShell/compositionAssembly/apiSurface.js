export function createCompositionAssemblyApi({
  exportRuntime,
  relayRuntime,
  handleChatSelectionChange,
}) {
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
