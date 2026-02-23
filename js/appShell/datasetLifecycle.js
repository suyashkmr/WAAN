import {
  createParticipantDirectory,
  serializeParticipantDirectory,
  deserializeParticipantDirectory,
  normalizeEntriesWithDirectory,
} from "./participantDirectory.js";

export function createDatasetLifecycleController({ elements, deps }) {
  const { rangeSelect } = elements;

  const {
    setDatasetEntries,
    setDatasetFingerprint,
    setDatasetParticipantDirectory,
    clearAnalyticsCache,
    setDatasetLabel,
    setCurrentRange,
    setCustomRange,
    resetHourlyFilters,
    resetWeekdayFilters,
    computeDatasetFingerprint,
    setCachedAnalytics,
    setDatasetAnalytics,
    setActiveChatId,
    computeAnalyticsWithWorker,
    renderDashboard,
    updateCustomRangeBounds,
    refreshChatSelector,
    updateStatus,
    setDashboardLoadingState,
    formatNumber,
    nextAnalyticsRequestToken,
    isAnalyticsRequestCurrent,
    resetSavedViewsForNewDataset,
    resetSearchState,
    populateSearchParticipants,
  } = deps;

  async function applyEntriesToApp(entries, label, options = {}) {
    let participantDirectory = null;
    if (options.participantDirectoryData) {
      participantDirectory = deserializeParticipantDirectory(options.participantDirectoryData);
    }
    if (!participantDirectory) {
      participantDirectory = createParticipantDirectory(entries, options.participants || []);
    }

    const directorySnapshot = serializeParticipantDirectory(participantDirectory);
    const shouldNormalize = !options.entriesNormalized;
    const normalizedEntries = shouldNormalize
      ? normalizeEntriesWithDirectory(entries, participantDirectory)
      : entries.map(entry => ({
          ...entry,
          search_text:
            entry.search_text ?? (typeof entry.message === "string" ? entry.message.toLowerCase() : ""),
        }));

    const fingerprint = computeDatasetFingerprint(normalizedEntries);
    setDatasetEntries(normalizedEntries);
    setDatasetFingerprint(fingerprint);
    setDatasetParticipantDirectory(directorySnapshot);
    resetSavedViewsForNewDataset();
    clearAnalyticsCache();
    resetSearchState();
    populateSearchParticipants();
    setDatasetLabel(label);
    setCurrentRange("all");
    setCustomRange(null);
    if (rangeSelect) rangeSelect.value = "all";
    resetHourlyFilters();
    resetWeekdayFilters();

    const requestToken = nextAnalyticsRequestToken();
    let analytics = options.analyticsOverride ?? null;
    if (!analytics) {
      analytics = await computeAnalyticsWithWorker(normalizedEntries);
      if (!isAnalyticsRequestCurrent(requestToken)) return null;
    }

    setCachedAnalytics("all", analytics);
    setDatasetAnalytics(analytics);
    renderDashboard(analytics);
    updateCustomRangeBounds();
    const selectionValue = options.selectionValue ?? null;
    if (selectionValue) {
      setActiveChatId(selectionValue);
    }
    await refreshChatSelector();

    const statusMessage =
      options.statusMessage ??
      `Loaded ${formatNumber(normalizedEntries.length)} chat lines from ${label}. Showing the full message history (${formatNumber(
        analytics.total_messages,
      )} messages).`;
    updateStatus(statusMessage, "info");
    setDashboardLoadingState(false);
    return { analytics, datasetId: null };
  }

  return {
    applyEntriesToApp,
  };
}
