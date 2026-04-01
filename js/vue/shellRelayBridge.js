/**
 * @param {{ documentRef?: Document | null }} [params]
 */
export function createRelayControlsBridgeMethods({ documentRef = globalThis.document ?? null } = {}) {
  /** @param {any} payload */
  function updateRelayRecoveryActions(payload) {
    const actionsEl = documentRef?.getElementById?.("relay-status-actions");
    const reconnectButton = documentRef?.getElementById?.("relay-recovery-reconnect");
    const resyncButton = documentRef?.getElementById?.("relay-recovery-resync");
    const exportButton = documentRef?.getElementById?.("relay-recovery-export");

    if (actionsEl) {
      if (payload.show) actionsEl.removeAttribute("hidden");
      else actionsEl.setAttribute("hidden", "");
    }

    /** @param {HTMLElement | null} el */
    function setRecoveryVisibility(el) {
      if (!el) return;
      if (payload.show) {
        el.removeAttribute("hidden");
        el.classList.remove("hidden");
      } else {
        el.setAttribute("hidden", "");
        el.classList.add("hidden");
      }
    }

    setRecoveryVisibility(reconnectButton);
    setRecoveryVisibility(resyncButton);
    setRecoveryVisibility(exportButton);

    if (reconnectButton) {
      reconnectButton.disabled = Boolean(payload.reconnectDisabled);
      reconnectButton.title = payload.reconnectTitle || "";
    }
    if (resyncButton) {
      resyncButton.disabled = Boolean(payload.resyncDisabled);
      resyncButton.title = payload.resyncTitle || "";
    }
    if (exportButton) {
      exportButton.disabled = Boolean(payload.exportDisabled);
      exportButton.title = payload.exportTitle || "";
    }
  }

  /** @param {any} payload */
  function updateRelayControlButtons(payload) {
    const startButton = documentRef?.getElementById?.("relay-start");
    const stopButton = documentRef?.getElementById?.("relay-stop");
    const logoutButton = documentRef?.getElementById?.("relay-logout");
    const reloadAllButton = documentRef?.getElementById?.("relay-reload-all");
    const clearStorageButton = documentRef?.getElementById?.("relay-clear-storage");

    if (startButton && payload?.start && typeof payload.start === "object") {
      if (typeof payload.start.action === "string") {
        startButton.dataset.relayAction = payload.start.action;
      }
      if (typeof payload.start.label === "string") {
        startButton.textContent = payload.start.label;
      }
      if (typeof payload.start.title === "string") {
        if (payload.start.title) startButton.setAttribute("title", payload.start.title);
        else startButton.removeAttribute("title");
      }
      if (typeof payload.start.disabled !== "undefined") {
        startButton.disabled = Boolean(payload.start.disabled);
      }
    }
    if (stopButton && typeof payload?.stopDisabled !== "undefined") {
      stopButton.disabled = Boolean(payload.stopDisabled);
    }
    if (logoutButton && typeof payload?.logoutDisabled !== "undefined") {
      logoutButton.disabled = Boolean(payload.logoutDisabled);
    }
    if (reloadAllButton && typeof payload?.reloadAllDisabled !== "undefined") {
      reloadAllButton.disabled = Boolean(payload.reloadAllDisabled);
    }
    if (clearStorageButton && typeof payload?.clearStorageDisabled !== "undefined") {
      clearStorageButton.disabled = Boolean(payload.clearStorageDisabled);
    }
  }

  return {
    updateRelayRecoveryActions,
    updateRelayControlButtons,
  };
}
