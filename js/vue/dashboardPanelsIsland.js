import { getWeekdayState } from "../state.js";
import { createParticipantsRoot } from "./dashboardParticipantsRoot.js";
import { createHourlyRoot, renderHourlyFromPayload } from "./dashboardHourlyRoot.js";
import { createTimeOfDayModel, createTimeOfDayRoot } from "./dashboardTimeOfDayRoot.js";
import { createWeekdayModel, createWeekdayRoot } from "./dashboardWeekdayRoot.js";
import {
  VUE_BRIDGE_NAMES,
  registerVueBridge,
  resolveVueBridge,
} from "./bridgeRegistry.js";

function normalizeHighlightEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    type: String(entry.type || ""),
    theme: String(entry.theme || ""),
    label: String(entry.label || "Highlight"),
    tooltip: String(entry.tooltip || ""),
    headline: String(entry.headline || ""),
    value: String(entry.value || "-"),
    descriptor: String(entry.descriptor || ""),
    meta: String(entry.meta || ""),
    items: Array.isArray(entry.items)
      ? entry.items.map(item => ({
          label: String(item?.label || ""),
          value: String(item?.value || ""),
        }))
      : [],
  };
}

export function mountDashboardPanelsIsland({ globalScope = globalThis } = {}) {
  const VueRuntime = globalScope?.Vue;
  const doc = globalScope?.document;
  if (!VueRuntime || !doc) return;
  if (resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope })) return;

  const mountEl = doc.getElementById("highlight-list") || doc.getElementById("highlights-list");
  const participantsMountEl = doc.querySelector("#top-senders tbody");
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
  });
  const hourlyState = reactive({
    model: null,
    anomalyBadges: [],
  });
  const weekdayState = reactive({
    model: null,
  });
  const hourlyAnomaliesMountedEls = new WeakSet();

  const iconPath =
    "M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z";

  const HighlightsRoot = {
    name: "WaanHighlightsIsland",
    setup() {
      return () => {
        if (!state.highlights.length) {
          return h("p", { class: "search-results-empty" }, "Highlights will show up after the chat loads.");
        }
        return state.highlights.map((highlight, index) =>
          h(
            "div",
            {
              class: ["highlight-card", highlight.type].filter(Boolean).join(" "),
              "data-accent": highlight.theme || highlight.type || undefined,
            },
            [
              h("div", { class: "highlight-label-row" }, [
                h("span", { class: "highlight-label" }, highlight.label),
                highlight.tooltip
                  ? h(
                      "button",
                      {
                        type: "button",
                        class: "info-note-button info-note-inline",
                        "aria-label": highlight.tooltip,
                        "aria-describedby": `highlight-note-${index}`,
                        title: highlight.tooltip,
                      },
                      [
                        h(
                          "svg",
                          {
                            viewBox: "0 0 24 24",
                            "aria-hidden": "true",
                          },
                          [h("path", { d: iconPath })],
                        ),
                        h(
                          "span",
                          {
                            class: "info-tooltip",
                            id: `highlight-note-${index}`,
                            role: "tooltip",
                          },
                          highlight.tooltip,
                        ),
                      ],
                    )
                  : null,
              ]),
              highlight.headline ? h("p", { class: "highlight-headline" }, highlight.headline) : null,
              h("span", { class: "highlight-value" }, highlight.value),
              highlight.descriptor ? h("span", { class: "highlight-descriptor" }, highlight.descriptor) : null,
              highlight.items.length
                ? h(
                    "ol",
                    { class: "highlight-items" },
                    highlight.items.map(item =>
                      h("li", {}, [
                        h("span", { class: "item-label" }, item.label),
                        item.value ? h("span", { class: "item-value" }, item.value) : null,
                      ]),
                    ),
                  )
                : null,
              highlight.meta ? h("span", { class: "highlight-meta" }, highlight.meta) : null,
            ],
          ),
        );
      };
    },
  };

  const app = createApp(HighlightsRoot);
  app.mount(mountEl);
  mountEl.dataset.vueHighlightsMounted = "true";

  if (participantsMountEl && participantsMountEl.dataset.vueParticipantsMounted !== "true") {
    const ParticipantsRoot = createParticipantsRoot(h, participantsState);
    createApp(ParticipantsRoot).mount(participantsMountEl);
    participantsMountEl.dataset.vueParticipantsMounted = "true";
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
      const anomaliesEl = /** @type {{ anomaliesEl?: HTMLElement | null }} */ (options).anomaliesEl;
      if (anomaliesEl) {
        if (!hourlyAnomaliesMountedEls.has(anomaliesEl)) {
          anomaliesEl.replaceChildren();
          hourlyAnomaliesMountedEls.add(anomaliesEl);
        }
        if (hourlyState.anomalyBadges.length) {
          render(
            h(
              VueRuntime.Fragment || "div",
              null,
              hourlyState.anomalyBadges.map((text, index) =>
                h("span", { class: "badge", key: `${index}-${text}` }, text)),
            ),
            anomaliesEl,
          );
        } else {
          render(null, anomaliesEl);
          anomaliesEl.textContent = "No hourly surprises detected.";
        }
      }
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
      if (filterNoteEl) {
        filterNoteEl.textContent = weekdayState.model?.filterNote || "";
      }
      return true;
    },
    ownsParticipantInteractions: true,
  }, { globalScope });
}

try {
  mountDashboardPanelsIsland();
} catch (error) {
  globalThis.console?.warn?.("Vue dashboard panels island mount failed.", error);
}
