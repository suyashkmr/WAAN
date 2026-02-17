function getRelayPrimaryAction(status, { relayServiceName } = {}) {
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

export function applyRelayPrimaryAction({
  status,
  relayStartButton,
  relayUiState,
  relayServiceName,
}) {
  if (!relayStartButton) return;
  const action = getRelayPrimaryAction(status, { relayServiceName });
  relayUiState.primaryAction = action.id;
  relayStartButton.dataset.relayAction = action.id;
  relayStartButton.textContent = action.label;
  if (action.hint) {
    relayStartButton.setAttribute("title", action.hint);
  } else {
    relayStartButton.removeAttribute("title");
  }
  relayStartButton.disabled = relayUiState.controlsLocked || Boolean(action.disabled);
}
