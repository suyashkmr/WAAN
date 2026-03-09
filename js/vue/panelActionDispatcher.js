/**
 * @returns {{
 *   dispatchPanelAction: (actionKey: string, payload?: any) => void,
 *   setPanelActionHandlers: (handlers: Record<string, (actionId: string, payload?: any) => void>) => boolean,
 *   hasPanelActionHandler: (actionKey: string) => boolean,
 * }}
 */
export function createPanelActionDispatcher() {
  /** @type {Record<string, (actionId: string, payload?: any) => void>} */
  const panelActionHandlers = {};

  /**
   * @param {string} actionKey
   * @param {any} [payload]
   */
  function dispatchPanelAction(actionKey, payload = null) {
    const handler = panelActionHandlers[actionKey];
    if (typeof handler === "function") handler(actionKey, payload);
  }

  /**
   * @param {Record<string, (actionId: string, payload?: any) => void>} handlers
   */
  function setPanelActionHandlers(handlers = {}) {
    Object.entries(handlers).forEach(([actionKey, handler]) => {
      if (typeof handler === "function") {
        panelActionHandlers[actionKey] = handler;
      }
    });
    return true;
  }

  /**
   * @param {string} actionKey
   */
  function hasPanelActionHandler(actionKey) {
    return typeof panelActionHandlers[actionKey] === "function";
  }

  return {
    dispatchPanelAction,
    setPanelActionHandlers,
    hasPanelActionHandler,
  };
}
