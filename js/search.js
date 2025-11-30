import {
  formatNumber,
  formatDisplayDate,
  formatTimestampDisplay,
  sanitizeText,
  toISODate,
} from "./utils.js";
import {
  getDatasetEntries,
  getSearchState,
  setSearchQuery,
  setSearchResults,
  resetSearchState,
  updateStatus,
} from "./state.js";
import { getTimestamp } from "./analytics.js";

const DEFAULT_RESULT_LIMIT = 200;
const SEARCH_CHUNK_SIZE = 400;

export function createSearchController({ elements = {}, options = {}, getSnapshotMode = () => false } = {}) {
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
  let activeSearchToken = 0;

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
    participantSelect.disabled = getSnapshotMode() || options.length === 0;
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

  function describeSearchFilters(query) {
    const details = [];
    if (query?.text) details.push(`Keywords: "${query.text}"`);
    if (query?.participant) details.push(`Participant: ${query.participant}`);
    if (query?.start || query?.end) {
      const start = query.start ? formatDisplayDate(query.start) : "Any";
      const end = query.end ? formatDisplayDate(query.end) : "Any";
      details.push(`Dates: ${start} → ${end}`);
    }
    if (!details.length) details.push("Filters: none (all messages)");
    return details;
  }

  function buildSearchSummary({ query, dayCounts, participantCounts, total, truncated }) {
    const hitsPerDay = Array.from(dayCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    const topParticipants = Array.from(participantCounts.entries())
      .map(([sender, count]) => ({ sender, count, share: total ? count / total : 0 }))
      .sort((a, b) => b.count - a.count || a.sender.localeCompare(b.sender))
      .slice(0, 5);
    return {
      total,
      truncated: Boolean(truncated),
      hitsPerDay,
      topParticipants,
      filters: describeSearchFilters(query),
    };
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

  function buildSearchResultItem(result, tokens) {
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
    messageEl.innerHTML = highlightKeywords(result.message || "", tokens);

    item.append(header, messageEl);
    return item;
  }

  function highlightKeywords(text, tokens) {
    if (!text) return "";
    let output = sanitizeText(text);
    if (!tokens || !tokens.length) return output;
    tokens.forEach(token => {
      if (!token) return;
      const escapedToken = sanitizeText(token);
      const escaped = escapedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      output = output.replace(regex, "<mark>$1</mark>");
    });
    return output;
  }

  function renderResults() {
    if (!resultsSummaryEl || !resultsListEl) return;
    const state = getSearchState();
    const query = state?.query ?? {};
    const results = state?.results ?? [];
    const total = state?.total ?? 0;
    const summary = state?.summary ?? null;

    const hasFilters = Boolean(query.text || query.participant || query.start || query.end);

    if (!hasFilters) {
      resultsSummaryEl.textContent = "Add keywords, choose a participant, or set dates to search this chat.";
    } else if (!total) {
      resultsSummaryEl.textContent = "No messages matched these filters. Try another keyword, participant, or date range.";
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

    const tokens = query.text
      ? query.text
          .toLowerCase()
          .split(/\s+/)
          .map(token => token.trim())
          .filter(Boolean)
      : [];

    const fragment = document.createDocumentFragment();
    results.forEach(result => {
      fragment.appendChild(buildSearchResultItem(result, tokens));
    });
    resultsListEl.appendChild(fragment);

    if (total > results.length) {
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
    activeSearchToken += 1;
    hideSearchProgress();
  }

  function runSearch(query) {
    const entries = getEntries();
    if (!entries.length) {
      updateStatus("Load a chat file before searching.", "warning");
      hideSearchProgress();
      return;
    }

    const tokens = query.text
      ? query.text
          .toLowerCase()
          .split(/\s+/)
          .map(token => token.trim())
          .filter(Boolean)
      : [];
    const participant = query.participant || "";
    const participantLower = participant.toLowerCase();

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
    const jobToken = ++activeSearchToken;
    const totalEntries = entries.length;
    showSearchProgress(totalEntries);

    const results = [];
    let totalMatches = 0;
    const dayCounts = new Map();
    const participantCounts = new Map();
    let index = 0;

    const finalizeSearch = () => {
      if (jobToken !== activeSearchToken) return;
      hideSearchProgress();
      const summary = totalMatches
        ? buildSearchSummary({
            query,
            dayCounts,
            participantCounts,
            total: totalMatches,
            truncated: totalMatches > results.length,
          })
        : null;
      setSearchResults(results, totalMatches, summary);
      renderResults();
      if (!totalMatches) {
        updateStatus("No messages matched those filters.", "info");
      } else if (totalMatches > resultLimit) {
        updateStatus(
          `Showing the first ${resultLimit} matches out of ${formatNumber(totalMatches)}. Narrow your filters for a closer look.`,
          "info",
        );
      } else {
        updateStatus(`Found ${formatNumber(totalMatches)} matching messages.`, "success");
      }
    };

    const processChunk = () => {
      if (jobToken !== activeSearchToken) return;
      const end = Math.min(totalEntries, index + SEARCH_CHUNK_SIZE);
      for (let i = index; i < end; i += 1) {
        const entry = entries[i];
        if (entry.type !== "message") continue;
        const sender = entry.sender || "";
        if (participant && sender.toLowerCase() !== participantLower) continue;

        const timestamp = getTimestamp(entry);
        if (startDate && (!timestamp || timestamp < startDate)) continue;
        if (endDate && (!timestamp || timestamp > endDate)) continue;

        const message = entry.message || "";
        if (tokens.length) {
          const messageLower = message.toLowerCase();
          const matchesTokens = tokens.every(token => messageLower.includes(token));
          if (!matchesTokens) continue;
        }

        totalMatches += 1;
        const dayKey = timestamp ? toISODate(timestamp) : null;
        if (dayKey) {
          dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
        }
        const senderKey = sender || "[Unknown]";
        participantCounts.set(senderKey, (participantCounts.get(senderKey) || 0) + 1);
        if (results.length < resultLimit) {
          results.push({
            sender,
            message,
            timestamp: timestamp ? timestamp.toISOString() : null,
          });
        }
      }
      index = end;
      setSearchProgress(index, totalEntries);
      if (index < totalEntries) {
        requestAnimationFrame(processChunk);
      } else {
        finalizeSearch();
      }
    };

    requestAnimationFrame(processChunk);
  }

  function handleSubmit(event) {
    event?.preventDefault();
    if (getSnapshotMode()) {
      updateStatus("Search isn't available in shared link view.", "warning");
      return;
    }
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
    if (getSnapshotMode()) {
      updateStatus("Search isn't available in shared link view.", "warning");
      return;
    }
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
