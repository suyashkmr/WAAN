import {
  formatNumber,
  formatFloat,
  formatTimestampDisplay,
  sanitizeText,
  toISODate,
  formatDisplayDate,
} from "../utils.js";
import { getTimestamp } from "../analytics.js";
import { formatHourLabel, computeTimeOfDayDataset } from "../analytics/activity.js";

export function createControllerWiringConfig({
  filterRefs,
  dashboardRefs,
  savedViewRefs,
  searchRefs,
  runtimeRefs,
  stateStore,
  brandName,
  searchResultLimit,
  datasetEmptyStateManager,
  setDatasetEmptyMessage,
}) {
  const controllerWiringState = {
    listChatDatasets: stateStore.listChatDatasets,
    getActiveChatId: stateStore.getActiveChatId,
    setActiveChatId: stateStore.setActiveChatId,
    getDatasetEntries: stateStore.getDatasetEntries,
    getDatasetLabel: stateStore.getDatasetLabel,
    setCurrentRange: stateStore.setCurrentRange,
    setCustomRange: stateStore.setCustomRange,
    getCustomRange: stateStore.getCustomRange,
    getCachedAnalytics: stateStore.getCachedAnalytics,
    setCachedAnalytics: stateStore.setCachedAnalytics,
    setDatasetAnalytics: stateStore.setDatasetAnalytics,
    updateStatus: stateStore.updateStatus,
    getDatasetAnalytics: stateStore.getDatasetAnalytics,
    getCurrentRange: stateStore.getCurrentRange,
    addSavedView: stateStore.addSavedView,
    getSavedViews: stateStore.getSavedViews,
    updateSavedView: stateStore.updateSavedView,
    removeSavedView: stateStore.removeSavedView,
    clearSavedViews: stateStore.clearSavedViews,
    getCompareSelection: stateStore.getCompareSelection,
    setCompareSelection: stateStore.setCompareSelection,
    getHourlyState: stateStore.getHourlyState,
    updateHourlyState: stateStore.updateHourlyState,
    getWeekdayState: stateStore.getWeekdayState,
    updateWeekdayState: stateStore.updateWeekdayState,
  };
  const controllerWiringUtils = {
    formatNumber,
    formatFloat,
    sanitizeText,
    formatDisplayDate,
    getTimestamp,
    toISODate,
  };

  return {
    filterRefs,
    dashboardRefs,
    savedViewRefs,
    searchRefs,
    runtimeRefs,
    state: controllerWiringState,
    utils: controllerWiringUtils,
    brandName,
    searchResultLimit,
    datasetEmptyStateManager,
    setDatasetEmptyMessage,
  };
}

export function createCompositionAssemblyConfig({
  filterRefs,
  runtimeRefs,
  relayRefs,
  stateStore,
  setDatasetEmptyMessage,
  fetchJson,
  brandName,
  apiBase,
  wiring,
  electronAPI,
}) {
  const compositionAssemblyState = {
    getDatasetFingerprint: stateStore.getDatasetFingerprint,
    getDatasetAnalytics: stateStore.getDatasetAnalytics,
    getDatasetEntries: stateStore.getDatasetEntries,
    getDatasetLabel: stateStore.getDatasetLabel,
    getCurrentRange: stateStore.getCurrentRange,
    getSearchState: stateStore.getSearchState,
    updateStatus: stateStore.updateStatus,
    setDatasetEntries: stateStore.setDatasetEntries,
    setDatasetFingerprint: stateStore.setDatasetFingerprint,
    setDatasetParticipantDirectory: stateStore.setDatasetParticipantDirectory,
    clearAnalyticsCache: stateStore.clearAnalyticsCache,
    setDatasetLabel: stateStore.setDatasetLabel,
    setCurrentRange: stateStore.setCurrentRange,
    setCustomRange: stateStore.setCustomRange,
    resetHourlyFilters: stateStore.resetHourlyFilters,
    resetWeekdayFilters: stateStore.resetWeekdayFilters,
    computeDatasetFingerprint: stateStore.computeDatasetFingerprint,
    saveChatDataset: stateStore.saveChatDataset,
    setCachedAnalytics: stateStore.setCachedAnalytics,
    setDatasetAnalytics: stateStore.setDatasetAnalytics,
    setActiveChatId: stateStore.setActiveChatId,
    getChatDatasetById: stateStore.getChatDatasetById,
    setDatasetEmptyMessage,
    fetchJson,
  };
  const compositionAssemblyUtils = {
    formatNumber,
    formatFloat,
    formatTimestampDisplay,
  };

  return {
    filterRefs,
    runtimeRefs,
    relayRefs,
    state: compositionAssemblyState,
    utils: compositionAssemblyUtils,
    analytics: {
      computeTimeOfDayDataset,
      formatHourLabel,
    },
    brandName,
    apiBase,
    wiring,
    electronAPI,
  };
}
