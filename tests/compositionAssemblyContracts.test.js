import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const applyEntriesToApp = vi.fn(async () => ({}));
  const loadRemoteChat = vi.fn(async () => {});
  const handleChatSelectionChangeCore = vi.fn(async () => {});
  return {
    applyEntriesToApp,
    loadRemoteChat,
    handleChatSelectionChangeCore,
    createExportRuntime: vi.fn(() => ({
      exportParticipants: vi.fn(),
      exportHourly: vi.fn(),
      exportDaily: vi.fn(),
      exportWeekly: vi.fn(),
      exportWeekday: vi.fn(),
      exportTimeOfDay: vi.fn(),
      exportMessageTypes: vi.fn(),
      exportChatJson: vi.fn(),
      exportSentiment: vi.fn(),
      exportSearchResults: vi.fn(),
      handleDownloadMarkdownReport: vi.fn(),
      handleDownloadSlidesReport: vi.fn(),
      exportMessageSubtype: vi.fn(),
      handleDownloadPdfReport: vi.fn(),
    })),
    createDatasetLifecycleRuntime: vi.fn(() => ({
      applyEntriesToApp,
    })),
    createBusyRuntimeController: vi.fn(() => ({
      withGlobalBusy: vi.fn(async task => task()),
    })),
    createRelayRuntime: vi.fn(() => ({
      startRelaySession: vi.fn(),
      stopRelaySession: vi.fn(),
      syncRelayChats: vi.fn(),
      loadRemoteChat,
      isLogDrawerOpen: vi.fn(() => false),
      openLogDrawer: vi.fn(),
      closeLogDrawer: vi.fn(),
      initRelayControls: vi.fn(),
    })),
  };
});

vi.mock("../js/appShell/index.js", () => ({
  createExportRuntime: h.createExportRuntime,
  createDatasetLifecycleRuntime: h.createDatasetLifecycleRuntime,
  createBusyRuntimeController: h.createBusyRuntimeController,
  createRelayRuntime: h.createRelayRuntime,
}));

import { createAppCompositionAssembly } from "../js/appShell/compositionAssembly.js";

describe("compositionAssembly contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assembles runtimes and wires chat-selection dependencies", async () => {
    const handleUpdateStatus = vi.fn();

    const result = createAppCompositionAssembly({
      dom: {
        rangeSelect: document.createElement("select"),
        globalProgressEl: document.createElement("div"),
        globalProgressLabel: document.createElement("div"),
        relayStartButton: document.createElement("button"),
        relayStopButton: document.createElement("button"),
        relayLogoutButton: document.createElement("button"),
        relayReloadAllButton: document.createElement("button"),
        relayStatusEl: document.createElement("div"),
        relayAccountEl: document.createElement("div"),
        relayQrContainer: document.createElement("div"),
        relayQrImage: document.createElement("img"),
        relayHelpText: document.createElement("div"),
        relayBannerEl: document.createElement("div"),
        relayBannerMessage: document.createElement("div"),
        relayBannerMeta: document.createElement("div"),
        relayOnboardingSteps: [],
        logDrawerToggleButton: document.createElement("button"),
        logDrawerEl: document.createElement("div"),
        logDrawerList: document.createElement("div"),
        logDrawerConnectionLabel: document.createElement("div"),
        relayClearStorageButton: document.createElement("button"),
        relaySyncProgressEl: document.createElement("div"),
        relaySyncChatsMeta: document.createElement("div"),
        relaySyncMessagesMeta: document.createElement("div"),
        logDrawerCloseButton: document.createElement("button"),
        logDrawerClearButton: document.createElement("button"),
      },
      state: {
        getDatasetFingerprint: vi.fn(() => "fp"),
        getDatasetAnalytics: vi.fn(() => ({})),
        getDatasetEntries: vi.fn(() => []),
        getDatasetLabel: vi.fn(() => "Demo"),
        getCurrentRange: vi.fn(() => "all"),
        getSearchState: vi.fn(() => ({})),
        updateStatus: handleUpdateStatus,
        setDatasetEntries: vi.fn(),
        setDatasetFingerprint: vi.fn(),
        setDatasetParticipantDirectory: vi.fn(),
        clearAnalyticsCache: vi.fn(),
        setDatasetLabel: vi.fn(),
        setCurrentRange: vi.fn(),
        setCustomRange: vi.fn(),
        resetHourlyFilters: vi.fn(),
        resetWeekdayFilters: vi.fn(),
        computeDatasetFingerprint: vi.fn(() => "fp"),
        saveChatDataset: vi.fn(() => ({ id: "dataset-1" })),
        setCachedAnalytics: vi.fn(),
        setDatasetAnalytics: vi.fn(),
        setActiveChatId: vi.fn(),
        getChatDatasetById: vi.fn(() => null),
        setDatasetEmptyMessage: vi.fn(),
        fetchJson: vi.fn(async () => ({})),
      },
      utils: {
        formatNumber: value => String(value),
        formatFloat: value => String(value),
        formatTimestampDisplay: value => String(value),
      },
      analytics: {
        computeTimeOfDayDataset: vi.fn(() => ({ data: [] })),
        formatHourLabel: vi.fn(hour => String(hour)),
      },
      constants: {
        brandName: "ChatScope",
        apiBase: "http://127.0.0.1:3334",
      },
      wiring: {
        getExportFilterSummary: vi.fn(() => ["all"]),
        getExportThemeConfig: vi.fn(() => ({ id: "clean" })),
        getParticipantView: vi.fn(() => ({ rows: [] })),
        describeRange: vi.fn(() => "All"),
        filterEntriesByRange: vi.fn(entries => entries),
        normalizeRangeValue: vi.fn(value => value),
        analyticsRequestTracker: {
          nextToken: vi.fn(() => 1),
          isAnalyticsRequestCurrent: vi.fn(() => true),
        },
        computeAnalyticsWithWorker: vi.fn(async () => ({ total_messages: 0 })),
        renderDashboard: vi.fn(),
        updateCustomRangeBounds: vi.fn(),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
        refreshChatSelector: vi.fn(async () => {}),
        savedViewsController: { resetForNewDataset: vi.fn() },
        searchController: { resetState: vi.fn(), populateParticipants: vi.fn() },
        setDashboardLoadingState: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        updateHeroRelayStatus: vi.fn(),
        handleChatSelectionChangeCore: h.handleChatSelectionChangeCore,
      },
    });

    expect(h.createExportRuntime).toHaveBeenCalledTimes(1);
    expect(h.createDatasetLifecycleRuntime).toHaveBeenCalledTimes(1);
    expect(h.createBusyRuntimeController).toHaveBeenCalledTimes(1);
    expect(h.createRelayRuntime).toHaveBeenCalledTimes(1);

    const event = { target: { value: "remote:abc", disabled: false } };
    await result.handleChatSelectionChange(event);

    expect(h.handleChatSelectionChangeCore).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        applyEntriesToApp: h.applyEntriesToApp,
        loadRemoteChat: h.loadRemoteChat,
        updateStatus: handleUpdateStatus,
      }),
    );
    expect(typeof result.syncRelayChats).toBe("function");
    expect(typeof result.exportParticipants).toBe("function");
  });
});
