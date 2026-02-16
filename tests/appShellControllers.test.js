import { describe, it, expect, vi, afterEach } from "vitest";
import { createDatasetLifecycleController } from "../js/appShell/datasetLifecycle.js";
import { createRelayBootstrapController } from "../js/appShell/relayBootstrap.js";
import { createEventBindingsController } from "../js/appShell/eventBindings.js";
import { createDataStatusController } from "../js/appShell/dataStatus.js";

describe("appShell controllers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("datasetLifecycle applyEntriesToApp resets state and persists dataset", async () => {
    const rangeSelect = document.createElement("select");
    const optionAll = document.createElement("option");
    optionAll.value = "all";
    rangeSelect.appendChild(optionAll);
    rangeSelect.value = "custom";

    const analytics = {
      total_messages: 2,
      date_range: { start: "2025-01-01", end: "2025-01-02" },
    };

    let requestToken = 0;
    const deps = {
      setDatasetEntries: vi.fn(),
      setDatasetFingerprint: vi.fn(),
      setDatasetParticipantDirectory: vi.fn(),
      clearAnalyticsCache: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
      setCustomRange: vi.fn(),
      resetHourlyFilters: vi.fn(),
      resetWeekdayFilters: vi.fn(),
      computeDatasetFingerprint: vi.fn(() => "fp-1"),
      saveChatDataset: vi.fn(() => ({ id: "dataset-1" })),
      setCachedAnalytics: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setActiveChatId: vi.fn(),
      computeAnalyticsWithWorker: vi.fn(async () => analytics),
      renderDashboard: vi.fn(),
      updateCustomRangeBounds: vi.fn(),
      encodeChatSelectorValue: vi.fn((kind, id) => `${kind}:${id}`),
      refreshChatSelector: vi.fn(async () => {}),
      updateStatus: vi.fn(),
      setDashboardLoadingState: vi.fn(),
      formatNumber: value => String(value),
      nextAnalyticsRequestToken: vi.fn(() => {
        requestToken += 1;
        return requestToken;
      }),
      isAnalyticsRequestCurrent: vi.fn(token => token === requestToken),
      resetSavedViewsForNewDataset: vi.fn(),
      resetSearchState: vi.fn(),
      populateSearchParticipants: vi.fn(),
    };

    const { applyEntriesToApp } = createDatasetLifecycleController({
      elements: { rangeSelect },
      deps,
    });

    const result = await applyEntriesToApp(
      [
        { sender: "Ana", sender_id: "ana", message: "hello", timestamp: "2025-01-01T00:00:00Z" },
        { sender: "Ben", sender_id: "ben", message: "hi", timestamp: "2025-01-02T00:00:00Z" },
      ],
      "Demo",
      { entriesNormalized: true, analyticsOverride: analytics },
    );

    expect(deps.setCurrentRange).toHaveBeenCalledWith("all");
    expect(deps.setCustomRange).toHaveBeenCalledWith(null);
    expect(rangeSelect.value).toBe("all");
    expect(deps.saveChatDataset).toHaveBeenCalledTimes(1);
    expect(deps.setActiveChatId).toHaveBeenCalledWith("local:dataset-1");
    expect(deps.renderDashboard).toHaveBeenCalledWith(analytics);
    expect(deps.refreshChatSelector).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ analytics, datasetId: "dataset-1" });
  });

  it("relayBootstrap wires controls and starts polling", async () => {
    const relayStartButton = document.createElement("button");
    const relayStopButton = document.createElement("button");
    const relayLogoutButton = document.createElement("button");
    const relayReloadAllButton = document.createElement("button");
    const relayClearStorageButton = document.createElement("button");
    const logDrawerToggleButton = document.createElement("button");
    const logDrawerCloseButton = document.createElement("button");
    const logDrawerClearButton = document.createElement("button");
    const relayStatusEl = document.createElement("div");

    const handlers = {
      handleRelayPrimaryActionClick: vi.fn(),
      stopRelaySession: vi.fn(),
      logoutRelaySession: vi.fn(),
      handleReloadAllChats: vi.fn(),
      openLogDrawer: vi.fn(),
      closeLogDrawer: vi.fn(),
      handleLogClear: vi.fn(),
      handleLogDrawerDocumentClick: vi.fn(),
      handleLogDrawerKeydown: vi.fn(),
      refreshRelayStatus: vi.fn(async () => {}),
      startStatusPolling: vi.fn(),
      initLogStream: vi.fn(),
    };

    const deps = {
      fetchJson: vi.fn(async () => ({})),
      apiBase: "http://127.0.0.1:3334",
      setRemoteChatList: vi.fn(),
      refreshChatSelector: vi.fn(async () => {}),
      updateStatus: vi.fn(),
    };

    const { initRelayControls, handleClearStorageClick } = createRelayBootstrapController({
      elements: {
        relayStartButton,
        relayStatusEl,
        relayStopButton,
        relayLogoutButton,
        relayReloadAllButton,
        relayClearStorageButton,
        logDrawerToggleButton,
        logDrawerCloseButton,
        logDrawerClearButton,
      },
      handlers,
      deps,
    });

    initRelayControls();
    relayStartButton.click();
    relayStopButton.click();
    relayLogoutButton.click();
    relayReloadAllButton.click();
    logDrawerToggleButton.click();
    logDrawerCloseButton.click();
    logDrawerClearButton.click();

    await Promise.resolve();

    expect(handlers.handleRelayPrimaryActionClick).toHaveBeenCalledTimes(1);
    expect(handlers.stopRelaySession).toHaveBeenCalledTimes(1);
    expect(handlers.logoutRelaySession).toHaveBeenCalledTimes(1);
    expect(handlers.handleReloadAllChats).toHaveBeenCalledTimes(1);
    expect(handlers.openLogDrawer).toHaveBeenCalledTimes(1);
    expect(handlers.closeLogDrawer).toHaveBeenCalledTimes(1);
    expect(handlers.handleLogClear).toHaveBeenCalledTimes(1);
    expect(handlers.refreshRelayStatus).toHaveBeenCalledWith({ silent: true });
    expect(handlers.startStatusPolling).toHaveBeenCalledTimes(1);
    expect(handlers.initLogStream).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn(() => true),
    });
    await handleClearStorageClick();
    expect(deps.fetchJson).toHaveBeenCalledWith("http://127.0.0.1:3334/chats/clear", { method: "POST" });
    expect(deps.setRemoteChatList).toHaveBeenCalledWith([]);
    expect(deps.refreshChatSelector).toHaveBeenCalled();
  });

  it("eventBindings handles custom range validation and apply", async () => {
    const chatSelector = document.createElement("select");
    const rangeSelect = document.createElement("select");
    const customApplyButton = document.createElement("button");
    const customStartInput = document.createElement("input");
    const customEndInput = document.createElement("input");

    const handlers = {
      handleChatSelectionChange: vi.fn(),
      handleRangeChange: vi.fn(),
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
      handleParticipantsTopChange: vi.fn(),
      handleParticipantsSortChange: vi.fn(),
      handleParticipantsTimeframeChange: vi.fn(),
      handleParticipantPresetClick: vi.fn(),
      handleParticipantRowToggle: vi.fn(),
    };

    const deps = {
      updateStatus: vi.fn(),
      applyCustomRange: vi.fn(async () => {}),
      updateWeekdayState: vi.fn(),
      ensureWeekdayDayFilters: vi.fn(),
      rerenderWeekdayFromState: vi.fn(),
      ensureWeekdayHourFilters: vi.fn(),
      updateHourlyState: vi.fn(),
      getHourlyState: vi.fn(() => ({ filters: {}, brush: { start: 0, end: 23 } })),
      ensureDayFilters: vi.fn(),
      syncHourlyControlsWithState: vi.fn(),
      rerenderHourlyFromState: vi.fn(),
    };

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        chatSelector,
        rangeSelect,
        customApplyButton,
        customStartInput,
        customEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    chatSelector.dispatchEvent(new Event("change"));
    rangeSelect.dispatchEvent(new Event("change"));
    expect(handlers.handleChatSelectionChange).toHaveBeenCalledTimes(1);
    expect(handlers.handleRangeChange).toHaveBeenCalledTimes(1);

    customApplyButton.click();
    await Promise.resolve();
    expect(deps.updateStatus).toHaveBeenCalledWith("Please pick both a start and end date.", "warning");

    customStartInput.value = "2025-01-01";
    customEndInput.value = "2025-01-31";
    customApplyButton.click();
    await Promise.resolve();
    expect(deps.applyCustomRange).toHaveBeenCalledWith("2025-01-01", "2025-01-31");
  });

  it("dataStatus updates empty-state and relay hero", () => {
    const dashboardRoot = document.createElement("main");
    const heroStatusBadge = document.createElement("span");
    const heroStatusCopy = document.createElement("span");

    const datasetEmptyStateManager = {
      setAvailability: vi.fn(),
    };

    const deps = {
      setDatasetEmptyMessage: vi.fn(),
      savedViewsController: {
        setDataAvailability: vi.fn(),
        refreshUI: vi.fn(),
      },
      formatRelayAccount: vi.fn(() => "Alice"),
      formatNumber: vi.fn(value => String(value)),
    };

    const controller = createDataStatusController({
      elements: {
        dashboardRoot,
        heroStatusBadge,
        heroStatusCopy,
        datasetEmptyStateManager,
      },
      deps,
    });

    controller.setDashboardLoadingState(true);
    expect(dashboardRoot.classList.contains("is-loading")).toBe(true);

    controller.setDataAvailabilityState(false);
    expect(datasetEmptyStateManager.setAvailability).toHaveBeenCalledWith(false);
    expect(deps.setDatasetEmptyMessage).toHaveBeenCalled();
    expect(deps.savedViewsController.setDataAvailability).toHaveBeenCalledWith(false);
    expect(controller.getDataAvailable()).toBe(false);

    controller.updateHeroRelayStatus({ status: "running", account: { wid: "1@c.us" }, chatCount: 42 });
    expect(heroStatusBadge.textContent).toContain("Connected");
    expect(heroStatusCopy.textContent).toContain("42 chats indexed.");
  });
});
