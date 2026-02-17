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
}) {
  let resultsRenderCacheKey = "";

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
      const empty = document.createElement("div");
      empty.className = "search-results-empty";
      empty.textContent = hasFilters
        ? "No matching messages. Try other names, words, or dates."
        : "Add filters above to search the chat history.";
      resultsListEl.appendChild(empty);
      renderSearchInsights({ insightsEl, summary: null, resultLimit });
      resultsRenderCacheKey = nextRenderCacheKey;
      return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach(result => {
      fragment.appendChild(buildSearchResultItem(result));
    });
    resultsListEl.appendChild(fragment);

    if (lastRunFiltered && total > results.length) {
      const note = document.createElement("div");
      note.className = "search-results-empty";
      note.textContent = "Narrow your filters to see more matches.";
      resultsListEl.appendChild(note);
    }

    renderSearchInsights({ insightsEl, summary, resultLimit });
    resultsRenderCacheKey = nextRenderCacheKey;
  }

  function resetResultsRenderCache() {
    resultsRenderCacheKey = "";
  }

  return {
    renderResults,
    resetResultsRenderCache,
  };
}
