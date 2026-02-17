import { EXPORT_THEME_STYLES } from "../../theme.js";
import {
  createDataStatusController,
  createParticipantInteractionsController,
  createExportFilterSummary,
  createDashboardRuntime,
  createThemeUiController,
  formatRelayAccount,
} from "../index.js";

export function createDashboardDataStatusThemeWiring({
  dom,
  state,
  utils,
  dataStatus,
  searchController,
  savedViewsController,
  rangeApi,
  dashboardControllerApi,
  documentRef = document,
  windowRef = window,
}) {
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
      notifyRelayReady: message => dataStatus.updateStatus?.(message, "success"),
    },
  });
  const {
    setDashboardLoadingState,
    setDataAvailabilityState,
    updateHeroRelayStatus,
    getDataAvailable,
  } = dataStatusController;
  setDashboardLoadingState(true);
  documentRef.querySelectorAll(".summary-value").forEach(element => {
    element.setAttribute("data-skeleton", "value");
  });

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
      weekdayChartEl: dom.weekdayChartEl,
      weekdayFilterNote: dom.weekdayFilterNote,
      weekdayToggleWeekdays: dom.weekdayToggleWeekdays,
      weekdayToggleWeekends: dom.weekdayToggleWeekends,
      weekdayToggleWorking: dom.weekdayToggleWorking,
      weekdayToggleOffhours: dom.weekdayToggleOffhours,
      weekdayHourStartInput: dom.weekdayHourStartInput,
      weekdayHourEndInput: dom.weekdayHourEndInput,
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
      participantFilters,
      setDataAvailabilityState,
      searchPopulateParticipants: () => searchController.populateParticipants(),
      searchRenderResults: () => searchController.renderResults(),
      applyCustomRange: rangeApi.applyCustomRange,
      formatNumber: utils.formatNumber,
      formatFloat: utils.formatFloat,
      sanitizeText: utils.sanitizeText,
    },
  });
  dashboardControllerApi.setController(createdDashboardRuntimeController);

  const themeUiController = createThemeUiController({
    themeToggleInputs: dom.themeToggleInputs,
    mediaQuery: windowRef.matchMedia ? windowRef.matchMedia("(prefers-color-scheme: dark)") : null,
    exportThemeStyles: EXPORT_THEME_STYLES,
  });
  const { initThemeControls, getExportThemeConfig } = themeUiController;

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
    getExportThemeConfig,
  };
}
