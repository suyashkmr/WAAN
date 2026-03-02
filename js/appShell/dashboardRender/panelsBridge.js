// @ts-check

/**
 * @template T
 * @param {string} method
 * @param {T} payload
 * @param {() => void} fallback
 */
export function renderWithDashboardPanelsBridge(method, payload, fallback) {
  /** @type {(typeof globalThis) & { __WAAN_VUE_DASHBOARD_PANELS_BRIDGE__?: Record<string, unknown> }} */
  const globalScope = globalThis;
  const bridge = globalScope.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__ ?? null;
  const handler = bridge?.[method];
  if (typeof handler === "function") {
    const handled = handler(payload);
    if (handled) return;
  }
  fallback();
}
