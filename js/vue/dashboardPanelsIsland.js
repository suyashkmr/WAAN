import { renderTimeOfDayPanel } from "../analytics/activity/timeOfDay.js";
import { renderHourlyHeatmapSection, renderWeekdaySection } from "../analytics/activity.js";
import { createParticipantsRoot } from "./dashboardParticipantsRoot.js";
import {
  LEGACY_VUE_BRIDGE_GLOBAL_KEYS,
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

  const mountEl = doc.getElementById("highlights-list");
  const participantsMountEl = doc.querySelector("#top-senders tbody");
  const timeOfDayMountEl = doc.getElementById("timeofday-chart");
  if (!mountEl || mountEl.dataset.vueHighlightsMounted === "true") return;

  const { createApp, h, reactive } = VueRuntime;
  const state = reactive({
    highlights: [],
  });
  const participantsState = reactive({
    rows: [],
    emptyMessage: "",
    expandedByRowId: {},
  });

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
    const TimeOfDayRoot = {
      name: "WaanTimeOfDayIsland",
      setup() {
        return () => [
          h("div", {
            class: "timeofday-sparkline",
            id: "timeofday-sparkline",
          }),
          h("div", {
            class: "timeofday-band-grid",
            id: "timeofday-bands",
          }),
          h("div", {
            class: "timeofday-callouts",
            id: "timeofday-callouts",
          }),
        ];
      },
    };
    createApp(TimeOfDayRoot).mount(timeOfDayMountEl);
    timeOfDayMountEl.dataset.vueTimeOfDayMounted = "true";
  }

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
      if (!doc) return false;
      const sparklineEl = doc.getElementById("timeofday-sparkline");
      const bandsEl = doc.getElementById("timeofday-bands");
      const calloutsEl = doc.getElementById("timeofday-callouts");
      if (!sparklineEl || !bandsEl || !calloutsEl) return false;

      renderTimeOfDayPanel(analytics, {
        container: timeOfDayMountEl,
        sparklineEl,
        bandsEl,
        calloutsEl,
      });
      return true;
    },
    /**
     * @param {{ data: unknown, options: unknown }} payload
     * @returns {boolean}
     */
    renderHourlyHeatmap(payload) {
      const data = payload?.data ?? null;
      const options = payload?.options ?? null;
      if (!options || typeof options !== "object") return false;
      renderHourlyHeatmapSection(data, options);
      return true;
    },
    /**
     * @param {unknown} options
     * @returns {boolean}
     */
    renderWeekdayChart(options) {
      if (!options || typeof options !== "object") return false;
      renderWeekdaySection(options);
      return true;
    },
    ownsParticipantInteractions: true,
  }, {
    globalScope,
    legacyGlobalKey: LEGACY_VUE_BRIDGE_GLOBAL_KEYS[VUE_BRIDGE_NAMES.dashboardPanels],
  });
}

try {
  mountDashboardPanelsIsland();
} catch (error) {
  globalThis.console?.warn?.("Vue dashboard panels island unavailable; falling back to legacy panel rendering.", error);
}
