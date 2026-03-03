/**
 * @returns {{
 *   dispatchPanelAction: (actionKey: string) => void,
 *   setPanelActionHandlers: (handlers: Record<string, (actionId: string) => void>) => boolean,
 * }}
 */
export function createPanelActionDispatcher() {
  /** @type {Record<string, (actionId: string) => void>} */
  const panelActionHandlers = {};

  /**
   * @param {string} actionKey
   */
  function dispatchPanelAction(actionKey) {
    const handler = panelActionHandlers[actionKey];
    if (typeof handler === "function") handler(actionKey);
  }

  /**
   * @param {Record<string, (actionId: string) => void>} handlers
   */
  function setPanelActionHandlers(handlers = {}) {
    Object.entries(handlers).forEach(([actionKey, handler]) => {
      if (typeof handler === "function") {
        panelActionHandlers[actionKey] = handler;
      }
    });
    return true;
  }

  return {
    dispatchPanelAction,
    setPanelActionHandlers,
  };
}
