import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./bridgeRegistry.js";
import { mountDashboardPanelsIsland } from "./dashboardPanelsIsland.js";

export function createDashboardPanelsBridgeInvoker(globalScope = globalThis) {
  /** @type {any} */
  let dashboardPanelsBridge = null;

  function resolveDashboardPanelsBridge() {
    if (dashboardPanelsBridge) return dashboardPanelsBridge;
    mountDashboardPanelsIsland({ globalScope });
    dashboardPanelsBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope }) ?? null;
    return dashboardPanelsBridge;
  }

  return function renderWithDashboardPanelsBridge(method, payload) {
    const bridge = resolveDashboardPanelsBridge();
    const handler = bridge?.[method];
    if (typeof handler !== "function") return false;
    return Boolean(handler(payload));
  };
}
