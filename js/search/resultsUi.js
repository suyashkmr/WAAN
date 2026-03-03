import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
import { mountSearchSavedBridge } from "../vue/searchSavedIsland.js";
import { createLegacySearchFallbackRenderer } from "./legacyResultsFallback.js";

export function createSearchResultsUiController({
  resultsSummaryEl,
  resultsListEl,
  insightsEl,
  resultLimit,
  getSearchState,
  getDatasetFingerprint,
  buildSearchRenderCacheKey,
  hasSearchFilters,
  buildResultsSummaryText,
  handleStateAction,
}) {
  let resultsRenderCacheKey = "";
  const legacyFallbackRenderer = createLegacySearchFallbackRenderer({
    resultsListEl,
    insightsEl,
    resultLimit,
    handleStateAction,
  });

  /**
   * @returns {{ renderSearchPanelState?: (payload: any) => boolean, renderSearchResults?: (payload: any) => boolean, renderSearchInsights?: (payload: any) => boolean } | null}
   */
  function getSearchSavedBridge() {
    mountSearchSavedBridge();
    /** @type {{
     *   renderSearchPanelState?: (payload: {
     *     tone?: string,
     *     title?: string,
     *     message?: string,
     *     actions?: Array<{ id?: string, label?: string, disabled?: boolean }>,
     *     onAction?: ((actionId: string) => void),
     *   }) => boolean,
     *   renderSearchResults?: (payload: {
     *     results?: unknown[],
     *     total?: number,
     *     lastRunFiltered?: boolean,
     *   }) => boolean,
     *   renderSearchInsights?: (payload: {
     *     summary?: unknown,
     *     resultLimit?: number,
     *   }) => boolean,
     *   setPanelActionHandlers?: (handlers: Record<string, (actionId: string, payload?: any) => void>) => boolean,
     * } | null} */
    return resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved);
  }

  function registerPanelActionHandlers(searchSavedBridge) {
    if (!searchSavedBridge?.setPanelActionHandlers || typeof handleStateAction !== "function") return;
    searchSavedBridge.setPanelActionHandlers({
      "search:retry-search": () => handleStateAction("retry-search"),
      "search:clear-search-filters": () => handleStateAction("clear-search-filters"),
    });
  }

  function cancelPendingRender() {
    // No-op kept for interface parity with loading/error state transitions.
  }

  /**
   * @returns {"bridge"|"fallback"|null}
   */
  function renderResultsState({ tone = "empty", title = "", message = "", actions = [] } = {}) {
    cancelPendingRender();
    const searchSavedBridge = getSearchSavedBridge();
    if (searchSavedBridge) registerPanelActionHandlers(searchSavedBridge);
    if (insightsEl) {
      searchSavedBridge?.renderSearchInsights?.({
        summary: null,
        resultLimit,
      });
      if (!searchSavedBridge?.renderSearchInsights) legacyFallbackRenderer.renderInsights(null);
    }
    if (searchSavedBridge?.renderSearchPanelState) {
      const handled = searchSavedBridge.renderSearchPanelState({
        tone,
        title,
        message,
        actions,
      });
      if (handled) return "bridge";
    }
    return legacyFallbackRenderer.renderState({ tone, title, message, actions }) ? "fallback" : null;
  }

  function renderLoadingState(message = "Searching messages…") {
    renderResultsState({
      tone: "loading",
      title: "Searching messages",
      message,
    });
  }

  function renderErrorState(message = "Search could not complete.") {
    renderResultsState({
      tone: "error",
      title: "Search failed",
      message,
      actions: [{ id: "retry-search", label: "Try again" }],
    });
  }

  function clearStateOverride() {
    cancelPendingRender();
    resultsRenderCacheKey = "";
  }

  function renderResults() {
    if (!resultsSummaryEl || !resultsListEl) return;
    const state = getSearchState();
    const query = state?.query ?? {};
    const results = state?.results ?? [];
    const total = state?.total ?? 0;
    const summary = state?.summary ?? null;
    const hasRunSearch = Boolean(state?.lastRun);
    const lastRunFiltered = Boolean(state?.lastRunHasFilters);
    const datasetFingerprint = getDatasetFingerprint() || "";
    const nextRenderCacheKey = buildSearchRenderCacheKey({
      datasetFingerprint,
      query,
      total,
      results,
      hasRunSearch,
      lastRunFiltered,
      lastRun: state?.lastRun,
      summary,
    });
    if (nextRenderCacheKey === resultsRenderCacheKey) return;

    const hasFilters = hasSearchFilters(query);
    cancelPendingRender();
    const searchSavedBridge = getSearchSavedBridge();
    if (searchSavedBridge) registerPanelActionHandlers(searchSavedBridge);
    resultsSummaryEl.textContent = buildResultsSummaryText({
      hasRunSearch,
      total,
      lastRunFiltered,
      resultsLength: results.length,
      hasFilters,
      resultLimit,
    });

    resultsListEl.innerHTML = "";
    if (!total) {
      const renderedStateSource = renderResultsState({
        tone: hasRunSearch ? "empty" : "loading",
        title: hasRunSearch ? "No matching messages" : "Search this chat",
        message: hasFilters
          ? "Try different keywords, participants, or dates."
          : "Add keywords, participant, or date filters to find messages.",
        actions: hasFilters ? [{ id: "clear-search-filters", label: "Clear filters" }] : [],
      });
      if (renderedStateSource === "bridge") resultsRenderCacheKey = nextRenderCacheKey;
      return;
    }

    if (searchSavedBridge?.renderSearchResults) {
      let handledResults = false;
      try {
        handledResults = Boolean(searchSavedBridge.renderSearchResults({
          results,
          total,
          lastRunFiltered,
        }));
      } catch {
        handledResults = false;
      }
      if (handledResults) {
        const expectedRenderCount = Array.isArray(results) ? results.filter(Boolean).length : 0;
        if (expectedRenderCount > 0 && !resultsListEl.querySelector(".search-result")) {
          handledResults = false;
        }
      }
      if (handledResults) {
        const handledInsights = Boolean(
          searchSavedBridge?.renderSearchInsights?.({
            summary,
            resultLimit,
          }),
        );
        if (!handledInsights) {
          const fallbackInsightsHandled = legacyFallbackRenderer.renderInsights(summary);
          if (fallbackInsightsHandled) {
            resultsRenderCacheKey = nextRenderCacheKey;
          }
          return;
        }
        resultsRenderCacheKey = nextRenderCacheKey;
        return;
      }
    }

    const handledFallbackResults = legacyFallbackRenderer.renderResults({
      results,
      total,
      lastRunFiltered,
    });
    if (handledFallbackResults) legacyFallbackRenderer.renderInsights(summary);
  }

  function resetResultsRenderCache() {
    resultsRenderCacheKey = "";
  }

  return {
    renderResults,
    resetResultsRenderCache,
    renderLoadingState,
    renderErrorState,
    clearStateOverride,
  };
}
