// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../../vue/bridgeRegistry.js";

/**
 * @template T
 * @param {string} method
 * @param {T} payload
 * @returns {boolean}
 */
export function renderWithDashboardPanelsBridge(method, payload) {
  /** @type {Record<string, unknown> | null} */
  const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels);
  const handler = bridge?.[method];
  if (typeof handler !== "function") return false;
  return Boolean(handler(payload));
}
