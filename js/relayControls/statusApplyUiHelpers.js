// @ts-check
import { syncWorkspaceRelaySurface } from "../appShell/vueStoreAdapter.js";

/**
 * @param {{
 *   globalScope?: any,
 *   resolveShellBridge: () => any,
 *   relayUiState: { controlsLocked?: boolean },
 *   relayStatusRenderer?: any,
 *   elements: Record<string, any>,
 * }} params
 */
export function createStatusApplyUiHelpers({
  globalScope = globalThis,
  resolveShellBridge,
  relayUiState,
  relayStatusRenderer = null,
  elements,
}) {
  const {
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
    relayBannerActions,
    relayRecoveryReconnectButton,
    relayRecoveryResyncButton,
    relayRecoveryExportButton,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayClearStorageButton,
  } = elements;

  const canRenderStatusSurface = typeof relayStatusRenderer?.renderStatusSurface === "function";

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

  /**
   * @param {{
   *   chatDisabled?: boolean,
   *   rangeDisabled?: boolean,
   *   customDisabled?: boolean,
   *   customVisible?: boolean,
   *   rangeValue?: string,
   *   customStart?: string,
   *   customEnd?: string,
   * }} payload
   */
  function syncWorkspaceReadinessControls(payload = {}) {
    const shellBridge = resolveShellBridge();
    shellBridge?.syncPageControls?.(payload);
    const documentRef = globalScope?.document ?? null;
    const chatSelector = documentRef?.getElementById?.("chat-selector");
    const rangeSelect = documentRef?.getElementById?.("global-range");
    const customControls = documentRef?.getElementById?.("custom-range-controls");
    const customStartInput = documentRef?.getElementById?.("custom-start");
    const customEndInput = documentRef?.getElementById?.("custom-end");
    const customApplyButton = documentRef?.getElementById?.("apply-custom-range");

    if (chatSelector && Object.prototype.hasOwnProperty.call(payload, "chatDisabled")) {
      chatSelector.disabled = Boolean(payload.chatDisabled);
    }
    if (rangeSelect) {
      if (Object.prototype.hasOwnProperty.call(payload, "rangeDisabled")) {
        rangeSelect.disabled = Boolean(payload.rangeDisabled);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "rangeValue")) {
        rangeSelect.value = String(payload.rangeValue ?? "all");
      }
    }
    if (customControls && Object.prototype.hasOwnProperty.call(payload, "customVisible")) {
      customControls.classList.toggle("hidden", !payload.customVisible);
    }
    if (customStartInput) {
      if (Object.prototype.hasOwnProperty.call(payload, "customDisabled")) {
        customStartInput.disabled = Boolean(payload.customDisabled);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "customStart")) {
        customStartInput.value = String(payload.customStart ?? "");
      }
    }
    if (customEndInput) {
      if (Object.prototype.hasOwnProperty.call(payload, "customDisabled")) {
        customEndInput.disabled = Boolean(payload.customDisabled);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "customEnd")) {
        customEndInput.value = String(payload.customEnd ?? "");
      }
    }
    if (customApplyButton && Object.prototype.hasOwnProperty.call(payload, "customDisabled")) {
      customApplyButton.disabled = Boolean(payload.customDisabled);
    }
  }

  /**
   * @param {{ statusText?: string, accountText?: string, helpText?: string, qrSrc?: string | null }} [payload]
   */
  function renderRelayStatusSurface({ statusText = "", accountText = "", helpText = "", qrSrc = null } = {}) {
    syncWorkspaceRelaySurface({ statusText, accountText, helpText, qrSrc });
    if (canRenderStatusSurface) {
      relayStatusRenderer.renderStatusSurface({ statusText, accountText, helpText, qrSrc });
      return;
    }
    if (relayStatusEl) relayStatusEl.textContent = statusText;
    if (relayAccountEl) relayAccountEl.textContent = accountText;
    if (relayHelpText) relayHelpText.textContent = helpText;
    if (relayQrImage) {
      if (qrSrc) relayQrImage.src = qrSrc;
      else relayQrImage.removeAttribute("src");
    }
    setElementVisibility(relayQrContainer, Boolean(qrSrc));
  }

  /**
   * @param {{ stopDisabled: boolean, clearStorageDisabled?: boolean, logoutDisabled?: boolean, reloadAllDisabled: boolean }} payload
   */
  function applyRelayControlButtons({
    stopDisabled,
    clearStorageDisabled = false,
    logoutDisabled = false,
    reloadAllDisabled,
  }) {
    const shellBridge = resolveShellBridge();
    if (shellBridge?.updateRelayControlButtons) {
      shellBridge.updateRelayControlButtons({
        stopDisabled,
        clearStorageDisabled,
        logoutDisabled,
        reloadAllDisabled,
      });
      return;
    }
    if (relayStopButton) relayStopButton.disabled = stopDisabled;
    if (relayClearStorageButton) relayClearStorageButton.disabled = clearStorageDisabled;
    if (relayLogoutButton) relayLogoutButton.disabled = logoutDisabled;
    if (relayReloadAllButton) relayReloadAllButton.disabled = reloadAllDisabled;
  }

  /**
   * @param {any} status
   */
  function shouldShowRecoveryActions(status) {
    if (!status) return true;
    if (status.status === "error" || status.status === "offline" || status.status === "stopped") return true;
    if (status.status !== "running") return false;
    if (status.syncPath === "fallback") return true;
    return Number(status.lastSyncDurationMs) >= 12_000;
  }

  /**
   * @param {any} status
   */
  function updateRecoveryActions(status) {
    const show = shouldShowRecoveryActions(status);
    const running = status?.status === "running";
    const reconnectDisabled = Boolean(relayUiState.controlsLocked) || status?.status === "starting";
    const reconnectTitle = "Restart relay connection and request a fresh status check.";
    const resyncDisabled = Boolean(relayUiState.controlsLocked) || !running || Boolean(status?.syncingChats);
    const resyncTitle = "Run an immediate chat sync to refresh loaded conversations.";
    const exportDisabled = false;
    const exportTitle = "Download relay diagnostics JSON for support or bug reports.";

    const shellBridge = resolveShellBridge();
    if (shellBridge?.updateRelayRecoveryActions) {
      shellBridge.updateRelayRecoveryActions({
        show,
        reconnectDisabled,
        reconnectTitle,
        resyncDisabled,
        resyncTitle,
        exportDisabled,
        exportTitle,
      });
      return;
    }

    if (relayBannerActions) {
      if (show) relayBannerActions.removeAttribute("hidden");
      else relayBannerActions.setAttribute("hidden", "");
    }
    setElementVisibility(relayRecoveryReconnectButton, show);
    setElementVisibility(relayRecoveryResyncButton, show);
    setElementVisibility(relayRecoveryExportButton, show);
    if (relayRecoveryReconnectButton) {
      relayRecoveryReconnectButton.disabled = reconnectDisabled;
      relayRecoveryReconnectButton.title = reconnectTitle;
    }
    if (relayRecoveryResyncButton) {
      relayRecoveryResyncButton.disabled = resyncDisabled;
      relayRecoveryResyncButton.title = resyncTitle;
    }
    if (relayRecoveryExportButton) {
      relayRecoveryExportButton.disabled = exportDisabled;
      relayRecoveryExportButton.title = exportTitle;
    }
  }

  return {
    syncWorkspaceReadinessControls,
    renderRelayStatusSurface,
    applyRelayControlButtons,
    updateRecoveryActions,
  };
}
