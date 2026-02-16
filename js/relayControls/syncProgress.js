export function createRelaySyncProgressController({
  relaySyncProgressEl,
  relaySyncChatsMeta,
  relaySyncMessagesMeta,
  formatNumber,
}) {
  const relaySyncChatsStep = relaySyncProgressEl?.querySelector('[data-step="chats"]');
  const relaySyncMessagesStep = relaySyncProgressEl?.querySelector('[data-step="messages"]');

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

  function handleSyncError() {
    relaySyncUiState.manualActive = false;
    hideRelaySyncProgress();
  }

  return {
    beginManualSyncUi,
    markChatsFetched,
    markMessagesActive,
    updateSyncProgressFromStatus,
    handleSyncError,
  };
}
