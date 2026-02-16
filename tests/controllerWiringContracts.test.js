import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const searchController = {
    populateParticipants: vi.fn(),
    renderResults: vi.fn(),
    resetState: vi.fn(),
  };
  const savedViewsController = {
    resetForNewDataset: vi.fn(),
  };
  const themeUiController = {
    initThemeControls: vi.fn(),
    getExportThemeConfig: vi.fn(() => ({ id: "theme" })),
  };
  const dashboardController = {
    renderDashboard: vi.fn(),
    renderParticipants: vi.fn(),
    ensureWeekdayDayFilters: vi.fn(),
    ensureWeekdayHourFilters: vi.fn(),
    syncWeekdayControlsWithState: vi.fn(),
    rerenderHourlyFromState: vi.fn(),
    rerenderWeekdayFromState: vi.fn(),
    ensureDayFilters: vi.fn(),
    ensureHourFilters: vi.fn(),
    syncHourlyControlsWithState: vi.fn(),
  };

  return {
    searchController,
    savedViewsController,
    themeUiController,
    dashboardController,
    handleChatSelectionChange: vi.fn(),
    setDashboardLoadingState: vi.fn(),
    setDataAvailabilityState: vi.fn(),
    updateHeroRelayStatus: vi.fn(),
    getDataAvailable: vi.fn(() => true),
    getExportFilterSummary: vi.fn(() => ["range: all"]),
    getParticipantView: vi.fn(() => ({ id: "participants" })),
    createSavedViewsController: vi.fn(() => savedViewsController),
    createDashboardRuntime: vi.fn(() => ({
      controller: dashboardController,
      getParticipantView: vi.fn(() => ({ id: "participants" })),
    })),
    createDataStatusController: vi.fn(() => ({
      setDashboardLoadingState: vi.fn(),
      setDataAvailabilityState: vi.fn(),
      updateHeroRelayStatus: vi.fn(),
      getDataAvailable: vi.fn(() => true),
    })),
  };
});

vi.mock("../js/search.js", () => ({
  createSearchController: vi.fn(() => h.searchController),
}));

vi.mock("../js/savedViews.js", () => ({
  createSavedViewsController: h.createSavedViewsController,
}));

vi.mock("../js/theme.js", () => ({
  EXPORT_THEME_STYLES: { clean: {} },
}));

vi.mock("../js/appShell/index.js", () => ({
  createAnalyticsRequestTracker: vi.fn(() => ({
    nextToken: vi.fn(() => 1),
    isCurrent: vi.fn(() => true),
  })),
  createChatSelectionController: vi.fn(() => ({
    encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
    setRemoteChatList: vi.fn(),
    getRemoteChatList: vi.fn(() => []),
    getRemoteChatsLastFetchedAt: vi.fn(() => 0),
    refreshChatSelector: vi.fn(async () => {}),
    handleChatSelectionChange: h.handleChatSelectionChange,
  })),
  createRangeFiltersController: vi.fn(() => ({
    normalizeRangeValue: vi.fn(value => value),
    filterEntriesByRange: vi.fn(entries => entries),
    describeRange: vi.fn(() => "All time"),
    showCustomControls: vi.fn(),
    updateCustomRangeBounds: vi.fn(),
    applyRangeAndRender: vi.fn(),
    handleRangeChange: vi.fn(),
    applyCustomRange: vi.fn(),
  })),
  createAnalyticsPipeline: vi.fn(() => ({
    computeAnalyticsWithWorker: vi.fn(async () => ({ total_messages: 0 })),
  })),
  createDataStatusController: vi.fn(() => ({
    setDashboardLoadingState: h.setDashboardLoadingState,
    setDataAvailabilityState: h.setDataAvailabilityState,
    updateHeroRelayStatus: h.updateHeroRelayStatus,
    getDataAvailable: h.getDataAvailable,
  })),
  createParticipantInteractionsController: vi.fn(() => ({
    handleParticipantsTopChange: vi.fn(),
    handleParticipantsSortChange: vi.fn(),
    handleParticipantsTimeframeChange: vi.fn(),
    handleParticipantPresetClick: vi.fn(),
    handleParticipantRowToggle: vi.fn(),
  })),
  createExportFilterSummary: vi.fn(() => h.getExportFilterSummary),
  createDashboardRuntime: vi.fn(() => ({
    controller: h.dashboardController,
    getParticipantView: h.getParticipantView,
  })),
  createThemeUiController: vi.fn(() => h.themeUiController),
  formatRelayAccount: vi.fn(() => "Relay User"),
}));

import { createAppControllerWiring } from "../js/appShell/controllerWiring.js";

describe("controllerWiring contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns wiring surface and delegates dashboard passthroughs", () => {
    document.body.innerHTML = `<span class="summary-value"></span>`;

    const dom = {
      chatSelector: document.createElement("select"),
      rangeSelect: document.createElement("select"),
      customControls: document.createElement("div"),
      customStartInput: document.createElement("input"),
      customEndInput: document.createElement("input"),
      customApplyButton: document.createElement("button"),
      searchForm: document.createElement("form"),
      searchKeywordInput: document.createElement("input"),
      searchParticipantSelect: document.createElement("select"),
      searchStartInput: document.createElement("input"),
      searchEndInput: document.createElement("input"),
      resetSearchButton: document.createElement("button"),
      searchResultsSummary: document.createElement("div"),
      searchResultsList: document.createElement("div"),
      searchInsightsEl: document.createElement("div"),
      searchProgressEl: document.createElement("div"),
      searchProgressTrack: document.createElement("div"),
      searchProgressBar: document.createElement("div"),
      searchProgressLabel: document.createElement("div"),
      savedViewNameInput: document.createElement("input"),
      saveViewButton: document.createElement("button"),
      savedViewList: document.createElement("select"),
      applySavedViewButton: document.createElement("button"),
      deleteSavedViewButton: document.createElement("button"),
      savedViewGallery: document.createElement("div"),
      compareViewASelect: document.createElement("select"),
      compareViewBSelect: document.createElement("select"),
      compareViewsButton: document.createElement("button"),
      compareSummaryEl: document.createElement("div"),
      dashboardRoot: document.createElement("main"),
      heroStatusBadge: document.createElement("span"),
      heroStatusCopy: document.createElement("span"),
      participantsTopSelect: document.createElement("select"),
      participantsSortSelect: document.createElement("select"),
      participantsTimeframeSelect: document.createElement("select"),
      participantsBody: document.createElement("tbody"),
      summaryEl: document.createElement("section"),
      participantsNote: document.createElement("div"),
      participantPresetButtons: [],
      themeToggleInputs: [],
    };

    const state = {
      listChatDatasets: vi.fn(() => []),
      getActiveChatId: vi.fn(() => ""),
      setActiveChatId: vi.fn(),
      getDatasetEntries: vi.fn(() => []),
      getDatasetLabel: vi.fn(() => "Demo"),
      setCurrentRange: vi.fn(),
      setCustomRange: vi.fn(),
      getCustomRange: vi.fn(() => null),
      getCachedAnalytics: vi.fn(() => null),
      setCachedAnalytics: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      updateStatus: vi.fn(),
      getDatasetAnalytics: vi.fn(() => ({})),
      getCurrentRange: vi.fn(() => "all"),
      addSavedView: vi.fn(),
      getSavedViews: vi.fn(() => []),
      updateSavedView: vi.fn(),
      removeSavedView: vi.fn(),
      clearSavedViews: vi.fn(),
      getCompareSelection: vi.fn(() => null),
      setCompareSelection: vi.fn(),
      getHourlyState: vi.fn(() => ({ filters: {}, brush: { start: 0, end: 23 } })),
      updateHourlyState: vi.fn(),
      getWeekdayState: vi.fn(() => ({ dayFilter: "all", hourRange: [0, 23] })),
      updateWeekdayState: vi.fn(),
    };

    const result = createAppControllerWiring({
      dom,
      state,
      utils: {
        formatNumber: value => String(value),
        formatFloat: value => String(value),
        sanitizeText: value => String(value),
        formatDisplayDate: value => String(value),
        getTimestamp: () => Date.now(),
        toISODate: () => "2026-01-01",
      },
      constants: {
        brandName: "ChatScope",
        searchResultLimit: 25,
      },
      callbacks: {
        syncHeroPillsWithRange: vi.fn(),
      },
      dataStatus: {
        datasetEmptyStateManager: { setAvailability: vi.fn() },
        setDatasetEmptyMessage: vi.fn(),
      },
    });

    expect(h.setDashboardLoadingState).toHaveBeenCalledWith(true);
    expect(document.querySelector(".summary-value")?.getAttribute("data-skeleton")).toBe("value");
    expect(result.handleChatSelectionChangeCore).toBe(h.handleChatSelectionChange);

    result.renderDashboard({ total_messages: 1 });
    result.ensureDayFilters();
    expect(h.dashboardController.renderDashboard).toHaveBeenCalledWith({ total_messages: 1 });
    expect(h.dashboardController.ensureDayFilters).toHaveBeenCalledTimes(1);

    expect(result.getExportFilterSummary()).toEqual(["range: all"]);
    expect(result.getParticipantView()).toEqual({ id: "participants" });
    expect(typeof result.initThemeControls).toBe("function");
    expect(typeof result.getExportThemeConfig).toBe("function");
    expect(h.createSavedViewsController).toHaveBeenCalledTimes(1);
  });
});
