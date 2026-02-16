import { createSearchController } from "../../search.js";
import { createSavedViewsController } from "../../savedViews.js";
import {
  createAnalyticsRequestTracker,
  createChatSelectionController,
  createRangeFiltersController,
  createAnalyticsPipeline,
} from "../index.js";

export function createRangeSearchSavedViewsWiring({
  dom,
  state,
  utils,
  constants,
  callbacks,
  dashboardControllerApi,
}) {
  const chatSelectionController = createChatSelectionController({
    chatSelector: dom.chatSelector,
    brandName: constants.brandName,
    formatNumber: utils.formatNumber,
    formatDisplayDate: utils.formatDisplayDate,
    listChatDatasets: state.listChatDatasets,
    getActiveChatId: state.getActiveChatId,
    setActiveChatId: state.setActiveChatId,
  });
  const {
    encodeChatSelectorValue,
    setRemoteChatList,
    getRemoteChatList,
    getRemoteChatsLastFetchedAt,
    refreshChatSelector,
    handleChatSelectionChange: handleChatSelectionChangeCore,
  } = chatSelectionController;

  const analyticsRequestTracker = createAnalyticsRequestTracker();
  const analyticsPipeline = createAnalyticsPipeline();
  const { computeAnalyticsWithWorker } = analyticsPipeline;

  const rangeFiltersController = createRangeFiltersController({
    elements: {
      rangeSelect: dom.rangeSelect,
      customControls: dom.customControls,
      customStartInput: dom.customStartInput,
      customEndInput: dom.customEndInput,
      customApplyButton: dom.customApplyButton,
      searchStartInput: dom.searchStartInput,
      searchEndInput: dom.searchEndInput,
    },
    deps: {
      getDatasetEntries: state.getDatasetEntries,
      getDatasetLabel: state.getDatasetLabel,
      setCurrentRange: state.setCurrentRange,
      setCustomRange: state.setCustomRange,
      getCustomRange: state.getCustomRange,
      getCachedAnalytics: state.getCachedAnalytics,
      setCachedAnalytics: state.setCachedAnalytics,
      setDatasetAnalytics: state.setDatasetAnalytics,
      renderDashboard: dashboardControllerApi.renderDashboard,
      computeAnalyticsWithWorker,
      updateStatus: state.updateStatus,
      formatNumber: utils.formatNumber,
      formatDisplayDate: utils.formatDisplayDate,
      getTimestamp: utils.getTimestamp,
      toISODate: utils.toISODate,
      onRangeApplied: callbacks.syncHeroPillsWithRange,
      nextAnalyticsRequestToken: analyticsRequestTracker.nextToken,
      isAnalyticsRequestCurrent: analyticsRequestTracker.isCurrent,
    },
  });
  const {
    normalizeRangeValue,
    filterEntriesByRange,
    describeRange,
    showCustomControls,
    updateCustomRangeBounds,
    applyRangeAndRender,
    handleRangeChange,
    applyCustomRange,
  } = rangeFiltersController;

  const searchController = createSearchController({
    elements: {
      form: dom.searchForm,
      keywordInput: dom.searchKeywordInput,
      participantSelect: dom.searchParticipantSelect,
      startInput: dom.searchStartInput,
      endInput: dom.searchEndInput,
      resetButton: dom.resetSearchButton,
      resultsSummaryEl: dom.searchResultsSummary,
      resultsListEl: dom.searchResultsList,
      insightsEl: dom.searchInsightsEl,
      progressEl: dom.searchProgressEl,
      progressTrackEl: dom.searchProgressTrack,
      progressBarEl: dom.searchProgressBar,
      progressLabelEl: dom.searchProgressLabel,
    },
    options: { resultLimit: constants.searchResultLimit },
  });

  const savedViewsController = createSavedViewsController({
    elements: {
      nameInput: dom.savedViewNameInput,
      saveButton: dom.saveViewButton,
      listSelect: dom.savedViewList,
      applyButton: dom.applySavedViewButton,
      deleteButton: dom.deleteSavedViewButton,
      gallery: dom.savedViewGallery,
      compareSelectA: dom.compareViewASelect,
      compareSelectB: dom.compareViewBSelect,
      compareButton: dom.compareViewsButton,
      compareSummaryEl: dom.compareSummaryEl,
      rangeSelect: dom.rangeSelect,
      customStartInput: dom.customStartInput,
      customEndInput: dom.customEndInput,
    },
    dependencies: {
      getDatasetEntries: state.getDatasetEntries,
      getDatasetAnalytics: state.getDatasetAnalytics,
      getDatasetLabel: state.getDatasetLabel,
      getCurrentRange: state.getCurrentRange,
      getCustomRange: state.getCustomRange,
      setCurrentRange: state.setCurrentRange,
      setCustomRange: state.setCustomRange,
      showCustomControls,
      addSavedView: state.addSavedView,
      getSavedViews: state.getSavedViews,
      updateSavedView: state.updateSavedView,
      removeSavedView: state.removeSavedView,
      clearSavedViews: state.clearSavedViews,
      getCompareSelection: state.getCompareSelection,
      setCompareSelection: state.setCompareSelection,
      getHourlyState: state.getHourlyState,
      updateHourlyState: state.updateHourlyState,
      getWeekdayState: state.getWeekdayState,
      updateWeekdayState: state.updateWeekdayState,
      applyRangeAndRender,
      ensureDayFilters: dashboardControllerApi.ensureDayFilters,
      ensureHourFilters: dashboardControllerApi.ensureHourFilters,
      syncHourlyControlsWithState: dashboardControllerApi.syncHourlyControlsWithState,
      ensureWeekdayDayFilters: dashboardControllerApi.ensureWeekdayDayFilters,
      ensureWeekdayHourFilters: dashboardControllerApi.ensureWeekdayHourFilters,
      syncWeekdayControlsWithState: dashboardControllerApi.syncWeekdayControlsWithState,
      describeRange,
      updateStatus: state.updateStatus,
      filterEntriesByRange,
      normalizeRangeValue,
    },
  });

  return {
    encodeChatSelectorValue,
    setRemoteChatList,
    getRemoteChatList,
    getRemoteChatsLastFetchedAt,
    refreshChatSelector,
    handleChatSelectionChangeCore,
    analyticsRequestTracker,
    computeAnalyticsWithWorker,
    normalizeRangeValue,
    filterEntriesByRange,
    describeRange,
    updateCustomRangeBounds,
    handleRangeChange,
    applyCustomRange,
    searchController,
    savedViewsController,
  };
}
