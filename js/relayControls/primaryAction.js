// @ts-check
import { UI_COPY } from "../uiCopy.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

/**
 * @typedef {Object} RelayStatus
 * @property {string} [status]
 * @property {string | null} [lastError]
 */

/**
 * @typedef {Object} RelayPrimaryAction
 * @property {"connect" | "reconnect" | "resync" | "waiting" | "starting"} id
 * @property {string} label
 * @property {string} hint
 * @property {boolean} disabled
 */

/**
 * @param {RelayStatus | null | undefined} status
 * @param {{ relayServiceName?: string }} [options]
 * @returns {RelayPrimaryAction}
 */
function getRelayPrimaryAction(status, { relayServiceName } = {}) {
  /** @type {RelayPrimaryAction} */
  const defaultAction = {
    id: "connect",
    label: UI_COPY.relay.primaryAction.startLabel,
    hint: UI_COPY.relay.primaryAction.startHint,
    disabled: false,
  };
  if (!status) return defaultAction;
  const state = status.status;
  if (status.lastError || state === "error") {
    return {
      id: "reconnect",
      label: UI_COPY.relay.primaryAction.reconnectLabel,
      hint: UI_COPY.relay.primaryAction.reconnectHint,
      disabled: false,
    };
  }
  if (state === "running") {
    return {
      id: "resync",
      label: UI_COPY.relay.primaryAction.resyncLabel,
      hint: UI_COPY.relay.primaryAction.resyncHint,
      disabled: false,
    };
  }
  if (state === "waiting_qr") {
    return {
      id: "waiting",
      label: UI_COPY.relay.primaryAction.waitingLabel,
      hint: UI_COPY.relay.primaryAction.waitingHint,
      disabled: true,
    };
  }
  if (state === "starting") {
    return {
      id: "starting",
      label: UI_COPY.relay.primaryAction.startingLabel,
      hint: UI_COPY.relay.primaryAction.startingHint(relayServiceName),
      disabled: true,
    };
  }
  return defaultAction;
}

/**
 * @param {{
 *   status: RelayStatus | null | undefined,
 *   relayStartButton: HTMLButtonElement | null | undefined,
 *   relayUiState: { controlsLocked: boolean, primaryAction?: string },
 *   relayServiceName?: string,
 * }} params
 */
export function applyRelayPrimaryAction({
  status,
  relayStartButton,
  relayUiState,
  relayServiceName,
}) {
  const action = getRelayPrimaryAction(status, { relayServiceName });
  relayUiState.primaryAction = action.id;
  const buttonDisabled = relayUiState.controlsLocked || Boolean(action.disabled);

  /** @type {{ updateRelayControlButtons?: (payload: any) => void } | null} */
  const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
  if (shellBridge?.updateRelayControlButtons) {
    shellBridge.updateRelayControlButtons({
      start: {
        action: action.id,
        label: action.label,
        title: action.hint || "",
        disabled: buttonDisabled,
      },
    });
    return;
  }
  if (!relayStartButton) return;
  relayStartButton.dataset.relayAction = action.id;
  relayStartButton.textContent = action.label;
  if (action.hint) {
    relayStartButton.setAttribute("title", action.hint);
  } else {
    relayStartButton.removeAttribute("title");
  }
  relayStartButton.disabled = buttonDisabled;
}
