// @ts-check

import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../../vue/bridgeRegistry.js";
import { createSearchController } from "../../search.js";
import { createSavedViewsController } from "../../savedViews.js";
import {
  createAnalyticsRequestTracker,
  createChatSelectionController,
  createRangeFiltersController,
  createAnalyticsPipeline,
} from "../index.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   dom: AnyRecord,
 *   state: AnyRecord,
 *   utils: AnyRecord,
 *   constants: AnyRecord,
 *   callbacks: AnyRecord,
 *   dashboardControllerApi: AnyRecord,
 * }} params
 */
export function createRangeSearchSavedViewsWiring({
  dom,
  state,
  utils,
  constants,
  callbacks,
  dashboardControllerApi,
}) {
  const globalScope = dom.windowRef ?? globalThis;
  /** @param {Record<string, any>} nextState */
  const syncPageControls = nextState =>
    Boolean(resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope })?.syncPageControls?.(nextState));
  const chatSelectionController = createChatSelectionController({
    chatSelector: dom.chatSelector,
    brandName: constants.brandName,
    formatNumber: utils.formatNumber,
    formatDisplayDate: utils.formatDisplayDate,
    getActiveChatId: state.getActiveChatId,
    setActiveChatId: state.setActiveChatId,
    syncPageControls,
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
      syncPageControls,
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
      searchActionsEl: dom.searchActionsEl,
      resetButton: dom.resetSearchButton,
      resultsSummaryEl: dom.searchResultsSummary,
      resultsListEl: dom.searchResultsList,
      insightsEl: dom.searchInsightsEl,
      progressEl: dom.searchProgressEl,
      progressTrackEl: dom.searchProgressTrack,
      progressBarEl: dom.searchProgressBar,
      progressLabelEl: dom.searchProgressLabel,
    },
    options: {
      resultLimit: constants.searchResultLimit,
      now: () => globalThis.performance?.now?.() ?? Date.now(),
      vueRuntime: dom.vueRuntime ?? null,
    },
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
      filterWeekdays: dom.filterWeekdays,
      filterWeekends: dom.filterWeekends,
      filterWorking: dom.filterWorking,
      filterOffhours: dom.filterOffhours,
      hourlyBrushStartInput: dom.hourlyBrushStartInput,
      hourlyBrushEndInput: dom.hourlyBrushEndInput,
      weekdayToggleWeekdays: dom.weekdayToggleWeekdays,
      weekdayToggleWeekends: dom.weekdayToggleWeekends,
      weekdayToggleWorking: dom.weekdayToggleWorking,
      weekdayToggleOffhours: dom.weekdayToggleOffhours,
      weekdayHourStartInput: dom.weekdayHourStartInput,
      weekdayHourEndInput: dom.weekdayHourEndInput,
      describeRange,
      updateStatus: state.updateStatus,
      filterEntriesByRange,
      normalizeRangeValue,
      computeAnalyticsWithWorker,
      syncPageControls,
      vueRuntime: dom.vueRuntime ?? null,
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
