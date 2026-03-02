// @ts-check

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
    label: "Connect relay",
    hint: "Launch the desktop relay and press Connect to sync chats.",
    disabled: false,
  };
  if (!status) return defaultAction;
  const state = status.status;
  if (status.lastError || state === "error") {
    return {
      id: "reconnect",
      label: "Reconnect relay",
      hint: "Restart the relay browser and relink your phone.",
      disabled: false,
    };
  }
  if (state === "running") {
    return {
      id: "resync",
      label: "Resync chats",
      hint: "Fetch the latest chats from the relay.",
      disabled: false,
    };
  }
  if (state === "waiting_qr") {
    return {
      id: "waiting",
      label: "Scan QR to continue",
      hint: "Open chat app -> Linked Devices on your phone to finish linking.",
      disabled: true,
    };
  }
  if (state === "starting") {
    return {
      id: "starting",
      label: "Starting…",
      hint: `Launching ${relayServiceName}…`,
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

  /** @type {(typeof globalThis) & { __WAAN_VUE_SHELL_BRIDGE__?: { updateRelayControlButtons?: (payload: any) => void } }} */
  const globalScope = globalThis;
  const shellBridge = globalScope.__WAAN_VUE_SHELL_BRIDGE__ ?? null;
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
