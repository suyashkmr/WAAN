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
    logDrawerClearButton,
  } = elements;

  const {
    handleRelayPrimaryActionClick,
    stopRelaySession,
    logoutRelaySession,
    handleReloadAllChats,
    openLogDrawer,
    closeLogDrawer,
    handleLogClear,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
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
        "Clear all cached ChatScope chats on this machine? You'll need to refresh to download them again.",
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

    relayStartButton.addEventListener("click", handleRelayPrimaryActionClick);
    relayStopButton?.addEventListener("click", stopRelaySession);
    relayLogoutButton?.addEventListener("click", logoutRelaySession);
    relayReloadAllButton?.addEventListener("click", handleReloadAllChats);
    relayClearStorageButton?.addEventListener("click", handleClearStorageClick);
    logDrawerToggleButton?.addEventListener("click", openLogDrawer);
    logDrawerCloseButton?.addEventListener("click", closeLogDrawer);
    logDrawerClearButton?.addEventListener("click", handleLogClear);

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
