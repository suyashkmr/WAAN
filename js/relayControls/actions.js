import { logPerfDuration } from "../perf.js";

export function createRelayActionsController({
  relayUiState,
  relayReloadAllButton,
  relayStatusEl,
  apiBase,
  relayBase,
  brandName,
  relayServiceName,
  relayPollIntervalMs,
  remoteMessageLimit,
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
  applyRelayStatus,
  beginManualSyncUi,
  markChatsFetched,
  markMessagesActive,
  handleSyncError,
}) {
  let statusRequestPromise = null;

  async function startRelaySession() {
    if (!relayBase) return;
    setRelayControlsDisabled(true);
    try {
      await withGlobalBusy(async () => {
        await fetchJson(`${relayBase}/relay/start`, { method: "POST" });
        updateStatus(`Starting ${relayServiceName}…`, "info");
        await refreshRelayStatus({ silent: true });
      }, `Starting ${relayServiceName}…`);
      electronAPI?.setRelayAutostart?.(true);
    } catch (error) {
      console.error(error);
      updateStatus(
        `We couldn't start ${relayServiceName}. Launch the desktop relay (or run \`npm start --workspace apps/server\`) and try again.`,
        "error",
      );
    } finally {
      setRelayControlsDisabled(false);
      applyRelayStatus(relayUiState.status);
    }
  }

  async function stopRelaySession() {
    if (!relayBase) return;
    setRelayControlsDisabled(true);
    try {
      await withGlobalBusy(async () => {
        await fetchJson(`${relayBase}/relay/stop`, { method: "POST" });
        updateStatus(`Stopped ${relayServiceName}.`, "info");
        setRemoteChatList([]);
        await refreshChatSelector();
        await refreshRelayStatus({ silent: true });
      }, `Stopping ${relayServiceName}…`);
      electronAPI?.setRelayAutostart?.(false);
    } catch (error) {
      console.error(error);
      updateStatus(`We couldn't stop ${relayServiceName}.`, "warning");
    } finally {
      setRelayControlsDisabled(false);
      applyRelayStatus(relayUiState.status);
    }
  }

  async function logoutRelaySession() {
    if (!relayBase) return;
    setRelayControlsDisabled(true);
    try {
      await withGlobalBusy(async () => {
        await fetchJson(`${relayBase}/relay/logout`, { method: "POST" });
        updateStatus("Logged out from the relay.", "info");
        setRemoteChatList([]);
        await refreshChatSelector();
        await refreshRelayStatus({ silent: true });
      }, "Logging out of the relay…");
      electronAPI?.setRelayAutostart?.(false);
    } catch (error) {
      console.error(error);
      updateStatus("We couldn't log out from the relay.", "warning");
    } finally {
      setRelayControlsDisabled(false);
    }
  }

  async function syncRelayChats({ silent = true } = {}) {
    if (!relayBase) return;
    if (!relayUiState.status || relayUiState.status.status !== "running") {
      if (!silent) {
        updateStatus(`Start ${relayServiceName} and link your phone before syncing chats.`, "warning");
      }
      return;
    }
    if (!silent) {
      beginManualSyncUi();
    }
    const syncStartedAt = globalThis.performance?.now?.() ?? Date.now();
    const task = async () => {
      try {
        await fetchJson(`${relayBase}/relay/sync`, { method: "POST" });
        const count = await refreshRemoteChats({ silent });
        if (!silent) {
          markChatsFetched(count);
          markMessagesActive();
        }
        return count;
      } catch (error) {
        console.error(error);
        if (!silent) {
          updateStatus("We couldn't refresh chats from the relay.", "warning");
          handleSyncError();
        }
        return 0;
      }
    };
    let syncedCount = 0;
    if (silent) {
      syncedCount = await task();
    } else {
      syncedCount = await withGlobalBusy(task, "Syncing chats from the relay…");
    }
    const syncFinishedAt = globalThis.performance?.now?.() ?? Date.now();
    logPerfDuration("relay.sync_chats", syncFinishedAt - syncStartedAt, { syncedCount, silent });
    if (!silent && syncedCount && electronAPI?.notifySyncSummary) {
      electronAPI.notifySyncSummary({ syncedChats: syncedCount });
    }
  }

  async function reloadAllChats() {
    if (!apiBase) return;
    return fetchJson(`${apiBase}/chats/reload`, { method: "POST" });
  }

  async function handleReloadAllChats() {
    if (!relayBase || !relayReloadAllButton) return;
    relayReloadAllButton.disabled = true;
    let syncedCount = 0;
    try {
      syncedCount = await withGlobalBusy(async () => {
        await reloadAllChats();
        const count = await refreshRemoteChats({ silent: false });
        updateStatus("Reloaded chat list from the relay.", "info");
        return count;
      }, "Reloading chats…");
    } catch (error) {
      console.error(error);
      updateStatus("We couldn't reload the chat list.", "error");
    } finally {
      relayReloadAllButton.disabled = false;
    }
    if (syncedCount && electronAPI?.notifySyncSummary) {
      electronAPI.notifySyncSummary({ syncedChats: syncedCount });
    }
  }

  async function refreshRemoteChats({ silent = true } = {}) {
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    let chatCount = 0;
    try {
      const payload = await fetchJson(`${apiBase}/chats`);
      const chats = Array.isArray(payload.chats) ? payload.chats : [];
      chatCount = chats.length;
      setRemoteChatList(chats);
      if (!silent) {
        updateStatus(`Fetched ${formatNumber(chats.length)} chats from ${brandName}.`, "info");
      }
    } catch (error) {
      console.error(error);
      setRemoteChatList([]);
      if (!silent) {
        updateStatus("Couldn't load chats from the relay. Make sure the desktop relay is running and connected.", "warning");
      }
    } finally {
      await refreshChatSelector();
    }
    const finishedAt = globalThis.performance?.now?.() ?? Date.now();
    logPerfDuration("relay.refresh_remote_chats", finishedAt - startedAt, { chatCount, silent });
    return chatCount;
  }

  async function refreshRelayStatus({ silent = false } = {}) {
    if (!relayBase || !relayStatusEl) return null;
    if (statusRequestPromise) return statusRequestPromise;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    statusRequestPromise = (async () => {
      try {
        const status = await fetchJson(`${relayBase}/relay/status`);
        applyRelayStatus(status);
        relayUiState.status = status;
        return status;
      } catch (error) {
        console.error("Failed to refresh relay status", error);
        if (!silent && (!relayUiState.lastErrorNotice || Date.now() - relayUiState.lastErrorNotice > 60000)) {
          updateStatus(
            `${relayServiceName} is offline. Launch the desktop relay and press Connect to enable live loading.`,
            "warning",
          );
          relayUiState.lastErrorNotice = Date.now();
        }
        relayUiState.status = null;
        applyRelayStatus(null);
        return null;
      } finally {
        const finishedAt = globalThis.performance?.now?.() ?? Date.now();
        logPerfDuration("relay.refresh_status", finishedAt - startedAt, { silent });
        statusRequestPromise = null;
      }
    })();
    return statusRequestPromise;
  }

  function startStatusPolling() {
    if (relayUiState.pollTimer) {
      clearTimeout(relayUiState.pollTimer);
    }
    const poll = async () => {
      await refreshRelayStatus({ silent: true });
      relayUiState.pollTimer = setTimeout(poll, relayPollIntervalMs);
    };
    poll();
  }

  async function loadRemoteChat(chatId, options = {}) {
    if (!chatId) return;
    const limit = Number(options.limit) || remoteMessageLimit;
    const params = new URLSearchParams({ limit: String(limit), refresh: "1", full: String(limit) });
    if (options.refresh === false) {
      params.delete("refresh");
    }
    if (options.fullLimit) params.set("full", String(options.fullLimit));
    const endpoint = `${apiBase}/chats/${encodeURIComponent(chatId)}/messages?${params.toString()}`;
    await withGlobalBusy(async () => {
      updateStatus("Fetching messages directly from the relay…", "info");
      try {
        const payload = await fetchJson(endpoint);
        const entries = Array.isArray(payload.entries) ? payload.entries : [];
        const label = payload.label || `${brandName} chat`;
        await applyEntriesToApp(entries, label, {
          datasetId: `remote-${chatId}`,
          selectionValue: encodeChatSelectorValue("remote", chatId),
          statusMessage: `Loaded ${formatNumber(entries.length)} messages from ${label}.`,
          persist: false,
          participants: Array.isArray(payload.participants) ? payload.participants : [],
        });
      } catch (error) {
        console.error(error);
        updateStatus(
          `We couldn't reach ${relayServiceName}. Make sure the desktop relay is running (or start it with \`npm start --workspace apps/server\`).`,
          "error",
        );
        throw error;
      }
    }, "Fetching messages…");
  }

  const relayPrimaryActionHandlers = {
    connect: () => startRelaySession(),
    reconnect: () => startRelaySession(),
    resync: () => syncRelayChats({ silent: false }),
  };

  function handlePrimaryActionClick(event) {
    const target = event.currentTarget;
    if (!target || target.disabled) {
      return;
    }
    const action = target.dataset?.relayAction || "connect";
    const handler = relayPrimaryActionHandlers[action];
    if (handler) {
      handler();
    }
  }

  return {
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
  };
}
