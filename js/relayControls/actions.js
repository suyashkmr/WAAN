// @ts-check
import { logPerfDuration } from "../perf.js";
import { loadRemoteChatFromRelay } from "./loadRemoteChat.js";
/** @param {Record<string, any>} params */
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
  visibilityAdapter,
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
  const MAX_RETRY_DELAY_MS = 60000;
  const RETRY_NOTICE_COOLDOWN_MS = 20000;
  const OFFLINE_AFTER_CONSECUTIVE_POLL_FAILURES = 3;
  /** @type {Promise<any> | null} */
  let statusRequestPromise = null;
  /** @type {{ silent: boolean, fromPolling: boolean } | null} */
  let statusRequestMeta = null;
  const nowMs = () => Date.now();
  /** @param {number} failureCount */
  function buildRetryDelayMs(failureCount) {
    const exponentialDelay = relayPollIntervalMs * (2 ** Math.min(failureCount, 4));
    const jitter = 0.85 + Math.random() * 0.3;
    const jittered = Math.round(exponentialDelay * jitter);
    return Math.max(relayPollIntervalMs, Math.min(MAX_RETRY_DELAY_MS, jittered));
  }
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
    logPerfDuration("relay.sync_chats", syncFinishedAt - syncStartedAt, /** @type {any} */ ({ syncedCount, silent }));
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
    logPerfDuration("relay.refresh_remote_chats", finishedAt - startedAt, /** @type {any} */ ({ chatCount, silent }));
    return chatCount;
  }
  async function refreshRelayStatus({ silent = false, fromPolling = false } = {}) {
    if (!relayBase || !relayStatusEl) return null;
    if (statusRequestPromise) {
      if (statusRequestMeta) {
        if (!fromPolling) statusRequestMeta.fromPolling = false;
        if (!silent) statusRequestMeta.silent = false;
      }
      return statusRequestPromise;
    }
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    statusRequestMeta = {
      silent: Boolean(silent),
      fromPolling: Boolean(fromPolling),
    };
    statusRequestPromise = (async () => {
      try {
        const status = await fetchJson(`${relayBase}/relay/status`);
        const failedPolls = Number(relayUiState.statusFailureCount || 0);
        if (failedPolls > 0) {
          updateStatus("Relay connection restored.", "success");
        }
        relayUiState.statusFailureCount = 0;
        relayUiState.nextPollDelayMs = relayPollIntervalMs;
        applyRelayStatus(status);
        relayUiState.status = status;
        return status;
      } catch (error) {
        const requestSilent = Boolean(statusRequestMeta?.silent);
        const requestFromPolling = Boolean(statusRequestMeta?.fromPolling);
        console.error("Failed to refresh relay status", error);
        const nextFailureCount = Number(relayUiState.statusFailureCount || 0) + 1;
        relayUiState.statusFailureCount = nextFailureCount;
        relayUiState.nextPollDelayMs = buildRetryDelayMs(nextFailureCount);
        const retryDelaySeconds = Math.ceil(relayUiState.nextPollDelayMs / 1000);
        if (
          requestFromPolling &&
          (!relayUiState.lastRetryNoticeAt || nowMs() - relayUiState.lastRetryNoticeAt > RETRY_NOTICE_COOLDOWN_MS)
        ) {
          updateStatus(`Relay connection lost. Retrying in ${retryDelaySeconds}s…`, "warning");
          relayUiState.lastRetryNoticeAt = nowMs();
        }
        if (!requestSilent && (!relayUiState.lastErrorNotice || Date.now() - relayUiState.lastErrorNotice > 60000)) {
          updateStatus(
            `${relayServiceName} is offline. Launch the desktop relay and press Connect to enable live loading.`,
            "warning",
          );
          relayUiState.lastErrorNotice = Date.now();
        }
        if (!requestFromPolling || nextFailureCount >= OFFLINE_AFTER_CONSECUTIVE_POLL_FAILURES) {
          relayUiState.status = null;
          applyRelayStatus(null);
        }
        return null;
      } finally {
        const finishedAt = globalThis.performance?.now?.() ?? Date.now();
        logPerfDuration("relay.refresh_status", finishedAt - startedAt, /** @type {any} */ ({ silent }));
        statusRequestPromise = null;
        statusRequestMeta = null;
      }
    })();
    return statusRequestPromise;
  }
  function startStatusPolling() {
    const addVisibilityListener = visibilityAdapter?.addChangeListener;
    const isDocumentHidden = () => Boolean(visibilityAdapter?.isHidden?.());
    if (relayUiState.pollTimer) clearTimeout(relayUiState.pollTimer);
    if (relayUiState.pollVisibilityCleanup) {
      relayUiState.pollVisibilityCleanup();
      relayUiState.pollVisibilityCleanup = null;
    }
    relayUiState.statusFailureCount = 0;
    relayUiState.nextPollDelayMs = relayPollIntervalMs;

    const poll = async () => {
      if (isDocumentHidden()) {
        relayUiState.pollTimer = null;
        return;
      }
      await refreshRelayStatus({ silent: true, fromPolling: true });
      if (isDocumentHidden()) {
        relayUiState.pollTimer = null;
        return;
      }
      const delayMs = Number(relayUiState.nextPollDelayMs) || relayPollIntervalMs;
      relayUiState.pollTimer = setTimeout(poll, delayMs);
    };

    if (typeof addVisibilityListener === "function") {
      const handleVisibilityChange = () => {
        if (isDocumentHidden()) return;
        if (relayUiState.pollTimer || statusRequestPromise) return;
        poll();
      };
      relayUiState.pollVisibilityCleanup = addVisibilityListener(handleVisibilityChange);
    }
    poll();
  }

  /** @param {string} chatId @param {Record<string, any>} [options] */
  async function loadRemoteChat(chatId, options = {}) {
    return loadRemoteChatFromRelay({
      chatId,
      options,
      apiBase,
      remoteMessageLimit,
      brandName,
      relayServiceName,
      fetchJson,
      updateStatus,
      withGlobalBusy,
      applyEntriesToApp,
      encodeChatSelectorValue,
      formatNumber,
    });
  }

  const relayPrimaryActionHandlers = /** @type {Record<string, () => void>} */ ({
    connect: () => startRelaySession(),
    reconnect: () => startRelaySession(),
    resync: () => syncRelayChats({ silent: false }),
  });

  /** @param {{ currentTarget?: EventTarget | null }} event */
  function handlePrimaryActionClick(event) {
    const target = /** @type {HTMLButtonElement | null} */ (
      event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null
    );
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
