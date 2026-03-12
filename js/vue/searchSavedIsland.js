import {
  VUE_BRIDGE_NAMES,
  registerVueBridge,
  resolveVueBridge,
} from "./bridgeRegistry.js";
import { createPanelActionDispatcher } from "./panelActionDispatcher.js";
import {
  mountSavedViewsActionPrimitives,
  mountSearchActionsPrimitive,
  mountSearchSavedSelectSeedPrimitives,
} from "./searchSavedActionPrimitives.js";
import {
  renderPanelStateWithVue,
  renderSearchResultsWithVue,
  renderSearchInsightsWithVue,
  renderSavedViewsGalleryWithVue,
  renderSavedViewsComparisonWithVue,
} from "./searchSavedRenderers.js";

export function mountSearchSavedBridge({ globalScope = globalThis } = {}) {
  if (!globalScope) return;
  mountSearchSavedSelectSeedPrimitives({ globalScope });
  const existingBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope });
  const shouldReplaceExistingBridge = Boolean(
    existingBridge
      && existingBridge.__waanVueSearchBridge === true
      && existingBridge.__runtimeBoundToVue !== true,
  );
  if (existingBridge && !shouldReplaceExistingBridge) {
    mountSearchActionsPrimitive({ globalScope, dispatchPanelAction: actionKey => existingBridge.dispatchPanelAction?.(actionKey) });
    mountSavedViewsActionPrimitives({ globalScope, dispatchPanelAction: actionKey => existingBridge.dispatchPanelAction?.(actionKey) });
    return;
  }
  const doc = globalScope.document ?? null;
  const vueRuntime = globalScope.Vue;
  const hasRenderableVueRuntime = Boolean(
    vueRuntime
      && typeof vueRuntime.h === "function"
      && typeof vueRuntime.render === "function",
  );
  if (!hasRenderableVueRuntime) return;
  const { dispatchPanelAction, setPanelActionHandlers, hasPanelActionHandler } = createPanelActionDispatcher();
  mountSearchActionsPrimitive({ globalScope, dispatchPanelAction });
  mountSavedViewsActionPrimitives({ globalScope, dispatchPanelAction });

  registerVueBridge(VUE_BRIDGE_NAMES.searchSaved, {
    __waanVueSearchBridge: true,
    __runtimeBoundToVue: true,
    dispatchPanelAction,
    renderSearchPanelState(payload = {}) {
      const container = doc?.getElementById?.("search-results-list") ?? null;
      return renderPanelStateWithVue({
        ...payload,
        dispatchAction: actionId => dispatchPanelAction(`search:${actionId}`),
        container,
        vueRuntime,
      });
    },
    renderSavedViewsPanelState(payload = {}) {
      const container = doc?.getElementById?.("saved-view-gallery") ?? null;
      return renderPanelStateWithVue({
        ...payload,
        dispatchAction: actionId => dispatchPanelAction(`savedViews:${actionId}`),
        container,
        vueRuntime,
      });
    },
    renderSearchResults(payload = {}) {
      const container = doc?.getElementById?.("search-results-list") ?? null;
      return renderSearchResultsWithVue({
        ...payload,
        container,
        vueRuntime,
        globalScope,
      });
    },
    renderSearchInsights(payload = {}) {
      const container = doc?.getElementById?.("search-insights") ?? null;
      return renderSearchInsightsWithVue({
        ...payload,
        container,
        vueRuntime,
        globalScope,
      });
    },
    renderSavedViewsGallery(payload = {}) {
      const container = doc?.getElementById?.("saved-view-gallery") ?? null;
      return renderSavedViewsGalleryWithVue({
        ...payload,
        dispatchAction: (actionId, payloadData = null) =>
          dispatchPanelAction(`savedViews:${actionId}`, payloadData),
        container,
        vueRuntime,
        globalScope,
      });
    },
    renderSavedViewsComparison(payload = {}) {
      const container = doc?.getElementById?.("compare-summary") ?? null;
      return renderSavedViewsComparisonWithVue({
        ...payload,
        container,
        vueRuntime,
        globalScope,
      });
    },
    setPanelActionHandlers,
    hasPanelActionHandler,
  }, { globalScope });
}

try {
  if (typeof globalThis.document !== "undefined") {
    mountSearchSavedBridge();
  }
} catch (error) {
  globalThis.console?.warn?.("Vue search/saved bridge mount failed.", error);
}
