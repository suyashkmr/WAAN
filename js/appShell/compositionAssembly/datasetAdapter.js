// @ts-check

/**
 * @param {{ dom: Record<string, any>, state: Record<string, any>, utils: Record<string, any>, wiring: Record<string, any> }} params
 */
export function createDatasetLifecycleCompositionAdapter({ dom, state, utils, wiring }) {
  return {
    rangeSelect: dom.rangeSelect,
    deps: {
      setDatasetEntries: state.setDatasetEntries,
      setDatasetFingerprint: state.setDatasetFingerprint,
      setDatasetParticipantDirectory: state.setDatasetParticipantDirectory,
      clearAnalyticsCache: state.clearAnalyticsCache,
      setDatasetLabel: state.setDatasetLabel,
      setCurrentRange: state.setCurrentRange,
      setCustomRange: state.setCustomRange,
      resetHourlyFilters: state.resetHourlyFilters,
      resetWeekdayFilters: state.resetWeekdayFilters,
      computeDatasetFingerprint: state.computeDatasetFingerprint,
      setCachedAnalytics: state.setCachedAnalytics,
      setDatasetAnalytics: state.setDatasetAnalytics,
      setActiveChatId: state.setActiveChatId,
      computeAnalyticsWithWorker: wiring.computeAnalyticsWithWorker,
      renderDashboard: wiring.renderDashboard,
      updateCustomRangeBounds: wiring.updateCustomRangeBounds,
      refreshChatSelector: wiring.refreshChatSelector,
      updateStatus: state.updateStatus,
      setDashboardLoadingState: wiring.setDashboardLoadingState,
      formatNumber: utils.formatNumber,
      nextAnalyticsRequestToken: wiring.analyticsRequestTracker.nextToken,
      isAnalyticsRequestCurrent: wiring.analyticsRequestTracker.isCurrent,
      resetSavedViewsForNewDataset: () => wiring.savedViewsController.resetForNewDataset(),
      resetSearchState: () => wiring.searchController.resetState(),
      populateSearchParticipants: () => wiring.searchController.populateParticipants(),
      syncPageControls: wiring.syncPageControls,
    },
  };
}
