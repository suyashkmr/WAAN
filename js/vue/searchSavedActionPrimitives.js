import { renderActionButton } from "./primevueRenderPrimitives.js";
import { configurePrimeVueApp } from "./primevueApp.js";

/**
 * @param {{
 *   button: HTMLElement | null | undefined,
 *   actionKey: string,
 *   dispatchPanelAction: (actionKey: string, payload?: any) => void,
 * }} params
 */
function bindPanelActionButton({ button, actionKey, dispatchPanelAction }) {
  if (!button || button.dataset.vuePrimitiveMounted === "true") return;
  button.addEventListener("click", event => {
    event?.preventDefault?.();
    dispatchPanelAction(actionKey);
  });
  button.dataset.vuePrimitiveMounted = "true";
  button.dataset.vueManaged = "true";
}

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

/**
 * @param {{
 *   globalScope?: any,
 *   dispatchPanelAction: (actionKey: string, payload?: any) => void,
 * }} params
 */
export function mountSavedViewsActionPrimitives({ globalScope = globalThis, dispatchPanelAction }) {
  const doc = globalScope?.document ?? null;
  bindPanelActionButton({
    button: doc?.getElementById?.("save-view") ?? null,
    actionKey: "savedViews:save-view",
    dispatchPanelAction,
  });
  bindPanelActionButton({
    button: doc?.getElementById?.("apply-saved-view") ?? null,
    actionKey: "savedViews:apply-selected-view",
    dispatchPanelAction,
  });
  bindPanelActionButton({
    button: doc?.getElementById?.("delete-saved-view") ?? null,
    actionKey: "savedViews:delete-selected-view",
    dispatchPanelAction,
  });
  bindPanelActionButton({
    button: doc?.getElementById?.("compare-views") ?? null,
    actionKey: "savedViews:compare-views",
    dispatchPanelAction,
  });
}
