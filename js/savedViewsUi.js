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
import {
  readPrimeSelectBridgeValue,
  syncPrimeSelectBridge,
} from "./vue/primeSelectBridge.js";

export function createSavedViewsUiController({
  elements,
  deps,
}) {
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
    const previous = selectedId ?? readPrimeSelectBridgeValue(select);
    const optionModels = [
      { value: "", label: placeholder },
      ...views.map(view => ({
        value: view.id,
        label: `${view.name} · ${view.rangeLabel}`,
      })),
    ];
    select.textContent = "";
    optionModels.forEach(option => {
      const optionEl = select.ownerDocument.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      select.appendChild(optionEl);
    });
    const targetValue = previous ?? "";
    select.value = targetValue;
    if (select.value !== targetValue) {
      select.value = "";
    }
    syncPrimeSelectBridge({
      selectEl: select,
      options: optionModels,
      value: select.value,
      disabled: !dataAvailableGetter(),
      keepDetachedNativeValueSynced: false,
      vueRuntime,
    });
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

  function refreshUI({ preferredListSelection = null } = {}) {
    const views = getSavedViews();
    const compareSelection = getCompareSelection();
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
    populateSavedSelect(
      listSelect,
      views,
      preferredListSelection ?? readPrimeSelectBridgeValue(listSelect),
      "Choose a saved view…",
    );
    populateSavedSelect(compareSelectA, views, primary, "Select view A…");
    populateSavedSelect(compareSelectB, views, secondary, "Select view B…");

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
