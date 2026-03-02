import { computeAnalytics } from "./analytics.js";

export function buildViewSnapshot(analytics) {
  if (!analytics) return null;
  const topSender = Array.isArray(analytics.top_senders) ? analytics.top_senders[0] : null;
  const topHour = analytics.hourly_summary?.topHour || null;

  return {
    generatedAt: new Date().toISOString(),
    totalMessages: analytics.total_messages ?? 0,
    uniqueSenders: analytics.unique_senders ?? 0,
    systemEvents: analytics.system_summary?.count ?? 0,
    averageWords: analytics.averages?.words ?? 0,
    averageChars: analytics.averages?.characters ?? 0,
    weeklyAverage: analytics.weekly_summary?.averagePerWeek ?? 0,
    dailyAverage: analytics.hourly_summary?.averagePerDay ?? 0,
    dateRange: analytics.date_range ?? null,
    topSender: topSender
      ? { sender: topSender.sender, count: topSender.count, share: topSender.share ?? null }
      : null,
    topHour: topHour
      ? { dayIndex: topHour.dayIndex, hour: topHour.hour, count: topHour.count }
      : null,
  };
}

function computeSnapshotForView({ view, getDatasetEntries, filterEntriesByRange, getNormalizedRangeForView }) {
  const entries = getDatasetEntries();
  if (!entries.length) return null;
  const normalizedRange = getNormalizedRangeForView(view);
  const subset =
    typeof filterEntriesByRange === "function"
      ? filterEntriesByRange(entries, normalizedRange)
      : entries;
  if (!subset.length) {
    return {
      generatedAt: new Date().toISOString(),
      totalMessages: 0,
      uniqueSenders: 0,
      systemEvents: 0,
      averageWords: 0,
      averageChars: 0,
      weeklyAverage: 0,
      dailyAverage: 0,
      dateRange: typeof normalizedRange === "object" ? normalizedRange : null,
      topSender: null,
      topHour: null,
    };
  }
  try {
    const analytics = computeAnalytics(subset);
    return buildViewSnapshot(analytics);
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function computeSnapshotForViewAsync({
  view,
  getDatasetEntries,
  filterEntriesByRange,
  getNormalizedRangeForView,
  computeAnalyticsWithWorker,
}) {
  const entries = getDatasetEntries();
  if (!entries.length) return null;
  const normalizedRange = getNormalizedRangeForView(view);
  const subset =
    typeof filterEntriesByRange === "function"
      ? filterEntriesByRange(entries, normalizedRange)
      : entries;
  if (!subset.length) {
    return {
      generatedAt: new Date().toISOString(),
      totalMessages: 0,
      uniqueSenders: 0,
      systemEvents: 0,
      averageWords: 0,
      averageChars: 0,
      weeklyAverage: 0,
      dailyAverage: 0,
      dateRange: typeof normalizedRange === "object" ? normalizedRange : null,
      topSender: null,
      topHour: null,
    };
  }
  try {
    if (typeof computeAnalyticsWithWorker === "function") {
      try {
        const analytics = await computeAnalyticsWithWorker(subset);
        return buildViewSnapshot(analytics);
      } catch (error) {
        console.error(error);
        const fallbackAnalytics = computeAnalytics(subset);
        return buildViewSnapshot(fallbackAnalytics);
      }
    }
    const analytics = computeAnalytics(subset);
    return buildViewSnapshot(analytics);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function createViewSnapshotResolver({
  getDatasetEntries,
  filterEntriesByRange,
  getNormalizedRangeForView,
  computeAnalyticsWithWorker,
}) {
  const inFlightSnapshotHydrations = new Set();

  return function resolveSnapshot(view) {
    if (typeof computeAnalyticsWithWorker !== "function") {
      return computeSnapshotForView({
        view,
        getDatasetEntries,
        filterEntriesByRange,
        getNormalizedRangeForView,
      });
    }
    const viewId = view?.id ? String(view.id) : "";
    if (!viewId || inFlightSnapshotHydrations.has(viewId)) return null;
    inFlightSnapshotHydrations.add(viewId);
    return computeSnapshotForViewAsync({
      view,
      getDatasetEntries,
      filterEntriesByRange,
      getNormalizedRangeForView,
      computeAnalyticsWithWorker,
    }).finally(() => {
      inFlightSnapshotHydrations.delete(viewId);
    });
  };
}

export function ensureViewSnapshot({ view, updateSavedView, computeSnapshotForView, onSnapshotReady }) {
  if (!view) return null;
  if (view.snapshot) return view.snapshot;
  const snapshot = computeSnapshotForView(view);
  if (snapshot && typeof snapshot.then === "function") {
    snapshot
      .then(nextSnapshot => {
        if (!nextSnapshot) return;
        updateSavedView(view.id, { snapshot: nextSnapshot });
        if (typeof onSnapshotReady === "function") onSnapshotReady(nextSnapshot, view);
      })
      .catch(error => {
        console.error(error);
      });
    return null;
  }
  if (snapshot) {
    updateSavedView(view.id, { snapshot });
  }
  return snapshot;
}
