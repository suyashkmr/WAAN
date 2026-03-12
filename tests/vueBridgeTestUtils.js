import {
  VUE_BRIDGE_NAMES,
  VUE_RUNTIME_REGISTRY_KEY,
  registerVueBridge,
} from "../js/vue/bridgeRegistry.js";
import { vi } from "vitest";

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

export function installVueRuntimeRegistry(bridges, { globalScope = globalThis } = {}) {
  if (!globalScope) return null;
  globalScope[VUE_RUNTIME_REGISTRY_KEY] = {
    bridges: {
      ...(bridges || {}),
    },
  };
  return globalScope[VUE_RUNTIME_REGISTRY_KEY];
}

export function createShellBridgeHarness(overrides = {}) {
  /** @type {Record<string, Function>} */
  let shellActionHandlers = {};
  const shellBridge = {
    setShellActionHandlers: vi.fn(handlersMap => {
      shellActionHandlers = handlersMap || {};
      return true;
    }),
    dispatchShellAction: vi.fn(),
    ...overrides,
  };
  return {
    shellBridge,
    getShellActionHandlers: () => shellActionHandlers,
  };
}

export function createDashboardPanelsBridgeStub(overrides = {}) {
  return {
    ownsParticipantInteractions: true,
    ownsActivityFilterInteractions: true,
    setPanelActionHandlers: vi.fn(() => true),
    ...overrides,
  };
}
