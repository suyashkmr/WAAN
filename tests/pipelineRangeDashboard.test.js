import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAnalyticsPipeline } from "../js/appShell/analyticsPipeline.js";
import { createRangeFiltersController } from "../js/appShell/rangeFilters.js";

const mocked = vi.hoisted(() => ({
  renderSummarySection: vi.fn(),
  renderSentimentSection: vi.fn(),
  renderMessageTypesSection: vi.fn(),
  renderPollsSection: vi.fn(),
  renderParticipants: vi.fn(),
  renderHourlyPanel: vi.fn(),
  renderDailyPanel: vi.fn(),
  renderWeeklyPanel: vi.fn(),
  renderWeekdayPanel: vi.fn(),
  ensureWeekdayDayFilters: vi.fn(),
  ensureWeekdayHourFilters: vi.fn(),
  syncWeekdayControlsWithState: vi.fn(),
  rerenderHourlyFromState: vi.fn(),
  rerenderWeekdayFromState: vi.fn(),
  ensureDayFilters: vi.fn(),
  ensureHourFilters: vi.fn(),
  syncHourlyControlsWithState: vi.fn(),
  renderHighlights: vi.fn(),
  renderStatistics: vi.fn(),
  formatSentimentScore: vi.fn(() => "0.0"),
  createActivityPanelsControllerArgs: [],
  createActivityPanelsMetaRenderer: vi.fn(() => ({ renderHourlyTopHour: vi.fn() })),
  applyParticipantTopChange: vi.fn(),
  applyParticipantSortChange: vi.fn(),
  applyParticipantTimeframeChange: vi.fn(),
  applyParticipantPreset: vi.fn(),
}));

vi.mock("../js/analytics/summary.js", () => ({
  renderSummaryCards: mocked.renderSummarySection,
}));

vi.mock("../js/analytics/sentiment.js", () => ({
  renderSentimentSection: mocked.renderSentimentSection,
}));

vi.mock("../js/analytics/messageTypes.js", () => ({
  renderMessageTypesSection: mocked.renderMessageTypesSection,
}));

vi.mock("../js/analytics/polls.js", () => ({
  renderPollsSection: mocked.renderPollsSection,
}));

vi.mock("../js/appShell/domCache.js", () => ({
  createDeferredRenderScheduler: () => (cb, _token) => cb(),
}));

vi.mock("../js/appShell/dashboardRender/activityPanels.js", () => ({
  createActivityPanelsController: args => {
    mocked.createActivityPanelsControllerArgs.push(args);
    return {
      renderHourlyPanel: mocked.renderHourlyPanel,
      renderDailyPanel: mocked.renderDailyPanel,
      renderWeeklyPanel: mocked.renderWeeklyPanel,
      renderWeekdayPanel: mocked.renderWeekdayPanel,
      ensureWeekdayDayFilters: mocked.ensureWeekdayDayFilters,
      ensureWeekdayHourFilters: mocked.ensureWeekdayHourFilters,
      syncWeekdayControlsWithState: mocked.syncWeekdayControlsWithState,
      rerenderHourlyFromState: mocked.rerenderHourlyFromState,
      rerenderWeekdayFromState: mocked.rerenderWeekdayFromState,
      ensureDayFilters: mocked.ensureDayFilters,
      ensureHourFilters: mocked.ensureHourFilters,
      syncHourlyControlsWithState: mocked.syncHourlyControlsWithState,
    };
  },
}));

vi.mock("../js/appShell/dashboardRender/participantsPanel.js", () => ({
  createParticipantsPanelController: () => ({
    renderParticipants: mocked.renderParticipants,
  }),
  applyParticipantTopChange: (...args) => mocked.applyParticipantTopChange(...args),
  applyParticipantSortChange: (...args) => mocked.applyParticipantSortChange(...args),
  applyParticipantTimeframeChange: (...args) => mocked.applyParticipantTimeframeChange(...args),
  applyParticipantPreset: (...args) => mocked.applyParticipantPreset(...args),
  toggleParticipantRow: vi.fn(),
}));

vi.mock("../js/appShell/dashboardRender/highlightsStats.js", () => ({
  createHighlightsStatsController: () => ({
    renderHighlights: mocked.renderHighlights,
    renderStatistics: mocked.renderStatistics,
    formatSentimentScore: mocked.formatSentimentScore,
  }),
}));

vi.mock("../js/vue/activityPanelsMetaRenderer.js", () => ({
  createActivityPanelsMetaRenderer: (...args) => mocked.createActivityPanelsMetaRenderer(...args),
}));

import { createDashboardRenderController } from "../js/appShell/dashboardRender.js";
import { clearVueBridgeRuntime, installDashboardPanelsVueBridge } from "./vueBridgeTestUtils.js";

describe("analytics pipeline", () => {
  let OriginalWorker;
  let workers;

  beforeEach(() => {
    workers = [];
    OriginalWorker = globalThis.Worker;
    globalThis.Worker = class MockWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
        this.messages = [];
        workers.push(this);
      }

      postMessage(message) {
        this.messages.push(message);
      }
    };
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
    vi.restoreAllMocks();
  });

  it("computes analytics through a shared worker", async () => {
    const pipeline = createAnalyticsPipeline();

    const p1 = pipeline.computeAnalyticsWithWorker([{ message: "a" }]);
    const p2 = pipeline.computeAnalyticsWithWorker([{ message: "b" }]);

    expect(workers.length).toBe(1);
    expect(workers[0].messages.length).toBe(2);

    const firstId = workers[0].messages[0].id;
    const secondId = workers[0].messages[1].id;
    workers[0].onmessage({ data: { id: firstId, analytics: { total_messages: 1 } } });
    workers[0].onmessage({ data: { id: secondId, analytics: { total_messages: 2 } } });

    await expect(p1).resolves.toEqual({ total_messages: 1 });
    await expect(p2).resolves.toEqual({ total_messages: 2 });
  });

  it("rejects pending requests on worker error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const pipeline = createAnalyticsPipeline();
    const pending = pipeline.computeAnalyticsWithWorker([{ message: "a" }]);

    workers[0].onerror({ message: "boom" });

    await expect(pending).rejects.toThrow("Analytics worker encountered an error.");
    errorSpy.mockRestore();
  });
});

describe("dashboard render controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createActivityPanelsControllerArgs.length = 0;
    mocked.createActivityPanelsMetaRenderer.mockClear();
    mocked.applyParticipantTopChange.mockClear();
    mocked.applyParticipantSortChange.mockClear();
    mocked.applyParticipantTimeframeChange.mockClear();
    mocked.applyParticipantPreset.mockClear();
    mocked.syncWeekdayControlsWithState.mockClear();
    mocked.rerenderWeekdayFromState.mockClear();
    mocked.syncHourlyControlsWithState.mockClear();
    mocked.rerenderHourlyFromState.mockClear();
    clearVueBridgeRuntime();
  });

  it("renders full dashboard and updates availability", () => {
    const searchPopulateParticipants = vi.fn();
    const searchRenderResults = vi.fn();
    const setDataAvailabilityState = vi.fn();

    const controller = createDashboardRenderController({
      elements: {
        summaryEl: document.createElement("div"),
        sentimentSummaryEl: document.createElement("div"),
        sentimentTrendNote: document.createElement("div"),
        sentimentDailyChart: document.createElement("div"),
        sentimentPositiveList: document.createElement("div"),
        sentimentNegativeList: document.createElement("div"),
        messageTypeSummaryEl: document.createElement("div"),
        messageTypeNoteEl: document.createElement("div"),
        pollsListEl: document.createElement("div"),
        pollsTotalEl: document.createElement("div"),
        pollsCreatorsEl: document.createElement("div"),
        pollsNote: document.createElement("div"),
      },
      deps: {
        getDatasetLabel: () => "Demo",
        getDatasetEntries: () => [],
        getDatasetAnalytics: () => null,
        getCustomRange: () => null,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        participantFilters: {},
        setParticipantView: vi.fn(),
        setDataAvailabilityState,
        searchPopulateParticipants,
        searchRenderResults,
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: value => String(value),
        sanitizeText: text => String(text),
      },
    });

    const analytics = {
      highlights: [{ title: "x" }],
      sentiment: {},
      message_types: {},
      polls: {},
      weekly_counts: [],
      weekly_summary: {},
      total_messages: 5,
    };

    controller.renderDashboard(analytics);

    expect(mocked.renderSummarySection).toHaveBeenCalled();
    expect(mocked.renderParticipants).toHaveBeenCalledWith(analytics);
    expect(mocked.renderHourlyPanel).toHaveBeenCalledWith(analytics);
    expect(mocked.renderDailyPanel).toHaveBeenCalledWith(analytics);
    expect(mocked.renderWeeklyPanel).toHaveBeenCalledWith(analytics);
    expect(mocked.renderWeekdayPanel).toHaveBeenCalledWith(analytics);
    expect(mocked.renderSentimentSection).toHaveBeenCalled();
    expect(mocked.renderMessageTypesSection).toHaveBeenCalled();
    expect(mocked.renderPollsSection).toHaveBeenCalled();
    expect(mocked.renderStatistics).toHaveBeenCalledWith(analytics);
    expect(mocked.renderHighlights).toHaveBeenCalledWith(analytics.highlights);
    expect(searchPopulateParticipants).toHaveBeenCalled();
    expect(searchRenderResults).toHaveBeenCalled();
    expect(setDataAvailabilityState).toHaveBeenCalledWith(true);
    expect(mocked.createActivityPanelsMetaRenderer).toHaveBeenCalledTimes(1);
    expect(mocked.createActivityPanelsControllerArgs[0]?.deps?.activityPanelsMetaRenderer).toBeTruthy();
    expect(mocked.createActivityPanelsControllerArgs[0]?.deps?.vueRuntime).toBe(null);
  });

  it("delegates time-of-day panel rendering to Vue dashboard bridge when available", () => {
    const renderTimeOfDay = vi.fn(() => true);
    installDashboardPanelsVueBridge({ renderTimeOfDay });
    const controller = createDashboardRenderController({
      elements: {
        summaryEl: document.createElement("div"),
        sentimentSummaryEl: document.createElement("div"),
        sentimentTrendNote: document.createElement("div"),
        sentimentDailyChart: document.createElement("div"),
        sentimentPositiveList: document.createElement("div"),
        sentimentNegativeList: document.createElement("div"),
        messageTypeSummaryEl: document.createElement("div"),
        messageTypeNoteEl: document.createElement("div"),
        pollsListEl: document.createElement("div"),
        pollsTotalEl: document.createElement("div"),
        pollsCreatorsEl: document.createElement("div"),
        pollsNote: document.createElement("div"),
      },
      deps: {
        getDatasetLabel: () => "Demo",
        getDatasetEntries: () => [],
        getDatasetAnalytics: () => null,
        getCustomRange: () => null,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        participantFilters: {},
        setParticipantView: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        searchPopulateParticipants: vi.fn(),
        searchRenderResults: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: value => String(value),
        sanitizeText: text => String(text),
      },
    });

    controller.renderDashboard({
      highlights: [],
      sentiment: {},
      message_types: {},
      polls: {},
      weekly_counts: [],
      weekly_summary: {},
      total_messages: 5,
    });

    expect(renderTimeOfDay).toHaveBeenCalledTimes(1);
  });

  it("registers participant action handlers on the dashboard bridge", () => {
    /** @type {Record<string, Function>} */
    let panelActionHandlers = {};
    installDashboardPanelsVueBridge({
      setPanelActionHandlers(handlers) {
        panelActionHandlers = handlers;
        return true;
      },
      syncParticipantControls: vi.fn(),
      renderTimeOfDay: vi.fn(() => true),
    });
    const getDatasetAnalytics = vi.fn(() => ({ top_senders: [] }));
    const participantFilters = { topCount: 25, sortMode: "most", timeframe: "all" };

    createDashboardRenderController({
      elements: {
        summaryEl: document.createElement("div"),
        sentimentSummaryEl: document.createElement("div"),
        sentimentTrendNote: document.createElement("div"),
        sentimentDailyChart: document.createElement("div"),
        sentimentPositiveList: document.createElement("div"),
        sentimentNegativeList: document.createElement("div"),
        messageTypeSummaryEl: document.createElement("div"),
        messageTypeNoteEl: document.createElement("div"),
        pollsListEl: document.createElement("div"),
        pollsTotalEl: document.createElement("div"),
        pollsCreatorsEl: document.createElement("div"),
        pollsNote: document.createElement("div"),
      },
      deps: {
        getDatasetLabel: () => "Demo",
        getDatasetEntries: () => [],
        getDatasetAnalytics,
        getCustomRange: () => null,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        participantFilters,
        setParticipantView: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        searchPopulateParticipants: vi.fn(),
        searchRenderResults: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: value => String(value),
        sanitizeText: text => String(text),
      },
    });

    expect(typeof panelActionHandlers["participants:set-top-count"]).toBe("function");
    expect(typeof panelActionHandlers["participants:set-sort-mode"]).toBe("function");
    expect(typeof panelActionHandlers["participants:set-timeframe"]).toBe("function");
    expect(typeof panelActionHandlers["participants:apply-preset"]).toBe("function");

    panelActionHandlers["participants:set-top-count"]("participants:set-top-count", { value: "10" });
    panelActionHandlers["participants:set-sort-mode"]("participants:set-sort-mode", { value: "quiet" });
    panelActionHandlers["participants:set-timeframe"]("participants:set-timeframe", { value: "week" });
    panelActionHandlers["participants:apply-preset"]("participants:apply-preset", { preset: "quiet" });

    expect(mocked.applyParticipantTopChange).toHaveBeenCalledWith(participantFilters, "10");
    expect(mocked.applyParticipantSortChange).toHaveBeenCalledWith(participantFilters, "quiet");
    expect(mocked.applyParticipantTimeframeChange).toHaveBeenCalledWith(participantFilters, "week");
    expect(mocked.applyParticipantPreset).toHaveBeenCalledWith(
      participantFilters,
      "quiet",
      {
        participantsTopSelect: null,
        participantsSortSelect: null,
        participantsTimeframeSelect: null,
      },
    );
    expect(mocked.renderParticipants).toHaveBeenCalledTimes(4);
  });

  it("registers weekday and time-of-day action handlers on the dashboard bridge", () => {
    /** @type {Record<string, Function>} */
    let panelActionHandlers = {};
    const syncWeekdayControls = vi.fn();
    const syncTimeOfDayControls = vi.fn();
    installDashboardPanelsVueBridge({
      setPanelActionHandlers(handlers) {
        panelActionHandlers = handlers;
        return true;
      },
      syncWeekdayControls,
      syncTimeOfDayControls,
      renderTimeOfDay: vi.fn(() => true),
    });
    const hourlyState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    };
    const weekdayState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    };
    const updateHourlyState = vi.fn(patch => {
      if (patch.filters) hourlyState.filters = { ...hourlyState.filters, ...patch.filters };
      if (patch.brush) hourlyState.brush = patch.brush;
    });
    const updateWeekdayState = vi.fn(patch => {
      if (patch.filters) weekdayState.filters = { ...weekdayState.filters, ...patch.filters };
      if (patch.brush) weekdayState.brush = patch.brush;
    });

    createDashboardRenderController({
      elements: {
        summaryEl: document.createElement("div"),
        sentimentSummaryEl: document.createElement("div"),
        sentimentTrendNote: document.createElement("div"),
        sentimentDailyChart: document.createElement("div"),
        sentimentPositiveList: document.createElement("div"),
        sentimentNegativeList: document.createElement("div"),
        messageTypeSummaryEl: document.createElement("div"),
        messageTypeNoteEl: document.createElement("div"),
        pollsListEl: document.createElement("div"),
        pollsTotalEl: document.createElement("div"),
        pollsCreatorsEl: document.createElement("div"),
        pollsNote: document.createElement("div"),
      },
      deps: {
        getDatasetLabel: () => "Demo",
        getDatasetEntries: () => [],
        getDatasetAnalytics: () => ({ top_senders: [], hourly_heatmap: [] }),
        getCustomRange: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState,
        getWeekdayState: () => weekdayState,
        updateWeekdayState,
        participantFilters: {},
        setParticipantView: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        searchPopulateParticipants: vi.fn(),
        searchRenderResults: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: value => String(value),
        sanitizeText: text => String(text),
      },
    });

    panelActionHandlers["hourly:set-day-filter"]("hourly:set-day-filter", { filterKey: "weekdays", checked: false });
    panelActionHandlers["hourly:set-hour-filter"]("hourly:set-hour-filter", { filterKey: "working", checked: false });
    panelActionHandlers["hourly:set-brush"]("hourly:set-brush", { start: 18, end: 6 });
    panelActionHandlers["weekday:set-day-filter"]("weekday:set-day-filter", { filterKey: "weekdays", checked: false });
    panelActionHandlers["weekday:set-hour-filter"]("weekday:set-hour-filter", { filterKey: "working", checked: false });
    panelActionHandlers["weekday:set-brush"]("weekday:set-brush", { start: 20, end: 8 });
    panelActionHandlers["timeofday:set-day-filter"]("timeofday:set-day-filter", { filterKey: "weekends", checked: false });
    panelActionHandlers["timeofday:set-brush"]("timeofday:set-brush", { start: 18, end: 6 });

    expect(updateHourlyState).toHaveBeenCalledWith({
      filters: { weekdays: false, weekends: true, working: true, offhours: true },
    });
    expect(updateHourlyState).toHaveBeenCalledWith({
      filters: { weekdays: false, weekends: true, working: false, offhours: true },
    });
    expect(updateHourlyState).toHaveBeenCalledWith({ brush: { start: 6, end: 18 } });
    expect(updateWeekdayState).toHaveBeenCalledWith({ filters: { weekdays: false } });
    expect(updateWeekdayState).toHaveBeenCalledWith({ filters: { working: false } });
    expect(updateWeekdayState).toHaveBeenCalledWith({ brush: { start: 8, end: 20 } });
    expect(updateHourlyState).toHaveBeenCalledWith({
      filters: { weekdays: false, weekends: false, working: false, offhours: true },
    });
    expect(mocked.syncWeekdayControlsWithState).toHaveBeenCalled();
    expect(mocked.rerenderWeekdayFromState).toHaveBeenCalled();
    expect(mocked.syncHourlyControlsWithState).toHaveBeenCalled();
    expect(mocked.rerenderHourlyFromState).toHaveBeenCalled();
  });
});

describe("range filters controller", () => {
  function buildController(overrides = {}) {
    const rangeSelect = document.createElement("select");
    ["all", "7", "custom"].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      rangeSelect.appendChild(option);
    });

    const customControls = document.createElement("div");
    const customStartInput = document.createElement("input");
    const customEndInput = document.createElement("input");
    const customApplyButton = document.createElement("button");
    const searchStartInput = document.createElement("input");
    const searchEndInput = document.createElement("input");

    let entries = overrides.entries ?? [];
    const cache = new Map();
    let customRange = null;
    let currentRange = "all";
    let datasetAnalytics = null;
    let token = 0;

    const deps = {
      getDatasetEntries: () => entries,
      getDatasetLabel: () => "Demo",
      setCurrentRange: value => {
        currentRange = value;
      },
      setCustomRange: value => {
        customRange = value;
      },
      getCustomRange: () => customRange,
      getCachedAnalytics: key => cache.get(key) ?? null,
      setCachedAnalytics: (key, value) => cache.set(key, value),
      setDatasetAnalytics: value => {
        datasetAnalytics = value;
      },
      renderDashboard: vi.fn(),
      computeAnalyticsWithWorker: vi.fn(async filtered => ({ total_messages: filtered.length })),
      updateStatus: vi.fn(),
      formatNumber: value => String(value),
      formatDisplayDate: value => String(value),
      getTimestamp: entry => (entry?.timestamp ? new Date(entry.timestamp) : null),
      toISODate: date => new Date(date).toISOString().slice(0, 10),
      onRangeApplied: vi.fn(),
      nextAnalyticsRequestToken: () => {
        token += 1;
        return token;
      },
      isAnalyticsRequestCurrent: current => current === token,
      ...overrides.deps,
    };

    const controller = createRangeFiltersController({
      elements: {
        rangeSelect,
        customControls,
        customStartInput,
        customEndInput,
        customApplyButton,
        searchStartInput,
        searchEndInput,
      },
      deps,
    });

    return {
      controller,
      deps,
      rangeSelect,
      customControls,
      customStartInput,
      customEndInput,
      customApplyButton,
      searchStartInput,
      searchEndInput,
      cache,
      getCurrentRange: () => currentRange,
      getDatasetAnalytics: () => datasetAnalytics,
      setEntries: value => {
        entries = value;
      },
    };
  }

  it("updates bounds and disables inputs when dataset is empty", () => {
    const ctx = buildController();

    ctx.controller.updateCustomRangeBounds();

    expect(ctx.customStartInput.disabled).toBe(true);
    expect(ctx.customEndInput.disabled).toBe(true);
    expect(ctx.customApplyButton.disabled).toBe(true);
    expect(ctx.searchStartInput.disabled).toBe(true);
    expect(ctx.searchEndInput.disabled).toBe(true);
  });

  it("uses cached analytics without recomputing", async () => {
    const ctx = buildController({
      entries: [{ timestamp: "2025-01-01T00:00:00Z" }],
    });
    ctx.cache.set("days:7", { total_messages: 99 });

    await ctx.controller.applyRangeAndRender("7");

    expect(ctx.deps.computeAnalyticsWithWorker).not.toHaveBeenCalled();
    expect(ctx.getDatasetAnalytics()).toEqual({ total_messages: 99 });
    expect(ctx.deps.renderDashboard).toHaveBeenCalledWith({ total_messages: 99 });
  });

  it("handles custom range prompt and invalid ranges", async () => {
    const ctx = buildController({ entries: [{ timestamp: "2025-01-01T00:00:00Z" }] });

    ctx.rangeSelect.value = "custom";
    await ctx.controller.handleRangeChange();
    expect(ctx.customControls.classList.contains("hidden")).toBe(false);

    await ctx.controller.applyCustomRange("2025-01-10", "2025-01-01");
    expect(ctx.deps.updateStatus).toHaveBeenCalledWith(
      "Start date must be on or before the end date.",
      "error",
    );
  });

  it("filters entries for numeric range and stores computed analytics", async () => {
    const entries = [
      { timestamp: "2025-01-01T10:00:00Z" },
      { timestamp: "2025-01-08T10:00:00Z" },
      { timestamp: "2025-01-09T10:00:00Z" },
    ];

    const ctx = buildController({ entries });

    await ctx.controller.applyRangeAndRender("2");

    expect(ctx.deps.computeAnalyticsWithWorker).toHaveBeenCalledWith([
      { timestamp: "2025-01-08T10:00:00Z" },
      { timestamp: "2025-01-09T10:00:00Z" },
    ]);
    expect(ctx.getDatasetAnalytics()).toEqual({ total_messages: 2 });
    expect(ctx.deps.onRangeApplied).toHaveBeenCalled();
  });

  it("changes quick range via selector and updates state", async () => {
    const ctx = buildController({
      entries: [{ timestamp: "2025-01-09T10:00:00Z" }],
    });

    ctx.rangeSelect.value = "7";
    await ctx.controller.handleRangeChange();

    expect(ctx.getCurrentRange()).toBe("7");
    expect(ctx.deps.computeAnalyticsWithWorker).toHaveBeenCalled();
  });
});
