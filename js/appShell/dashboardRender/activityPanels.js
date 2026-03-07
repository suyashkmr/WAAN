// @ts-check

import {
  renderDailySection,
  renderWeeklySection,
} from "../../analytics/activity.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../../vue/bridgeRegistry.js";
import { mountDashboardPanelsIsland } from "../../vue/dashboardPanelsIsland.js";
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
    filterWeekdays,
    filterWeekends,
    filterWorking,
    filterOffhours,
    hourlyBrushStartInput,
    hourlyBrushEndInput,
    hourlyBrushStartLabel,
    hourlyBrushEndLabel,
    weekdayChartEl,
    weekdayFilterNote,
    weekdayToggleWeekdays,
    weekdayToggleWeekends,
    weekdayToggleWorking,
    weekdayToggleOffhours,
    weekdayHourStartInput,
    weekdayHourEndInput,
    weekdayHourStartLabel,
    weekdayHourEndLabel,
    timeOfDayWeekdayToggle,
    timeOfDayWeekendToggle,
    timeOfDayHourStartInput,
    timeOfDayHourEndInput,
    timeOfDayHourStartLabel,
    timeOfDayHourEndLabel,
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

  function renderWithDashboardPanelsBridge(/** @type {string} */ method, /** @type {any} */ payload) {
    mountDashboardPanelsIsland();
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels);
    /** @type {any} */
    const handler = bridge?.[method];
    if (typeof handler !== "function") return false;
    return Boolean(handler(payload));
  }

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
    const data = {
      heatmap: analytics.hourly_heatmap,
      summary: analytics.hourly_summary,
      details: analytics.hourly_details,
      distribution: analytics.hourly_distribution,
    };
    const options = {
      chartEl: hourlyChartEl,
      filterNoteEl,
      brushSummaryEl,
      anomaliesEl: hourlyAnomaliesEl,
      renderSummary: renderHourlySummary,
    };
    renderWithDashboardPanelsBridge("renderHourlyHeatmap", { data, options });
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
    }, /** @type {any} */ (globalThis).Vue ?? null);
  }

  /** @param {Record<string, any>} analytics */
  function renderWeeklyPanel(analytics) {
    const customRange = getCustomRange();
    renderWeeklySection(
      analytics.weekly_counts,
      analytics.weekly_summary,
      {
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
      },
      /** @type {any} */ (globalThis).Vue ?? null,
    );
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
    if (weekdayHourStartLabel) {
      weekdayHourStartLabel.textContent = `${String(brush.start).padStart(2, "0")}:00`;
    }
    if (weekdayHourEndLabel) {
      weekdayHourEndLabel.textContent = `${String(brush.end).padStart(2, "0")}:00`;
    }
  }

  function rerenderHourlyFromState() {
    const options = {
      chartEl: hourlyChartEl,
      filterNoteEl,
      brushSummaryEl,
      anomaliesEl: hourlyAnomaliesEl,
      renderSummary: renderHourlySummary,
    };
    renderWithDashboardPanelsBridge("renderHourlyHeatmap", { data: null, options });
    const analytics = getDatasetAnalytics();
    if (analytics) {
      renderWithDashboardPanelsBridge("renderTimeOfDay", analytics);
    }
  }

  function rerenderWeekdayFromState() {
    const options = {
      container: weekdayChartEl,
      filterNoteEl: weekdayFilterNote,
    };
    renderWithDashboardPanelsBridge("renderWeekdayChart", options);
  }

  function initHourlyControls() {
    initActivityHourlyControls({
      getHourlyState,
      updateHourlyState,
      ensureDayFilters,
      ensureHourFilters,
      weekdayToggle: filterWeekdays,
      weekendToggle: filterWeekends,
      workingToggle: filterWorking,
      offToggle: filterOffhours,
      brushStart: hourlyBrushStartInput,
      brushEnd: hourlyBrushEndInput,
      startLabel: hourlyBrushStartLabel,
      endLabel: hourlyBrushEndLabel,
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
      if (filterWeekdays) filterWeekdays.checked = true;
      if (filterWeekends) filterWeekends.checked = true;
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
      if (filterWorking) filterWorking.checked = true;
      if (filterOffhours) filterOffhours.checked = true;
      updateHourlyState({ filters: normalizedFilters });
      return;
    }
  }

  function syncHourlyControlsWithState() {
    /** @type {FilterState} */
    const state = getHourlyState();
    if (filterWeekdays) filterWeekdays.checked = state.filters.weekdays;
    if (filterWeekends) filterWeekends.checked = state.filters.weekends;
    if (filterWorking) filterWorking.checked = state.filters.working;
    if (filterOffhours) filterOffhours.checked = state.filters.offhours;
    if (hourlyBrushStartInput) hourlyBrushStartInput.value = String(state.brush.start);
    if (hourlyBrushEndInput) hourlyBrushEndInput.value = String(state.brush.end);
    if (hourlyBrushStartLabel) hourlyBrushStartLabel.textContent = `${String(state.brush.start).padStart(2, "0")}:00`;
    if (hourlyBrushEndLabel) hourlyBrushEndLabel.textContent = `${String(state.brush.end).padStart(2, "0")}:00`;
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
