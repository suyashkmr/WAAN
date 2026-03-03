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
        h(
          "button",
          {
            type: "submit",
            class: "ghost-button",
            id: "run-search",
            onClick: event => {
              event?.preventDefault?.();
              dispatchPanelAction("search:run-search");
            },
          },
          "Search messages",
        ),
        h(
          "button",
          {
            type: "button",
            class: "ghost-button",
            id: "reset-search",
            onClick: () => dispatchPanelAction("search:clear-search-filters"),
          },
          "Clear filters",
        ),
      ];
    },
  };

  createApp(SearchActionsRoot).mount(actionsEl);
  actionsEl.dataset.vuePrimitiveMounted = "true";
  actionsEl.dataset.vueManaged = "true";
}
