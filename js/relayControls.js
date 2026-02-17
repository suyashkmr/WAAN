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
import { createRelaySyncProgressController } from "./relayControls/syncProgress.js";
import { createRelayLogController } from "./relayControls/logStream.js";
import { createRelayActionsController } from "./relayControls/actions.js";
import {
  describeRelayStatus,
  formatRelayAccount,
  updateRelayBanner,
  updateRelayOnboarding,
} from "./relayControls/statusView.js";

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
    firstRunSetup,
    firstRunSetupSteps,
    firstRunPrimaryActionButton,
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
    getDataAvailable,
    updateHeroRelayStatus,
    applyEntriesToApp,
    encodeChatSelectorValue,
  } = helpers;

  const relayUiState = {
    status: null,
    controlsLocked: false,
    pollTimer: null,
    lastStatusKind: null,
    lastErrorNotice: null,
    primaryAction: "connect",
  };

  function scrollToElement(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: "auto", block: "center" });
  }

  function updateFirstRunSetup({ status, hasData = false } = {}) {
    if (!firstRunSetup || !firstRunSetupSteps?.length) return;
    if (hasData) {
      firstRunSetup.setAttribute("hidden", "");
      return;
    }
    firstRunSetup.removeAttribute("hidden");

    const state = status?.status || "offline";
    const chatCount = Number(status?.chatCount ?? 0);

    firstRunSetupSteps.forEach(step => {
      const stepId = step.dataset.setupStep;
      let value = "pending";
      if (stepId === "connect") {
        value = state === "offline" || state === "error" ? "active" : "complete";
      } else if (stepId === "link") {
        if (state === "offline" || state === "error") value = "pending";
        else if (state === "waiting_qr" || state === "starting") value = "active";
        else value = "complete";
      } else if (stepId === "load") {
        if (hasData) value = "complete";
        else if (state === "running" && chatCount > 0) value = "active";
        else value = "pending";
      }
      step.dataset.state = value;
    });

    if (firstRunPrimaryActionButton) {
      firstRunPrimaryActionButton.dataset.action = "connect";
      firstRunPrimaryActionButton.disabled = relayUiState.controlsLocked;
      if (state === "running" && chatCount > 0) {
        firstRunPrimaryActionButton.textContent = "Choose Loaded Chat";
        firstRunPrimaryActionButton.dataset.action = "select-chat";
      } else if (state === "starting") {
        firstRunPrimaryActionButton.textContent = "Starting Relay…";
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "waiting_qr") {
        firstRunPrimaryActionButton.textContent = "Waiting for QR Scan";
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "running") {
        firstRunPrimaryActionButton.textContent = "Syncing Chats…";
        firstRunPrimaryActionButton.disabled = true;
      } else {
        firstRunPrimaryActionButton.textContent = "Connect Relay";
      }
    }
  }

  function handleFirstRunOpenRelay() {
    const relayCard = document.getElementById("relay-live-card");
    scrollToElement(relayCard);
  }

  function handleFirstRunPrimaryAction() {
    const action = firstRunPrimaryActionButton?.dataset.action || "connect";
    if (action === "select-chat") {
      const selector = document.getElementById("chat-selector");
      scrollToElement(selector);
      selector?.focus();
      return;
    }
    if (relayStartButton && !relayStartButton.disabled) {
      relayStartButton.click();
    }
  }
  const {
    beginManualSyncUi,
    markChatsFetched,
    markMessagesActive,
    updateSyncProgressFromStatus,
    handleSyncError,
  } = createRelaySyncProgressController({
    relaySyncProgressEl,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    formatNumber,
  });
  const {
    openLogDrawer,
    closeLogDrawer,
    isLogDrawerOpen,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
    handleLogClear,
    initLogStream,
  } = createRelayLogController({
    relayBase: RELAY_BASE,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    fetchJson,
    updateStatus,
  });

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
  const formatRelayAccountLabel = account => formatRelayAccount(account, RELAY_CLIENT_LABEL);
  const describeRelayStatusForUi = status =>
    describeRelayStatus(status, {
      relayServiceName: RELAY_SERVICE_NAME,
      brandName: BRAND_NAME,
      formatRelayAccount: formatRelayAccountLabel,
    });

  const {
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
  } = createRelayActionsController({
    relayUiState,
    relayReloadAllButton,
    relayStatusEl,
    apiBase: API_BASE,
    relayBase: RELAY_BASE,
    brandName: BRAND_NAME,
    relayServiceName: RELAY_SERVICE_NAME,
    relayPollIntervalMs: RELAY_POLL_INTERVAL_MS,
    remoteMessageLimit: REMOTE_MESSAGE_LIMIT,
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
  });

  function applyRelayStatus(status) {
    updateHeroRelayStatus(status);
    electronAPI?.updateRelayStatus?.(status);
    applyRelayPrimaryAction(status);
    if (!relayStatusEl) return;
    updateRelayBanner({
      status,
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn: describeRelayStatusForUi,
      formatRelayAccountFn: formatRelayAccountLabel,
      formatRelativeTime,
      formatDisplayDate,
      formatNumber,
    });
    updateRelayOnboarding({ status, relayOnboardingSteps });
    if (!status) {
      updateFirstRunSetup({ status: null, hasData: Boolean(getDataAvailable?.()) });
      updateSyncProgressFromStatus(null);
      relayStatusEl.textContent = `Relay offline. Open the desktop relay to connect ${BRAND_NAME}.`;
      if (relayAccountEl) relayAccountEl.textContent = "";
      if (relayQrContainer) relayQrContainer.classList.add("hidden");
      if (relayQrImage) relayQrImage.removeAttribute("src");
      if (relayHelpText) {
        relayHelpText.textContent =
          "Press Connect, scan the QR code from Linked Devices, then choose a chat from “Loaded chats”.";
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
        "Open Relay Controls, scan the QR code, then choose a chat from “Loaded chats”.",
      );
      setDataAvailabilityState(false);
      return;
    }

    const description = describeRelayStatusForUi(status);
    relayStatusEl.textContent = description.message;
    if (relayAccountEl) {
      relayAccountEl.textContent = status.account
        ? `Logged in as ${formatRelayAccountLabel(status.account)}`
        : "";
    }
    if (relayHelpText) {
      relayHelpText.textContent =
        status.status === "running"
          ? `Your mirrored ${BRAND_NAME} chats appear under “Loaded chats”. Pick one to view insights.`
          : "Open Linked Devices on your phone and scan the QR code shown here.";
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
    updateFirstRunSetup({ status, hasData: Boolean(getDataAvailable?.()) });

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
        const accountLabel = formatRelayAccountLabel(status.account) || "your account";
        updateStatus(`Connected as ${accountLabel}.`, "success");
        relayUiState.lastStatusKind = "running";
      }
    } else {
      setRemoteChatList([]);
      refreshChatSelector();
      setDashboardLoadingState(true);
      if (waiting && relayUiState.lastStatusKind !== "waiting") {
        updateStatus("Scan the QR code to finish linking your phone.", "info");
        relayUiState.lastStatusKind = "waiting";
      } else if (status.status === "starting" && relayUiState.lastStatusKind !== "starting") {
        updateStatus(`Starting ${RELAY_SERVICE_NAME}…`, "info");
        relayUiState.lastStatusKind = "starting";
      }
    }

    updateSyncProgressFromStatus(status);
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
    handleFirstRunOpenRelay,
    handleFirstRunPrimaryAction,
    updateFirstRunSetup,
  };
}
