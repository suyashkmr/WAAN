// @ts-check
import { renderDailySection, renderWeeklySection } from "../../analytics/activity.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../../vue/bridgeRegistry.js";
import { createDashboardPanelsBridgeInvoker } from "../../vue/dashboardPanelsBridgeRuntime.js";
import { buildHourlyTopHourSummary } from "./hourlySummary.js";
import { syncHourlyControls, syncWeekdayControls } from "./activityPanelControlSync.js";
import { initActivityHourlyControls } from "./hourlyControlBindings.js";
import {
  buildHourLabels,
  ensureFilterPair,
  syncHourLabelPair,
} from "./activityPanelFilterUtils.js";

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
    vueRuntime = null,
    activityPanelsMetaRenderer = null,
  } = deps;
  let hourlyControlsInitialised = false;
  let stateSubscriptionsInitialised = false;
  const hasStateSubscription = typeof subscribeAppShellUiState === "function";
  const renderWithDashboardPanelsBridge = createDashboardPanelsBridgeInvoker();

  function shellBridgeOwnsPageControls() {
    return Boolean(resolveVueBridge(VUE_BRIDGE_NAMES.shell)?.ownsPageControlInteractions);
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
    const text = buildHourlyTopHourSummary(/** @type {import("./hourlySummary.js").HourlySummaryData | null | undefined} */ (summary), {
      formatNumber,
      formatFloat,
    });
    const canRenderHourlyTopHour = typeof activityPanelsMetaRenderer?.renderHourlyTopHour === "function";
    activityPanelsMetaRenderer?.renderHourlyTopHour?.(text);
    if (!canRenderHourlyTopHour && hourlyTopHourEl) {
      hourlyTopHourEl.textContent = text;
    }
  }

  /** @param {Record<string, any>} analytics */
  function renderHourlyPanel(analytics) {
    const hourlyState = getHourlyState();
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
      const bridgeOwnsHourlyControls = renderWithDashboardPanelsBridge("syncHourlyControls", {
        filters: hourlyState.filters,
        brush: hourlyState.brush,
        labels: buildHourLabels(hourlyState.brush.start, hourlyState.brush.end),
      });
      if (!bridgeOwnsHourlyControls) initHourlyControls();
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
    }, vueRuntime);
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
        if (!shellBridgeOwnsPageControls() && rangeSelect) rangeSelect.value = "custom";
      },
      },
      vueRuntime,
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
    ensureFilterPair(getWeekdayState(), {
      firstKey: "weekdays",
      secondKey: "weekends",
      firstToggle: weekdayToggleWeekdays,
      secondToggle: weekdayToggleWeekends,
      updateState: updateWeekdayState,
    });
  }

  function ensureWeekdayHourFilters() {
    ensureFilterPair(getWeekdayState(), {
      firstKey: "working",
      secondKey: "offhours",
      firstToggle: weekdayToggleWorking,
      secondToggle: weekdayToggleOffhours,
      updateState: updateWeekdayState,
    });
  }

  function syncWeekdayControlsWithState() {
    syncWeekdayControls({
      state: getWeekdayState(),
      renderWithDashboardPanelsBridge,
      weekdayToggleWeekdays,
      weekdayToggleWeekends,
      weekdayToggleWorking,
      weekdayToggleOffhours,
      weekdayHourStartInput,
      weekdayHourEndInput,
      weekdayHourStartLabel,
      weekdayHourEndLabel,
      activityPanelsMetaRenderer,
    });
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
      syncBrushLabels: labels =>
        syncHourLabelPair(
          hourlyBrushStartLabel,
          hourlyBrushEndLabel,
          labels,
          () => typeof activityPanelsMetaRenderer?.renderHourlyBrushLabels === "function",
          nextLabels => activityPanelsMetaRenderer?.renderHourlyBrushLabels?.(nextLabels),
        ),
    });
  }

  function ensureDayFilters() {
    const hourlyState = getHourlyState();
    ensureFilterPair(hourlyState, {
      firstKey: "weekdays",
      secondKey: "weekends",
      firstToggle: filterWeekdays,
      secondToggle: filterWeekends,
      updateState: updateHourlyState,
    });
  }

  function ensureHourFilters() {
    const hourlyState = getHourlyState();
    ensureFilterPair(hourlyState, {
      firstKey: "working",
      secondKey: "offhours",
      firstToggle: filterWorking,
      secondToggle: filterOffhours,
      updateState: updateHourlyState,
    });
  }

  function syncHourlyControlsWithState() {
    const hourlyState = getHourlyState();
    syncHourlyControls({
      state: hourlyState,
      renderWithDashboardPanelsBridge,
      filterWeekdays,
      filterWeekends,
      filterWorking,
      filterOffhours,
      hourlyBrushStartInput,
      hourlyBrushEndInput,
      hourlyBrushStartLabel,
      hourlyBrushEndLabel,
      timeOfDayWeekdayToggle,
      timeOfDayWeekendToggle,
      timeOfDayHourStartInput,
      timeOfDayHourEndInput,
      timeOfDayHourStartLabel,
      timeOfDayHourEndLabel,
      activityPanelsMetaRenderer,
    });
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
