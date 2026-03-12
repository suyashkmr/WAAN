import { syncPrimeDateBridgeById } from "./primeDateBridge.js";
import { readPrimeSelectBridgeValueById, syncPrimeSelectBridgeById } from "./primeSelectBridge.js";

export function readRegisteredPageControlBridgeValue(ownerDocument, controlKey) {
  if (!ownerDocument) return "";
  if (controlKey === "chat") return readPrimeSelectBridgeValueById(ownerDocument, "chat-selector--primevue");
  if (controlKey === "range") return readPrimeSelectBridgeValueById(ownerDocument, "global-range--primevue");
  return "";
}

export function syncRegisteredPageControlBridge(ownerDocument, controlKey, state = {}) {
  if (!ownerDocument) return false;
  if (controlKey === "chat") {
    return syncPrimeSelectBridgeById({
      ownerDocument,
      bridgeId: "chat-selector--primevue",
      options: state.chatOptions,
      value: state.chatValue ?? "",
      disabled: state.chatDisabled,
    });
  }
  if (controlKey === "range") {
    return syncPrimeSelectBridgeById({
      ownerDocument,
      bridgeId: "global-range--primevue",
      options: state.rangeOptions,
      value: state.rangeValue ?? "all",
      disabled: state.rangeDisabled,
    });
  }
  if (controlKey === "customStart") {
    return syncPrimeDateBridgeById({
      ownerDocument,
      bridgeId: "custom-start--primevue",
      value: state.customStart ?? "",
      disabled: state.customDisabled,
      min: state.customMin,
      max: state.customMax,
    });
  }
  if (controlKey === "customEnd") {
    return syncPrimeDateBridgeById({
      ownerDocument,
      bridgeId: "custom-end--primevue",
      value: state.customEnd ?? "",
      disabled: state.customDisabled,
      min: state.customMin,
      max: state.customMax,
    });
  }
  return false;
}

export function syncBridgeOwnedPageControls(ownerDocument, state = {}) {
  if (!ownerDocument) return false;
  return Boolean([
    syncRegisteredPageControlBridge(ownerDocument, "chat", state),
    syncRegisteredPageControlBridge(ownerDocument, "range", state),
    syncRegisteredPageControlBridge(ownerDocument, "customStart", state),
    syncRegisteredPageControlBridge(ownerDocument, "customEnd", state),
  ].some(Boolean));
}
