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
  renderWeeklySection,
} from "../js/analytics/activity.js";

function createRangeSelect() {
  const select = document.createElement("select");
  ["all", "custom"].forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    select.appendChild(option);
  });
  return select;
}

describe("activityPanels controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("normalizes day/hour filters and syncs controls", () => {
    const weekdayToggleWeekdays = document.createElement("input");
    const weekdayToggleWeekends = document.createElement("input");
    const weekdayToggleWorking = document.createElement("input");
    const weekdayToggleOffhours = document.createElement("input");
    const weekdayHourStartInput = document.createElement("input");
    const weekdayHourEndInput = document.createElement("input");

    const timeOfDayWeekdayToggle = document.createElement("input");
    const timeOfDayWeekendToggle = document.createElement("input");
    const timeOfDayHourStartInput = document.createElement("input");
    const timeOfDayHourEndInput = document.createElement("input");
    const timeOfDayHourStartLabel = document.createElement("span");
    const timeOfDayHourEndLabel = document.createElement("span");

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
    const weekdayStartLabel = document.createElement("span");
    weekdayStartLabel.id = "weekday-hour-start-label";
    const weekdayEndLabel = document.createElement("span");
    weekdayEndLabel.id = "weekday-hour-end-label";

    document.body.append(
      filterWeekdays,
      filterWeekends,
      filterWorking,
      filterOffhours,
      brushStart,
      brushEnd,
      brushStartLabel,
      brushEndLabel,
      weekdayStartLabel,
      weekdayEndLabel,
    );

    const hourlyState = {
      filters: { weekdays: false, weekends: false, working: false, offhours: false },
      brush: { start: 6, end: 22 },
    };
    const weekdayState = {
      filters: { weekdays: false, weekends: false, working: false, offhours: false },
      brush: { start: 7, end: 20 },
    };

    const controller = createActivityPanelsController({
      elements: {
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
        weekdayToggleWeekdays,
        weekdayToggleWeekends,
        weekdayToggleWorking,
        weekdayToggleOffhours,
        weekdayHourStartInput,
        weekdayHourEndInput,
        timeOfDayWeekdayToggle,
        timeOfDayWeekendToggle,
        timeOfDayHourStartInput,
        timeOfDayHourEndInput,
        timeOfDayHourStartLabel,
        timeOfDayHourEndLabel,
        timeOfDayChartContainer: document.createElement("div"),
        timeOfDaySparklineEl: document.createElement("div"),
        timeOfDayBandsEl: document.createElement("div"),
        timeOfDayCalloutsEl: document.createElement("div"),
        rangeSelect: createRangeSelect(),
      },
      deps: {
        getCustomRange: () => null,
        getDatasetAnalytics: () => null,
        getHourlyState: () => hourlyState,
        updateHourlyState: patch => {
          if (patch.filters) hourlyState.filters = patch.filters;
          if (patch.brush) hourlyState.brush = patch.brush;
        },
        getWeekdayState: () => weekdayState,
        updateWeekdayState: patch => {
          if (patch.filters) weekdayState.filters = patch.filters;
          if (patch.brush) weekdayState.brush = patch.brush;
        },
        applyCustomRange: vi.fn(),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value).toFixed(digits),
      },
    });

    controller.ensureDayFilters();
    controller.ensureHourFilters();
    controller.ensureWeekdayDayFilters();
    controller.ensureWeekdayHourFilters();
    controller.syncHourlyControlsWithState();
    controller.syncWeekdayControlsWithState();

    expect(hourlyState.filters.weekdays).toBe(true);
    expect(hourlyState.filters.weekends).toBe(true);
    expect(hourlyState.filters.working).toBe(true);
    expect(hourlyState.filters.offhours).toBe(true);
    expect(weekdayState.filters.weekdays).toBe(true);
    expect(weekdayState.filters.weekends).toBe(true);
    expect(weekdayState.filters.working).toBe(true);
    expect(weekdayState.filters.offhours).toBe(true);

    expect(brushStart.value).toBe("6");
    expect(brushEnd.value).toBe("22");
    expect(brushStartLabel.textContent).toBe("06:00");
    expect(brushEndLabel.textContent).toBe("22:00");
    expect(timeOfDayHourStartLabel.textContent).toBe("06:00");
    expect(timeOfDayHourEndLabel.textContent).toBe("22:00");
    expect(weekdayStartLabel.textContent).toBe("07:00");
    expect(weekdayEndLabel.textContent).toBe("20:00");
  });

  it("renders weekly panel and applies selected custom range", () => {
    const rangeSelect = createRangeSelect();
    const applyCustomRange = vi.fn();

    const controller = createActivityPanelsController({
      elements: {
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
        rangeSelect,
      },
      deps: {
        getCustomRange: () => null,
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

    const weeklyCall = renderWeeklySection.mock.calls.at(-1);
    expect(weeklyCall).toBeTruthy();
    const options = weeklyCall[2];
    options.onSelectRange({ start: "2025-01-01", end: "2025-01-07" });

    expect(applyCustomRange).toHaveBeenCalledWith("2025-01-01", "2025-01-07");
    expect(rangeSelect.value).toBe("custom");
  });
});
