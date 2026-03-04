import {
  VUE_BRIDGE_NAMES,
  VUE_RUNTIME_REGISTRY_KEY,
  registerVueBridge,
} from "../js/vue/bridgeRegistry.js";

export function installSearchSavedVueBridge(bridge, { globalScope = globalThis } = {}) {
  return registerVueBridge(VUE_BRIDGE_NAMES.searchSaved, bridge, { globalScope });
}

export function installShellVueBridge(bridge, { globalScope = globalThis } = {}) {
  return registerVueBridge(VUE_BRIDGE_NAMES.shell, bridge, { globalScope });
}

export function installSummaryVueBridge(bridge, { globalScope = globalThis } = {}) {
  return registerVueBridge(VUE_BRIDGE_NAMES.summary, bridge, { globalScope });
}

export function installDashboardPanelsVueBridge(bridge, { globalScope = globalThis } = {}) {
  return registerVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, bridge, { globalScope });
}

export function clearVueBridgeRuntime({ globalScope = globalThis } = {}) {
  if (!globalScope) return;
  delete globalScope[VUE_RUNTIME_REGISTRY_KEY];
}
