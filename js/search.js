import {
  formatNumber,
  formatDisplayDate,
  formatTimestampDisplay,
  sanitizeText,
} from "./utils.js";
import {
  getDatasetEntries,
  getSearchState,
  setSearchQuery,
  setSearchResults,
  resetSearchState,
  updateStatus,
} from "./state.js";

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
  let searchWorkerInstance = null;
  let searchWorkerRequestId = 0;
  const searchWorkerRequests = new Map();

  function applyStateToForm() {
    const state = getSearchState();
    if (!state) return;
    if (keywordInput) keywordInput.value = state.query.text ?? "";
    if (participantSelect) participantSelect.value = state.query.participant ?? "";
    if (startInput) startInput.value = state.query.start ?? "";
    if (endInput) endInput.value = state.query.end ?? "";
  }

  function getEntries() {
    return getDatasetEntries() || [];
  }

  function ensureSearchWorker() {
    if (searchWorkerInstance) return searchWorkerInstance;
    searchWorkerInstance = new Worker(new URL("./searchWorker.js", import.meta.url), {
      type: "module",
    });
    searchWorkerInstance.onmessage = event => {
      const { id, type, ...rest } = event.data || {};
      if (typeof id === "undefined") return;
      const request = searchWorkerRequests.get(id);
      if (!request) return;
      if (type === "progress") {
        request.onProgress?.(rest);
        return;
      }
      searchWorkerRequests.delete(id);
      if (type === "result") {
        request.resolve(rest);
      } else if (type === "cancelled") {
        request.resolve({ cancelled: true });
      } else if (type === "error") {
        request.reject(new Error(rest.error || "Search failed."));
      } else {
        request.reject(new Error("Search worker returned an unknown response."));
      }
    };
    searchWorkerInstance.onerror = event => {
      console.error("Search worker error", event);
      searchWorkerRequests.forEach(({ reject }) => {
        reject(new Error("Search worker encountered an error."));
      });
      searchWorkerRequests.clear();
      searchWorkerInstance?.terminate();
      searchWorkerInstance = null;
    };
    return searchWorkerInstance;
  }

  function populateParticipants() {
    if (!participantSelect) return;
    const entries = getEntries();
    const senders = new Set();
    entries.forEach(entry => {
      if (entry.type === "message" && entry.sender) {
        senders.add(entry.sender);
      }
    });

    const selected = getSearchState()?.query.participant ?? "";
    const options = Array.from(senders).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const previousValue = participantSelect.value;
    participantSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "All participants";
    participantSelect.appendChild(placeholder);

    options.forEach(sender => {
      const option = document.createElement("option");
      option.value = sender;
      option.textContent = sender;
      participantSelect.appendChild(option);
    });

    if (selected && !options.includes(selected)) {
      const extraOption = document.createElement("option");
      extraOption.value = selected;
      extraOption.textContent = selected;
      participantSelect.appendChild(extraOption);
    }

    const targetValue = selected || previousValue || "";
    participantSelect.value = targetValue;
    if (participantSelect.value !== targetValue) {
      participantSelect.value = "";
    }
    participantSelect.disabled = options.length === 0;
  }

  function parseDateInput(value, endOfDay = false) {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const date = new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function renderSearchInsights(summary) {
    if (!insightsEl) return;
    if (!summary || !summary.total) {
      insightsEl.classList.add("hidden");
      insightsEl.innerHTML = "";
      return;
    }
    const hitsList = summary.hitsPerDay.length
      ? summary.hitsPerDay
          .map(
            item => `
              <li>
                <span class="search-insight-label">${sanitizeText(formatDisplayDate(item.date))}</span>
                <span>${formatNumber(item.count)}</span>
              </li>
            `,
          )
          .join("")
      : '<li><span class="search-insight-label">No daily data</span><span>—</span></li>';
    const participantList = summary.topParticipants.length
      ? summary.topParticipants
          .map(
            item => `
              <li>
                <span class="search-insight-label">${sanitizeText(item.sender)}</span>
                <span>${formatNumber(item.count)}</span>
              </li>
            `,
          )
          .join("")
      : '<li><span class="search-insight-label">No matches yet</span><span>—</span></li>';
    const filtersList = summary.filters
      .map(filter => `<li><span class="search-insight-label">${sanitizeText(filter)}</span></li>`)
      .join("");
    const noteText = summary.truncated
      ? `Showing first ${resultLimit} of ${formatNumber(summary.total)} matches.`
      : `Total matches: ${formatNumber(summary.total)}.`;
    insightsEl.classList.remove("hidden");
    insightsEl.innerHTML = `
      <div class="search-insight-card">
        <h4>Hits per day</h4>
        <ul class="search-insight-list">${hitsList}</ul>
      </div>
      <div class="search-insight-card">
        <h4>Top participants</h4>
        <ul class="search-insight-list">${participantList}</ul>
      </div>
      <div class="search-insight-card">
        <h4>Search filters</h4>
        <ul class="search-insight-list">${filtersList}</ul>
        <p class="search-insight-note">${noteText}</p>
      </div>
    `;
  }

  function buildSearchResultItem(result) {
    const item = document.createElement("div");
    item.className = "search-result";

    const header = document.createElement("div");
    header.className = "search-result-header";

    const senderEl = document.createElement("span");
    senderEl.className = "search-result-sender";
    senderEl.textContent = result.sender || "[Unknown]";
    header.appendChild(senderEl);

    const timestampEl = document.createElement("span");
    timestampEl.textContent = formatTimestampDisplay(result.timestamp);
    header.appendChild(timestampEl);

    const messageEl = document.createElement("div");
    messageEl.className = "search-result-message";
    if (result.messageHtml) {
      messageEl.innerHTML = result.messageHtml;
    } else {
      messageEl.textContent = result.message || "";
    }

    item.append(header, messageEl);
    return item;
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

    const hasFilters = Boolean(query.text || query.participant || query.start || query.end);
    if (!hasRunSearch) {
      resultsSummaryEl.textContent =
        "Add keywords, choose a participant, or set dates to search this chat. Leave filters blank to list everything.";
    } else if (!total) {
      resultsSummaryEl.textContent = lastRunFiltered
        ? "No messages matched these filters. Try another keyword, participant, or date range."
        : "This chat doesn't have any messages yet.";
    } else if (!lastRunFiltered) {
      resultsSummaryEl.textContent = `Showing all ${formatNumber(results.length)} messages in this chat.`;
    } else if (total > results.length) {
      resultsSummaryEl.textContent = `Showing ${formatNumber(results.length)} of ${formatNumber(total)} matches (first ${resultLimit} shown). Narrow further to see more.`;
    } else {
      resultsSummaryEl.textContent = `Showing ${formatNumber(results.length)} match${results.length === 1 ? "" : "es"}.`;
    }

    resultsListEl.innerHTML = "";
    if (!total) {
      const empty = document.createElement("div");
      empty.className = "search-results-empty";
      empty.textContent = hasFilters
        ? "No matching messages. Try other names, words, or dates."
        : "Add filters above to search the chat history.";
      resultsListEl.appendChild(empty);
      renderSearchInsights(null);
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

    renderSearchInsights(summary);
  }

  function setSearchProgress(scanned, total) {
    if (!progressEl) return;
    const safeTotal = Math.max(0, total || 0);
    const safeScanned = Math.min(Math.max(0, scanned), safeTotal);
    const percent = safeTotal ? Math.min(100, (safeScanned / safeTotal) * 100) : 0;
    if (progressLabelEl) {
      progressLabelEl.textContent = safeTotal
        ? `Scanning ${formatNumber(safeScanned)} of ${formatNumber(safeTotal)} messages…`
        : "Scanning messages…";
    }
    if (progressBarEl) {
      progressBarEl.style.width = `${percent}%`;
    }
    if (progressTrackEl) {
      const rounded = Math.round(percent);
      progressTrackEl.setAttribute("aria-valuenow", String(rounded));
      progressTrackEl.setAttribute("aria-valuetext", `${rounded}%`);
    }
  }

  function showSearchProgress(total) {
    if (!progressEl) return;
    progressEl.classList.add("is-active");
    setSearchProgress(0, total);
  }

  function hideSearchProgress() {
    if (!progressEl) return;
    progressEl.classList.remove("is-active");
    if (progressLabelEl) progressLabelEl.textContent = "";
    if (progressBarEl) progressBarEl.style.width = "0%";
    if (progressTrackEl) {
      progressTrackEl.setAttribute("aria-valuenow", "0");
      progressTrackEl.setAttribute("aria-valuetext", "0%");
    }
  }

  function cancelActiveSearch() {
    if (activeSearchRequest && searchWorkerInstance) {
      searchWorkerInstance.postMessage({ id: activeSearchRequest, type: "cancel" });
    }
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

    const worker = ensureSearchWorker();
    const requestId = ++searchWorkerRequestId;
    activeSearchRequest = requestId;
    showSearchProgress(entries.length);

    const startBound = startDate ? startDate.getTime() : null;
    const endBound = endDate ? endDate.getTime() : null;
    const requestHasFilters = Boolean(query.text || query.participant || query.start || query.end);
    const requestLimit = requestHasFilters ? resultLimit : entries.length;

    return new Promise((resolve, reject) => {
      searchWorkerRequests.set(requestId, {
        resolve,
        reject,
        onProgress: data => {
          if (requestId === activeSearchRequest) {
            setSearchProgress(data.scanned ?? 0, data.total ?? entries.length);
          }
        },
      });
      worker.postMessage({
        id: requestId,
        type: "search",
        payload: {
          entries,
          query,
          resultLimit: requestLimit,
          startMs: startBound,
          endMs: endBound,
        },
      });
    })
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
      })
      .catch(error => {
        if (requestId !== activeSearchRequest) return;
        hideSearchProgress();
        console.error(error);
        updateStatus("Search could not complete.", "error");
      });
  }

  function handleSubmit(event) {
    event?.preventDefault();
    const query = {
      text: keywordInput?.value.trim() ?? "",
      participant: participantSelect?.value ?? "",
      start: startInput?.value ?? "",
      end: endInput?.value ?? "",
    };
    if (query.start && query.end && query.start > query.end) {
      updateStatus("The start date must come before the end date.", "error");
      return;
    }
    runSearch(query);
  }

  function resetFilters(showToast = true) {
    cancelActiveSearch();
    resetSearchState();
    if (keywordInput) keywordInput.value = "";
    if (participantSelect) participantSelect.value = "";
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";
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
