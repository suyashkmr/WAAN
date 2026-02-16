export function createStatusUiController({
  statusEl,
  toastContainer,
  autoHideDelayMs = 5000,
  exitDurationMs = 300,
  maxToasts = 4,
}) {
  const toasts = [];
  let statusHideTimer = null;
  let statusExitTimer = null;

  function dismissToast(toast) {
    if (!toast?.isConnected) return;
    toast.classList.add("toast-dismiss");
    setTimeout(() => {
      toast.remove();
      const index = toasts.indexOf(toast);
      if (index >= 0) toasts.splice(index, 1);
    }, 150);
  }

  function showToast(message, tone = "info", { duration = 5000 } = {}) {
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
    if (!statusEl) return;
    statusEl.classList.remove("is-active", "is-exiting", "success", "warning", "error");
    statusEl.classList.add("hidden");
  }

  function beginStatusExit() {
    if (!statusEl) return;
    statusEl.classList.add("is-exiting");
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
    }
    statusExitTimer = window.setTimeout(() => finalizeStatusExit(), exitDurationMs);
  }

  function showStatusMessage(message, tone) {
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
