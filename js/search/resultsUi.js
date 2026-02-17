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
  let renderToken = 0;

  function appendNoticeIfNeeded({ resultsListEl, lastRunFiltered, total, renderedCount }) {
    if (lastRunFiltered && total > renderedCount) {
      const note = document.createElement("div");
      note.className = "search-results-empty";
      note.textContent = "Narrow your filters to see more matches.";
      resultsListEl.appendChild(note);
    }
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
    renderToken += 1;
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
  };
}
