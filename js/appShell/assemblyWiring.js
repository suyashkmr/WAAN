// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {AnyRecord} exportRefs
 */
export function createDatasetEmptyButtons(exportRefs) {
  return [
    exportRefs.downloadPdfButton,
    exportRefs.downloadMarkdownButton,
    exportRefs.downloadSlidesButton,
    exportRefs.downloadChatJsonButton,
    exportRefs.downloadParticipantsButton,
    exportRefs.downloadHourlyButton,
    exportRefs.downloadDailyButton,
    exportRefs.downloadWeeklyButton,
    exportRefs.downloadWeekdayButton,
    exportRefs.downloadTimeOfDayButton,
    exportRefs.downloadMessageTypesButton,
    exportRefs.downloadSentimentButton,
    exportRefs.downloadSearchButton,
  ];
}

/**
 * @param {AnyRecord} controllerWiring
 */
export function createCompositionAssemblyWiring(controllerWiring) {
  return {
    getExportFilterSummary: controllerWiring.getExportFilterSummary,
    getExportThemeConfig: controllerWiring.getExportThemeConfig,
    getParticipantView: controllerWiring.getParticipantView,
    describeRange: controllerWiring.describeRange,
    filterEntriesByRange: controllerWiring.filterEntriesByRange,
    normalizeRangeValue: controllerWiring.normalizeRangeValue,
    analyticsRequestTracker: controllerWiring.analyticsRequestTracker,
    computeAnalyticsWithWorker: controllerWiring.computeAnalyticsWithWorker,
    renderDashboard: controllerWiring.renderDashboard,
    updateCustomRangeBounds: controllerWiring.updateCustomRangeBounds,
    encodeChatSelectorValue: controllerWiring.encodeChatSelectorValue,
    setRemoteChatList: controllerWiring.setRemoteChatList,
    getRemoteChatList: controllerWiring.getRemoteChatList,
    getRemoteChatsLastFetchedAt: controllerWiring.getRemoteChatsLastFetchedAt,
    refreshChatSelector: controllerWiring.refreshChatSelector,
    savedViewsController: controllerWiring.savedViewsController,
    searchController: controllerWiring.searchController,
    setDashboardLoadingState: controllerWiring.setDashboardLoadingState,
    setDataAvailabilityState: controllerWiring.setDataAvailabilityState,
    updateHeroRelayStatus: controllerWiring.updateHeroRelayStatus,
    handleChatSelectionChangeCore: controllerWiring.handleChatSelectionChangeCore,
  };
}

/**
 * @param {{
 *   controllerWiring: AnyRecord,
 *   compositionAssembly: AnyRecord,
 *   stateStore: AnyRecord,
 * }} params
 */
export function createRuntimeHandlers({ controllerWiring, compositionAssembly, stateStore }) {
  return {
    handleChatSelectionChange: compositionAssembly.handleChatSelectionChange,
    handleRangeChange: controllerWiring.handleRangeChange,
    exportParticipants: compositionAssembly.exportParticipants,
    exportHourly: compositionAssembly.exportHourly,
    exportDaily: compositionAssembly.exportDaily,
    exportWeekly: compositionAssembly.exportWeekly,
    exportWeekday: compositionAssembly.exportWeekday,
    exportTimeOfDay: compositionAssembly.exportTimeOfDay,
    exportMessageTypes: compositionAssembly.exportMessageTypes,
    exportChatJson: compositionAssembly.exportChatJson,
    exportSentiment: compositionAssembly.exportSentiment,
    exportMessageSubtype: compositionAssembly.exportMessageSubtype,
    handleDownloadMarkdownReport: compositionAssembly.handleDownloadMarkdownReport,
    handleDownloadSlidesReport: compositionAssembly.handleDownloadSlidesReport,
    exportSearchResults: compositionAssembly.exportSearchResults,
    handleDownloadPdfReport: compositionAssembly.handleDownloadPdfReport,
    handleParticipantsTopChange: controllerWiring.handleParticipantsTopChange,
    handleParticipantsSortChange: controllerWiring.handleParticipantsSortChange,
    handleParticipantsTimeframeChange: controllerWiring.handleParticipantsTimeframeChange,
    handleParticipantPresetClick: controllerWiring.handleParticipantPresetClick,
    initRelayControls: compositionAssembly.initRelayControls,
    initThemeControls: controllerWiring.initThemeControls,
    setThemePreference: controllerWiring.setThemePreference,
    setDataAvailabilityState: controllerWiring.setDataAvailabilityState,
    startRelaySession: compositionAssembly.startRelaySession,
    stopRelaySession: compositionAssembly.stopRelaySession,
    searchController: controllerWiring.searchController,
    savedViewsController: controllerWiring.savedViewsController,
    getDataAvailable: controllerWiring.getDataAvailable,
    refreshChatSelector: controllerWiring.refreshChatSelector,
    updateStatus: stateStore.updateStatus,
  };
}

/**
 * @param {{ controllerWiring: AnyRecord, stateStore: AnyRecord }} params
 */
export function createRuntimeDeps({ controllerWiring, stateStore }) {
  return {
    updateStatus: stateStore.updateStatus,
    applyCustomRange: controllerWiring.applyCustomRange,
    updateWeekdayState: stateStore.updateWeekdayState,
    ensureWeekdayDayFilters: controllerWiring.ensureWeekdayDayFilters,
    syncWeekdayControlsWithState: controllerWiring.syncWeekdayControlsWithState,
    rerenderWeekdayFromState: controllerWiring.rerenderWeekdayFromState,
    ensureWeekdayHourFilters: controllerWiring.ensureWeekdayHourFilters,
    updateHourlyState: stateStore.updateHourlyState,
    getHourlyState: stateStore.getHourlyState,
    ensureDayFilters: controllerWiring.ensureDayFilters,
    syncHourlyControlsWithState: controllerWiring.syncHourlyControlsWithState,
    rerenderHourlyFromState: controllerWiring.rerenderHourlyFromState,
  };
}
