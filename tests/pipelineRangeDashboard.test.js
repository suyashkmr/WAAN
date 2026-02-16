import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAnalyticsPipeline } from "../js/appShell/analyticsPipeline.js";
import { createRangeFiltersController } from "../js/appShell/rangeFilters.js";

const mocked = vi.hoisted(() => ({
  renderSummarySection: vi.fn(),
  renderTimeOfDayPanel: vi.fn(),
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
}));

vi.mock("../js/analytics/summary.js", () => ({
  renderSummaryCards: mocked.renderSummarySection,
}));

vi.mock("../js/analytics/activity.js", () => ({
  renderTimeOfDayPanel: mocked.renderTimeOfDayPanel,
  formatHourLabel: vi.fn(hour => `${hour}:00`),
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

vi.mock("../js/ui.js", () => ({
  createDeferredRenderScheduler: () => (cb, _token) => cb(),
}));

vi.mock("../js/appShell/dashboardRender/activityPanels.js", () => ({
  createActivityPanelsController: () => ({
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
  }),
}));

vi.mock("../js/appShell/dashboardRender/participantsPanel.js", () => ({
  createParticipantsPanelController: () => ({
    renderParticipants: mocked.renderParticipants,
  }),
  applyParticipantTopChange: vi.fn(),
  applyParticipantSortChange: vi.fn(),
  applyParticipantTimeframeChange: vi.fn(),
  applyParticipantPreset: vi.fn(),
  toggleParticipantRow: vi.fn(),
}));

vi.mock("../js/appShell/dashboardRender/highlightsStats.js", () => ({
  createHighlightsStatsController: () => ({
    renderHighlights: mocked.renderHighlights,
    renderStatistics: mocked.renderStatistics,
    formatSentimentScore: mocked.formatSentimentScore,
  }),
}));

import { createDashboardRenderController } from "../js/appShell/dashboardRender.js";

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
        timeOfDayChartContainer: document.createElement("div"),
        timeOfDaySparklineEl: document.createElement("div"),
        timeOfDayBandsEl: document.createElement("div"),
        timeOfDayCalloutsEl: document.createElement("div"),
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
    expect(mocked.renderTimeOfDayPanel).toHaveBeenCalled();
    expect(mocked.renderMessageTypesSection).toHaveBeenCalled();
    expect(mocked.renderPollsSection).toHaveBeenCalled();
    expect(mocked.renderStatistics).toHaveBeenCalledWith(analytics);
    expect(mocked.renderHighlights).toHaveBeenCalledWith(analytics.highlights);
    expect(searchPopulateParticipants).toHaveBeenCalled();
    expect(searchRenderResults).toHaveBeenCalled();
    expect(setDataAvailabilityState).toHaveBeenCalledWith(true);
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
