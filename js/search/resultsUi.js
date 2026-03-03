import { renderPanelState } from "../ui/panelState.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

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
  buildSearchResultItem,
  renderSearchInsights,
  handleStateAction,
}) {
  let resultsRenderCacheKey = "";
  let renderToken = 0;

  /**
   * @returns {{ renderSearchPanelState?: (payload: any) => boolean, renderSearchResults?: (payload: any) => boolean, renderSearchInsights?: (payload: any) => boolean } | null}
   */
  function getSearchSavedBridge() {
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
    renderToken += 1;
  }

  function appendNoticeIfNeeded({ resultsListEl, lastRunFiltered, total, renderedCount }) {
    if (lastRunFiltered && total > renderedCount) {
      const note = document.createElement("div");
      note.className = "search-results-empty";
      note.textContent = "Narrow your filters to see more matches.";
      resultsListEl.appendChild(note);
    }
  }

  function renderResultsLegacy({
    results,
    total,
    summary,
    lastRunFiltered,
    activeRenderToken,
    onComplete,
  }) {
    if (results.length <= 120) {
      const fragment = document.createDocumentFragment();
      results.forEach(result => {
        fragment.appendChild(buildSearchResultItem(result));
      });
      if (activeRenderToken !== renderToken) return;
      resultsListEl.appendChild(fragment);
      appendNoticeIfNeeded({
        resultsListEl,
        lastRunFiltered,
        total,
        renderedCount: results.length,
      });
      renderSearchInsights({ insightsEl, summary, resultLimit });
      if (typeof onComplete === "function") onComplete();
      return;
    }

    const batchSize = 40;
    let index = 0;
    const renderBatch = () => {
      if (activeRenderToken !== renderToken) return;
      const fragment = document.createDocumentFragment();
      const end = Math.min(index + batchSize, results.length);
      for (let cursor = index; cursor < end; cursor += 1) {
        fragment.appendChild(buildSearchResultItem(results[cursor]));
      }
      resultsListEl.appendChild(fragment);
      index = end;
      if (index < results.length) {
        setTimeout(renderBatch, 0);
        return;
      }
      appendNoticeIfNeeded({
        resultsListEl,
        lastRunFiltered,
        total,
        renderedCount: results.length,
      });
      renderSearchInsights({ insightsEl, summary, resultLimit });
      if (typeof onComplete === "function") onComplete();
    };
    renderBatch();
  }

  function renderResultsState({ tone = "empty", title = "", message = "", actions = [] } = {}) {
    cancelPendingRender();
    const searchSavedBridge = getSearchSavedBridge();
    registerPanelActionHandlers(searchSavedBridge);
    if (insightsEl) {
      const handledInsights = Boolean(
        searchSavedBridge?.renderSearchInsights?.({
          summary: null,
          resultLimit,
        }),
      );
      if (!handledInsights) {
        renderSearchInsights({ insightsEl, summary: null, resultLimit });
      }
    }
    if (searchSavedBridge?.renderSearchPanelState) {
      const handled = searchSavedBridge.renderSearchPanelState({
        tone,
        title,
        message,
        actions,
      });
      if (handled) return true;
    }
    renderPanelState({
      container: resultsListEl,
      tone,
      title,
      message,
      actions,
      onAction: actionId => {
        if (typeof handleStateAction === "function") handleStateAction(actionId);
      },
    });
    return true;
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
    const activeRenderToken = renderToken;
    const searchSavedBridge = getSearchSavedBridge();
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
      const renderedState = renderResultsState({
        tone: hasRunSearch ? "empty" : "loading",
        title: hasRunSearch ? "No matching messages" : "Search this chat",
        message: hasFilters
          ? "Try different keywords, participants, or dates."
          : "Add keywords, participant, or date filters to find messages.",
        actions: hasFilters ? [{ id: "clear-search-filters", label: "Clear filters" }] : [],
      });
      if (renderedState) resultsRenderCacheKey = nextRenderCacheKey;
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
          renderSearchInsights({ insightsEl, summary, resultLimit });
        }
        resultsRenderCacheKey = nextRenderCacheKey;
        return;
      }
    }

    renderResultsLegacy({
      results,
      total,
      summary,
      lastRunFiltered,
      activeRenderToken,
      onComplete: () => {
        resultsRenderCacheKey = nextRenderCacheKey;
      },
    });
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
