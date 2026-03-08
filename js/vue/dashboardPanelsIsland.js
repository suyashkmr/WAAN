import { getWeekdayState } from "../state.js";
import {
  createHourlyControlsState,
  createTimeOfDayControlsState,
  createWeekdayControlsState,
  syncActivityControlsState,
} from "./dashboardActivityControlsState.js";
import { createDashboardMetaRenderHelpers } from "./dashboardPanelsMetaHelpers.js";
import { createParticipantsRoot } from "./dashboardParticipantsRoot.js";
import {
  createParticipantControlsRoot,
  createParticipantQuickFiltersRoot,
} from "./dashboardParticipantControlsRoot.js";
import {
  createHourlyControlsRoot,
  createWeekdayControlsRoot,
  createTimeOfDayControlsRoot,
} from "./dashboardActivityControlsRoot.js";
import { createHighlightsRoot, normalizeHighlightEntry } from "./dashboardHighlightsRoot.js";
import { createHourlyRoot, renderHourlyFromPayload } from "./dashboardHourlyRoot.js";
import { createTimeOfDayModel, createTimeOfDayRoot } from "./dashboardTimeOfDayRoot.js";
import { createWeekdayModel, createWeekdayRoot } from "./dashboardWeekdayRoot.js";
import {
  VUE_BRIDGE_NAMES,
  registerVueBridge,
  resolveVueBridge,
} from "./bridgeRegistry.js";
import { createPanelActionDispatcher } from "./panelActionDispatcher.js";

export function mountDashboardPanelsIsland({ globalScope = globalThis } = {}) {
  const VueRuntime = globalScope?.Vue;
  const doc = globalScope?.document;
  if (!VueRuntime || !doc) return;
  if (resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope })) return;

  const mountEl = doc.getElementById("highlight-list") || doc.getElementById("highlights-list");
  const participantsMountEl = doc.querySelector("#top-senders tbody");
  const participantControlsMountEl = doc.querySelector(".participants-controls");
  const participantQuickFiltersMountEl = doc.querySelector(".participants-quick-filters");
  const hourlyControlsMountEl = doc.querySelector(".hourly-controls");
  const weekdayControlsMountEl = doc.querySelector(".weekday-controls");
  const timeOfDayControlsMountEl = doc.querySelector(".timeofday-controls");
  const timeOfDayMountEl = doc.getElementById("timeofday-chart");
  let hourlyMountEl = doc.getElementById("hourly-chart");
  let weekdayMountEl = doc.getElementById("weekday-chart");
  if (!mountEl || mountEl.dataset.vueHighlightsMounted === "true") return;

  const { createApp, h, reactive, render } = VueRuntime;
  if (typeof render !== "function") return;
  const state = reactive({
    highlights: [],
  });
  const timeOfDayState = reactive({
    model: null,
  });
  const participantsState = reactive({
    rows: [],
    emptyMessage: "",
    expandedByRowId: {},
    filters: {
      topCount: String(doc.getElementById("participants-top-count")?.value || "25"),
      sortMode: String(doc.getElementById("participants-sort")?.value || "most"),
      timeframe: String(doc.getElementById("participants-timeframe")?.value || "all"),
    },
  });
  const hourlyState = reactive({
    model: null,
    filterNote: "",
    brushSummary: "",
    anomalyBadges: [],
    anomalyMessage: "No hourly surprises detected.",
  });
  const weekdayState = reactive({
    model: null,
  });
  const hourlyControlsState = createHourlyControlsState(doc, VueRuntime);
  const weekdayControlsState = createWeekdayControlsState(doc, VueRuntime);
  const timeOfDayControlsState = createTimeOfDayControlsState(doc, VueRuntime);
  const PrimeDataView = globalScope?.PrimeVue?.DataView || globalScope?.primevue?.DataView || null;
  const usePrimeDataView = Boolean(PrimeDataView && (typeof PrimeDataView === "function" || typeof PrimeDataView === "object"));
  const { dispatchPanelAction, setPanelActionHandlers } = createPanelActionDispatcher();
  const { renderMetaText, renderHourlyAnomalies } = createDashboardMetaRenderHelpers({ VueRuntime, hourlyState });

  const HighlightsRoot = createHighlightsRoot({ h, state, PrimeDataView, usePrimeDataView, globalScope });

  const app = createApp(HighlightsRoot);
  app.mount(mountEl);
  mountEl.dataset.vueHighlightsMounted = "true";

  if (participantsMountEl && participantsMountEl.dataset.vueParticipantsMounted !== "true") {
    const ParticipantsRoot = createParticipantsRoot(h, participantsState);
    createApp(ParticipantsRoot).mount(participantsMountEl);
    participantsMountEl.dataset.vueParticipantsMounted = "true";
  }

  if (participantControlsMountEl && participantControlsMountEl.dataset.vueParticipantsControlsMounted !== "true") {
    const ParticipantsControlsRoot = createParticipantControlsRoot(
      h,
      participantsState,
      dispatchPanelAction,
      globalScope,
    );
    createApp(ParticipantsControlsRoot).mount(participantControlsMountEl);
    participantControlsMountEl.dataset.vueParticipantsControlsMounted = "true";
  }

  if (participantQuickFiltersMountEl && participantQuickFiltersMountEl.dataset.vueParticipantsQuickFiltersMounted !== "true") {
    const ParticipantsQuickFiltersRoot = createParticipantQuickFiltersRoot(
      h,
      participantsState,
      dispatchPanelAction,
      globalScope,
    );
    createApp(ParticipantsQuickFiltersRoot).mount(participantQuickFiltersMountEl);
    participantQuickFiltersMountEl.dataset.vueParticipantsQuickFiltersMounted = "true";
  }

  if (hourlyControlsMountEl && hourlyControlsMountEl.dataset.vueHourlyControlsMounted !== "true") {
    const HourlyControlsRoot = createHourlyControlsRoot(
      h,
      hourlyControlsState,
      dispatchPanelAction,
    );
    createApp(HourlyControlsRoot).mount(hourlyControlsMountEl);
    hourlyControlsMountEl.dataset.vueHourlyControlsMounted = "true";
  }

  if (weekdayControlsMountEl && weekdayControlsMountEl.dataset.vueWeekdayControlsMounted !== "true") {
    const WeekdayControlsRoot = createWeekdayControlsRoot(
      h,
      weekdayControlsState,
      dispatchPanelAction,
    );
    createApp(WeekdayControlsRoot).mount(weekdayControlsMountEl);
    weekdayControlsMountEl.dataset.vueWeekdayControlsMounted = "true";
  }

  if (timeOfDayControlsMountEl && timeOfDayControlsMountEl.dataset.vueTimeOfDayControlsMounted !== "true") {
    const TimeOfDayControlsRoot = createTimeOfDayControlsRoot(
      h,
      timeOfDayControlsState,
      dispatchPanelAction,
    );
    createApp(TimeOfDayControlsRoot).mount(timeOfDayControlsMountEl);
    timeOfDayControlsMountEl.dataset.vueTimeOfDayControlsMounted = "true";
  }

  if (timeOfDayMountEl && timeOfDayMountEl.dataset.vueTimeOfDayMounted !== "true") {
    const TimeOfDayRoot = createTimeOfDayRoot(h, timeOfDayState);
    createApp(TimeOfDayRoot).mount(timeOfDayMountEl);
    timeOfDayMountEl.dataset.vueTimeOfDayMounted = "true";
  }

  function ensureHourlyMounted(container) {
    if (!container) return false;
    hourlyMountEl = container;
    if (hourlyMountEl.dataset.vueHourlyMounted === "true") return true;
    const HourlyRoot = createHourlyRoot(h, hourlyState);
    createApp(HourlyRoot).mount(hourlyMountEl);
    hourlyMountEl.dataset.vueHourlyMounted = "true";
    return true;
  }

  if (hourlyMountEl) ensureHourlyMounted(hourlyMountEl);

  function ensureWeekdayMounted(container) {
    if (!container) return false;
    weekdayMountEl = container;
    if (weekdayMountEl.dataset.vueWeekdayMounted === "true") return true;
    const WeekdayRoot = createWeekdayRoot(h, weekdayState);
    createApp(WeekdayRoot).mount(weekdayMountEl);
    weekdayMountEl.dataset.vueWeekdayMounted = "true";
    return true;
  }

  if (weekdayMountEl) ensureWeekdayMounted(weekdayMountEl);

  registerVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, {
    /**
     * @param {unknown} highlights
     * @returns {boolean}
     */
    renderHighlights(highlights) {
      if (!Array.isArray(highlights)) {
        state.highlights = [];
        return true;
      }
      state.highlights = highlights.map(normalizeHighlightEntry).filter(Boolean);
      return true;
    },
    /**
     * @param {unknown} rows
     * @returns {boolean}
     */
    renderParticipantsRows(rows) {
      if (!participantsMountEl) return false;
      participantsState.emptyMessage = "";
      participantsState.rows = Array.isArray(rows) ? rows : [];
      participantsState.expandedByRowId = {};
      return true;
    },
    /**
     * @param {unknown} message
     * @returns {boolean}
     */
    renderParticipantsEmpty(message) {
      if (!participantsMountEl) return false;
      participantsState.rows = [];
      participantsState.emptyMessage = String(message || "");
      participantsState.expandedByRowId = {};
      return true;
    },
    /**
     * @param {{ topCount?: number|string, sortMode?: string, timeframe?: string } | null | undefined} filters
     * @returns {boolean}
     */
    syncParticipantControls(filters) {
      participantsState.filters = {
        topCount: String(filters?.topCount ?? participantsState.filters.topCount ?? "25"),
        sortMode: String(filters?.sortMode ?? participantsState.filters.sortMode ?? "most"),
        timeframe: String(filters?.timeframe ?? participantsState.filters.timeframe ?? "all"),
      };
      return true;
    },
    /**
     * @param {{ filters?: { weekdays?: boolean, weekends?: boolean, working?: boolean, offhours?: boolean }, brush?: { start?: number|string, end?: number|string }, labels?: { start?: string, end?: string } } | null | undefined} nextState
     * @returns {boolean}
     */
    syncHourlyControls(nextState) {
      return syncActivityControlsState(hourlyControlsState, nextState);
    },
    /**
     * @param {{ filters?: { weekdays?: boolean, weekends?: boolean, working?: boolean, offhours?: boolean }, brush?: { start?: number|string, end?: number|string }, labels?: { start?: string, end?: string } } | null | undefined} nextState
     * @returns {boolean}
     */
    syncWeekdayControls(nextState) {
      return syncActivityControlsState(weekdayControlsState, nextState);
    },
    /**
     * @param {{ filters?: { weekdays?: boolean, weekends?: boolean }, brush?: { start?: number|string, end?: number|string }, labels?: { start?: string, end?: string } } | null | undefined} nextState
     * @returns {boolean}
     */
    syncTimeOfDayControls(nextState) {
      return syncActivityControlsState(timeOfDayControlsState, nextState);
    },
    /**
     * @param {unknown} analytics
     * @returns {boolean}
     */
    renderTimeOfDay(analytics) {
      if (!timeOfDayMountEl) return false;
      const chartWidth = timeOfDayMountEl.clientWidth || 480;
      timeOfDayState.model = createTimeOfDayModel(analytics, chartWidth);
      return true;
    },
    /**
     * @param {{ data: unknown, options: unknown }} payload
     * @returns {boolean}
     */
    renderHourlyHeatmap(payload) {
      const options = payload?.options ?? null;
      if (!options || typeof options !== "object") return false;
      const chartEl = /** @type {{ chartEl?: HTMLElement | null }} */ (options).chartEl;
      if (!ensureHourlyMounted(chartEl || hourlyMountEl)) return false;
      const bridgeOptions = {
        ...(/** @type {Record<string, any>} */ (options)),
        anomaliesEl: null,
      };
      const bridgePayload = {
        ...(/** @type {Record<string, any>} */ (payload)),
        options: bridgeOptions,
      };
      const handled = renderHourlyFromPayload(bridgePayload, hourlyState);
      if (!handled) return false;
      const filterNoteEl = /** @type {{ filterNoteEl?: HTMLElement | null }} */ (options).filterNoteEl;
      renderMetaText(filterNoteEl, hourlyState.filterNote);
      const brushSummaryEl = /** @type {{ brushSummaryEl?: HTMLElement | null }} */ (options).brushSummaryEl;
      renderMetaText(brushSummaryEl, hourlyState.brushSummary);
      const anomaliesEl = /** @type {{ anomaliesEl?: HTMLElement | null }} */ (options).anomaliesEl;
      renderHourlyAnomalies(anomaliesEl);
      return true;
    },
    /**
     * @param {unknown} options
     * @returns {boolean}
     */
    renderWeekdayChart(options) {
      if (!options || typeof options !== "object") return false;
      const container = /** @type {{ container?: HTMLElement | null, filterNoteEl?: HTMLElement | null }} */ (options).container;
      const filterNoteEl = /** @type {{ container?: HTMLElement | null, filterNoteEl?: HTMLElement | null }} */ (options).filterNoteEl;
      if (!ensureWeekdayMounted(container || weekdayMountEl)) return false;
      const state = getWeekdayState();
      weekdayState.model = createWeekdayModel(state);
      renderMetaText(filterNoteEl, weekdayState.model?.filterNote || "");
      return true;
    },
    setPanelActionHandlers,
    ownsParticipantInteractions: true,
    ownsActivityFilterInteractions: true,
  }, { globalScope });
}

try {
  mountDashboardPanelsIsland();
} catch (error) {
  globalThis.console?.warn?.("Vue dashboard panels island mount failed.", error);
}
