import { describe, expect, it } from "vitest";
import { VUE_RUNTIME_REGISTRY_KEY, registerVueBridge } from "../js/vue/bridgeRegistry.js";
import { resetTestUiGlobals } from "./uiTestHarness.js";

describe("ui test harness", () => {
  it("clears bridge runtime and shell bootstrap markers during cleanup", () => {
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {},
    };
    registerVueBridge("summary", { ready: true });
    document.documentElement.dataset.waanDomRefsCaptured = "true";

    resetTestUiGlobals({
      clearBridgeRuntime: true,
      clearDomRefsCaptured: true,
    });

    expect(globalThis[VUE_RUNTIME_REGISTRY_KEY]).toBeUndefined();
    expect(document.documentElement.dataset.waanDomRefsCaptured).toBeUndefined();
  });
});
