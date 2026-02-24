import { renderPanelState } from "../ui/panelState.js";

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

  function renderResultsState({ tone = "empty", title = "", message = "", actions = [] } = {}) {
    cancelPendingRender();
    if (insightsEl) {
      renderSearchInsights({ insightsEl, summary: null, resultLimit });
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
      renderResultsState({
        tone: hasRunSearch ? "empty" : "loading",
        title: hasRunSearch ? "No matching messages" : "Search this chat",
        message: hasFilters
          ? "Try different keywords, participants, or dates."
          : "Add keywords, participant, or date filters to find messages.",
        actions: hasFilters ? [{ id: "clear-search-filters", label: "Clear filters" }] : [],
      });
      renderSearchInsights({ insightsEl, summary: null, resultLimit });
      resultsRenderCacheKey = nextRenderCacheKey;
      return;
    }

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
      resultsRenderCacheKey = nextRenderCacheKey;
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
      resultsRenderCacheKey = nextRenderCacheKey;
    };
    renderBatch();
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
