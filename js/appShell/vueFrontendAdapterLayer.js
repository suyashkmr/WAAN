// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

export const VUE_FRONTEND_ADAPTER_KEY = "__WAAN_VUE_FRONTEND_ADAPTER__";

/**
 * @param {{
 *   stateStore: AnyRecord,
 *   apiBase: string,
 *   relayBase: string,
 *   brandName: string,
 *   relayServiceName: string,
 * }} params
 */
export function createVueFrontendAdapterLayer({
  stateStore,
  apiBase,
  relayBase,
  brandName,
  relayServiceName,
}) {
  const getSnapshot = () =>
    typeof stateStore?.getAppShellUiState === "function"
      ? stateStore.getAppShellUiState()
      : null;

  /** @param {(event: any) => void} callback */
  const subscribe = callback =>
    typeof stateStore?.subscribeAppShellUiState === "function"
      ? stateStore.subscribeAppShellUiState(callback)
      : () => {};

  return {
    meta: {
      brandName,
      relayServiceName,
    },
    appShellState: {
      getSnapshot,
      subscribe,
      actions: {
        /** @param {any} activeChatId */
        setActiveChatId: activeChatId => stateStore?.setAppShellActiveChatId?.(activeChatId),
        /** @param {any} currentRange */
        setCurrentRange: currentRange => stateStore?.setAppShellCurrentRange?.(currentRange),
        /** @param {any} customRange */
        setCustomRange: customRange => stateStore?.setAppShellCustomRange?.(customRange),
        /** @param {any} partial */
        setHourlyFilters: partial => stateStore?.setAppShellHourlyFiltersState?.(partial),
        /** @param {any} partial */
        setWeekdayFilters: partial => stateStore?.setAppShellWeekdayFiltersState?.(partial),
      },
    },
    relayEndpoints: {
      apiBase,
      relayBase,
      chats: `${apiBase}/chats`,
      relayStart: `${relayBase}/relay/start`,
      relayStop: `${relayBase}/relay/stop`,
      relayStatus: `${relayBase}/relay/status`,
      relaySync: `${relayBase}/relay/sync`,
      relayLogout: `${relayBase}/relay/logout`,
      relayLogs: `${relayBase}/relay/logs`,
    },
  };
}

/**
 * @param {{
 *   adapter: AnyRecord,
 *   globalScope?: AnyRecord,
 * }} params
 */
export function installVueFrontendAdapterLayer({
  adapter,
  globalScope = globalThis,
}) {
  if (!globalScope || !adapter) return null;
  globalScope[VUE_FRONTEND_ADAPTER_KEY] = adapter;
  return adapter;
}
