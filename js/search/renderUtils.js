import {
  formatNumber,
} from "../utils.js";
import { UI_COPY } from "../uiCopy.js";

export function buildResultsSummaryText({
  hasRunSearch,
  total,
  lastRunFiltered,
  resultsLength,
  hasFilters,
  resultLimit,
}) {
  if (!hasRunSearch) {
    return UI_COPY.search.emptySummary;
  }
  if (!total) {
    return lastRunFiltered
      ? UI_COPY.search.noMatchesSummary
      : UI_COPY.search.noMessagesSummary;
  }
  if (!lastRunFiltered) {
    return UI_COPY.search.allMessagesSummary(formatNumber(resultsLength));
  }
  if (total > resultsLength) {
    return UI_COPY.search.limitedSummary(formatNumber(resultsLength), formatNumber(total));
  }
  if (hasFilters) {
    return UI_COPY.search.matchesSummary(resultsLength, formatNumber(resultsLength));
  }
  return UI_COPY.search.allMessagesSummary(formatNumber(resultsLength));
}
