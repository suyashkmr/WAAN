// @ts-check

/**
 * @param {{
 *   relaySyncProgressEl: HTMLElement | null | undefined,
 *   relaySyncChatsStep: HTMLElement | null | undefined,
 *   relaySyncMessagesStep: HTMLElement | null | undefined,
 *   relaySyncChatsMeta: HTMLElement | null | undefined,
 *   relaySyncMessagesMeta: HTMLElement | null | undefined,
 *   formatNumber: (value: number) => string,
 * }} params
 */
export function createRelaySyncProgressController({
  relaySyncProgressEl,
  relaySyncChatsStep,
  relaySyncMessagesStep,
  relaySyncChatsMeta,
  relaySyncMessagesMeta,
  formatNumber,
}) {
  /**
   * @param {HTMLElement | null | undefined} el
   * @param {boolean} shouldShow
   */
  function setElementVisibility(el, shouldShow) {
    if (!el) return;
    el.classList.toggle("hidden", !shouldShow);
    if (shouldShow) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  const SLOW_SYNC_THRESHOLD_MS = 12_000;

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
    setElementVisibility(relaySyncProgressEl, true);
  }

  function hideRelaySyncProgress() {
    setElementVisibility(relaySyncProgressEl, false);
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

  /**
   * @param {{ lastSyncDurationMs?: number } | null | undefined} [status]
   */
  function completeSyncUi(status) {
    const slowSyncMs = Number(status?.lastSyncDurationMs);
    const isSlow = Number.isFinite(slowSyncMs) && slowSyncMs >= SLOW_SYNC_THRESHOLD_MS;
    const message = isSlow
      ? `Messages are up to date. Last sync took ${Math.round(slowSyncMs / 1000)}s.`
      : "Messages are up to date.";
    setSyncStepState(relaySyncMessagesStep, relaySyncMessagesMeta, "complete", message);
    relaySyncUiState.hideTimer = setTimeout(() => {
      relaySyncUiState.manualActive = false;
      hideRelaySyncProgress();
    }, 1800);
  }

  /**
   * @param {{ syncingChats?: boolean, chatCount?: number, syncPath?: string, lastSyncDurationMs?: number } | null | undefined} status
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
        status?.syncPath === "fallback"
          ? "Mirroring messages via fallback path… keep the relay open."
          : "Mirroring messages… keep the relay open.",
      );
    } else if (relaySyncUiState.wasSyncing || relaySyncUiState.manualActive) {
      relaySyncUiState.wasSyncing = false;
      completeSyncUi(status);
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
