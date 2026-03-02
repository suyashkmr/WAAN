// @ts-check

/**
 * @param {{
 *   statusEl: HTMLElement | null | undefined,
 *   toastContainer: HTMLElement | null | undefined,
 *   autoHideDelayMs?: number,
 *   exitDurationMs?: number,
 *   maxToasts?: number,
 * }} params
 */
export function createStatusUiController({
  statusEl,
  toastContainer,
  autoHideDelayMs = 5000,
  exitDurationMs = 300,
  maxToasts = 4,
}) {
  const vueBridge =
    typeof globalThis !== "undefined" && globalThis.__WAAN_VUE_SHELL_BRIDGE__
      ? globalThis.__WAAN_VUE_SHELL_BRIDGE__
      : null;

  /** @type {HTMLElement[]} */
  const toasts = [];
  /** @type {number | null} */
  let statusHideTimer = null;
  /** @type {number | null} */
  let statusExitTimer = null;

  /**
   * @param {HTMLElement} toast
   */
  function dismissToast(toast) {
    if (vueBridge?.dismissToast) {
      vueBridge.dismissToast(toast);
      return;
    }
    if (!toast?.isConnected) return;
    toast.classList.add("toast-dismiss");
    setTimeout(() => {
      toast.remove();
      const index = toasts.indexOf(toast);
      if (index >= 0) toasts.splice(index, 1);
    }, 150);
  }

  /**
   * @param {string} message
   * @param {string} [tone]
   * @param {{ duration?: number }} [options]
   */
  function showToast(message, tone = "info", { duration = 5000 } = {}) {
    if (vueBridge?.showToast) {
      vueBridge.showToast(message, tone, { duration, maxToasts });
      return;
    }
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast ${tone}`;
    const body = document.createElement("div");
    body.className = "toast-message";
    body.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "x";
    close.addEventListener("click", () => dismissToast(toast));
    toast.appendChild(body);
    toast.appendChild(close);
    toastContainer.appendChild(toast);
    toasts.push(toast);
    while (toasts.length > maxToasts) {
      const expired = toasts.shift();
      expired?.remove();
    }
    setTimeout(() => dismissToast(toast), duration);
  }

  function finalizeStatusExit() {
    if (vueBridge?.finalizeStatusExit) {
      vueBridge.finalizeStatusExit();
      return;
    }
    if (!statusEl) return;
    statusEl.classList.remove("is-active", "is-exiting", "success", "warning", "error");
    statusEl.classList.add("hidden");
  }

  function beginStatusExit() {
    if (vueBridge?.beginStatusExit) {
      vueBridge.beginStatusExit(exitDurationMs);
      return;
    }
    if (!statusEl) return;
    statusEl.classList.add("is-exiting");
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
    }
    statusExitTimer = window.setTimeout(() => finalizeStatusExit(), exitDurationMs);
  }

  /**
   * @param {string} message
   * @param {string | null | undefined} tone
   */
  function showStatusMessage(message, tone) {
    if (vueBridge?.showStatusMessage) {
      vueBridge.showStatusMessage(message, tone, { autoHideDelayMs, exitDurationMs });
      return;
    }
    if (!statusEl) return;
    statusEl.classList.remove("hidden", "is-exiting", "success", "warning", "error");
    if (tone) {
      statusEl.classList.add(tone);
    }
    statusEl.textContent = message;
    if (statusHideTimer) {
      clearTimeout(statusHideTimer);
      statusHideTimer = null;
    }
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
      statusExitTimer = null;
    }
    requestAnimationFrame(() => {
      statusEl.classList.add("is-active");
    });
    statusHideTimer = window.setTimeout(() => beginStatusExit(), autoHideDelayMs);
  }

  return {
    showToast,
    dismissToast,
    showStatusMessage,
    beginStatusExit,
    finalizeStatusExit,
  };
}
