import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../js/analytics/activity.js", () => ({
  renderTimeOfDayPanel: vi.fn(),
  renderHourlyHeatmapSection: vi.fn(),
  renderDailySection: vi.fn(),
  renderWeeklySection: vi.fn(),
  renderWeekdaySection: vi.fn(),
}));

import { createActivityPanelsController } from "../js/appShell/dashboardRender/activityPanels.js";
import {
  renderTimeOfDayPanel,
  renderHourlyHeatmapSection,
  renderWeeklySection,
  renderWeekdaySection,
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
    weekdayChartEl: document.createElement("div"),
    weekdayFilterNote: document.createElement("div"),
    weekdayToggleWeekdays: document.createElement("input"),
    weekdayToggleWeekends: document.createElement("input"),
    weekdayToggleWorking: document.createElement("input"),
    weekdayToggleOffhours: document.createElement("input"),
    weekdayHourStartInput: document.createElement("input"),
    weekdayHourEndInput: document.createElement("input"),
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

describe("activityPanels detailed", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders hourly summary for empty and populated top-hour states", () => {
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
    const renderSummary = renderHourlyHeatmapSection.mock.calls[0][1].renderSummary;

    renderSummary(null);
    expect(elements.hourlyTopHourEl.textContent).toBe("-");

    renderSummary({ topHour: { dayIndex: 1, hour: 9, count: 3 }, totalMessages: 0 });
    expect(elements.hourlyTopHourEl.textContent).toBe("Mon 09:00 · 3 msgs");

    renderSummary({ topHour: { dayIndex: 20, hour: 14, count: 5 }, totalMessages: 10 });
    expect(elements.hourlyTopHourEl.textContent).toContain("Day 21 14:00");
    expect(elements.hourlyTopHourEl.textContent).toContain("(50.0%)");
  });

  it("initializes hourly controls once and normalizes toggles/brush", () => {
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
    const hourlyState = {
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 3, end: 21 },
    };

    const controller = createActivityPanelsController({
      elements,
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: patch => {
          if (patch.filters) hourlyState.filters = { ...hourlyState.filters, ...patch.filters };
          if (patch.brush) hourlyState.brush = patch.brush;
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
    expect(hourlyState.filters.weekdays).toBe(true);
    expect(hourlyState.filters.weekends).toBe(true);

    filterWorking.checked = false;
    filterOffhours.checked = false;
    filterWorking.dispatchEvent(new Event("change"));
    filterOffhours.dispatchEvent(new Event("change"));
    expect(hourlyState.filters.working).toBe(true);
    expect(hourlyState.filters.offhours).toBe(true);

    brushStart.value = "22";
    brushEnd.value = "7";
    brushStart.dispatchEvent(new Event("input"));
    expect(hourlyState.brush).toEqual({ start: 7, end: 22 });
    expect(brushStartLabel.textContent).toBe("07:00");
    expect(brushEndLabel.textContent).toBe("22:00");

    expect(renderHourlyHeatmapSection.mock.calls.length).toBeGreaterThan(2);
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
    expect(renderWeekdaySection).toHaveBeenCalledTimes(1);

    controller.rerenderHourlyFromState();
    expect(renderTimeOfDayPanel).not.toHaveBeenCalled();

    analytics = { hourly_heatmap: [] };
    controller.rerenderHourlyFromState();
    expect(renderTimeOfDayPanel).toHaveBeenCalledTimes(1);
  });
});
