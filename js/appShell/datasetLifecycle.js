import {
  createParticipantDirectory,
  serializeParticipantDirectory,
  deserializeParticipantDirectory,
  normalizeEntriesWithDirectory,
  buildParticipantRoster,
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
    saveChatDataset,
    setCachedAnalytics,
    setDatasetAnalytics,
    setActiveChatId,
    computeAnalyticsWithWorker,
    renderDashboard,
    updateCustomRangeBounds,
    encodeChatSelectorValue,
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

    let savedRecord = null;
    const persistDataset = options.persist !== false;
    const participantRoster = buildParticipantRoster(participantDirectory);

    if (persistDataset) {
      savedRecord = saveChatDataset({
        id: options.datasetId ?? undefined,
        label,
        entries: normalizedEntries,
        analytics,
        fingerprint,
        participantDirectory: directorySnapshot,
        meta: {
          messageCount: analytics.total_messages,
          dateRange: analytics.date_range,
          participants: participantRoster,
        },
      });
    }

    const selectionValue =
      options.selectionValue ??
      (persistDataset && savedRecord ? encodeChatSelectorValue("local", savedRecord.id) : null);
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
    return { analytics, datasetId: savedRecord?.id ?? null };
  }

  return {
    applyEntriesToApp,
  };
}
