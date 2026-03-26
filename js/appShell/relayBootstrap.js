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
 *   documentRef?: Document | null | undefined,
 *   windowRef?: Window | null | undefined,
 *   globalScope?: any,
 * }} params
 */
export function createRelayBootstrapController({
  elements,
  handlers,
  deps,
  documentRef = typeof document !== "undefined" ? document : null,
  windowRef = typeof window !== "undefined" ? window : null,
  globalScope = globalThis,
}) {
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

  /**
   * @param {any} payload
   * @param {HTMLButtonElement | null | undefined} defaultButton
   */
  function resolveRelayButtonFromPayload(payload, defaultButton) {
    const candidate = payload?.currentTarget ?? payload?.target ?? null;
    if (candidate instanceof HTMLButtonElement) return candidate;
    return defaultButton || null;
  }

  /**
   * @param {any} [payload]
   */
  function dispatchRelayPrimaryAction(payload = null) {
    const startButton = resolveRelayButtonFromPayload(payload, relayStartButton)
      ?? /** @type {HTMLButtonElement | null} */ (documentRef?.getElementById?.("relay-start") ?? null);
    handleRelayPrimaryActionClick({
      ...(payload && typeof payload === "object" ? payload : {}),
      currentTarget: startButton,
      target: startButton,
    });
  }

  async function handleClearStorageClick(payload = null) {
    if (typeof windowRef?.confirm === "function") {
      const confirmed = windowRef.confirm(
        "Clear all cached WAAN chats on this machine? You'll need to refresh to download them again.",
      );
      if (!confirmed) return;
    }

    const clearStorageButton = resolveRelayButtonFromPayload(payload, relayClearStorageButton);
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
    shellBridge?.updateRelayControlButtons?.({ clearStorageDisabled: true });
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
      shellBridge?.updateRelayControlButtons?.({ clearStorageDisabled: false });
      if (clearStorageButton) clearStorageButton.disabled = false;
    }
  }

  function initRelayControls() {
    // Re-query: relay-start is Vue-rendered, may be null in domRefs initially.
    const liveStartButton = relayStartButton
      ?? /** @type {HTMLButtonElement | null} */ (documentRef?.getElementById?.("relay-start") ?? null);
    const liveStatusEl = relayStatusEl
      ?? documentRef?.getElementById?.("relay-connection-status")
      ?? null;

    if (!liveStartButton || !liveStatusEl) {
      // Continue anyway; guards below will catch mounting state.
    }

    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
    const supportsRelayActionDispatch =
      typeof shellBridge?.setRelayActionHandlers === "function" &&
      typeof shellBridge?.dispatchRelayAction === "function";
    if (!supportsRelayActionDispatch) {
      throw new Error("Shell relay dispatch contracts are required for relay controls.");
    }
    shellBridge.setRelayActionHandlers({
      "relay.primaryAction": /** @param {any} payload */ payload => dispatchRelayPrimaryAction(payload),
      "relay.stop": stopRelaySession,
      "relay.logout": logoutRelaySession,
      "relay.reloadAll": handleReloadAllChats,
      "relay.clearStorage": /** @param {any} payload */ payload => handleClearStorageClick(payload),
      "relay.logDrawerOpen": openLogDrawer,
      "relay.firstRunOpenRelay": handleFirstRunOpenRelay,
      "relay.firstRunPrimaryAction": handleFirstRunPrimaryAction,
      "relay.recoveryReconnect": handleRecoveryReconnect,
      "relay.recoveryResync": handleRecoveryResync,
      "relay.recoveryExportDiagnostics": handleRecoveryExportDiagnostics,
    });

    // Consistently re-query at runtime: all relay controls are now Vue-rendered into 
    // #relay-sidebar-live-actions. Outer references from domRefs may be null 
    // if initialization happens before Vue finishes mounting.
    const liveActionsContainer = documentRef?.getElementById?.("relay-sidebar-live-actions")
      ?? relayStartButton?.closest?.(".live-actions")
      ?? null;
    
    const liveActionsVueManaged = liveActionsContainer?.dataset?.vuePrimitiveMounted === "true";

    if (!liveActionsVueManaged) {
      console.warn("Relay action group is not Vue-managed yet; continuing bootstrap and relying on late-mounted shell actions.");
    }
    void relayStopButton;
    void relayLogoutButton;
    void relayReloadAllButton;
    void relayClearStorageButton;
    void logDrawerToggleButton;
    logDrawerCloseButton?.addEventListener("click", closeLogDrawer);
    logDrawerExportButton?.addEventListener("click", handleExportDiagnostics);
    logDrawerReportButton?.addEventListener("click", handleReportIssue);
    logDrawerClearButton?.addEventListener("click", handleLogClear);
    void firstRunOpenRelayButton;
    void firstRunPrimaryActionButton;
    relayRecoveryReconnectButton?.addEventListener("click", event => {
      event.preventDefault();
      handleRecoveryReconnect();
    });
    relayRecoveryResyncButton?.addEventListener("click", event => {
      event.preventDefault();
      handleRecoveryResync();
    });
    relayRecoveryExportButton?.addEventListener("click", event => {
      event.preventDefault();
      handleRecoveryExportDiagnostics();
    });

    documentRef?.addEventListener("click", handleLogDrawerDocumentClick);
    documentRef?.addEventListener("keydown", handleLogDrawerKeydown);
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
