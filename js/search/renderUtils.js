import {
  formatNumber,
} from "../utils.js";

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
