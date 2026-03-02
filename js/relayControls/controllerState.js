// @ts-check

/**
 * @typedef {{
 *   status: any,
 *   controlsLocked: boolean,
 *   pollTimer: ReturnType<typeof setTimeout> | null,
 *   pollVisibilityCleanup: (() => void) | null,
 *   lastStatusKind: string | null,
 *   lastAppliedStateKind: string | null,
 *   lastErrorNotice: string | null,
 *   primaryAction: string,
 * }} RelayUiState
 */

/**
 * @returns {RelayUiState}
 */
export function createRelayUiState() {
  return {
    status: null,
    controlsLocked: false,
    pollTimer: null,
    pollVisibilityCleanup: null,
    lastStatusKind: null,
    lastAppliedStateKind: null,
    lastErrorNotice: null,
    primaryAction: "connect",
  };
}

/**
 * @param {{
 *   relayUiState: RelayUiState,
 *   disabled: boolean,
 *   buttons: Array<HTMLButtonElement | null | undefined>,
 *   applyRelayPrimaryAction?: ((status: any) => void) | null,
 * }} params
 */
export function setRelayControlsDisabled({
  relayUiState,
  disabled,
  buttons,
  applyRelayPrimaryAction,
}) {
  relayUiState.controlsLocked = disabled;
  /** @type {(typeof globalThis) & { __WAAN_VUE_SHELL_BRIDGE__?: { updateRelayControlButtons?: (payload: any) => void } }} */
  const globalScope = globalThis;
  const shellBridge = globalScope.__WAAN_VUE_SHELL_BRIDGE__ ?? null;
  if (shellBridge?.updateRelayControlButtons) {
    shellBridge.updateRelayControlButtons({
      start: { disabled: Boolean(disabled) },
      stopDisabled: Boolean(disabled),
      logoutDisabled: Boolean(disabled),
      reloadAllDisabled: Boolean(disabled),
      clearStorageDisabled: Boolean(disabled),
    });
  }
  buttons.forEach(button => {
    if (button) button.disabled = disabled;
  });
  if (!disabled && typeof applyRelayPrimaryAction === "function") {
    applyRelayPrimaryAction(relayUiState.status);
  }
}
