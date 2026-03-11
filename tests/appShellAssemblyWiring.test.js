import { describe, it, expect, vi } from "vitest";
import {
  createCompositionAssemblyWiring,
  createRuntimeHandlers,
  createRuntimeDeps,
  createDatasetEmptyButtons,
} from "../js/appShell/assemblyWiring.js";

describe("appShell assembly wiring", () => {
  it("keeps composition/runtime API surfaces stable for orchestration wiring", () => {
    const controllerWiring = {
      getExportFilterSummary: vi.fn(),
      getExportThemeConfig: vi.fn(),
      getParticipantView: vi.fn(),
      describeRange: vi.fn(),
      filterEntriesByRange: vi.fn(),
      normalizeRangeValue: vi.fn(),
      analyticsRequestTracker: {},
      computeAnalyticsWithWorker: vi.fn(),
      renderDashboard: vi.fn(),
      updateCustomRangeBounds: vi.fn(),
      encodeChatSelectorValue: vi.fn(),
      setRemoteChatList: vi.fn(),
      getRemoteChatList: vi.fn(),
      getRemoteChatsLastFetchedAt: vi.fn(),
      refreshChatSelector: vi.fn(),
      savedViewsController: {},
      searchController: {},
      setDashboardLoadingState: vi.fn(),
      setDataAvailabilityState: vi.fn(),
      updateHeroRelayStatus: vi.fn(),
      handleChatSelectionChangeCore: vi.fn(),
      handleRangeChange: vi.fn(),
      initThemeControls: vi.fn(),
      setThemePreference: vi.fn(),
      getDataAvailable: vi.fn(),
      applyCustomRange: vi.fn(),
      ensureWeekdayDayFilters: vi.fn(),
      syncWeekdayControlsWithState: vi.fn(),
      rerenderWeekdayFromState: vi.fn(),
      ensureWeekdayHourFilters: vi.fn(),
      ensureDayFilters: vi.fn(),
      syncHourlyControlsWithState: vi.fn(),
      rerenderHourlyFromState: vi.fn(),
    };
    const compositionAssembly = {
      handleChatSelectionChange: vi.fn(),
      exportParticipants: vi.fn(),
      exportHourly: vi.fn(),
      exportDaily: vi.fn(),
      exportWeekly: vi.fn(),
      exportWeekday: vi.fn(),
      exportTimeOfDay: vi.fn(),
      exportMessageTypes: vi.fn(),
      exportChatJson: vi.fn(),
      exportSentiment: vi.fn(),
      exportMessageSubtype: vi.fn(),
      handleDownloadMarkdownReport: vi.fn(),
      handleDownloadSlidesReport: vi.fn(),
      exportSearchResults: vi.fn(),
      handleDownloadPdfReport: vi.fn(),
      initRelayControls: vi.fn(),
      startRelaySession: vi.fn(),
      stopRelaySession: vi.fn(),
    };
    const stateStore = {
      updateStatus: vi.fn(),
      updateWeekdayState: vi.fn(),
      updateHourlyState: vi.fn(),
      getHourlyState: vi.fn(),
    };

    expect(Object.keys(createCompositionAssemblyWiring(controllerWiring)).sort()).toEqual([
      "analyticsRequestTracker",
      "computeAnalyticsWithWorker",
      "describeRange",
      "encodeChatSelectorValue",
      "filterEntriesByRange",
      "getExportFilterSummary",
      "getExportThemeConfig",
      "getParticipantView",
      "getRemoteChatList",
      "getRemoteChatsLastFetchedAt",
      "handleChatSelectionChangeCore",
      "normalizeRangeValue",
      "refreshChatSelector",
      "renderDashboard",
      "savedViewsController",
      "searchController",
      "setDashboardLoadingState",
      "setDataAvailabilityState",
      "setRemoteChatList",
      "updateCustomRangeBounds",
      "updateHeroRelayStatus",
    ]);

    expect(
      Object.keys(createRuntimeHandlers({ controllerWiring, compositionAssembly, stateStore })).sort(),
    ).toEqual([
      "exportChatJson",
      "exportDaily",
      "exportHourly",
      "exportMessageSubtype",
      "exportMessageTypes",
      "exportParticipants",
      "exportSearchResults",
      "exportSentiment",
      "exportTimeOfDay",
      "exportWeekday",
      "exportWeekly",
      "getDataAvailable",
      "handleChatSelectionChange",
      "handleDownloadMarkdownReport",
      "handleDownloadPdfReport",
      "handleDownloadSlidesReport",
      "handleRangeChange",
      "initRelayControls",
      "initThemeControls",
      "refreshChatSelector",
      "savedViewsController",
      "searchController",
      "setDataAvailabilityState",
      "setThemePreference",
      "startRelaySession",
      "stopRelaySession",
      "updateStatus",
    ]);

    expect(Object.keys(createRuntimeDeps({ controllerWiring, stateStore })).sort()).toEqual([
      "applyCustomRange",
      "ensureDayFilters",
      "ensureWeekdayDayFilters",
      "ensureWeekdayHourFilters",
      "getHourlyState",
      "rerenderHourlyFromState",
      "rerenderWeekdayFromState",
      "syncHourlyControlsWithState",
      "syncWeekdayControlsWithState",
      "updateHourlyState",
      "updateStatus",
      "updateWeekdayState",
    ]);
  });

  it("creates composition assembly wiring from controller wiring surface", () => {
    const controllerWiring = {
      getExportFilterSummary: vi.fn(),
      getExportThemeConfig: vi.fn(),
      getParticipantView: vi.fn(),
      describeRange: vi.fn(),
      filterEntriesByRange: vi.fn(),
      normalizeRangeValue: vi.fn(),
      analyticsRequestTracker: {},
      computeAnalyticsWithWorker: vi.fn(),
      renderDashboard: vi.fn(),
      updateCustomRangeBounds: vi.fn(),
      encodeChatSelectorValue: vi.fn(),
      setRemoteChatList: vi.fn(),
      getRemoteChatList: vi.fn(),
      getRemoteChatsLastFetchedAt: vi.fn(),
      refreshChatSelector: vi.fn(),
      savedViewsController: {},
      searchController: {},
      setDashboardLoadingState: vi.fn(),
      setDataAvailabilityState: vi.fn(),
      updateHeroRelayStatus: vi.fn(),
      handleChatSelectionChangeCore: vi.fn(),
    };

    const wiring = createCompositionAssemblyWiring(controllerWiring);
    expect(wiring.handleChatSelectionChangeCore).toBe(controllerWiring.handleChatSelectionChangeCore);
    expect(wiring.searchController).toBe(controllerWiring.searchController);
    expect(wiring.savedViewsController).toBe(controllerWiring.savedViewsController);
  });

  it("creates runtime handler and dependency bundles for bootstrap", () => {
    const controllerWiring = {
      handleRangeChange: vi.fn(),
      initThemeControls: vi.fn(),
      setThemePreference: vi.fn(),
      setDataAvailabilityState: vi.fn(),
      searchController: {},
      savedViewsController: {},
      getDataAvailable: vi.fn(),
      refreshChatSelector: vi.fn(),
      applyCustomRange: vi.fn(),
      ensureWeekdayDayFilters: vi.fn(),
      syncWeekdayControlsWithState: vi.fn(),
      rerenderWeekdayFromState: vi.fn(),
      ensureWeekdayHourFilters: vi.fn(),
      ensureDayFilters: vi.fn(),
      syncHourlyControlsWithState: vi.fn(),
      rerenderHourlyFromState: vi.fn(),
    };
    const compositionAssembly = {
      handleChatSelectionChange: vi.fn(),
      exportParticipants: vi.fn(),
      exportHourly: vi.fn(),
      exportDaily: vi.fn(),
      exportWeekly: vi.fn(),
      exportWeekday: vi.fn(),
      exportTimeOfDay: vi.fn(),
      exportMessageTypes: vi.fn(),
      exportChatJson: vi.fn(),
      exportSentiment: vi.fn(),
      exportMessageSubtype: vi.fn(),
      handleDownloadMarkdownReport: vi.fn(),
      handleDownloadSlidesReport: vi.fn(),
      exportSearchResults: vi.fn(),
      handleDownloadPdfReport: vi.fn(),
      initRelayControls: vi.fn(),
      startRelaySession: vi.fn(),
      stopRelaySession: vi.fn(),
    };
    const stateStore = {
      updateStatus: vi.fn(),
      updateWeekdayState: vi.fn(),
      updateHourlyState: vi.fn(),
      getHourlyState: vi.fn(),
    };

    const handlers = createRuntimeHandlers({
      controllerWiring,
      compositionAssembly,
      stateStore,
    });
    const deps = createRuntimeDeps({
      controllerWiring,
      stateStore,
    });

    expect(handlers.handleChatSelectionChange).toBe(compositionAssembly.handleChatSelectionChange);
    expect(handlers.handleRangeChange).toBe(controllerWiring.handleRangeChange);
    expect(handlers.updateStatus).toBe(stateStore.updateStatus);
    expect(deps.applyCustomRange).toBe(controllerWiring.applyCustomRange);
    expect(deps.updateHourlyState).toBe(stateStore.updateHourlyState);
  });

  it("returns dataset empty-state export button list in stable order", () => {
    const exportRefs = {
      downloadPdfButton: { id: "pdf" },
      downloadMarkdownButton: { id: "md" },
      downloadSlidesButton: { id: "slides" },
      downloadChatJsonButton: { id: "chat-json" },
      downloadParticipantsButton: { id: "participants" },
      downloadHourlyButton: { id: "hourly" },
      downloadDailyButton: { id: "daily" },
      downloadWeeklyButton: { id: "weekly" },
      downloadWeekdayButton: { id: "weekday" },
      downloadTimeOfDayButton: { id: "timeofday" },
      downloadMessageTypesButton: { id: "types" },
      downloadSentimentButton: { id: "sentiment" },
      downloadSearchButton: { id: "search" },
    };

    const buttons = createDatasetEmptyButtons(exportRefs);
    expect(buttons).toHaveLength(13);
    expect(buttons[0]).toBe(exportRefs.downloadPdfButton);
    expect(buttons[12]).toBe(exportRefs.downloadSearchButton);
  });
});
