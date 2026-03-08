// @ts-check

import { EXPORT_THEME_STYLES } from "../../theme.js";
import {
  createDataStatusController,
  createParticipantInteractionsController,
  createExportFilterSummary,
  createDashboardRuntime,
  createThemeUiController,
  formatRelayAccount,
} from "../index.js";
import { createDashboardViewAdapter } from "./dashboardViewAdapter.js";
import { createHeroStatusRenderer } from "../../vue/heroStatusRenderer.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 * @typedef {{
 *   applySummarySkeletonState: () => void,
 *   getThemeMediaQuery: () => MediaQueryList | null,
 * }} DashboardViewAdapter
 */

/**
 * @param {{
 *   dom: AnyRecord,
 *   state: AnyRecord,
 *   utils: AnyRecord,
 *   dataStatus: AnyRecord,
 *   searchController: AnyRecord,
 *   savedViewsController: AnyRecord,
 *   rangeApi: AnyRecord,
 *   dashboardControllerApi: AnyRecord,
 *   viewAdapter?: DashboardViewAdapter,
 * }} params
 */
export function createDashboardDataStatusThemeWiring({
  dom,
  state,
  utils,
  dataStatus,
  searchController,
  savedViewsController,
  rangeApi,
  dashboardControllerApi,
  viewAdapter = createDashboardViewAdapter(),
}) {
  const heroStatusRenderer = createHeroStatusRenderer({
    elements: {
      dashboardRoot: dom.dashboardRoot,
      heroStatusBadge: dom.heroStatusBadge,
      heroStatusCopy: dom.heroStatusCopy,
      heroStatusMetaCopy: dom.heroStatusMetaCopy,
      heroSyncDot: dom.heroSyncDot,
      heroMilestoneSteps: dom.heroMilestoneSteps,
    },
    vueRuntime: typeof globalThis !== "undefined" ? /** @type {any} */ (globalThis).Vue : null,
  });
  const dataStatusController = createDataStatusController({
    elements: {
      dashboardRoot: dom.dashboardRoot,
      heroStatusBadge: dom.heroStatusBadge,
      heroStatusCopy: dom.heroStatusCopy,
      heroStatusMetaCopy: dom.heroStatusMetaCopy,
      heroSyncDot: dom.heroSyncDot,
      heroMilestoneSteps: dom.heroMilestoneSteps,
      datasetEmptyStateManager: dataStatus.datasetEmptyStateManager,
    },
    deps: {
      setDatasetEmptyMessage: dataStatus.setDatasetEmptyMessage,
      savedViewsController,
      formatRelayAccount,
      formatNumber: utils.formatNumber,
      notifyRelayReady: /** @param {string} message */ message => dataStatus.updateStatus?.(message, "success"),
      formatStatusTime: () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      heroStatusRenderer,
    },
  });
  const {
    setDashboardLoadingState,
    setDataAvailabilityState,
    updateHeroRelayStatus,
    getDataAvailable,
  } = dataStatusController;
  setDashboardLoadingState(true);
  viewAdapter.applySummarySkeletonState();

  const participantFilters = {
    topCount: Number(dom.participantsTopSelect?.value ?? 25) || 0,
    sortMode: dom.participantsSortSelect?.value ?? "most",
    timeframe: dom.participantsTimeframeSelect?.value ?? "all",
  };
  const participantInteractionsController = createParticipantInteractionsController({
    elements: {
      participantsTopSelect: dom.participantsTopSelect,
      participantsSortSelect: dom.participantsSortSelect,
      participantsTimeframeSelect: dom.participantsTimeframeSelect,
      participantsBody: dom.participantsBody,
    },
    deps: {
      participantFilters,
      getDatasetAnalytics: state.getDatasetAnalytics,
      renderParticipants: dashboardControllerApi.renderParticipants,
    },
  });
  const {
    handleParticipantsTopChange,
    handleParticipantsSortChange,
    handleParticipantsTimeframeChange,
    handleParticipantPresetClick,
    handleParticipantRowToggle,
  } = participantInteractionsController;

  const getExportFilterSummary = createExportFilterSummary({
    normalizeRangeValue: rangeApi.normalizeRangeValue,
    getCurrentRange: state.getCurrentRange,
    describeRange: rangeApi.describeRange,
    participantFilters,
  });

  const { controller: createdDashboardRuntimeController, getParticipantView } = createDashboardRuntime({
    elements: {
      summaryEl: dom.summaryEl,
      participantsBody: dom.participantsBody,
      participantsNote: dom.participantsNote,
      participantPresetButtons: dom.participantPresetButtons,
      hourlyChartEl: dom.hourlyChartEl,
      filterNoteEl: dom.filterNoteEl,
      brushSummaryEl: dom.brushSummaryEl,
      hourlyAnomaliesEl: dom.hourlyAnomaliesEl,
      hourlyTopHourEl: dom.hourlyTopHourEl,
      dailyChartEl: dom.dailyChartEl,
      dailyAvgDayEl: dom.dailyAvgDayEl,
      weeklyChartEl: dom.weeklyChartEl,
      weeklyCumulativeEl: dom.weeklyCumulativeEl,
      weeklyRollingEl: dom.weeklyRollingEl,
      weeklyAverageEl: dom.weeklyAverageEl,
      filterWeekdays: dom.filterWeekdays,
      filterWeekends: dom.filterWeekends,
      filterWorking: dom.filterWorking,
      filterOffhours: dom.filterOffhours,
      hourlyBrushStartInput: dom.hourlyBrushStartInput,
      hourlyBrushEndInput: dom.hourlyBrushEndInput,
      hourlyBrushStartLabel: dom.hourlyBrushStartLabel,
      hourlyBrushEndLabel: dom.hourlyBrushEndLabel,
      weekdayChartEl: dom.weekdayChartEl,
      weekdayFilterNote: dom.weekdayFilterNote,
      weekdayToggleWeekdays: dom.weekdayToggleWeekdays,
      weekdayToggleWeekends: dom.weekdayToggleWeekends,
      weekdayToggleWorking: dom.weekdayToggleWorking,
      weekdayToggleOffhours: dom.weekdayToggleOffhours,
      weekdayHourStartInput: dom.weekdayHourStartInput,
      weekdayHourEndInput: dom.weekdayHourEndInput,
      weekdayHourStartLabel: dom.weekdayHourStartLabel,
      weekdayHourEndLabel: dom.weekdayHourEndLabel,
      timeOfDayWeekdayToggle: dom.timeOfDayWeekdayToggle,
      timeOfDayWeekendToggle: dom.timeOfDayWeekendToggle,
      timeOfDayHourStartInput: dom.timeOfDayHourStartInput,
      timeOfDayHourEndInput: dom.timeOfDayHourEndInput,
      timeOfDayHourStartLabel: dom.timeOfDayHourStartLabel,
      timeOfDayHourEndLabel: dom.timeOfDayHourEndLabel,
      timeOfDayChartContainer: dom.timeOfDayChartContainer,
      timeOfDaySparklineEl: dom.timeOfDaySparklineEl,
      timeOfDayBandsEl: dom.timeOfDayBandsEl,
      timeOfDayCalloutsEl: dom.timeOfDayCalloutsEl,
      sentimentSummaryEl: dom.sentimentSummaryEl,
      sentimentTrendNote: dom.sentimentTrendNote,
      sentimentDailyChart: dom.sentimentDailyChart,
      sentimentPositiveList: dom.sentimentPositiveList,
      sentimentNegativeList: dom.sentimentNegativeList,
      messageTypeSummaryEl: dom.messageTypeSummaryEl,
      messageTypeNoteEl: dom.messageTypeNoteEl,
      pollsListEl: dom.pollsListEl,
      pollsTotalEl: dom.pollsTotalEl,
      pollsCreatorsEl: dom.pollsCreatorsEl,
      pollsNote: dom.pollsNote,
      highlightList: dom.highlightList,
      rangeSelect: dom.rangeSelect,
    },
    deps: {
      getDatasetLabel: state.getDatasetLabel,
      getDatasetEntries: state.getDatasetEntries,
      getDatasetAnalytics: state.getDatasetAnalytics,
      getCustomRange: state.getCustomRange,
      getHourlyState: state.getHourlyState,
      updateHourlyState: state.updateHourlyState,
      getWeekdayState: state.getWeekdayState,
      updateWeekdayState: state.updateWeekdayState,
      subscribeAppShellUiState: state.subscribeAppShellUiState,
      participantFilters,
      setDataAvailabilityState,
      searchPopulateParticipants: () => searchController.populateParticipants(),
      searchRenderResults: () => searchController.renderResults(),
      applyCustomRange: rangeApi.applyCustomRange,
      formatNumber: utils.formatNumber,
      formatFloat: utils.formatFloat,
      sanitizeText: utils.sanitizeText,
      vueRuntime: typeof globalThis !== "undefined" ? /** @type {any} */ (globalThis).Vue : null,
    },
  });
  dashboardControllerApi.setController(createdDashboardRuntimeController);

  const themeUiController = createThemeUiController({
    themeToggleInputs: dom.themeToggleInputs,
    mediaQuery: /** @type {any} */ (viewAdapter.getThemeMediaQuery()),
    exportThemeStyles: EXPORT_THEME_STYLES,
    documentRef: typeof document !== "undefined" ? document : null,
    windowRef: typeof window !== "undefined" ? window : null,
    storageRef: globalThis.localStorage ?? null,
  });
  const { initThemeControls, setThemePreference, getExportThemeConfig } = themeUiController;

  return {
    setDashboardLoadingState,
    setDataAvailabilityState,
    updateHeroRelayStatus,
    getDataAvailable,
    handleParticipantsTopChange,
    handleParticipantsSortChange,
    handleParticipantsTimeframeChange,
    handleParticipantPresetClick,
    handleParticipantRowToggle,
    getExportFilterSummary,
    getParticipantView,
    initThemeControls,
    setThemePreference,
    getExportThemeConfig,
  };
}
