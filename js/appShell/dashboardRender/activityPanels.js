// @ts-check

import {
  renderTimeOfDayPanel,
  renderHourlyHeatmapSection,
  renderDailySection,
  renderWeeklySection,
  renderWeekdaySection,
} from "../../analytics/activity.js";
import { buildHourlyTopHourSummary } from "./hourlySummary.js";
import { initActivityHourlyControls } from "./hourlyControlBindings.js";

/**
 * @typedef {{ weekdays: boolean, weekends: boolean, working: boolean, offhours: boolean }} ActivityFilters
 * @typedef {{ start: number, end: number }} ActivityBrush
 * @typedef {{ filters: ActivityFilters, brush: ActivityBrush }} FilterState
 * @typedef {{ type?: string, start?: string, end?: string } | null} CustomRange
 * @typedef {{ type?: string }} UiStateEvent
 */

/**
 * @param {{ elements: Record<string, any>, deps: Record<string, any> }} params
 */
export function createActivityPanelsController({ elements, deps }) {
  const {
    hourlyChartEl,
    filterNoteEl,
    brushSummaryEl,
    hourlyAnomaliesEl,
    hourlyTopHourEl,
    dailyChartEl,
    dailyAvgDayEl,
    weeklyChartEl,
    weeklyCumulativeEl,
    weeklyRollingEl,
    weeklyAverageEl,
    weekdayChartEl,
    weekdayFilterNote,
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
    timeOfDayChartContainer,
    timeOfDaySparklineEl,
    timeOfDayBandsEl,
    timeOfDayCalloutsEl,
    rangeSelect,
  } = elements;

  const {
    getCustomRange,
    getDatasetAnalytics,
    getHourlyState,
    updateHourlyState,
    getWeekdayState,
    updateWeekdayState,
    applyCustomRange,
    subscribeAppShellUiState,
    formatNumber,
    formatFloat,
  } = deps;

  let hourlyControlsInitialised = false;
  let stateSubscriptionsInitialised = false;
  const hasStateSubscription = typeof subscribeAppShellUiState === "function";

  function initStateSubscriptions() {
    if (!hasStateSubscription || stateSubscriptionsInitialised) return;
    subscribeAppShellUiState(
      /** @param {UiStateEvent | null | undefined} event */ event => {
      if (!event?.type) return;
      if (event.type === "filters.hourly") {
        ensureDayFilters();
        ensureHourFilters();
        syncHourlyControlsWithState();
        rerenderHourlyFromState();
      }
      if (event.type === "filters.weekday") {
        ensureWeekdayDayFilters();
        ensureWeekdayHourFilters();
        syncWeekdayControlsWithState();
        rerenderWeekdayFromState();
      }
      },
    );
    stateSubscriptionsInitialised = true;
  }

  /** @param {any} summary */
  function renderHourlySummary(summary) {
    if (!hourlyTopHourEl) return;
    hourlyTopHourEl.textContent = buildHourlyTopHourSummary(/** @type {import("./hourlySummary.js").HourlySummaryData | null | undefined} */ (summary), {
      formatNumber,
      formatFloat,
    });
  }

  /** @param {Record<string, any>} analytics */
  function renderHourlyPanel(analytics) {
    renderHourlyHeatmapSection(
      {
        heatmap: analytics.hourly_heatmap,
        summary: analytics.hourly_summary,
        details: analytics.hourly_details,
        distribution: analytics.hourly_distribution,
      },
      {
        chartEl: hourlyChartEl,
        filterNoteEl,
        brushSummaryEl,
        anomaliesEl: hourlyAnomaliesEl,
        renderSummary: renderHourlySummary,
      },
    );
    if (!hourlyControlsInitialised) {
      initHourlyControls();
      hourlyControlsInitialised = true;
    }
    initStateSubscriptions();
    syncHourlyControlsWithState();
  }

  /** @param {Record<string, any>} analytics */
  function renderDailyPanel(analytics) {
    renderDailySection(analytics.daily_counts, {
      container: dailyChartEl,
      averageEl: dailyAvgDayEl,
    });
  }

  /** @param {Record<string, any>} analytics */
  function renderWeeklyPanel(analytics) {
    const customRange = getCustomRange();
    renderWeeklySection(analytics.weekly_counts, analytics.weekly_summary, {
      container: weeklyChartEl,
      cumulativeEl: weeklyCumulativeEl,
      rollingEl: weeklyRollingEl,
      averageEl: weeklyAverageEl,
      selectedRange:
        customRange && customRange.type === "custom"
          ? { start: customRange.start, end: customRange.end }
          : null,
      /** @param {{ start?: string, end?: string }} range */
      onSelectRange: range => {
        if (!range?.start || !range?.end) return;
        applyCustomRange(range.start, range.end);
        if (rangeSelect) rangeSelect.value = "custom";
      },
    });
  }

  /** @param {Record<string, any>} analytics */
  function renderWeekdayPanel(analytics) {
    updateWeekdayState({
      distribution: analytics.weekday_distribution,
      stats: analytics.weekday_stats,
    });
    ensureWeekdayDayFilters();
    ensureWeekdayHourFilters();
    syncWeekdayControlsWithState();
    rerenderWeekdayFromState();
  }

  function ensureWeekdayDayFilters() {
    /** @type {FilterState} */
    const state = getWeekdayState();
    const filters = { ...state.filters };
    if (!filters.weekdays && !filters.weekends) {
      filters.weekdays = true;
      filters.weekends = true;
      if (weekdayToggleWeekdays) weekdayToggleWeekdays.checked = true;
      if (weekdayToggleWeekends) weekdayToggleWeekends.checked = true;
    }
    updateWeekdayState({ filters });
  }

  function ensureWeekdayHourFilters() {
    /** @type {FilterState} */
    const state = getWeekdayState();
    const filters = { ...state.filters };
    if (!filters.working && !filters.offhours) {
      filters.working = true;
      filters.offhours = true;
      if (weekdayToggleWorking) weekdayToggleWorking.checked = true;
      if (weekdayToggleOffhours) weekdayToggleOffhours.checked = true;
    }
    updateWeekdayState({ filters });
  }

  function syncWeekdayControlsWithState() {
    /** @type {FilterState} */
    const state = getWeekdayState();
    const { filters, brush } = state;
    if (weekdayToggleWeekdays) weekdayToggleWeekdays.checked = filters.weekdays;
    if (weekdayToggleWeekends) weekdayToggleWeekends.checked = filters.weekends;
    if (weekdayToggleWorking) weekdayToggleWorking.checked = filters.working;
    if (weekdayToggleOffhours) weekdayToggleOffhours.checked = filters.offhours;
    if (weekdayHourStartInput) weekdayHourStartInput.value = String(brush.start);
    if (weekdayHourEndInput) weekdayHourEndInput.value = String(brush.end);
    const startLabel = /** @type {HTMLElement | null} */ (document.getElementById("weekday-hour-start-label"));
    const endLabel = /** @type {HTMLElement | null} */ (document.getElementById("weekday-hour-end-label"));
    if (startLabel) startLabel.textContent = `${String(brush.start).padStart(2, "0")}:00`;
    if (endLabel) endLabel.textContent = `${String(brush.end).padStart(2, "0")}:00`;
  }

  function rerenderHourlyFromState() {
    renderHourlyHeatmapSection(null, {
      chartEl: hourlyChartEl,
      filterNoteEl,
      brushSummaryEl,
      anomaliesEl: hourlyAnomaliesEl,
      renderSummary: renderHourlySummary,
    });
    const analytics = getDatasetAnalytics();
    if (analytics) {
      renderTimeOfDayPanel(analytics, {
        container: timeOfDayChartContainer,
        sparklineEl: timeOfDaySparklineEl,
        bandsEl: timeOfDayBandsEl,
        calloutsEl: timeOfDayCalloutsEl,
      });
    }
  }

  function rerenderWeekdayFromState() {
    renderWeekdaySection({
      container: weekdayChartEl,
      filterNoteEl: weekdayFilterNote,
    });
  }

  function initHourlyControls() {
    initActivityHourlyControls({
      getHourlyState,
      updateHourlyState,
      ensureDayFilters,
      ensureHourFilters,
    });
  }

  function ensureDayFilters() {
    /** @type {FilterState} */
    const state = getHourlyState();
    const filters = state.filters;
    if (!filters.weekdays && !filters.weekends) {
      const normalizedFilters = {
        ...filters,
        weekdays: true,
        weekends: true,
      };
      const weekdayToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-weekdays"));
      const weekendToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-weekends"));
      if (weekdayToggle) weekdayToggle.checked = true;
      if (weekendToggle) weekendToggle.checked = true;
      updateHourlyState({ filters: normalizedFilters });
      return;
    }
  }

  function ensureHourFilters() {
    /** @type {FilterState} */
    const state = getHourlyState();
    const filters = state.filters;
    if (!filters.working && !filters.offhours) {
      const normalizedFilters = {
        ...filters,
        working: true,
        offhours: true,
      };
      const workingToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-working"));
      const offToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-offhours"));
      if (workingToggle) workingToggle.checked = true;
      if (offToggle) offToggle.checked = true;
      updateHourlyState({ filters: normalizedFilters });
      return;
    }
  }

  function syncHourlyControlsWithState() {
    /** @type {FilterState} */
    const state = getHourlyState();
    const weekdayToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-weekdays"));
    const weekendToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-weekends"));
    const workingToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-working"));
    const offToggle = /** @type {HTMLInputElement | null} */ (document.getElementById("filter-offhours"));
    const brushStart = /** @type {HTMLInputElement | null} */ (document.getElementById("hourly-brush-start"));
    const brushEnd = /** @type {HTMLInputElement | null} */ (document.getElementById("hourly-brush-end"));
    const startLabel = /** @type {HTMLElement | null} */ (document.getElementById("hourly-brush-start-label"));
    const endLabel = /** @type {HTMLElement | null} */ (document.getElementById("hourly-brush-end-label"));

    if (weekdayToggle) weekdayToggle.checked = state.filters.weekdays;
    if (weekendToggle) weekendToggle.checked = state.filters.weekends;
    if (workingToggle) workingToggle.checked = state.filters.working;
    if (offToggle) offToggle.checked = state.filters.offhours;
    if (brushStart) brushStart.value = String(state.brush.start);
    if (brushEnd) brushEnd.value = String(state.brush.end);
    if (startLabel) startLabel.textContent = `${String(state.brush.start).padStart(2, "0")}:00`;
    if (endLabel) endLabel.textContent = `${String(state.brush.end).padStart(2, "0")}:00`;
    if (timeOfDayWeekdayToggle) timeOfDayWeekdayToggle.checked = state.filters.weekdays;
    if (timeOfDayWeekendToggle) timeOfDayWeekendToggle.checked = state.filters.weekends;
    if (timeOfDayHourStartInput) timeOfDayHourStartInput.value = String(state.brush.start);
    if (timeOfDayHourEndInput) timeOfDayHourEndInput.value = String(state.brush.end);
    if (timeOfDayHourStartLabel) {
      timeOfDayHourStartLabel.textContent = `${String(state.brush.start).padStart(2, "0")}:00`;
    }
    if (timeOfDayHourEndLabel) {
      timeOfDayHourEndLabel.textContent = `${String(state.brush.end).padStart(2, "0")}:00`;
    }
  }

  return {
    renderHourlyPanel,
    renderDailyPanel,
    renderWeeklyPanel,
    renderWeekdayPanel,
    ensureWeekdayDayFilters,
    ensureWeekdayHourFilters,
    syncWeekdayControlsWithState,
    rerenderHourlyFromState,
    rerenderWeekdayFromState,
    ensureDayFilters,
    ensureHourFilters,
    syncHourlyControlsWithState,
  };
}
