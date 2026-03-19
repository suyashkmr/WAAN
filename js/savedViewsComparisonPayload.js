import { formatNumber, formatFloat } from "./utils.js";
import { UI_COPY } from "./uiCopy.js";

export function buildSavedViewsComparisonPayload({
  allViews,
  selection,
  primaryId,
  secondaryId,
  getSavedViewById,
  ensureViewSnapshot,
  formatSavedViewRange,
  formatTopHourLabel,
}) {
  const selectedPrimaryId = primaryId ?? selection.primary;
  const selectedSecondaryId = secondaryId ?? selection.secondary;
  const primaryView = getSavedViewById(selectedPrimaryId);
  const secondaryView = getSavedViewById(selectedSecondaryId);

  if (allViews.length < 2) {
    return {
      empty: true,
      message: allViews.length
        ? UI_COPY.savedViews.compareNeedMore
        : UI_COPY.savedViews.compareStart,
    };
  }
  if (!primaryView || !secondaryView) {
    return {
      empty: true,
      message: UI_COPY.savedViews.comparePrompt,
    };
  }

  const primarySnapshot = ensureViewSnapshot(primaryView);
  const secondarySnapshot = ensureViewSnapshot(secondaryView);
  if (!primarySnapshot || !secondarySnapshot) {
    return {
      empty: true,
      message: UI_COPY.savedViews.compareRetry,
    };
  }

  const metrics = [
    { key: "range", label: "Date Range", get: (snapshot, view) => formatSavedViewRange(view), diff: false },
    { key: "totalMessages", label: "Messages", get: snapshot => snapshot.totalMessages, diff: true, digits: 0 },
    { key: "uniqueSenders", label: "Participants", get: snapshot => snapshot.uniqueSenders, diff: true, digits: 0 },
    { key: "averageWords", label: "Avg words per message", get: snapshot => snapshot.averageWords, diff: true, digits: 1 },
    { key: "averageChars", label: "Avg characters per message", get: snapshot => snapshot.averageChars, diff: true, digits: 1 },
    { key: "weeklyAverage", label: "Avg per week", get: snapshot => snapshot.weeklyAverage, diff: true, digits: 1 },
    { key: "dailyAverage", label: "Avg per day", get: snapshot => snapshot.dailyAverage, diff: true, digits: 1 },
    {
      key: "topSender",
      label: "Top Sender",
      get: snapshot =>
        snapshot.topSender
          ? `${snapshot.topSender.sender} (${formatNumber(snapshot.topSender.count)} msgs)`
          : null,
      diff: false,
    },
    {
      key: "topHour",
      label: "Top Hour",
      get: snapshot =>
        snapshot.topHour
          ? `${formatTopHourLabel(snapshot)} (${formatNumber(snapshot.topHour.count)} msgs)`
          : null,
      diff: false,
    },
  ];

  const formatMetricValue = (value, digits = 0) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number" && !Number.isNaN(value)) {
      return digits > 0 ? formatFloat(value, digits) : formatNumber(value);
    }
    return String(value);
  };

  const buildColumn = (heading, view, snapshot) => ({
    heading: `${heading} · ${view.name}`,
    metrics: metrics.map(metric => ({
      label: metric.label,
      value: formatMetricValue(metric.get(snapshot, view), metric.digits ?? 0),
    })),
  });

  const diffColumn = {
    heading: "Difference (B - A)",
    metrics: metrics
      .filter(metric => metric.diff)
      .map(metric => {
        const valueA = metric.get(primarySnapshot);
        const valueB = metric.get(secondarySnapshot);
        if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
          return { label: metric.label, value: "—", tone: "neutral" };
        }
        const diff = valueB - valueA;
        const digits = metric.digits ?? 0;
        const formatted = Math.abs(diff) < 0.0001
          ? "0"
          : digits > 0
            ? formatFloat(diff, digits)
            : formatNumber(diff);
        const prefix = diff > 0 && !String(formatted).startsWith("+") ? "+" : "";
        return {
          label: metric.label,
          value: `${prefix}${formatted}`,
          tone: diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral",
        };
      }),
  };

  return {
    empty: false,
    columns: [
      buildColumn("View A", primaryView, primarySnapshot),
      buildColumn("View B", secondaryView, secondarySnapshot),
      diffColumn,
    ],
  };
}
