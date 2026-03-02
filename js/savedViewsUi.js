import {
  formatNumber,
  formatFloat,
  formatTimestampDisplay,
  sanitizeText,
} from "./utils.js";
import { renderPanelState } from "./ui/panelState.js";
import { WEEKDAY_SHORT } from "./constants.js";
import { renderSavedViewsComparison } from "./savedViewsCompare.js";

export function createSavedViewsUiController({
  elements,
  deps,
}) {
  const {
    nameInput,
    saveButton,
    listSelect,
    applyButton,
    deleteButton,
    gallery,
    compareSelectA,
    compareSelectB,
    compareButton,
    compareSummaryEl,
  } = elements;
  const {
    getSavedViews,
    getCompareSelection,
    setCompareSelection,
    getSavedViewById,
    ensureViewSnapshot,
    formatSavedViewRange,
    dataAvailableGetter,
    onPanelAction,
  } = deps;

  /**
   * @returns {{
   *   renderSavedViewsPanelState?: (payload: any) => boolean,
   *   renderSavedViewsGallery?: (payload: any) => boolean,
   *   renderSavedViewsComparison?: (payload: any) => boolean,
   * } | null}
   */
  function getSearchSavedBridge() {
    /** @type {(typeof globalThis) & { __WAAN_VUE_SEARCH_SAVED_BRIDGE__?: {
     *   renderSavedViewsPanelState?: (payload: {
     *     tone?: string,
     *     title?: string,
     *     message?: string,
     *     actions?: Array<{ id?: string, label?: string, disabled?: boolean }>,
     *     onAction?: ((actionId: string) => void),
     *   }) => boolean,
     *   renderSavedViewsGallery?: (payload: {
     *     cardsHtml?: string,
     *     interactive?: boolean,
     *   }) => boolean,
     *   renderSavedViewsComparison?: (payload: {
     *     html?: string,
     *     empty?: boolean,
     *   }) => boolean,
     * } }} */
    const globalScope = globalThis;
    return globalScope.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ ?? null;
  }

  function formatSavedViewTopHour(snapshot) {
    if (!snapshot?.topHour) {
      return "No hourly data yet";
    }
    const weekday = WEEKDAY_SHORT?.[snapshot.topHour.dayIndex]
      ?? `Day ${snapshot.topHour.dayIndex + 1}`;
    return `${weekday} ${String(snapshot.topHour.hour).padStart(2, "0")}:00`;
  }

  function formatRelativeTime(isoValue) {
    if (!isoValue) return "";
    const when = new Date(isoValue);
    const timestamp = when.getTime();
    if (Number.isNaN(timestamp)) return "";
    const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (deltaSeconds < 60) return "Used just now";
    if (deltaSeconds < 3600) return `Used ${Math.floor(deltaSeconds / 60)}m ago`;
    if (deltaSeconds < 86400) return `Used ${Math.floor(deltaSeconds / 3600)}h ago`;
    return `Used ${Math.floor(deltaSeconds / 86400)}d ago`;
  }

  function buildSavedViewCard(view, activeContext = {}) {
    if (!view) return "";
    const snapshot = ensureViewSnapshot(view);
    const viewId = String(view?.id ?? "");
    const viewName = view?.name || "Untitled view";
    const rangeLabel = view.rangeLabel || formatSavedViewRange(view);
    const createdAtLabel = view.createdAt ? `Saved ${formatTimestampDisplay(view.createdAt)}` : "";
    const recencyHint = formatRelativeTime(view.lastAppliedAt);
    const totalMessages = snapshot ? formatNumber(snapshot.totalMessages ?? 0) : "—";
    const participants = snapshot ? formatNumber(snapshot.uniqueSenders ?? 0) : "—";
    const avgPerDay = snapshot && Number.isFinite(snapshot.dailyAverage)
      ? `${formatFloat(snapshot.dailyAverage, 1)} / day`
      : "Not enough data";
    const topSender = snapshot?.topSender || null;
    const sharePercent =
      topSender && typeof topSender.share === "number"
        ? Math.round(topSender.share * 100)
        : null;
    const topSenderShare =
      topSender && sharePercent !== null ? `${sharePercent}% of messages` : "Share updates soon";
    const peakHour = formatSavedViewTopHour(snapshot);
    const peakHourCount =
      snapshot?.topHour && Number.isFinite(snapshot.topHour.count)
        ? `${formatNumber(snapshot.topHour.count)} msgs`
        : "Waiting for hourly data";
    const barWidth = sharePercent !== null ? Math.min(100, Math.max(0, sharePercent)) : 8;
    const interactive = dataAvailableGetter();
    const isActive = activeContext.activeViewId === viewId;
    const isDirty = isActive && activeContext.activeViewDirty;
    const cardClasses = [
      "saved-view-card",
      interactive ? "" : "disabled",
      isActive ? "is-active" : "",
      isDirty ? "is-dirty" : "",
    ].filter(Boolean).join(" ");
    const accessibility = interactive
      ? `role="button" tabindex="0" aria-label="Apply saved view ${sanitizeText(viewName)}"`
      : "role=\"button\" aria-disabled=\"true\" tabindex=\"-1\"";
    return `
      <article class="${cardClasses}" data-view-id="${sanitizeText(viewId)}" data-active="${String(isActive)}" data-dirty="${String(isDirty)}" ${accessibility}>
        <header class="saved-view-card-header">
          <div>
            <p class="saved-view-card-title">${sanitizeText(viewName)}</p>
            <p class="saved-view-card-range">${sanitizeText(rangeLabel)}</p>
          </div>
          <div class="saved-view-card-meta">
            ${isActive ? '<span class="saved-view-chip saved-view-chip-active">Active</span>' : ""}
            ${isDirty ? '<span class="saved-view-chip saved-view-chip-dirty">Unsaved changes</span>' : ""}
            ${recencyHint ? `<span class="saved-view-card-used">${sanitizeText(recencyHint)}</span>` : ""}
            ${createdAtLabel ? `<span class="saved-view-card-created">${sanitizeText(createdAtLabel)}</span>` : ""}
          </div>
        </header>
        <div class="saved-view-card-metrics">
          <div class="saved-view-stat">
            <span class="stat-label">Messages</span>
            <span class="stat-value">${totalMessages}</span>
          </div>
          <div class="saved-view-stat">
            <span class="stat-label">Participants</span>
            <span class="stat-value">${participants}</span>
          </div>
          <div class="saved-view-stat">
            <span class="stat-label">Avg pace</span>
            <span class="stat-value">${sanitizeText(avgPerDay)}</span>
          </div>
        </div>
        <div class="saved-view-card-foot">
          <div class="saved-view-detail">
            <span class="detail-label">Top voice</span>
            <span class="detail-value">${topSender ? sanitizeText(topSender.sender) : "—"}</span>
            <span class="detail-meta">${sanitizeText(topSenderShare)}</span>
          </div>
          <div class="saved-view-detail">
            <span class="detail-label">Peak hour</span>
            <span class="detail-value">${sanitizeText(peakHour)}</span>
            <span class="detail-meta">${sanitizeText(peakHourCount)}</span>
          </div>
        </div>
        <div class="saved-view-share-bar${sharePercent === null ? " is-empty" : ""}">
          <span style="width:${barWidth}%;"></span>
        </div>
      </article>
    `;
  }

  function renderSavedViewGallery(views) {
    if (!gallery) return;
    const list = Array.isArray(views) ? views : [];
    const activeContext = typeof deps.getActiveViewContext === "function"
      ? deps.getActiveViewContext()
      : {};
    const searchSavedBridge = getSearchSavedBridge();
    if (!list.length) {
      const tone = dataAvailableGetter() ? "empty" : "loading";
      const title = dataAvailableGetter() ? "No saved views yet" : "Load a chat to use saved views";
      const message = dataAvailableGetter()
        ? "Save your current filters and chart settings to create a reusable view."
        : "Connect relay and select a chat, then save a view for quick re-apply.";
      const actions = dataAvailableGetter()
        ? [
            { id: "save-view", label: "Save current view" },
            { id: "focus-range", label: "Set time range" },
          ]
        : [];
      if (searchSavedBridge?.renderSavedViewsPanelState) {
        const handled = searchSavedBridge.renderSavedViewsPanelState({
          tone,
          title,
          message,
          actions,
          onAction: actionId => {
            if (typeof onPanelAction === "function") onPanelAction(actionId);
          },
        });
        if (handled) {
          gallery.dataset.interactive = "false";
          return;
        }
      }
      renderPanelState({
        container: gallery,
        tone,
        title,
        message,
        actions,
        onAction: actionId => {
          if (typeof onPanelAction === "function") onPanelAction(actionId);
        },
      });
      gallery.dataset.interactive = "false";
      return;
    }
    const cards = list.map(view => buildSavedViewCard(view, activeContext)).join("");
    if (searchSavedBridge?.renderSavedViewsGallery) {
      const handled = searchSavedBridge.renderSavedViewsGallery({
        cardsHtml: cards,
        interactive: dataAvailableGetter(),
      });
      if (handled) return;
    }
    gallery.innerHTML = cards;
    gallery.dataset.interactive = dataAvailableGetter() ? "true" : "false";
  }

  function populateSavedSelect(select, views, selectedId, placeholder) {
    if (!select) return;
    const previous = selectedId ?? select.value;
    select.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);
    views.forEach(view => {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = `${view.name} · ${view.rangeLabel}`;
      if (view.id === previous) option.selected = true;
      select.appendChild(option);
    });
    if (select.value && !views.some(view => view.id === select.value)) {
      select.value = "";
    }
  }

  function updateControlsDisabled() {
    const disabled = !dataAvailableGetter();
    [nameInput, saveButton, listSelect, applyButton, deleteButton, compareSelectA, compareSelectB, compareButton].forEach(el => {
      if (el) el.disabled = disabled;
    });
  }

  function renderComparisonSummary(primaryId, secondaryId) {
    const args = {
      compareSummaryEl,
      allViews: getSavedViews(),
      selection: getCompareSelection(),
      primaryId,
      secondaryId,
      getSavedViewById,
      ensureViewSnapshot,
      formatSavedViewRange,
      formatTopHourLabel: formatSavedViewTopHour,
      formatNumber,
      formatFloat,
      sanitizeText,
    };
    const searchSavedBridge = getSearchSavedBridge();
    if (compareSummaryEl && searchSavedBridge?.renderSavedViewsComparison) {
      const detached = document.createElement("div");
      renderSavedViewsComparison({
        ...args,
        compareSummaryEl: detached,
      });
      const handled = searchSavedBridge.renderSavedViewsComparison({
        html: detached.innerHTML,
        empty: detached.classList.contains("empty"),
      });
      if (handled) return;
    }
    renderSavedViewsComparison(args);
  }

  function refreshUI() {
    const views = getSavedViews();
    const compareSelection = getCompareSelection();

    populateSavedSelect(listSelect, views, listSelect?.value, "Choose a saved view…");
    populateSavedSelect(compareSelectA, views, compareSelection.primary, "Select view A…");
    populateSavedSelect(compareSelectB, views, compareSelection.secondary, "Select view B…");

    const validPrimary = views.some(view => view.id === compareSelection.primary)
      ? compareSelection.primary
      : null;
    const validSecondary = views.some(view => view.id === compareSelection.secondary)
      ? compareSelection.secondary
      : null;
    let primary = validPrimary;
    let secondary = validSecondary;

    if (views.length >= 2) {
      if (!primary) primary = views[0].id;
      if (!secondary || secondary === primary) {
        const fallback = views.find(view => view.id !== primary);
        secondary = fallback ? fallback.id : null;
      }
    } else {
      primary = primary ?? null;
      secondary = secondary ?? null;
    }

    setCompareSelection(primary, secondary);
    if (compareSelectA) compareSelectA.value = primary ?? "";
    if (compareSelectB) compareSelectB.value = secondary ?? "";

    renderComparisonSummary();
    renderSavedViewGallery(views);
    updateControlsDisabled();
  }

  return {
    refreshUI,
    renderComparisonSummary,
    updateControlsDisabled,
  };
}
