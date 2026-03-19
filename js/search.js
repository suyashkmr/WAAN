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
  buildResultsSummaryText,
} from "./search/renderUtils.js";
import { logPerfDuration } from "./perf.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./vue/bridgeRegistry.js";
import { UI_COPY } from "./uiCopy.js";

const DEFAULT_RESULT_LIMIT = 200;

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function normalizeWorkerSearchResults(results) {
  if (!Array.isArray(results)) return [];
  const normalized = [];
  results.forEach(result => {
    if (!result || typeof result !== "object") return;
    normalized.push({
      sender: result.sender,
      timestamp: result.timestamp,
      message: result.message ?? "",
      messageSegments: Array.isArray(result.messageSegments) ? result.messageSegments : [],
    });
  });
  return normalized;
}

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
    searchActionsEl,
  } = elements;

  const resultLimit = Number.isFinite(options.resultLimit) ? options.resultLimit : DEFAULT_RESULT_LIMIT;
  const now = typeof options.now === "function" ? options.now : defaultNow;
  const vueRuntime = options.vueRuntime ?? null;
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
    vueRuntime,
  });
  const { populateParticipants, resetParticipantOptionsCache, syncParticipantBridgeState } = participantUiController;
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
        handleStateAction: actionId => {
      if (actionId === "clear-search-filters") {
        resetFilters(false);
        updateStatus(UI_COPY.search.clearedStatus, "info");
        return;
      }
      if (actionId === "retry-search") {
        handleSubmit({
          preventDefault() {},
        });
      }
    },
  });
  const {
    renderResults,
    resetResultsRenderCache,
    renderLoadingState,
    renderErrorState,
    clearStateOverride,
  } = resultsUiController;

  function applyStateToForm() {
    applySearchStateToInputs({
      state: getSearchState(),
      keywordInput,
      participantSelect,
      startInput,
      endInput,
    });
    syncParticipantBridgeState();
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
      updateStatus(UI_COPY.search.noDataStatus, "warning");
      clearStateOverride();
      renderErrorState(UI_COPY.search.noDataError);
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
    const startedAt = now();
    let requestId = 0;
    const { requestId: nextRequestId, promise } = searchWorkerClient.runSearchRequest({
      payload: {
        entries,
        datasetFingerprint: getDatasetFingerprint(),
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
    renderLoadingState(UI_COPY.search.progressMessage);
    showSearchProgress(entries.length);

    return promise
      .then(payload => {
        if (!payload || payload.cancelled) return;
        const { results, total, summary } = payload;
        if (requestId !== activeSearchRequest) return;
        clearStateOverride();
        hideSearchProgress();
        setSearchResults(
          normalizeWorkerSearchResults(results),
          total,
          summary,
          { hasFilters: requestHasFilters },
        );
        renderResults();
        if (!total) {
          updateStatus(
            requestHasFilters ? UI_COPY.search.noMatchesSummary : UI_COPY.search.noMessagesSummary,
            "info",
          );
        } else if (requestHasFilters && total > requestLimit) {
          updateStatus(
            UI_COPY.search.limitedSummary(formatNumber(requestLimit), formatNumber(total)),
            "info",
          );
        } else {
          updateStatus(UI_COPY.search.matchesSummary(total, formatNumber(total)), "success");
        }
        const finishedAt = now();
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
        updateStatus(UI_COPY.search.errorStatus, "error");
        clearStateOverride();
        renderErrorState(UI_COPY.search.errorMessage);
        const finishedAt = now();
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
    syncParticipantBridgeState();
    resetResultsRenderCache();
    clearStateOverride();
    resetParticipantOptionsCache();
    renderResults();
    if (showToast) updateStatus(UI_COPY.search.clearedStatus, "info");
  }

  function handleReset(event) {
    event?.preventDefault();
    resetFilters(true);
  }

  function resetState() {
    resetFilters(false);
  }

  function init() {
    const searchSavedBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved);
    const searchActionsVueManaged = searchActionsEl?.dataset?.vuePrimitiveMounted === "true";
    const searchFormVueManaged = form?.dataset?.vueSubmitManaged === "true";
    const canRegisterSearchBridgeHandlers = Boolean(
      searchSavedBridge && typeof searchSavedBridge.setPanelActionHandlers === "function",
    );
    if (canRegisterSearchBridgeHandlers && (searchActionsVueManaged || searchFormVueManaged)) {
      searchSavedBridge.setPanelActionHandlers({
        "search:run-search": () => handleSubmit({ preventDefault() {} }),
        "search:clear-search-filters": () => handleReset({ preventDefault() {} }),
      });
    }
    if (form && !searchFormVueManaged) form.addEventListener("submit", handleSubmit);
    if (resetButton && !searchActionsVueManaged) resetButton.addEventListener("click", handleReset);
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
