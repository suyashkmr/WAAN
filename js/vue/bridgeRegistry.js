// @ts-check

export const VUE_RUNTIME_REGISTRY_KEY = "__WAAN_VUE_RUNTIME__";

export const VUE_BRIDGE_NAMES = Object.freeze({
  shell: "shell",
  summary: "summary",
  dashboardPanels: "dashboardPanels",
  searchSaved: "searchSaved",
});

export const LEGACY_VUE_BRIDGE_GLOBAL_KEYS = Object.freeze({
  [VUE_BRIDGE_NAMES.shell]: "__WAAN_VUE_SHELL_BRIDGE__",
  [VUE_BRIDGE_NAMES.summary]: "__WAAN_VUE_SUMMARY_BRIDGE__",
  [VUE_BRIDGE_NAMES.dashboardPanels]: "__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__",
  [VUE_BRIDGE_NAMES.searchSaved]: "__WAAN_VUE_SEARCH_SAVED_BRIDGE__",
});
/** @type {Record<string, string>} */
const legacyBridgeGlobalKeys = LEGACY_VUE_BRIDGE_GLOBAL_KEYS;

/**
 * @param {any} globalScope
 */
function ensureVueRuntimeRegistry(globalScope) {
  if (!globalScope) return null;
  if (!globalScope[VUE_RUNTIME_REGISTRY_KEY] || typeof globalScope[VUE_RUNTIME_REGISTRY_KEY] !== "object") {
    globalScope[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {},
    };
  }
  if (!globalScope[VUE_RUNTIME_REGISTRY_KEY].bridges || typeof globalScope[VUE_RUNTIME_REGISTRY_KEY].bridges !== "object") {
    globalScope[VUE_RUNTIME_REGISTRY_KEY].bridges = {};
  }
  return globalScope[VUE_RUNTIME_REGISTRY_KEY];
}

/**
 * @param {string} bridgeName
 * @param {{ globalScope?: any, legacyGlobalKey?: string }} [options]
 */
export function resolveVueBridge(bridgeName, { globalScope = globalThis, legacyGlobalKey } = {}) {
  if (!globalScope || !bridgeName) return null;
  const resolvedLegacyKey = legacyGlobalKey || legacyBridgeGlobalKeys[bridgeName];
  if (resolvedLegacyKey && globalScope[resolvedLegacyKey]) {
    return globalScope[resolvedLegacyKey];
  }
  const runtimeRegistry = ensureVueRuntimeRegistry(globalScope);
  return runtimeRegistry?.bridges?.[bridgeName] ?? null;
}

/**
 * @param {string} bridgeName
 * @param {Record<string, any>} bridge
 * @param {{ globalScope?: any, legacyGlobalKey?: string }} [options]
 */
export function registerVueBridge(bridgeName, bridge, { globalScope = globalThis, legacyGlobalKey } = {}) {
  if (!globalScope || !bridgeName || !bridge) return null;
  const runtimeRegistry = ensureVueRuntimeRegistry(globalScope);
  if (!runtimeRegistry) return null;
  runtimeRegistry.bridges[bridgeName] = bridge;
  const resolvedLegacyKey = legacyGlobalKey || legacyBridgeGlobalKeys[bridgeName];
  if (resolvedLegacyKey) {
    globalScope[resolvedLegacyKey] = bridge;
  }
  return bridge;
}
