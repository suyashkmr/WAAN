/**
 * @param {Record<string, (event?: any) => any>} delegatedExportHandlers
 */
export function createDelegatedExportFallbackHandler(delegatedExportHandlers) {
  /**
   * @param {MouseEvent} event
   */
  return event => {
    const target = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target : null);
    const button = /** @type {HTMLElement | null} */ (target?.closest?.("button[id]"));
    if (!button) return;
    if (button.closest('[data-vue-primitive-mounted="true"]')) return;
    if (button.dataset.eventBindingsBound === "true") return;
    const handler = delegatedExportHandlers[button.id];
    if (typeof handler !== "function") return;
    handler(event);
  };
}
