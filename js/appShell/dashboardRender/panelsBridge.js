// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../../vue/bridgeRegistry.js";

/**
 * @template T
 * @param {string} method
 * @param {T} payload
 * @param {() => void} fallback
 */
export function renderWithDashboardPanelsBridge(method, payload, fallback) {
  /** @type {Record<string, unknown> | null} */
  const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels);
  const handler = bridge?.[method];
  if (typeof handler === "function") {
    const handled = handler(payload);
    if (handled) return;
  }
  fallback();
}
