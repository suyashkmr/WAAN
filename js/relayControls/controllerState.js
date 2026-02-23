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

export function setRelayControlsDisabled({
  relayUiState,
  disabled,
  buttons,
  applyRelayPrimaryAction,
}) {
  relayUiState.controlsLocked = disabled;
  buttons.forEach(button => {
    if (button) button.disabled = disabled;
  });
  if (!disabled && typeof applyRelayPrimaryAction === "function") {
    applyRelayPrimaryAction(relayUiState.status);
  }
}
