import { renderActionButton } from "./primevueRenderPrimitives.js";
import { configurePrimeVueApp } from "./primevueApp.js";

/**
 * @param {{
 *   globalScope?: any,
 *   dispatchPanelAction: (actionKey: string, payload?: any) => void,
 * }} params
 */
export function mountSearchActionsPrimitive({ globalScope = globalThis, dispatchPanelAction }) {
  const VueRuntime = globalScope?.Vue;
  const actionsEl = globalScope?.document?.querySelector?.("#advanced-search-form .search-actions");
  if (!VueRuntime || !actionsEl) return;
  if (actionsEl.dataset.vuePrimitiveMounted === "true") return;
  const { createApp, h } = VueRuntime;
  if (typeof createApp !== "function" || typeof h !== "function") return;
  const SearchActionsRoot = {
    name: "SearchActionsPrimitive",
    render() {
      return [
        renderActionButton(h, {
          type: "submit",
          className: "ghost-button",
          id: "run-search",
          text: "Search messages",
          onClick: event => {
            event?.preventDefault?.();
            dispatchPanelAction("search:run-search");
          },
        }, globalScope),
        renderActionButton(h, {
          type: "button",
          className: "ghost-button",
          id: "reset-search",
          text: "Clear filters",
          onClick: () => dispatchPanelAction("search:clear-search-filters"),
        }, globalScope),
      ];
    },
  };

  configurePrimeVueApp(createApp(SearchActionsRoot), globalScope).mount(actionsEl);
  actionsEl.dataset.vuePrimitiveMounted = "true";
  actionsEl.dataset.vueManaged = "true";
}
