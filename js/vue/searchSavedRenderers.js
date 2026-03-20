import { formatDisplayDate, formatNumber, formatTimestampDisplay } from "../utils.js";
import { ensureSavedViewsGalleryActions } from "./searchSavedGalleryActions.js";
import { renderSavedViewsComparisonWithVue } from "./searchSavedComparisonRenderer.js";
import { renderActionButton } from "./primevueRenderPrimitives.js";
import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";
function normalizeActions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map(action => ({ id: String(action?.id || ""), label: String(action?.label || "Action"), disabled: Boolean(action?.disabled) }));
}

export function renderPanelStateWithVue({
  tone = "empty",
  title = "",
  message = "",
  actions = [],
  dispatchAction = null,
  container,
  vueRuntime = null,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeActions = normalizeActions(actions);
  const safeTone = String(tone || "empty");
  const safeTitle = String(title || "");
  const safeMessage = String(message || "");
  clearContainerForVueRenderOnce(container);
  render(
    h("div", {
      class: ["panel-state", "app-empty-state", `panel-state--${safeTone}`],
      role: safeTone === "error" ? "alert" : "status",
    }, [
      safeTitle ? h("h4", { class: "panel-state-title" }, safeTitle) : null,
      safeMessage ? h("p", { class: "panel-state-copy" }, safeMessage) : null,
      safeActions.length
        ? h("div", { class: "app-toolbar-row panel-state-actions" }, safeActions.map(action =>
          renderActionButton(h, {
            type: "button",
            className: "ghost-button small",
            text: action.label,
            disabled: action.disabled,
            attrs: {
              "data-panel-action": action.id,
            },
            onClick: () => {
              if (typeof dispatchAction === "function") dispatchAction(action.id);
            },
          }),
        ))
        : null,
    ]),
    container,
  );
  return true;
}

function normalizeSearchResults(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map(result => ({
    sender: String(result?.sender || "[Unknown]"),
    timestamp: String(result?.timestamp || ""),
    message: String(result?.message || ""),
    messageSegments: Array.isArray(result?.messageSegments)
      ? result.messageSegments
        .filter(Boolean)
        .map(segment => ({
          text: String(segment?.text || ""),
          highlighted: Boolean(segment?.highlighted),
        }))
      : [],
  }));
}
export function renderSearchResultsWithVue({
  results = [],
  total = 0,
  lastRunFiltered = false,
  container,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeResults = normalizeSearchResults(results);
  const safeTotal = Number(total || 0);
  const showNarrowNotice = Boolean(lastRunFiltered) && safeTotal > safeResults.length;
  const renderSearchResultCard = result =>
    h("div", { class: "search-result" }, [
      h("div", { class: "search-result-header" }, [
        h("span", { class: "search-result-sender" }, result.sender),
        h("span", null, formatTimestampDisplay(result.timestamp)),
      ]),
      h(
        "div",
        { class: "search-result-message" },
        result.messageSegments.length
          ? result.messageSegments
            .filter(segment => String(segment?.text || ""))
            .map(segment => h(segment.highlighted ? "mark" : "span", {}, String(segment.text)))
          : [result.message],
      ),
    ]);

  const DataView = globalScope?.PrimeVue?.DataView || globalScope?.primevue?.DataView || null;
  const usePrimeDataView = Boolean(DataView && (typeof DataView === "function" || typeof DataView === "object"));
  clearContainerForVueRenderOnce(container);
  render(
    h("div", { class: "search-results-vue-list" }, [
      ...(usePrimeDataView
        ? [
          h(DataView, {
            value: safeResults,
            layout: "list",
            unstyled: true,
            "data-ui-runtime": "primevue",
          }, {
            list: slotProps => {
              const items = Array.isArray(slotProps?.items) ? slotProps.items : safeResults;
              return items.map(renderSearchResultCard);
            },
          }),
        ]
        : safeResults.map(renderSearchResultCard)),
      showNarrowNotice
        ? h("div", { class: "search-results-empty" }, "Narrow your filters to see more matches.")
        : null,
    ]),
    container,
  );
  return true;
}

function normalizeSummary(value) {
  if (!value || typeof value !== "object") return null;
  const hitsPerDay = Array.isArray(value.hitsPerDay)
    ? value.hitsPerDay.filter(Boolean).map(item => ({
      date: String(item?.date || ""),
      count: Number(item?.count || 0),
    }))
    : [];
  const topParticipants = Array.isArray(value.topParticipants)
    ? value.topParticipants.filter(Boolean).map(item => ({
      sender: String(item?.sender || ""),
      count: Number(item?.count || 0),
    }))
    : [];
  const filters = Array.isArray(value.filters)
    ? value.filters.filter(Boolean).map(filter => String(filter))
    : [];
  return {
    total: Number(value.total || 0),
    truncated: Boolean(value.truncated),
    hitsPerDay,
    topParticipants,
    filters,
  };
}

export function renderSearchInsightsWithVue({
  summary,
  resultLimit = 200,
  container,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeSummary = normalizeSummary(summary);
  if (!safeSummary || !safeSummary.total) {
    container.classList.add("hidden");
    clearContainerForVueRenderOnce(container);
    render(null, container);
    return true;
  }
  container.classList.remove("hidden");
  clearContainerForVueRenderOnce(container);
  const hitsItems = safeSummary.hitsPerDay.length ? safeSummary.hitsPerDay : [{ date: "No daily data", count: "—" }];
  const participantItems = safeSummary.topParticipants.length ? safeSummary.topParticipants : [{ sender: "No matches yet", count: "—" }];
  const filtersItems = safeSummary.filters.length ? safeSummary.filters : ["No filters applied"];
  const noteText = safeSummary.truncated ? `Showing first ${formatNumber(resultLimit)} of ${formatNumber(safeSummary.total)} matches.` : `Total matches: ${formatNumber(safeSummary.total)}.`;
  const DataView = globalScope?.PrimeVue?.DataView || globalScope?.primevue?.DataView || null;
  const usePrimeDataView = Boolean(DataView && (typeof DataView === "function" || typeof DataView === "object"));
  const renderInsightListItem = ({ label, value }) => h("li", null, [
    h("span", { class: "search-insight-label" }, label),
    value ? h("span", null, value) : null,
  ]);
  const renderInsightList = items => !usePrimeDataView
    ? h("ul", { class: "search-insight-list" }, items.map(renderInsightListItem))
    : h(DataView, {
      value: items,
      layout: "list",
      unstyled: true,
      "data-ui-runtime": "primevue",
    }, {
      list: slotProps => {
        const safeItems = Array.isArray(slotProps?.items) ? slotProps.items : items;
        return [h("ul", { class: "search-insight-list" }, safeItems.map(renderInsightListItem))];
      },
    });

  render(
    h("div", { class: "search-insights-vue-grid" }, [
      h("div", { class: "search-insight-card" }, [
        h("h4", null, "Hits per day"),
        renderInsightList(hitsItems.map(item => ({
          label: item.date === "No daily data" ? item.date : formatDisplayDate(item.date),
          value: typeof item.count === "number" ? formatNumber(item.count) : String(item.count),
        }))),
      ]),
      h("div", { class: "search-insight-card" }, [
        h("h4", null, "Top participants"),
        renderInsightList(participantItems.map(item => ({
          label: item.sender,
          value: typeof item.count === "number" ? formatNumber(item.count) : String(item.count),
        }))),
      ]),
      h("div", { class: "search-insight-card" }, [
        h("h4", null, "Search filters"),
        renderInsightList(filtersItems.map(filter => ({ label: filter, value: "" }))),
        h("p", { class: "search-insight-note" }, noteText),
      ]),
    ]),
    container,
  );
  return true;
}

export function renderSavedViewsGalleryWithVue({
  cards = [],
  interactive = false,
  dispatchAction = null,
  container,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeCards = Array.isArray(cards) ? cards.filter(Boolean).map(card => ({
    viewId: String(card?.viewId || ""),
    viewName: String(card?.viewName || "Untitled view"),
    rangeLabel: String(card?.rangeLabel || ""),
    recencyHint: String(card?.recencyHint || ""),
    createdAtLabel: String(card?.createdAtLabel || ""),
    totalMessages: String(card?.totalMessages || "—"),
    participants: String(card?.participants || "—"),
    avgPerDay: String(card?.avgPerDay || "Not enough data"),
    topSenderName: String(card?.topSenderName || "—"),
    topSenderShare: String(card?.topSenderShare || ""),
    peakHour: String(card?.peakHour || "No hourly data yet"),
    peakHourCount: String(card?.peakHourCount || ""),
    barWidth: Number.isFinite(Number(card?.barWidth)) ? Number(card.barWidth) : 8,
    shareEmpty: Boolean(card?.shareEmpty),
    interactive: Boolean(card?.interactive),
    isActive: Boolean(card?.isActive),
    isDirty: Boolean(card?.isDirty),
  })) : [];

  const renderGalleryCard = card =>
    h("article", {
      class: [
        "saved-view-card",
        card.interactive ? "" : "disabled",
        card.isActive ? "is-active" : "",
        card.isDirty ? "is-dirty" : "",
      ],
      "data-view-id": card.viewId,
      "data-active": String(card.isActive),
      "data-dirty": String(card.isDirty),
      role: "button",
      tabindex: card.interactive ? 0 : -1,
      "aria-disabled": card.interactive ? undefined : "true",
      "aria-label": card.interactive ? `Apply saved view ${card.viewName}` : undefined,
    }, [
      h("header", { class: "saved-view-card-header" }, [
        h("div", {}, [
          h("p", { class: "saved-view-card-title" }, card.viewName),
          h("p", { class: "saved-view-card-range" }, card.rangeLabel),
        ]),
        h("div", { class: "saved-view-card-meta" }, [
          card.isActive ? h("span", { class: "saved-view-chip saved-view-chip-active" }, "Active") : null,
          card.isDirty ? h("span", { class: "saved-view-chip saved-view-chip-dirty" }, "Unsaved changes") : null,
          card.recencyHint ? h("span", { class: "saved-view-card-used" }, card.recencyHint) : null,
          card.createdAtLabel ? h("span", { class: "saved-view-card-created" }, card.createdAtLabel) : null,
        ]),
      ]),
      h("div", { class: "saved-view-card-metrics" }, [
        h("div", { class: "saved-view-stat" }, [
          h("span", { class: "stat-label" }, "Messages"),
          h("span", { class: "stat-value" }, card.totalMessages),
        ]),
        h("div", { class: "saved-view-stat" }, [
          h("span", { class: "stat-label" }, "Participants"),
          h("span", { class: "stat-value" }, card.participants),
        ]),
        h("div", { class: "saved-view-stat" }, [
          h("span", { class: "stat-label" }, "Avg pace"),
          h("span", { class: "stat-value" }, card.avgPerDay),
        ]),
      ]),
      h("div", { class: "saved-view-card-foot" }, [
        h("div", { class: "saved-view-detail" }, [
          h("span", { class: "detail-label" }, "Top voice"),
          h("span", { class: "detail-value" }, card.topSenderName),
          h("span", { class: "detail-meta" }, card.topSenderShare),
        ]),
        h("div", { class: "saved-view-detail" }, [
          h("span", { class: "detail-label" }, "Peak hour"),
          h("span", { class: "detail-value" }, card.peakHour),
          h("span", { class: "detail-meta" }, card.peakHourCount),
        ]),
      ]),
      h("div", { class: ["saved-view-share-bar", card.shareEmpty ? "is-empty" : ""] }, [
        h("span", { style: { width: `${Math.min(100, Math.max(0, card.barWidth))}%` } }),
      ]),
    ]);
  clearContainerForVueRenderOnce(container);

  render(h(
    "div",
    { class: "saved-view-gallery-vue-root" },
    safeCards.map(renderGalleryCard),
  ), container);
  container.dataset.interactive = interactive ? "true" : "false";
  ensureSavedViewsGalleryActions({ container, dispatchAction });
  return true;
}

export { renderSavedViewsComparisonWithVue };
