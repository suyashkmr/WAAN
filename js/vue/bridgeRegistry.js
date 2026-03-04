// @ts-check

export const VUE_RUNTIME_REGISTRY_KEY = "__WAAN_VUE_RUNTIME__";

export const VUE_BRIDGE_NAMES = Object.freeze({
  shell: "shell",
  summary: "summary",
  dashboardPanels: "dashboardPanels",
  searchSaved: "searchSaved",
});

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
 * @param {{ globalScope?: any }} [options]
 */
export function resolveVueBridge(bridgeName, { globalScope = globalThis } = {}) {
  if (!globalScope || !bridgeName) return null;
  const runtimeRegistry = ensureVueRuntimeRegistry(globalScope);
  return runtimeRegistry?.bridges?.[bridgeName] ?? null;
}

/**
 * @param {string} bridgeName
 * @param {Record<string, any>} bridge
 * @param {{ globalScope?: any }} [options]
 */
export function registerVueBridge(bridgeName, bridge, { globalScope = globalThis } = {}) {
  if (!globalScope || !bridgeName || !bridge) return null;
  const runtimeRegistry = ensureVueRuntimeRegistry(globalScope);
  if (!runtimeRegistry) return null;
  runtimeRegistry.bridges[bridgeName] = bridge;
  return bridge;
}
