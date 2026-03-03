import { mountSummaryIsland } from "./summaryIsland.js";
import { mountShellPrimitivesIsland } from "./shellPrimitivesIsland.js";
import { mountDashboardPanelsIsland } from "./dashboardPanelsIsland.js";
import { mountSearchSavedBridge } from "./searchSavedIsland.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./bridgeRegistry.js";

export const VUE_APP_SHELL_ROOT_KEY = "__WAAN_VUE_APP_SHELL_ROOT__";

/**
 * @param {{ globalScope?: any }} [params]
 */
export function mountVueAppShellRoot({ globalScope = globalThis } = {}) {
  if (!globalScope || typeof globalScope.document === "undefined") return null;
  if (globalScope[VUE_APP_SHELL_ROOT_KEY]?.mounted) {
    return globalScope[VUE_APP_SHELL_ROOT_KEY];
  }

  const existingState = globalScope[VUE_APP_SHELL_ROOT_KEY];
  const rootState = existingState && typeof existingState === "object"
    ? existingState
    : {
        mounted: false,
        mountedAt: 0,
        attempts: 0,
        lastAttemptAt: 0,
      };

  const mountSteps = [
    ["summary", mountSummaryIsland],
    ["shell", mountShellPrimitivesIsland],
    ["dashboardPanels", mountDashboardPanelsIsland],
    ["searchSaved", mountSearchSavedBridge],
  ];
  let hadMountError = false;

  mountSteps.forEach(([name, step]) => {
    try {
      step({ globalScope });
    } catch (error) {
      hadMountError = true;
      globalScope.console?.warn?.(`Vue app-shell root: ${name} mount failed; retaining fallback behavior.`, error);
    }
  });

  const requiredBridges = [
    VUE_BRIDGE_NAMES.summary,
    VUE_BRIDGE_NAMES.shell,
    VUE_BRIDGE_NAMES.dashboardPanels,
    VUE_BRIDGE_NAMES.searchSaved,
  ];
  const allBridgesReady = requiredBridges.every(bridgeName =>
    Boolean(resolveVueBridge(bridgeName, { globalScope })),
  );
  const mountedNow = allBridgesReady && !hadMountError;
  const now = Date.now();

  rootState.attempts = Number(rootState.attempts || 0) + 1;
  rootState.lastAttemptAt = now;
  rootState.mounted = mountedNow;
  if (mountedNow) {
    rootState.mountedAt = now;
  }
  globalScope[VUE_APP_SHELL_ROOT_KEY] = rootState;
  return rootState;
}
