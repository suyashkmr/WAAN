import {
  formatNumber,
  formatDisplayDate,
  formatTimestampDisplay,
  sanitizeText,
} from "../utils.js";

export function renderSearchInsights({ insightsEl, summary, resultLimit }) {
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

export function buildSearchResultItem(result) {
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

export function buildResultsSummaryText({
  hasRunSearch,
  total,
  lastRunFiltered,
  resultsLength,
  hasFilters,
  resultLimit,
}) {
  if (!hasRunSearch) {
    return "Add keywords, choose a participant, or set dates to search this chat. Leave filters blank to list everything.";
  }
  if (!total) {
    return lastRunFiltered
      ? "No messages matched these filters. Try another keyword, participant, or date range."
      : "This chat doesn't have any messages yet.";
  }
  if (!lastRunFiltered) {
    return `Showing all ${formatNumber(resultsLength)} messages in this chat.`;
  }
  if (total > resultsLength) {
    return `Showing ${formatNumber(resultsLength)} of ${formatNumber(total)} matches (first ${resultLimit} shown). Narrow further to see more.`;
  }
  if (hasFilters) {
    return `Showing ${formatNumber(resultsLength)} match${resultsLength === 1 ? "" : "es"}.`;
  }
  return `Showing all ${formatNumber(resultsLength)} messages in this chat.`;
}
