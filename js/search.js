import {
  formatNumber,
} from "./utils.js";
import {
  getDatasetEntries,
  getDatasetFingerprint,
  getSearchState,
  setSearchQuery,
  setSearchResults,
  resetSearchState,
  updateStatus,
} from "./state.js";
import { parseDateInput, hasSearchFilters } from "./search/queryUtils.js";
import {
  buildParticipantOptionsCacheKey,
  buildSearchRenderCacheKey,
} from "./search/cacheKeys.js";
import {
  applySearchStateToInputs,
  readSearchQueryFromInputs,
  resetSearchInputs,
} from "./search/formState.js";
import { createSearchParticipantUiController } from "./search/participantUi.js";
import { createSearchProgressUi } from "./search/progressUi.js";
import { createSearchResultsUiController } from "./search/resultsUi.js";
import { createSearchWorkerClient } from "./search/workerClient.js";
import {
  renderSearchInsights,
  buildSearchResultItem,
  buildResultsSummaryText,
} from "./search/renderUtils.js";
import { logPerfDuration } from "./perf.js";

const DEFAULT_RESULT_LIMIT = 200;

export function createSearchController({ elements = {}, options = {} } = {}) {
  const {
    form,
    keywordInput,
    participantSelect,
    startInput,
    endInput,
    resetButton,
    resultsSummaryEl,
    resultsListEl,
    insightsEl,
    progressEl,
    progressTrackEl,
    progressBarEl,
    progressLabelEl,
  } = elements;

  const resultLimit = Number.isFinite(options.resultLimit) ? options.resultLimit : DEFAULT_RESULT_LIMIT;
  let activeSearchRequest = 0;
  const searchWorkerClient = createSearchWorkerClient();
  const {
    setSearchProgress,
    showSearchProgress,
    hideSearchProgress,
  } = createSearchProgressUi({
    progressEl,
    progressTrackEl,
    progressBarEl,
    progressLabelEl,
    formatNumber,
  });
  const participantUiController = createSearchParticipantUiController({
    participantSelect,
    getEntries,
    getDatasetFingerprint,
    getSearchState,
    buildParticipantOptionsCacheKey,
  });
  const { populateParticipants, resetParticipantOptionsCache } = participantUiController;
  const resultsUiController = createSearchResultsUiController({
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
  });
  const { renderResults, resetResultsRenderCache } = resultsUiController;

  function applyStateToForm() {
    applySearchStateToInputs({
      state: getSearchState(),
      keywordInput,
      participantSelect,
      startInput,
      endInput,
    });
  }

  function getEntries() {
    return getDatasetEntries() || [];
  }

  function cancelActiveSearch() {
    searchWorkerClient.cancelSearchRequest(activeSearchRequest);
    activeSearchRequest = 0;
    hideSearchProgress();
  }

  function runSearch(query) {
    const entries = getEntries();
    if (!entries.length) {
      updateStatus("Load a chat file before searching.", "warning");
      hideSearchProgress();
      return;
    }

    const startDate = parseDateInput(query.start, false);
    const endDate = parseDateInput(query.end, true);
    if (query.start && !startDate) {
      updateStatus("The search start date isn't valid.", "error");
      return;
    }
    if (query.end && !endDate) {
      updateStatus("The search end date isn't valid.", "error");
      return;
    }

    setSearchQuery(query);
    cancelActiveSearch();

    const startBound = startDate ? startDate.getTime() : null;
    const endBound = endDate ? endDate.getTime() : null;
    const requestHasFilters = hasSearchFilters(query);
    const requestLimit = requestHasFilters ? resultLimit : entries.length;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    let requestId = 0;
    const { requestId: nextRequestId, promise } = searchWorkerClient.runSearchRequest({
      payload: {
        entries,
        query,
        resultLimit: requestLimit,
        startMs: startBound,
        endMs: endBound,
      },
      onProgress: data => {
        if (requestId === activeSearchRequest) {
          setSearchProgress(data.scanned ?? 0, data.total ?? entries.length);
        }
      },
    });
    requestId = nextRequestId;
    activeSearchRequest = requestId;
    showSearchProgress(entries.length);

    return promise
      .then(payload => {
        if (!payload || payload.cancelled) return;
        const { results, total, summary } = payload;
        if (requestId !== activeSearchRequest) return;
        hideSearchProgress();
        setSearchResults(
          results.map(result => ({
            sender: result.sender,
            timestamp: result.timestamp,
            message: result.message ?? "",
            messageHtml: result.messageHtml,
          })),
          total,
          summary,
          { hasFilters: requestHasFilters },
        );
        renderResults();
        if (!total) {
          updateStatus(
            requestHasFilters ? "No messages matched those filters." : "This chat doesn't have any messages yet.",
            "info",
          );
        } else if (requestHasFilters && total > requestLimit) {
          updateStatus(
            `Showing the first ${requestLimit} matches out of ${formatNumber(total)}. Narrow your filters for a closer look.`,
            "info",
          );
        } else {
          const prefix = requestHasFilters ? "Found" : "Listed";
          updateStatus(`${prefix} ${formatNumber(total)} messages.`, "success");
        }
        const finishedAt = globalThis.performance?.now?.() ?? Date.now();
        logPerfDuration("search.run", finishedAt - startedAt, {
          entries: entries.length,
          matched: total,
          limited: requestLimit < entries.length,
        });
      })
      .catch(error => {
        if (requestId !== activeSearchRequest) return;
        hideSearchProgress();
        console.error(error);
        updateStatus("Search could not complete.", "error");
        const finishedAt = globalThis.performance?.now?.() ?? Date.now();
        logPerfDuration("search.run.failed", finishedAt - startedAt, {
          entries: entries.length,
          error: error?.message || "unknown",
        });
      });
  }

  function handleSubmit(event) {
    event?.preventDefault();
    const query = readSearchQueryFromInputs({
      keywordInput,
      participantSelect,
      startInput,
      endInput,
    });
    if (query.start && query.end && query.start > query.end) {
      updateStatus("The start date must come before the end date.", "error");
      return;
    }
    runSearch(query);
  }

  function resetFilters(showToast = true) {
    cancelActiveSearch();
    resetSearchState();
    resetSearchInputs({
      keywordInput,
      participantSelect,
      startInput,
      endInput,
    });
    resetResultsRenderCache();
    resetParticipantOptionsCache();
    renderResults();
    if (showToast) updateStatus("Search filters cleared.", "info");
  }

  function handleReset(event) {
    event?.preventDefault();
    resetFilters(true);
  }

  function resetState() {
    resetFilters(false);
  }

  function init() {
    if (form) form.addEventListener("submit", handleSubmit);
    if (resetButton) resetButton.addEventListener("click", handleReset);
    hideSearchProgress();
    applyStateToForm();
    renderResults();
  }

  return {
    init,
    applyStateToForm,
    populateParticipants,
    renderResults,
    resetState,
  };
}
