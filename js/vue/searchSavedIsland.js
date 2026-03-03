import { formatDisplayDate, formatNumber, formatTimestampDisplay } from "../utils.js";
import {
  LEGACY_VUE_BRIDGE_GLOBAL_KEYS,
  VUE_BRIDGE_NAMES,
  registerVueBridge,
  resolveVueBridge,
} from "./bridgeRegistry.js";
import { createPanelActionDispatcher } from "./panelActionDispatcher.js";

function normalizeActions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map(action => ({
    id: String(action?.id || ""),
    label: String(action?.label || "Action"),
    disabled: Boolean(action?.disabled),
  }));
}

/**
 * @param {{
 *   tone?: string,
 *   title?: string,
 *   message?: string,
 *   actions?: unknown[],
 *   dispatchAction?: ((actionId: string) => void) | null,
 *   container: HTMLElement | null,
 * }} params
 */
function renderPanelStateWithVue({
  tone = "empty",
  title = "",
  message = "",
  actions = [],
  dispatchAction = null,
  container,
  vueRuntime = globalThis.Vue,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeActions = normalizeActions(actions);
  const safeTone = String(tone || "empty");
  const safeTitle = String(title || "");
  const safeMessage = String(message || "");

  render(
    h("div", {
      class: ["panel-state", "app-empty-state", `panel-state--${safeTone}`],
      role: safeTone === "error" ? "alert" : "status",
    }, [
      safeTitle ? h("h4", { class: "panel-state-title" }, safeTitle) : null,
      safeMessage ? h("p", { class: "panel-state-copy" }, safeMessage) : null,
      safeActions.length
        ? h("div", { class: "app-toolbar-row panel-state-actions" }, safeActions.map(action =>
          h("button", {
            type: "button",
            class: "ghost-button small",
            "data-panel-action": action.id,
            disabled: action.disabled,
            onClick: () => {
              if (typeof dispatchAction === "function") dispatchAction(action.id);
            },
          }, action.label),
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
    messageHtml: typeof result?.messageHtml === "string" ? result.messageHtml : "",
  }));
}

/**
 * @param {{
 *   results?: unknown[],
 *   total?: number,
 *   lastRunFiltered?: boolean,
 *   container: HTMLElement | null,
 * }} params
 */
function renderSearchResultsWithVue({
  results = [],
  total = 0,
  lastRunFiltered = false,
  container,
  vueRuntime = globalThis.Vue,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeResults = normalizeSearchResults(results);
  const safeTotal = Number(total || 0);
  const showNarrowNotice = Boolean(lastRunFiltered) && safeTotal > safeResults.length;
  render(
    h("div", { class: "search-results-vue-list" }, [
      ...safeResults.map(result =>
        h("div", { class: "search-result" }, [
          h("div", { class: "search-result-header" }, [
            h("span", { class: "search-result-sender" }, result.sender),
            h("span", null, formatTimestampDisplay(result.timestamp)),
          ]),
          result.messageHtml
            ? h("div", { class: "search-result-message", innerHTML: result.messageHtml })
            : h("div", { class: "search-result-message" }, result.message),
        ]),
      ),
      showNarrowNotice
        ? h("div", { class: "search-results-empty" }, "Narrow your filters to see more matches.")
        : null,
    ]),
    container,
  );
  return true;
}

/**
 * @param {unknown} value
 */
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

/**
 * @param {{
 *   summary?: unknown,
 *   resultLimit?: number,
 *   container: HTMLElement | null,
 * }} params
 */
function renderSearchInsightsWithVue({
  summary,
  resultLimit = 200,
  container,
  vueRuntime = globalThis.Vue,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeSummary = normalizeSummary(summary);
  if (!safeSummary || !safeSummary.total) {
    container.classList.add("hidden");
    render(null, container);
    return true;
  }
  container.classList.remove("hidden");

  const hitsItems = safeSummary.hitsPerDay.length
    ? safeSummary.hitsPerDay
    : [{ date: "No daily data", count: "—" }];
  const participantItems = safeSummary.topParticipants.length
    ? safeSummary.topParticipants
    : [{ sender: "No matches yet", count: "—" }];
  const filtersItems = safeSummary.filters.length ? safeSummary.filters : ["No filters applied"];
  const noteText = safeSummary.truncated
    ? `Showing first ${formatNumber(resultLimit)} of ${formatNumber(safeSummary.total)} matches.`
    : `Total matches: ${formatNumber(safeSummary.total)}.`;

  render(
    h("div", { class: "search-insights-vue-grid" }, [
      h("div", { class: "search-insight-card" }, [
        h("h4", null, "Hits per day"),
        h("ul", { class: "search-insight-list" }, hitsItems.map(item =>
          h("li", null, [
            h("span", { class: "search-insight-label" }, item.date === "No daily data" ? item.date : formatDisplayDate(item.date)),
            h("span", null, typeof item.count === "number" ? formatNumber(item.count) : String(item.count)),
          ]),
        )),
      ]),
      h("div", { class: "search-insight-card" }, [
        h("h4", null, "Top participants"),
        h("ul", { class: "search-insight-list" }, participantItems.map(item =>
          h("li", null, [
            h("span", { class: "search-insight-label" }, item.sender),
            h("span", null, typeof item.count === "number" ? formatNumber(item.count) : String(item.count)),
          ]),
        )),
      ]),
      h("div", { class: "search-insight-card" }, [
        h("h4", null, "Search filters"),
        h("ul", { class: "search-insight-list" }, filtersItems.map(filter =>
          h("li", null, [h("span", { class: "search-insight-label" }, filter)]),
        )),
        h("p", { class: "search-insight-note" }, noteText),
      ]),
    ]),
    container,
  );
  return true;
}

function renderSavedViewsGalleryWithVue({
  cardsHtml = "",
  interactive = false,
  container,
  vueRuntime = globalThis.Vue,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { render } = VueRuntime;
  if (typeof render !== "function") return false;
  // Keep cards as direct children so existing .saved-view-gallery grid rules continue to apply.
  render(null, container);
  container.innerHTML = String(cardsHtml || "");
  container.dataset.interactive = interactive ? "true" : "false";
  return true;
}

function renderSavedViewsComparisonWithVue({
  html = "",
  empty = false,
  container,
  vueRuntime = globalThis.Vue,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  container.classList.toggle("empty", Boolean(empty));
  render(h("div", { class: "saved-views-compare-vue", innerHTML: String(html || "") }), container);
  return true;
}

export function mountSearchSavedBridge({ globalScope = globalThis } = {}) {
  if (!globalScope) return;
  const existingBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope });
  const shouldReplaceExistingBridge = Boolean(
    existingBridge
      && existingBridge.__waanVueSearchBridge === true
      && existingBridge.__runtimeBoundToVue !== true,
  );
  if (existingBridge && !shouldReplaceExistingBridge) return;
  const doc = globalScope.document ?? null;
  const vueRuntime = globalScope.Vue;
  const hasRenderableVueRuntime = Boolean(
    vueRuntime
      && typeof vueRuntime.h === "function"
      && typeof vueRuntime.render === "function",
  );
  if (!hasRenderableVueRuntime) return;
  const { dispatchPanelAction, setPanelActionHandlers } = createPanelActionDispatcher();

  registerVueBridge(VUE_BRIDGE_NAMES.searchSaved, {
    __waanVueSearchBridge: true,
    __runtimeBoundToVue: true,
    renderSearchPanelState(payload = {}) {
      const container = doc?.getElementById?.("search-results-list") ?? null;
      return renderPanelStateWithVue({
        ...payload,
        dispatchAction: actionId => dispatchPanelAction(`search:${actionId}`),
        container,
        vueRuntime,
      });
    },
    renderSavedViewsPanelState(payload = {}) {
      const container = doc?.getElementById?.("saved-view-gallery") ?? null;
      return renderPanelStateWithVue({
        ...payload,
        dispatchAction: actionId => dispatchPanelAction(`savedViews:${actionId}`),
        container,
        vueRuntime,
      });
    },
    renderSearchResults(payload = {}) {
      const container = doc?.getElementById?.("search-results-list") ?? null;
      return renderSearchResultsWithVue({
        ...payload,
        container,
        vueRuntime,
      });
    },
    renderSearchInsights(payload = {}) {
      const container = doc?.getElementById?.("search-insights") ?? null;
      return renderSearchInsightsWithVue({
        ...payload,
        container,
        vueRuntime,
      });
    },
    renderSavedViewsGallery(payload = {}) {
      const container = doc?.getElementById?.("saved-view-gallery") ?? null;
      return renderSavedViewsGalleryWithVue({
        ...payload,
        container,
        vueRuntime,
      });
    },
    renderSavedViewsComparison(payload = {}) {
      const container = doc?.getElementById?.("compare-summary") ?? null;
      return renderSavedViewsComparisonWithVue({
        ...payload,
        container,
        vueRuntime,
      });
    },
    setPanelActionHandlers,
  }, {
    globalScope,
    legacyGlobalKey: LEGACY_VUE_BRIDGE_GLOBAL_KEYS[VUE_BRIDGE_NAMES.searchSaved],
  });
}

try {
  if (typeof globalThis.document !== "undefined" && globalThis.Vue) {
    mountSearchSavedBridge();
  }
} catch (error) {
  globalThis.console?.warn?.("Vue search/saved bridge unavailable; using legacy DOM rendering.", error);
}
