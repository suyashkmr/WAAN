// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   elements: AnyRecord,
 *   handlers: AnyRecord,
 *   deps: AnyRecord,
 * }} params
 */
export function createRelayBootstrapController({ elements, handlers, deps }) {
  const {
    relayStartButton,
    relayStatusEl,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayClearStorageButton,
    logDrawerToggleButton,
    logDrawerCloseButton,
    logDrawerExportButton,
    logDrawerReportButton,
    logDrawerClearButton,
    firstRunOpenRelayButton,
    firstRunPrimaryActionButton,
    relayRecoveryReconnectButton,
    relayRecoveryResyncButton,
    relayRecoveryExportButton,
  } = elements;

  const {
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
    handleRecoveryReconnect,
    handleRecoveryResync,
    handleRecoveryExportDiagnostics,
    refreshRelayStatus,
    startStatusPolling,
    initLogStream,
  } = handlers;

  const {
    fetchJson,
    apiBase,
    setRemoteChatList,
    refreshChatSelector,
    updateStatus,
  } = deps;

  async function clearStoredChatsOnServer() {
    return fetchJson(`${apiBase}/chats/clear`, { method: "POST" });
  }

  async function handleClearStorageClick() {
    if (typeof window !== "undefined" && window.confirm) {
      const confirmed = window.confirm(
        "Clear all cached WAAN chats on this machine? You'll need to refresh to download them again.",
      );
      if (!confirmed) return;
    }

    if (relayClearStorageButton) relayClearStorageButton.disabled = true;
    try {
      await clearStoredChatsOnServer();
      setRemoteChatList([]);
      await refreshChatSelector();
      updateStatus('Cleared cached chats. Press "Reload all chats" to download them again.', "info");
    } catch (error) {
      console.error(error);
      updateStatus("We couldn't clear the cached chats.", "error");
    } finally {
      if (relayClearStorageButton) relayClearStorageButton.disabled = false;
    }
  }

  function initRelayControls() {
    if (!relayStartButton || !relayStatusEl) {
      return;
    }

    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
    const supportsRelayActionDispatch =
      typeof shellBridge?.setRelayActionHandlers === "function" &&
      typeof shellBridge?.dispatchRelayAction === "function";
    if (supportsRelayActionDispatch) {
      shellBridge.setRelayActionHandlers({
        "relay.logDrawerOpen": openLogDrawer,
        "relay.recoveryReconnect": handleRecoveryReconnect,
        "relay.recoveryResync": handleRecoveryResync,
        "relay.recoveryExportDiagnostics": handleRecoveryExportDiagnostics,
      });
    }

    relayStartButton.addEventListener("click", handleRelayPrimaryActionClick);
    relayStopButton?.addEventListener("click", stopRelaySession);
    relayLogoutButton?.addEventListener("click", logoutRelaySession);
    relayReloadAllButton?.addEventListener("click", handleReloadAllChats);
    relayClearStorageButton?.addEventListener("click", handleClearStorageClick);
    if (!supportsRelayActionDispatch) {
      logDrawerToggleButton?.addEventListener("click", openLogDrawer);
    }
    logDrawerCloseButton?.addEventListener("click", closeLogDrawer);
    logDrawerExportButton?.addEventListener("click", handleExportDiagnostics);
    logDrawerReportButton?.addEventListener("click", handleReportIssue);
    logDrawerClearButton?.addEventListener("click", handleLogClear);
    firstRunOpenRelayButton?.addEventListener("click", handleFirstRunOpenRelay);
    firstRunPrimaryActionButton?.addEventListener("click", handleFirstRunPrimaryAction);
    if (!supportsRelayActionDispatch) {
      relayRecoveryReconnectButton?.addEventListener("click", handleRecoveryReconnect);
      relayRecoveryResyncButton?.addEventListener("click", handleRecoveryResync);
      relayRecoveryExportButton?.addEventListener("click", handleRecoveryExportDiagnostics);
    }

    document.addEventListener("click", handleLogDrawerDocumentClick);
    document.addEventListener("keydown", handleLogDrawerKeydown);
    refreshRelayStatus({ silent: true }).finally(() => {
      startStatusPolling();
    });
    initLogStream();
  }

  return {
    initRelayControls,
    handleClearStorageClick,
  };
}
