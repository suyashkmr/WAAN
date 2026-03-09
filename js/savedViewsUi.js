import {
  formatNumber,
  formatFloat,
  sanitizeText,
} from "./utils.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./vue/bridgeRegistry.js";
import {
  formatSavedViewTopHour,
  buildSavedViewCardModel,
} from "./savedViewsCards.js";
import { buildSavedViewsComparisonPayload } from "./savedViewsComparisonPayload.js";

export function createSavedViewsUiController({
  elements,
  deps,
}) {
  const vueMountedSelects = new WeakSet();
  const {
    nameInput,
    saveButton,
    listSelect,
    applyButton,
    deleteButton,
    gallery,
    compareSelectA,
    compareSelectB,
    compareButton,
    compareSummaryEl,
  } = elements;
  const {
    getSavedViews,
    getCompareSelection,
    setCompareSelection,
    getSavedViewById,
    ensureViewSnapshot,
    formatSavedViewRange,
    dataAvailableGetter,
    onPanelAction,
    vueRuntime = null,
  } = deps;

  /**
   * @returns {{
   *   renderSavedViewsPanelState?: (payload: any) => boolean,
   *   renderSavedViewsGallery?: (payload: any) => boolean,
   *   renderSavedViewsComparison?: (payload: any) => boolean,
   * } | null}
   */
  function getSearchSavedBridge() {
    /** @type {{
     *   renderSavedViewsPanelState?: (payload: {
     *     tone?: string,
     *     title?: string,
     *     message?: string,
     *     actions?: Array<{ id?: string, label?: string, disabled?: boolean }>,
     *     onAction?: ((actionId: string) => void),
     *   }) => boolean,
     *   renderSavedViewsGallery?: (payload: {
     *     cards?: Array<Record<string, any>>,
     *     interactive?: boolean,
     *   }) => boolean,
     *   renderSavedViewsComparison?: (payload: {
     *     empty?: boolean,
     *     message?: string,
     *     columns?: Array<Record<string, any>>,
     *   }) => boolean,
     *   setPanelActionHandlers?: (handlers: Record<string, (actionId: string, payload?: any) => void>) => boolean,
     * } | null} */
    return resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved);
  }

  function registerPanelActionHandlers(searchSavedBridge) {
    if (!searchSavedBridge?.setPanelActionHandlers || typeof onPanelAction !== "function") return;
    searchSavedBridge.setPanelActionHandlers({
      "savedViews:save-view": () => onPanelAction("save-view"),
      "savedViews:focus-range": () => onPanelAction("focus-range"),
      "savedViews:apply-selected-view": () => onPanelAction("apply-selected-view"),
      "savedViews:delete-selected-view": () => onPanelAction("delete-selected-view"),
      "savedViews:compare-views": () => onPanelAction("compare-views"),
      "savedViews:apply-view": (_actionId, payload) => onPanelAction("apply-view", payload),
    });
  }

  function renderSavedViewGallery(views) {
    if (!gallery) return;
    const list = Array.isArray(views) ? views : [];
    const activeContext = typeof deps.getActiveViewContext === "function"
      ? deps.getActiveViewContext()
      : {};
    const searchSavedBridge = getSearchSavedBridge();
    registerPanelActionHandlers(searchSavedBridge);
    if (!list.length) {
      const tone = dataAvailableGetter() ? "empty" : "loading";
      const title = dataAvailableGetter() ? "No saved views yet" : "Load a chat to use saved views";
      const message = dataAvailableGetter()
        ? "Save your current filters and chart settings to create a reusable view."
        : "Connect relay and select a chat, then save a view for quick re-apply.";
      const actions = dataAvailableGetter()
        ? [
            { id: "save-view", label: "Save current view" },
            { id: "focus-range", label: "Set time range" },
          ]
        : [];
      if (searchSavedBridge?.renderSavedViewsPanelState) {
        const handled = searchSavedBridge.renderSavedViewsPanelState({
          tone,
          title,
          message,
          actions,
        });
        if (handled) {
          gallery.dataset.interactive = "false";
          return;
        }
      }
      gallery.textContent = "";
      gallery.dataset.interactive = "false";
      return;
    }
    if (searchSavedBridge?.renderSavedViewsGallery) {
      const cards = list
        .map(view => buildSavedViewCardModel(view, activeContext, {
          ensureViewSnapshot,
          formatSavedViewRange,
          dataAvailableGetter,
        }))
        .filter(Boolean);
      const handled = searchSavedBridge.renderSavedViewsGallery({
        cards,
        interactive: dataAvailableGetter(),
      });
      if (handled) return;
    }
    gallery.textContent = "";
    gallery.dataset.interactive = "false";
  }

  function populateSavedSelect(select, views, selectedId, placeholder) {
    if (!select) return;
    const previous = selectedId ?? select.value;
    const VueRuntime = /** @type {any} */ (vueRuntime);
    const canRenderWithVue = Boolean(
      VueRuntime &&
      typeof VueRuntime.h === "function" &&
      typeof VueRuntime.render === "function" &&
      VueRuntime.Fragment,
    );
    if (canRenderWithVue) {
      const { h, render, Fragment } = VueRuntime;
      if (!vueMountedSelects.has(select)) {
        select.textContent = "";
        vueMountedSelects.add(select);
      }
      render(
        h(
          Fragment,
          null,
          [
            h("option", { value: "", key: "__placeholder" }, placeholder),
            ...views.map(view =>
              h(
                "option",
                {
                  value: view.id,
                  selected: view.id === previous,
                  key: view.id,
                },
                `${view.name} · ${view.rangeLabel}`,
              )),
          ],
        ),
        select,
      );
    } else {
      throw new Error("Vue runtime is required for saved view select rendering.");
    }
    if (select.value && !views.some(view => view.id === select.value)) {
      select.value = "";
    }
  }

  function updateControlsDisabled() {
    const disabled = !dataAvailableGetter();
    [nameInput, saveButton, listSelect, applyButton, deleteButton, compareSelectA, compareSelectB, compareButton].forEach(el => {
      if (el) el.disabled = disabled;
    });
  }

  function renderComparisonSummary(primaryId, secondaryId) {
    const args = {
      compareSummaryEl,
      allViews: getSavedViews(),
      selection: getCompareSelection(),
      primaryId,
      secondaryId,
      getSavedViewById,
      ensureViewSnapshot,
      formatSavedViewRange,
      formatTopHourLabel: formatSavedViewTopHour,
      formatNumber,
      formatFloat,
      sanitizeText,
    };
    const searchSavedBridge = getSearchSavedBridge();
    if (compareSummaryEl && searchSavedBridge?.renderSavedViewsComparison) {
      const payload = buildSavedViewsComparisonPayload(args);
      const handled = searchSavedBridge.renderSavedViewsComparison(payload);
      if (handled) return;
    }
    if (compareSummaryEl) compareSummaryEl.textContent = "";
  }

  function refreshUI() {
    const views = getSavedViews();
    const compareSelection = getCompareSelection();

    populateSavedSelect(listSelect, views, listSelect?.value, "Choose a saved view…");
    populateSavedSelect(compareSelectA, views, compareSelection.primary, "Select view A…");
    populateSavedSelect(compareSelectB, views, compareSelection.secondary, "Select view B…");

    const validPrimary = views.some(view => view.id === compareSelection.primary)
      ? compareSelection.primary
      : null;
    const validSecondary = views.some(view => view.id === compareSelection.secondary)
      ? compareSelection.secondary
      : null;
    let primary = validPrimary;
    let secondary = validSecondary;

    if (views.length >= 2) {
      if (!primary) primary = views[0].id;
      if (!secondary || secondary === primary) {
        const alternate = views.find(view => view.id !== primary);
        secondary = alternate ? alternate.id : null;
      }
    } else {
      primary = primary ?? null;
      secondary = secondary ?? null;
    }

    setCompareSelection(primary, secondary);
    if (compareSelectA) compareSelectA.value = primary ?? "";
    if (compareSelectB) compareSelectB.value = secondary ?? "";

    renderComparisonSummary();
    renderSavedViewGallery(views);
    updateControlsDisabled();
  }

  return {
    refreshUI,
    renderComparisonSummary,
    updateControlsDisabled,
  };
}
