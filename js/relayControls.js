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
} from "./config.js";
const MAX_LOG_ENTRIES = 400;

export function createRelayController({ elements, helpers, electronAPI = window.electronAPI }) {
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
    relayOnboardingSteps,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relaySyncProgressEl,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
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
    updateHeroRelayStatus,
    applyEntriesToApp,
    encodeChatSelectorValue,
  } = helpers;

  const relaySyncChatsStep = relaySyncProgressEl?.querySelector('[data-step="chats"]');
  const relaySyncMessagesStep = relaySyncProgressEl?.querySelector('[data-step="messages"]');

  const relayUiState = {
    status: null,
    controlsLocked: false,
    pollTimer: null,
    lastStatusKind: null,
    lastErrorNotice: null,
    primaryAction: "connect",
  };

  const relayLogState = {
    entries: [],
    connected: false,
    eventSource: null,
    reconnectTimer: null,
    drawerOpen: false,
  };

  const relaySyncUiState = {
    manualActive: false,
    hideTimer: null,
    wasSyncing: false,
  };

  function setSyncStepState(stepEl, metaEl, state, text) {
    if (stepEl && state) {
      stepEl.dataset.state = state;
    }
    if (metaEl && typeof text === "string") {
      metaEl.textContent = text;
    }
  }

  function showRelaySyncProgress() {
    if (!relaySyncProgressEl) return;
    relaySyncProgressEl.classList.remove("hidden");
  }

  function hideRelaySyncProgress() {
    if (!relaySyncProgressEl) return;
    relaySyncProgressEl.classList.add("hidden");
  }

  function beginManualSyncUi() {
    if (!relaySyncProgressEl) return;
    clearTimeout(relaySyncUiState.hideTimer);
    relaySyncUiState.manualActive = true;
    showRelaySyncProgress();
    setSyncStepState(relaySyncChatsStep, relaySyncChatsMeta, "active", "Requesting chat list…");
    setSyncStepState(relaySyncMessagesStep, relaySyncMessagesMeta, "pending", "Waiting to mirror messages…");
  }

  function markChatsFetched(count) {
    const label = Number.isFinite(count) && count > 0
      ? `Loaded ${formatNumber(count)} chats.`
      : "Chat list loaded.";
    setSyncStepState(relaySyncChatsStep, relaySyncChatsMeta, "complete", label);
  }

  function markMessagesActive() {
    setSyncStepState(relaySyncMessagesStep, relaySyncMessagesMeta, "active", "Mirroring recent messages…");
  }

  function completeSyncUi() {
    setSyncStepState(relaySyncMessagesStep, relaySyncMessagesMeta, "complete", "Messages are up to date.");
    relaySyncUiState.hideTimer = setTimeout(() => {
      relaySyncUiState.manualActive = false;
      hideRelaySyncProgress();
    }, 1800);
  }

  function updateSyncProgressFromStatus(status) {
    if (!relaySyncProgressEl) return;
    const syncing = Boolean(status?.syncingChats);
    if (syncing) {
      clearTimeout(relaySyncUiState.hideTimer);
      relaySyncUiState.wasSyncing = true;
      showRelaySyncProgress();
      const chatCount = Number(status?.chatCount ?? 0);
      const label = chatCount > 0
        ? `${formatNumber(chatCount)} chats indexed.`
        : "Fetching chat list…";
      setSyncStepState(relaySyncChatsStep, relaySyncChatsMeta, chatCount > 0 ? "complete" : "active", label);
      setSyncStepState(
        relaySyncMessagesStep,
        relaySyncMessagesMeta,
        "active",
        "Mirroring messages… keep the relay open.",
      );
    } else if (relaySyncUiState.wasSyncing || relaySyncUiState.manualActive) {
      relaySyncUiState.wasSyncing = false;
      completeSyncUi();
    } else {
      hideRelaySyncProgress();
    }
  }

  function setRelayControlsDisabled(disabled) {
    relayUiState.controlsLocked = disabled;
    [
      relayStartButton,
      relayStopButton,
      relayLogoutButton,
      relayReloadAllButton,
      relayClearStorageButton,
    ].forEach(button => {
      if (button) button.disabled = disabled;
    });
    if (!disabled) {
      applyRelayPrimaryAction(relayUiState.status);
    }
  }

  function getRelayPrimaryAction(status) {
    const defaultAction = {
      id: "connect",
      label: "Connect relay",
      hint: `Launch the desktop relay and press Connect to sync chats.`,
      disabled: false,
    };
    if (!status) return defaultAction;
    const state = status.status;
    if (status.lastError || state === "error") {
      return {
        id: "reconnect",
        label: "Reconnect relay",
        hint: "Restart the relay browser and relink your phone.",
        disabled: false,
      };
    }
    if (state === "running") {
      return {
        id: "resync",
        label: "Resync chats",
        hint: "Fetch the latest chats from the relay.",
        disabled: false,
      };
    }
    if (state === "waiting_qr") {
      return {
        id: "waiting",
        label: "Scan QR to continue",
        hint: "Open chat app → Linked Devices on your phone to finish linking.",
        disabled: true,
      };
    }
    if (state === "starting") {
      return {
        id: "starting",
        label: "Starting…",
        hint: `Launching ${RELAY_SERVICE_NAME}…`,
        disabled: true,
      };
    }
    return defaultAction;
  }

  function applyRelayPrimaryAction(status) {
    if (!relayStartButton) return;
    const action = getRelayPrimaryAction(status);
    relayUiState.primaryAction = action.id;
    relayStartButton.dataset.relayAction = action.id;
    relayStartButton.textContent = action.label;
    if (action.hint) {
      relayStartButton.setAttribute("title", action.hint);
    } else {
      relayStartButton.removeAttribute("title");
    }
    relayStartButton.disabled = relayUiState.controlsLocked || Boolean(action.disabled);
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

  function scheduleRelayStatusPolling() {
    if (relayUiState.pollTimer) {
      clearTimeout(relayUiState.pollTimer);
    }
    const poll = async () => {
      await refreshRelayStatus({ silent: true });
      relayUiState.pollTimer = setTimeout(poll, RELAY_POLL_INTERVAL_MS);
    };
    poll();
  }

  function startStatusPolling() {
    scheduleRelayStatusPolling();
  }

  async function startRelaySession() {
    if (!RELAY_BASE) return;
    setRelayControlsDisabled(true);
    try {
      await withGlobalBusy(async () => {
        await fetchJson(`${RELAY_BASE}/relay/start`, { method: "POST" });
        updateStatus(`Starting ${RELAY_SERVICE_NAME}…`, "info");
        await refreshRelayStatus({ silent: true });
      }, `Starting ${RELAY_SERVICE_NAME}…`);
      electronAPI?.setRelayAutostart?.(true);
    } catch (error) {
      console.error(error);
      updateStatus(
        `We couldn't start ${RELAY_SERVICE_NAME}. Launch the desktop relay (or run \`npm start --workspace apps/server\`) and try again.`,
        "error"
      );
    } finally {
      setRelayControlsDisabled(false);
      applyRelayStatus(relayUiState.status);
    }
  }

  async function stopRelaySession() {
    if (!RELAY_BASE) return;
    setRelayControlsDisabled(true);
    try {
      await withGlobalBusy(async () => {
        await fetchJson(`${RELAY_BASE}/relay/stop`, { method: "POST" });
        updateStatus(`Stopped ${RELAY_SERVICE_NAME}.`, "info");
        setRemoteChatList([]);
        await refreshChatSelector();
        await refreshRelayStatus({ silent: true });
      }, `Stopping ${RELAY_SERVICE_NAME}…`);
      electronAPI?.setRelayAutostart?.(false);
    } catch (error) {
      console.error(error);
      updateStatus(`We couldn't stop ${RELAY_SERVICE_NAME}.`, "warning");
    } finally {
      setRelayControlsDisabled(false);
      applyRelayStatus(relayUiState.status);
    }
  }

  async function logoutRelaySession() {
    if (!RELAY_BASE) return;
    setRelayControlsDisabled(true);
    try {
      await withGlobalBusy(async () => {
        await fetchJson(`${RELAY_BASE}/relay/logout`, { method: "POST" });
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
    if (!RELAY_BASE) return;
    if (!relayUiState.status || relayUiState.status.status !== "running") {
      if (!silent) {
        updateStatus(`Start ${RELAY_SERVICE_NAME} and link your phone before syncing chats.`, "warning");
      }
      return;
    }
    if (!silent) {
      beginManualSyncUi();
    }
    const task = async () => {
      try {
        await fetchJson(`${RELAY_BASE}/relay/sync`, { method: "POST" });
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
          relaySyncUiState.manualActive = false;
          hideRelaySyncProgress();
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
    if (!silent && syncedCount && electronAPI?.notifySyncSummary) {
      electronAPI.notifySyncSummary({ syncedChats: syncedCount });
    }
  }

  async function reloadAllChats() {
    if (!API_BASE) return;
    return fetchJson(`${API_BASE}/chats/reload`, { method: "POST" });
  }

  async function handleReloadAllChats() {
    if (!RELAY_BASE || !relayReloadAllButton) return;
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
    let chatCount = 0;
    try {
      const payload = await fetchJson(`${API_BASE}/chats`);
      const chats = Array.isArray(payload.chats) ? payload.chats : [];
      chatCount = chats.length;
      setRemoteChatList(chats);
      if (!silent) {
        updateStatus(`Fetched ${formatNumber(chats.length)} chats from ${BRAND_NAME}.`, "info");
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
    return chatCount;
  }

  async function refreshRelayStatus({ silent = false } = {}) {
    if (!RELAY_BASE || !relayStatusEl) return null;
    try {
      const status = await fetchJson(`${RELAY_BASE}/relay/status`);
      applyRelayStatus(status);
      relayUiState.status = status;
      return status;
    } catch (error) {
      console.error("Failed to refresh relay status", error);
      if (!silent && (!relayUiState.lastErrorNotice || Date.now() - relayUiState.lastErrorNotice > 60000)) {
        updateStatus(
          `${RELAY_SERVICE_NAME} is offline. Launch the desktop relay and press Connect to enable live loading.`,
          "warning"
        );
        relayUiState.lastErrorNotice = Date.now();
      }
      relayUiState.status = null;
      applyRelayStatus(null);
      return null;
    }
  }

  function describeRelayStatus(status) {
    const baseMessage = (() => {
      switch (status.status) {
        case "starting":
          return `Starting ${RELAY_SERVICE_NAME}. Launching the relay browser…`;
        case "waiting_qr":
          return "Waiting for you to scan the QR code from your phone.";
        case "running":
          return status.account
            ? `Connected as ${formatRelayAccount(status.account)}.`
            : `Connected to ${BRAND_NAME}.`;
        default:
          return "Relay is offline.";
      }
    })();
    return { message: baseMessage };
  }

  function applyRelayStatus(status) {
    updateHeroRelayStatus(status);
    electronAPI?.updateRelayStatus?.(status);
    applyRelayPrimaryAction(status);
    if (!relayStatusEl) return;
    updateRelayBanner(status);
    updateRelayOnboarding(status);
    if (!status) {
      updateSyncProgressFromStatus(null);
      relayStatusEl.textContent = `Relay offline. Launch the desktop relay to link ${BRAND_NAME}.`;
      if (relayAccountEl) relayAccountEl.textContent = "";
      if (relayQrContainer) relayQrContainer.classList.add("hidden");
      if (relayQrImage) relayQrImage.removeAttribute("src");
      if (relayHelpText) {
        relayHelpText.textContent =
          "Press Connect, open chat app on your phone (Linked Devices), scan the QR code, then choose a chat from “Loaded chats”.";
      }
      if (relayStopButton) relayStopButton.disabled = true;
      if (relayReloadAllButton) relayReloadAllButton.disabled = true;
      if (relayClearStorageButton) relayClearStorageButton.disabled = false;
      setRemoteChatList([]);
      relayUiState.lastStatusKind = "offline";
      refreshChatSelector();
      setDashboardLoadingState(true);
      setDatasetEmptyMessage(
        "No chat is selected yet.",
        "Start the relay desktop app, press Connect, scan the QR code, then choose a mirrored chat from “Loaded chats”.",
      );
      setDataAvailabilityState(false);
      return;
    }

    const description = describeRelayStatus(status);
    relayStatusEl.textContent = description.message;
    if (relayAccountEl) {
      relayAccountEl.textContent = status.account
        ? `Logged in as ${formatRelayAccount(status.account)}`
        : "";
    }
    if (relayHelpText) {
      relayHelpText.textContent =
        status.status === "running"
          ? `Your mirrored ${BRAND_NAME} chats now appear under “Loaded chats”. Pick one to explore insights.`
          : "Open chat app on your phone, go to Linked Devices, tap “Link a device”, and scan the QR code shown here.";
    }
    if (status.lastQr && relayQrContainer && relayQrImage) {
      relayQrImage.src = status.lastQr;
      relayQrContainer.classList.remove("hidden");
    } else if (relayQrContainer) {
      relayQrContainer.classList.add("hidden");
    }

    const running = status.status === "running";
    const waiting = status.status === "waiting_qr" || status.status === "starting";
    const canLogout = running || waiting || Boolean(status.account);
    if (relayStopButton) {
      relayStopButton.disabled = !running && !waiting;
    }
    if (relayClearStorageButton) {
      relayClearStorageButton.disabled = relayUiState.controlsLocked;
    }
    if (relayLogoutButton) {
      relayLogoutButton.disabled = !canLogout;
    }
    if (relayReloadAllButton) {
      relayReloadAllButton.disabled = !running;
    }
    if (!getRemoteChatList().length) {
      if (running) {
        setDatasetEmptyMessage(
          "Pick a chat",
          "Select any conversation from “Loaded chats” to see its insights.",
        );
      } else if (waiting) {
        setDatasetEmptyMessage("Scan the QR code", "Link your phone to start mirroring messages.");
      }
    }

    if (running) {
      const lastFetchedAt = typeof getRemoteChatsLastFetchedAt === "function"
        ? getRemoteChatsLastFetchedAt()
        : 0;
      const needsRefresh =
        !getRemoteChatList().length ||
        (lastFetchedAt && Date.now() - lastFetchedAt > REMOTE_CHAT_REFRESH_INTERVAL_MS);
      if (needsRefresh) {
        refreshRemoteChats({ silent: true });
      }
      if (relayUiState.lastStatusKind !== "running") {
        const accountLabel = formatRelayAccount(status.account) || "your account";
        updateStatus(`Connected as ${accountLabel}.`, "success");
        relayUiState.lastStatusKind = "running";
      }
    } else {
      setRemoteChatList([]);
      refreshChatSelector();
      setDashboardLoadingState(true);
      if (waiting && relayUiState.lastStatusKind !== "waiting") {
        updateStatus("Scan the QR code shown below to finish linking your phone.", "info");
        relayUiState.lastStatusKind = "waiting";
      } else if (status.status === "starting" && relayUiState.lastStatusKind !== "starting") {
        updateStatus(`Starting ${RELAY_SERVICE_NAME}…`, "info");
        relayUiState.lastStatusKind = "starting";
      }
    }

    updateSyncProgressFromStatus(status);
  }

  function updateRelayBanner(status) {
    if (!relayBannerEl || !relayBannerMessage || !relayBannerMeta) return;
    if (!status) {
      relayBannerEl.dataset.status = "offline";
      relayBannerMessage.textContent = "Relay offline.";
      relayBannerMeta.textContent = "Launch the relay desktop app, press Connect, then pick a mirrored chat.";
      return;
    }
    relayBannerEl.dataset.status = status.status || "unknown";
    relayBannerMessage.textContent = describeRelayStatus(status).message;
    const metaParts = [];
    if (status.account) {
      const accountLabel = formatRelayAccount(status.account) || "Linked account";
      metaParts.push(`Account: ${accountLabel}`);
    }
    if (status.chatsSyncedAt) {
      const relative = formatRelativeTime(status.chatsSyncedAt);
      metaParts.push(relative ? `Synced ${relative}` : `Synced ${formatDisplayDate(status.chatsSyncedAt)}`);
    } else {
      metaParts.push("Waiting to sync chats");
    }
    if (Number.isFinite(status.chatCount)) {
      metaParts.push(`${formatNumber(status.chatCount)} chats indexed`);
    }
    relayBannerMeta.textContent = metaParts.join(" · ") || "Relay ready.";
  }

  function updateRelayOnboarding(status) {
    if (!relayOnboardingSteps?.length) return;
    const state = status?.status || "stopped";
    const chatCount = Number(status?.chatCount ?? 0);
    relayOnboardingSteps.forEach(step => {
      const id = step.dataset.stepId;
      let value = "pending";
      if (id === "start") {
        if (!status) value = "pending";
        else if (state === "starting") value = "active";
        else if (state === "running" || state === "waiting_qr") value = "complete";
        else value = "pending";
        const detail = step.querySelector(".relay-step-detail");
        if (detail) {
          if (value === "complete") {
            detail.textContent = "Relay is running.";
          } else if (value === "active") {
            detail.textContent = "Launching the service…";
          } else if (state === "error") {
            detail.textContent = "Relay failed to launch. Retry.";
          } else {
            detail.textContent = "Open the ChatScope Relay app and press Start.";
          }
        }
      } else if (id === "qr") {
        if (!status) value = "pending";
        else if (state === "waiting_qr") value = "active";
        else if (state === "running") value = "complete";
        const detail = step.querySelector(".relay-step-detail");
        if (detail) {
          detail.textContent =
            value === "complete"
              ? "Phone linked."
              : value === "active"
                ? "Scan the QR code shown below."
                : "Open chat app → Linked Devices on your phone and scan the code.";
        }
      } else if (id === "sync") {
        if (state === "running" && chatCount === 0) value = "active";
        else if (state === "running" && chatCount > 0) value = "complete";
        else value = "pending";
        const detail = step.querySelector(".relay-step-detail");
        if (detail) {
          detail.textContent =
            value === "complete"
              ? "Chats synced."
              : value === "active"
                ? "Syncing chats…"
                : "Sync chats into ChatScope.";
        }
      }
      step.dataset.state = value;
    });
  }

  function normalizeAccountId(value) {
    if (!value) return "";
    if (typeof value === "string") return value.replace(/@[\w.]+$/, "");
    if (typeof value === "object") {
      if (typeof value._serialized === "string") return value._serialized.replace(/@[\w.]+$/, "");
      if (typeof value.user === "string" && typeof value.server === "string") {
        return `${value.user}`.replace(/@[\w.]+$/, "");
      }
    }
    return "";
  }

  function formatRelayAccount(account) {
    if (!account) return "";
    const name =
      account.name || account.pushName || account.pushname || account.displayName || account.formattedName;
    const number =
      normalizeAccountId(account.id) ||
      normalizeAccountId(account.jid) ||
      normalizeAccountId(account.me) ||
      normalizeAccountId(account.wid);
    if (name && number) return `${name} (${number})`;
    if (name) return name;
    return number || RELAY_CLIENT_LABEL;
  }

  async function loadRemoteChat(chatId, options = {}) {
    if (!chatId) return;
    const limit = Number(options.limit) || REMOTE_MESSAGE_LIMIT;
    const params = new URLSearchParams({ limit: String(limit), refresh: "1", full: String(limit) });
    if (options.refresh === false) {
      params.delete("refresh");
    }
    if (options.fullLimit) params.set("full", String(options.fullLimit));
    const endpoint = `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages?${params.toString()}`;
    await withGlobalBusy(async () => {
      updateStatus("Fetching messages directly from the relay…", "info");
      try {
        const payload = await fetchJson(endpoint);
        const entries = Array.isArray(payload.entries) ? payload.entries : [];
        const label = payload.label || `${BRAND_NAME} chat`;
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
          `We couldn't reach ${RELAY_SERVICE_NAME}. Make sure the desktop relay is running (or start it with \`npm start --workspace apps/server\`).`,
          "error"
        );
        throw error;
      }
    }, "Fetching messages…");
  }

  function openLogDrawer() {
    if (!logDrawerEl) return;
    logDrawerEl.setAttribute("aria-hidden", "false");
    relayLogState.drawerOpen = true;
    logDrawerToggleButton?.removeAttribute("data-has-unread");
    renderRelayLogs();
  }

  function closeLogDrawer() {
    if (!logDrawerEl) return;
    logDrawerEl.setAttribute("aria-hidden", "true");
    relayLogState.drawerOpen = false;
  }

  function isLogDrawerOpen() {
    return relayLogState.drawerOpen;
  }

  function handleLogDrawerDocumentClick(event) {
    if (!relayLogState.drawerOpen) return;
    const target = event.target;
    if (!logDrawerEl || logDrawerEl.contains(target)) return;
    if (logDrawerToggleButton && logDrawerToggleButton.contains(target)) return;
    closeLogDrawer();
  }

  function handleLogDrawerKeydown(event) {
    if (event.key === "Escape" && relayLogState.drawerOpen) {
      closeLogDrawer();
    }
  }

  async function handleLogClear() {
    if (!RELAY_BASE) return;
    try {
      await fetchJson(`${RELAY_BASE}/relay/logs/clear`, { method: "POST" });
      relayLogState.entries = [];
      logDrawerToggleButton?.removeAttribute("data-has-unread");
      renderRelayLogs();
    } catch (error) {
      console.error("Failed to clear logs", error);
      updateStatus("Couldn't clear the relay logs.", "warning");
    }
  }

  function renderRelayLogs() {
    if (!logDrawerList) return;
    if (!relayLogState.entries.length) {
      logDrawerList.innerHTML = '<p class="relay-log-empty">No relay logs yet.</p>';
      return;
    }
    const fragment = document.createDocumentFragment();
    relayLogState.entries.forEach(line => {
      const li = document.createElement("p");
      li.classList.add("relay-log-entry");
      li.textContent = line;
      fragment.appendChild(li);
    });
    logDrawerList.innerHTML = "";
    logDrawerList.appendChild(fragment);
    if (relayLogState.drawerOpen) {
      logDrawerList.scrollTop = logDrawerList.scrollHeight;
    }
  }

  function initLogStream() {
    if (!RELAY_BASE || relayLogState.eventSource) return;
    if (typeof EventSource === "undefined") {
      setLogConnectionLabel("Live log stream not available in this environment.");
      return;
    }
    const source = new EventSource(`${RELAY_BASE}/relay/logs/stream`);
    relayLogState.eventSource = source;
    setLogConnectionLabel("Connecting…");
    source.onopen = () => {
      relayLogState.connected = true;
      setLogConnectionLabel("Live log stream");
    };
    source.onmessage = event => {
      relayLogState.entries.push(event.data);
      if (relayLogState.entries.length > MAX_LOG_ENTRIES) {
        relayLogState.entries.splice(0, relayLogState.entries.length - MAX_LOG_ENTRIES);
      }
      appendRelayLog(event.data);
      if (!relayLogState.drawerOpen) {
        logDrawerToggleButton?.setAttribute("data-has-unread", "true");
      }
    };
    source.onerror = () => {
      relayLogState.connected = false;
      setLogConnectionLabel("Log stream disconnected. Retrying…");
      source.close();
      relayLogState.eventSource = null;
      if (!relayLogState.reconnectTimer) {
        relayLogState.reconnectTimer = setTimeout(() => {
          relayLogState.reconnectTimer = null;
          initLogStream();
        }, 5000);
      }
    };
  }

  function appendRelayLog(entry) {
    if (!logDrawerList) return;
    if (logDrawerList.firstChild?.classList?.contains?.("relay-log-empty")) {
      logDrawerList.innerHTML = "";
    }
    const p = document.createElement("p");
    p.classList.add("relay-log-entry");
    p.textContent = entry;
    logDrawerList.appendChild(p);
    while (logDrawerList.children.length > MAX_LOG_ENTRIES) {
      logDrawerList.removeChild(logDrawerList.firstChild);
    }
    if (relayLogState.drawerOpen) {
      logDrawerList.scrollTop = logDrawerList.scrollHeight;
    }
  }

  function setLogConnectionLabel(text) {
    if (logDrawerConnectionLabel) {
      logDrawerConnectionLabel.textContent = text;
    }
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
    isLogDrawerOpen,
  };
}
