import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearVueBridgeRuntime, installDashboardPanelsVueBridge } from "./vueBridgeTestUtils.js";

vi.mock("../js/analytics/activity.js", () => ({
  renderDailySection: vi.fn(),
  renderWeeklySection: vi.fn(),
}));

import { createActivityPanelsController } from "../js/appShell/dashboardRender/activityPanels.js";
import {
  renderWeeklySection,
} from "../js/analytics/activity.js";

function baseElements() {
  return {
    hourlyChartEl: document.createElement("div"),
    filterNoteEl: document.createElement("div"),
    brushSummaryEl: document.createElement("div"),
    hourlyAnomaliesEl: document.createElement("div"),
    hourlyTopHourEl: document.createElement("div"),
    dailyChartEl: document.createElement("div"),
    dailyAvgDayEl: document.createElement("div"),
    weeklyChartEl: document.createElement("div"),
    weeklyCumulativeEl: document.createElement("div"),
    weeklyRollingEl: document.createElement("div"),
    weeklyAverageEl: document.createElement("div"),
    filterWeekdays: document.createElement("input"),
    filterWeekends: document.createElement("input"),
    filterWorking: document.createElement("input"),
    filterOffhours: document.createElement("input"),
    hourlyBrushStartInput: document.createElement("input"),
    hourlyBrushEndInput: document.createElement("input"),
    hourlyBrushStartLabel: document.createElement("span"),
    hourlyBrushEndLabel: document.createElement("span"),
    weekdayChartEl: document.createElement("div"),
    weekdayFilterNote: document.createElement("div"),
    weekdayToggleWeekdays: document.createElement("input"),
    weekdayToggleWeekends: document.createElement("input"),
    weekdayToggleWorking: document.createElement("input"),
    weekdayToggleOffhours: document.createElement("input"),
    weekdayHourStartInput: document.createElement("input"),
    weekdayHourEndInput: document.createElement("input"),
    weekdayHourStartLabel: document.createElement("span"),
    weekdayHourEndLabel: document.createElement("span"),
    timeOfDayWeekdayToggle: document.createElement("input"),
    timeOfDayWeekendToggle: document.createElement("input"),
    timeOfDayHourStartInput: document.createElement("input"),
    timeOfDayHourEndInput: document.createElement("input"),
    timeOfDayHourStartLabel: document.createElement("span"),
    timeOfDayHourEndLabel: document.createElement("span"),
    timeOfDayChartContainer: document.createElement("div"),
    timeOfDaySparklineEl: document.createElement("div"),
    timeOfDayBandsEl: document.createElement("div"),
    timeOfDayCalloutsEl: document.createElement("div"),
    rangeSelect: (() => {
      const select = document.createElement("select");
      const all = document.createElement("option");
      all.value = "all";
      const custom = document.createElement("option");
      custom.value = "custom";
      select.append(all, custom);
      return select;
    })(),
  };
}

function installDashboardPanelsBridge() {
  const bridge = {
    renderHourlyHeatmap: vi.fn(payload => {
      payload?.options?.renderSummary?.(payload?.data?.summary ?? null);
      return true;
    }),
    renderWeekdayChart: vi.fn(() => true),
    renderTimeOfDay: vi.fn(() => true),
  };
  installDashboardPanelsVueBridge(bridge);
  return bridge;
}

describe("activityPanels detailed", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    clearVueBridgeRuntime();
  });

  it("renders hourly summary for empty and populated top-hour states", () => {
    const bridge = installDashboardPanelsBridge();
    const elements = baseElements();
    const hourlyState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 4, end: 20 },
    };

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: null });
    const renderSummary = bridge.renderHourlyHeatmap.mock.calls[0][0].options.renderSummary;

    renderSummary(null);
    expect(elements.hourlyTopHourEl.textContent).toBe("-");

    renderSummary({ topHour: { dayIndex: 1, hour: 9, count: 3 }, totalMessages: 0 });
    expect(elements.hourlyTopHourEl.textContent).toBe("Mon 09:00 · 3 msgs");

    renderSummary({ topHour: { dayIndex: 20, hour: 14, count: 5 }, totalMessages: 10 });
    expect(elements.hourlyTopHourEl.textContent).toContain("Day 21 14:00");
    expect(elements.hourlyTopHourEl.textContent).toContain("(50.0%)");
  });

  it("routes meta labels through the injected activity meta renderer when present", () => {
    installDashboardPanelsBridge();
    const elements = baseElements();
    const hourlyState = {
      filters: { weekdays: true, weekends: false, working: true, offhours: false },
      brush: { start: 5, end: 19 },
    };
    const weekdayState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 7, end: 21 },
    };
    const activityPanelsMetaRenderer = {
      renderHourlyTopHour: vi.fn(),
      renderHourlyBrushLabels: vi.fn(),
      renderWeekdayBrushLabels: vi.fn(),
      renderTimeOfDayBrushLabels: vi.fn(),
    };

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: vi.fn(),
        getWeekdayState: () => weekdayState,
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
        activityPanelsMetaRenderer,
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: { topHour: { dayIndex: 0, hour: 9, count: 4 }, totalMessages: 8 } });
    controller.syncHourlyControlsWithState();
    controller.syncWeekdayControlsWithState();

    expect(activityPanelsMetaRenderer.renderHourlyTopHour).toHaveBeenCalledWith("Sun 09:00 · 4 msgs (50.0%)");
    expect(activityPanelsMetaRenderer.renderHourlyBrushLabels).toHaveBeenCalledWith({ start: "05:00", end: "19:00" });
    expect(activityPanelsMetaRenderer.renderTimeOfDayBrushLabels).toHaveBeenCalledWith({ start: "05:00", end: "19:00" });
    expect(activityPanelsMetaRenderer.renderWeekdayBrushLabels).toHaveBeenCalledWith({ start: "07:00", end: "21:00" });
  });

  it("keeps DOM fallback for labels and top-hour text when a partial meta renderer omits methods", () => {
    installDashboardPanelsBridge();
    const elements = baseElements();
    const hourlyState = {
      filters: { weekdays: true, weekends: false, working: true, offhours: false },
      brush: { start: 6, end: 18 },
    };
    const weekdayState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 8, end: 20 },
    };
    const activityPanelsMetaRenderer = {
      renderHourlyTopHour: vi.fn(),
    };

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: vi.fn(),
        getWeekdayState: () => weekdayState,
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
        activityPanelsMetaRenderer,
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: { topHour: { dayIndex: 1, hour: 10, count: 2 }, totalMessages: 4 } });
    controller.syncHourlyControlsWithState();
    controller.syncWeekdayControlsWithState();

    expect(activityPanelsMetaRenderer.renderHourlyTopHour).toHaveBeenCalledWith("Mon 10:00 · 2 msgs (50.0%)");
    expect(elements.hourlyBrushStartLabel.textContent).toBe("06:00");
    expect(elements.hourlyBrushEndLabel.textContent).toBe("18:00");
    expect(elements.timeOfDayHourStartLabel.textContent).toBe("06:00");
    expect(elements.timeOfDayHourEndLabel.textContent).toBe("18:00");
    expect(elements.weekdayHourStartLabel.textContent).toBe("08:00");
    expect(elements.weekdayHourEndLabel.textContent).toBe("20:00");
  });

  it("prefers bridge-owned hourly controls over DOM sync and listeners when available", () => {
    const bridge = installDashboardPanelsBridge();
    bridge.syncHourlyControls = vi.fn(() => true);
    const elements = baseElements();
    const hourlyState = {
      filters: { weekdays: false, weekends: true, working: false, offhours: true },
      brush: { start: 4, end: 15 },
    };

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: null });
    controller.syncHourlyControlsWithState();

    expect(bridge.syncHourlyControls).toHaveBeenCalledWith({
      filters: hourlyState.filters,
      brush: hourlyState.brush,
      labels: { start: "04:00", end: "15:00" },
    });
    expect(elements.filterWeekdays.checked).toBe(false);
    expect(elements.hourlyBrushStartInput.value).toBe("");
  });

  it("initializes hourly controls once and normalizes toggles/brush", () => {
    const bridge = installDashboardPanelsBridge();
    const filterWeekdays = document.createElement("input");
    filterWeekdays.id = "filter-weekdays";
    const filterWeekends = document.createElement("input");
    filterWeekends.id = "filter-weekends";
    const filterWorking = document.createElement("input");
    filterWorking.id = "filter-working";
    const filterOffhours = document.createElement("input");
    filterOffhours.id = "filter-offhours";
    const brushStart = document.createElement("input");
    brushStart.id = "hourly-brush-start";
    const brushEnd = document.createElement("input");
    brushEnd.id = "hourly-brush-end";
    const brushStartLabel = document.createElement("span");
    brushStartLabel.id = "hourly-brush-start-label";
    const brushEndLabel = document.createElement("span");
    brushEndLabel.id = "hourly-brush-end-label";
    document.body.append(
      filterWeekdays,
      filterWeekends,
      filterWorking,
      filterOffhours,
      brushStart,
      brushEnd,
      brushStartLabel,
      brushEndLabel,
    );

    const elements = baseElements();
    elements.filterWeekdays = filterWeekdays;
    elements.filterWeekends = filterWeekends;
    elements.filterWorking = filterWorking;
    elements.filterOffhours = filterOffhours;
    elements.hourlyBrushStartInput = brushStart;
    elements.hourlyBrushEndInput = brushEnd;
    elements.hourlyBrushStartLabel = brushStartLabel;
    elements.hourlyBrushEndLabel = brushEndLabel;
    const hourlyState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 3, end: 21 },
    };
    let onStateChange = null;

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: patch => {
          if (patch.filters) hourlyState.filters = { ...hourlyState.filters, ...patch.filters };
          if (patch.brush) hourlyState.brush = patch.brush;
          onStateChange?.({ type: "filters.hourly" });
        },
        subscribeAppShellUiState: callback => {
          onStateChange = callback;
        },
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: {} });
    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: {} });

    expect(brushStart.value).toBe("3");
    expect(brushEnd.value).toBe("21");

    filterWeekdays.checked = false;
    filterWeekends.checked = false;
    filterWeekdays.dispatchEvent(new Event("change"));
    filterWeekends.dispatchEvent(new Event("change"));
    hourlyState.filters = {
      ...hourlyState.filters,
      weekdays: false,
      weekends: false,
    };
    controller.ensureDayFilters();
    expect(hourlyState.filters.weekdays).toBe(true);
    expect(hourlyState.filters.weekends).toBe(true);

    filterWorking.checked = false;
    filterOffhours.checked = false;
    filterWorking.dispatchEvent(new Event("change"));
    filterOffhours.dispatchEvent(new Event("change"));
    hourlyState.filters = {
      ...hourlyState.filters,
      working: false,
      offhours: false,
    };
    controller.ensureHourFilters();
    expect(hourlyState.filters.working).toBe(true);
    expect(hourlyState.filters.offhours).toBe(true);

    brushStart.value = "22";
    brushEnd.value = "7";
    brushStart.dispatchEvent(new Event("input"));
    expect(hourlyState.brush).toEqual({ start: 7, end: 22 });
    expect(brushStartLabel.textContent).toBe("07:00");
    expect(brushEndLabel.textContent).toBe("22:00");

    expect(bridge.renderHourlyHeatmap.mock.calls.length).toBeGreaterThan(2);
  });

  it("routes hourly brush input label updates through the injected meta renderer when present", () => {
    installDashboardPanelsBridge();
    const filterWeekdays = document.createElement("input");
    const filterWeekends = document.createElement("input");
    const filterWorking = document.createElement("input");
    const filterOffhours = document.createElement("input");
    const brushStart = document.createElement("input");
    const brushEnd = document.createElement("input");
    const brushStartLabel = document.createElement("span");
    const brushEndLabel = document.createElement("span");
    const activityPanelsMetaRenderer = {
      renderHourlyBrushLabels: vi.fn(),
    };
    const hourlyState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 5, end: 19 },
    };

    const controller = createActivityPanelsController({
      elements: {
        ...baseElements(),
        filterWeekdays,
        filterWeekends,
        filterWorking,
        filterOffhours,
        hourlyBrushStartInput: brushStart,
        hourlyBrushEndInput: brushEnd,
        hourlyBrushStartLabel: brushStartLabel,
        hourlyBrushEndLabel: brushEndLabel,
      },
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: patch => {
          if (patch.filters) hourlyState.filters = patch.filters;
          if (patch.brush) hourlyState.brush = patch.brush;
        },
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
        activityPanelsMetaRenderer,
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: null });
    brushStart.value = "22";
    brushEnd.value = "7";
    brushStart.dispatchEvent(new Event("input"));

    expect(hourlyState.brush).toEqual({ start: 7, end: 22 });
    expect(activityPanelsMetaRenderer.renderHourlyBrushLabels).toHaveBeenCalledWith({ start: "07:00", end: "22:00" });
    expect(brushStartLabel.textContent).toBe("");
    expect(brushEndLabel.textContent).toBe("");
  });

  it("passes selected custom range to weekly renderer and applies valid selections", () => {
    const elements = baseElements();
    const applyCustomRange = vi.fn();

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => ({ type: "custom", start: "2025-01-01", end: "2025-01-05" }),
        getDatasetAnalytics: () => null,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        applyCustomRange,
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderWeeklyPanel({ weekly_counts: [], weekly_summary: {} });

    const options = renderWeeklySection.mock.calls[0][2];
    expect(options.selectedRange).toEqual({ start: "2025-01-01", end: "2025-01-05" });

    options.onSelectRange({ start: "2025-01-02" });
    expect(applyCustomRange).not.toHaveBeenCalled();

    options.onSelectRange({ start: "2025-01-02", end: "2025-01-09" });
    expect(applyCustomRange).toHaveBeenCalledWith("2025-01-02", "2025-01-09");
    expect(elements.rangeSelect.value).toBe("custom");
  });

  it("rerenders weekday/time-of-day from state based on analytics availability", () => {
    const bridge = installDashboardPanelsBridge();
    const elements = baseElements();
    const weekdayState = {
      filters: { weekdays: false, weekends: false, working: false, offhours: false },
      brush: { start: 8, end: 18 },
    };
    let analytics = null;

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => analytics,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => weekdayState,
        updateWeekdayState: patch => {
          if (patch.filters) weekdayState.filters = { ...weekdayState.filters, ...patch.filters };
          if (patch.brush) weekdayState.brush = patch.brush;
          if (patch.distribution) weekdayState.distribution = patch.distribution;
          if (patch.stats) weekdayState.stats = patch.stats;
        },
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderWeekdayPanel({ weekday_distribution: [1], weekday_stats: { peak: 2 } });
    expect(weekdayState.distribution).toEqual([1]);
    expect(weekdayState.stats).toEqual({ peak: 2 });
    expect(elements.weekdayToggleWeekdays.checked).toBe(true);
    expect(elements.weekdayToggleWorking.checked).toBe(true);
    expect(bridge.renderWeekdayChart).toHaveBeenCalledTimes(1);

    controller.rerenderHourlyFromState();
    expect(bridge.renderTimeOfDay).not.toHaveBeenCalled();

    analytics = { hourly_heatmap: [] };
    controller.rerenderHourlyFromState();
    expect(bridge.renderTimeOfDay).toHaveBeenCalledTimes(1);
  });

  it("keeps weekday panel render when subscriptions are enabled and filters do not change", () => {
    const bridge = installDashboardPanelsBridge();
    const elements = baseElements();
    const weekdayState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
      distribution: null,
      stats: null,
    };

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => weekdayState,
        updateWeekdayState: patch => {
          if (patch.filters) weekdayState.filters = { ...weekdayState.filters, ...patch.filters };
          if (patch.brush) weekdayState.brush = patch.brush;
          if (patch.distribution) weekdayState.distribution = patch.distribution;
          if (patch.stats) weekdayState.stats = patch.stats;
        },
        applyCustomRange: vi.fn(),
        subscribeAppShellUiState: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderWeekdayPanel({ weekday_distribution: [2, 4], weekday_stats: { peak: 4 } });

    expect(weekdayState.distribution).toEqual([2, 4]);
    expect(weekdayState.stats).toEqual({ peak: 4 });
    expect(bridge.renderWeekdayChart).toHaveBeenCalledTimes(1);
  });

  it("delegates hourly and weekday rerenders to Vue dashboard bridge when available", () => {
    const elements = baseElements();
    const bridge = {
      renderHourlyHeatmap: vi.fn(() => true),
      renderWeekdayChart: vi.fn(() => true),
    };
    installDashboardPanelsVueBridge(bridge);
    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateHourlyState: vi.fn(),
        getWeekdayState: () => ({ filters: {}, brush: { start: 0, end: 23 } }),
        updateWeekdayState: vi.fn(),
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.renderHourlyPanel({ hourly_heatmap: [], hourly_summary: {}, hourly_details: [], hourly_distribution: [] });
    controller.rerenderWeekdayFromState();

    expect(bridge.renderHourlyHeatmap).toHaveBeenCalled();
    expect(bridge.renderWeekdayChart).toHaveBeenCalled();
  });
});
