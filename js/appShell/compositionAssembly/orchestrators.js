import {
  createExportRuntime,
  createDatasetLifecycleRuntime,
  createBusyRuntimeController,
  createRelayRuntime,
} from "../index.js";
import { createRelayCompositionAdapter } from "./relayAdapter.js";
import { createDatasetLifecycleCompositionAdapter } from "./datasetAdapter.js";

export function createExportOrchestrator({ state, utils, analytics, constants, wiring }) {
  return createExportRuntime({
    brandName: constants.brandName,
    getExportFilterSummary: wiring.getExportFilterSummary,
    getExportThemeConfig: wiring.getExportThemeConfig,
    getDatasetFingerprint: state.getDatasetFingerprint,
    getDatasetAnalytics: state.getDatasetAnalytics,
    getDatasetEntries: state.getDatasetEntries,
    getDatasetLabel: state.getDatasetLabel,
    getCurrentRange: state.getCurrentRange,
    getParticipantView: wiring.getParticipantView,
    getSearchState: state.getSearchState,
    updateStatus: state.updateStatus,
    formatNumber: utils.formatNumber,
    formatFloat: utils.formatFloat,
    formatTimestampDisplay: utils.formatTimestampDisplay,
    computeTimeOfDayDataset: analytics.computeTimeOfDayDataset,
    formatHourLabel: analytics.formatHourLabel,
    describeRange: wiring.describeRange,
    filterEntriesByRange: wiring.filterEntriesByRange,
    normalizeRangeValue: wiring.normalizeRangeValue,
  });
}

export function createDatasetRelayOrchestrator({
  dom,
  state,
  utils,
  constants,
  wiring,
  electronAPI,
}) {
  const datasetAdapter = createDatasetLifecycleCompositionAdapter({
    dom,
    state,
    utils,
    wiring,
  });
  const { applyEntriesToApp } = createDatasetLifecycleRuntime(datasetAdapter);

  const busyRuntimeController = createBusyRuntimeController({
    globalProgressEl: dom.globalProgressEl,
    globalProgressLabel: dom.globalProgressLabel,
  });
  const { withGlobalBusy } = busyRuntimeController;
  const relayAdapter = createRelayCompositionAdapter({
    dom,
    state,
    wiring,
    withGlobalBusy,
    applyEntriesToApp,
  });

  const relayRuntime = createRelayRuntime({
    relayElements: relayAdapter.relayElements,
    relayHelpers: relayAdapter.relayHelpers,
    electronAPI,
    bootstrapElements: relayAdapter.bootstrapElements,
    fetchJson: state.fetchJson,
    apiBase: constants.apiBase,
    setRemoteChatList: wiring.setRemoteChatList,
    refreshChatSelector: wiring.refreshChatSelector,
    updateStatus: state.updateStatus,
  });

  return {
    applyEntriesToApp,
    ...relayRuntime,
  };
}

export function createSelectionOrchestrator({ wiring, loadRemoteChat, updateStatus }) {
  return async function handleChatSelectionChange(event) {
    return wiring.handleChatSelectionChangeCore(event, {
      loadRemoteChat,
      updateStatus,
    });
  };
}
