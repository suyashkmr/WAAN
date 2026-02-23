import { describe, it, expect, vi } from "vitest";
import { createRelayUiState, setRelayControlsDisabled } from "../js/relayControls/controllerState.js";

describe("relay controller state helpers", () => {
  it("creates default relay ui state and toggles controls", () => {
    const relayUiState = createRelayUiState();
    const button = document.createElement("button");
    const applyRelayPrimaryAction = vi.fn();

    setRelayControlsDisabled({
      relayUiState,
      disabled: true,
      buttons: [button],
      applyRelayPrimaryAction,
    });
    expect(relayUiState.controlsLocked).toBe(true);
    expect(button.disabled).toBe(true);
    expect(applyRelayPrimaryAction).not.toHaveBeenCalled();

    setRelayControlsDisabled({
      relayUiState,
      disabled: false,
      buttons: [button],
      applyRelayPrimaryAction,
    });
    expect(relayUiState.controlsLocked).toBe(false);
    expect(button.disabled).toBe(false);
    expect(applyRelayPrimaryAction).toHaveBeenCalledWith(null);
  });
});
