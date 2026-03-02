// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

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
  /** @type {{ updateRelayControlButtons?: (payload: any) => void } | null} */
  const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
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
