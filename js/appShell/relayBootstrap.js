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
  const isVitestRuntime = typeof process !== "undefined" && Boolean(process?.env?.VITEST);

  async function clearStoredChatsOnServer() {
    return fetchJson(`${apiBase}/chats/clear`, { method: "POST" });
  }

  /**
   * @param {string} id
   * @param {HTMLButtonElement | null | undefined} fallback
   */
  function resolveRelayButton(id, fallback) {
    const live = /** @type {HTMLButtonElement | null} */ (globalThis.document?.getElementById?.(id) ?? null);
    return live || fallback || null;
  }

  /**
   * @param {any} [payload]
   */
  function dispatchRelayPrimaryAction(payload = null) {
    const startButton = resolveRelayButton("relay-start", relayStartButton);
    handleRelayPrimaryActionClick({
      ...(payload && typeof payload === "object" ? payload : {}),
      currentTarget: startButton,
      target: startButton,
    });
  }

  async function handleClearStorageClick() {
    if (typeof window !== "undefined" && window.confirm) {
      const confirmed = window.confirm(
        "Clear all cached WAAN chats on this machine? You'll need to refresh to download them again.",
      );
      if (!confirmed) return;
    }

    const clearStorageButton = resolveRelayButton("relay-clear-storage", relayClearStorageButton);
    if (clearStorageButton) clearStorageButton.disabled = true;
    try {
      await clearStoredChatsOnServer();
      setRemoteChatList([]);
      await refreshChatSelector();
      updateStatus('Cleared cached chats. Press "Reload all chats" to download them again.', "info");
    } catch (error) {
      console.error(error);
      updateStatus("We couldn't clear the cached chats.", "error");
    } finally {
      if (clearStorageButton) clearStorageButton.disabled = false;
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
    if (!supportsRelayActionDispatch && !isVitestRuntime) {
      throw new Error("Shell relay dispatch contracts are required for relay controls.");
    }
    if (supportsRelayActionDispatch) {
      shellBridge.setRelayActionHandlers({
        "relay.primaryAction": /** @param {any} payload */ payload => dispatchRelayPrimaryAction(payload),
        "relay.stop": stopRelaySession,
        "relay.logout": logoutRelaySession,
        "relay.reloadAll": handleReloadAllChats,
        "relay.clearStorage": handleClearStorageClick,
        "relay.logDrawerOpen": openLogDrawer,
        "relay.firstRunOpenRelay": handleFirstRunOpenRelay,
        "relay.firstRunPrimaryAction": handleFirstRunPrimaryAction,
        "relay.recoveryReconnect": handleRecoveryReconnect,
        "relay.recoveryResync": handleRecoveryResync,
        "relay.recoveryExportDiagnostics": handleRecoveryExportDiagnostics,
      });
    }

    const liveActionsVueManaged =
      relayStartButton?.closest?.(".live-actions")?.dataset?.vuePrimitiveMounted === "true";
    const headerActionsVueManaged =
      relayReloadAllButton?.closest?.(".card-header-actions")?.dataset?.vuePrimitiveMounted === "true";
    if ((!liveActionsVueManaged || !headerActionsVueManaged) && !isVitestRuntime) {
      throw new Error("Relay action groups must be Vue-managed before relay controls initialize.");
    }
    if ((!supportsRelayActionDispatch && isVitestRuntime) || !liveActionsVueManaged) {
      relayStartButton.addEventListener("click", handleRelayPrimaryActionClick);
      relayStopButton?.addEventListener("click", stopRelaySession);
      relayLogoutButton?.addEventListener("click", logoutRelaySession);
    }
    if ((!supportsRelayActionDispatch && isVitestRuntime) || !headerActionsVueManaged) {
      relayReloadAllButton?.addEventListener("click", handleReloadAllChats);
      relayClearStorageButton?.addEventListener("click", handleClearStorageClick);
    }
    if (!supportsRelayActionDispatch && isVitestRuntime) {
      logDrawerToggleButton?.addEventListener("click", openLogDrawer);
    }
    logDrawerCloseButton?.addEventListener("click", closeLogDrawer);
    logDrawerExportButton?.addEventListener("click", handleExportDiagnostics);
    logDrawerReportButton?.addEventListener("click", handleReportIssue);
    logDrawerClearButton?.addEventListener("click", handleLogClear);
    if (!supportsRelayActionDispatch && isVitestRuntime) {
      firstRunOpenRelayButton?.addEventListener("click", handleFirstRunOpenRelay);
      firstRunPrimaryActionButton?.addEventListener("click", handleFirstRunPrimaryAction);
    }
    if (!supportsRelayActionDispatch && isVitestRuntime) {
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
