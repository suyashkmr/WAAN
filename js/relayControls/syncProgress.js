// @ts-check

/**
 * @param {{
 *   relaySyncProgressEl: HTMLElement | null | undefined,
 *   relaySyncChatsMeta: HTMLElement | null | undefined,
 *   relaySyncMessagesMeta: HTMLElement | null | undefined,
 *   formatNumber: (value: number) => string,
 * }} params
 */
export function createRelaySyncProgressController({
  relaySyncProgressEl,
  relaySyncChatsMeta,
  relaySyncMessagesMeta,
  formatNumber,
}) {
  const relaySyncChatsStep = /** @type {HTMLElement | null} */ (
    relaySyncProgressEl?.querySelector('[data-step="chats"]')
  );
  const relaySyncMessagesStep = /** @type {HTMLElement | null} */ (
    relaySyncProgressEl?.querySelector('[data-step="messages"]')
  );

  const relaySyncUiState = {
    manualActive: false,
    /** @type {any} */
    hideTimer: null,
    wasSyncing: false,
  };

  /**
   * @param {HTMLElement | null | undefined} stepEl
   * @param {HTMLElement | null | undefined} metaEl
   * @param {string} state
   * @param {string} text
   */
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
    if (relaySyncUiState.hideTimer != null) clearTimeout(relaySyncUiState.hideTimer);
    relaySyncUiState.manualActive = true;
    showRelaySyncProgress();
    setSyncStepState(relaySyncChatsStep, relaySyncChatsMeta, "active", "Requesting chat list…");
    setSyncStepState(relaySyncMessagesStep, relaySyncMessagesMeta, "pending", "Waiting to mirror messages…");
  }

  /**
   * @param {number} count
   */
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

  /**
   * @param {{ syncingChats?: boolean, chatCount?: number } | null | undefined} status
   */
  function updateSyncProgressFromStatus(status) {
    if (!relaySyncProgressEl) return;
    const syncing = Boolean(status?.syncingChats);
    if (syncing) {
      if (relaySyncUiState.hideTimer != null) clearTimeout(relaySyncUiState.hideTimer);
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
