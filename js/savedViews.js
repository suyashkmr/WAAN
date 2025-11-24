import {
  formatNumber,
  formatFloat,
  formatDisplayDate,
  formatTimestampDisplay,
  sanitizeText,
} from "./utils.js";
import { computeAnalytics } from "./analytics.js";
import { WEEKDAY_SHORT } from "./constants.js";

export function createSavedViewsController({ elements = {}, dependencies = {} } = {}) {
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
    rangeSelect,
    customStartInput,
    customEndInput,
  } = elements;

  const {
    getDatasetEntries,
    getDatasetAnalytics,
    getDatasetLabel,
    getCurrentRange,
    getCustomRange,
    setCurrentRange,
    setCustomRange,
    showCustomControls,
    addSavedView,
    getSavedViews,
    updateSavedView,
    removeSavedView,
    clearSavedViews,
    getCompareSelection,
    setCompareSelection,
    getHourlyState,
    updateHourlyState,
    getWeekdayState,
    updateWeekdayState,
    applyRangeAndRender,
    ensureDayFilters,
    ensureHourFilters,
    syncHourlyControlsWithState,
    ensureWeekdayDayFilters,
    ensureWeekdayHourFilters,
    syncWeekdayControlsWithState,
    describeRange,
    updateStatus,
  } = dependencies;

  const placeholderText = nameInput?.getAttribute("placeholder") || "";
  let snapshotMode = false;
  let dataAvailable = false;

  function buildViewSnapshot(analytics) {
    if (!analytics) return null;
    const topSender = Array.isArray(analytics.top_senders) ? analytics.top_senders[0] : null;
    const topHour = analytics.hourly_summary?.topHour || null;

    return {
      generatedAt: new Date().toISOString(),
      totalMessages: analytics.total_messages ?? 0,
      uniqueSenders: analytics.unique_senders ?? 0,
      systemEvents: analytics.system_summary?.count ?? 0,
      averageWords: analytics.averages?.words ?? 0,
      averageChars: analytics.averages?.characters ?? 0,
      weeklyAverage: analytics.weekly_summary?.averagePerWeek ?? 0,
      dailyAverage: analytics.hourly_summary?.averagePerDay ?? 0,
      dateRange: analytics.date_range ?? null,
      topSender: topSender
        ? { sender: topSender.sender, count: topSender.count, share: topSender.share ?? null }
        : null,
      topHour: topHour
        ? { dayIndex: topHour.dayIndex, hour: topHour.hour, count: topHour.count }
        : null,
    };
  }

  function captureCurrentView(name) {
    const entries = getDatasetEntries();
    if (!entries.length) return null;
    const range = getCurrentRange();
    const customRange = getCustomRange();
    const rangeData = range === "custom" && customRange
      ? { type: "custom", start: customRange.start, end: customRange.end }
      : range;
    const hourly = getHourlyState();
    const weekday = getWeekdayState();
    const analytics = getDatasetAnalytics();

    return {
      name,
      label: getDatasetLabel(),
      createdAt: new Date().toISOString(),
      range,
      rangeData,
      rangeLabel: describeRange(rangeData),
      hourlyFilters: { ...hourly.filters },
      hourlyBrush: { ...hourly.brush },
      weekdayFilters: { ...weekday.filters },
      weekdayBrush: { ...weekday.brush },
      snapshot: analytics ? buildViewSnapshot(analytics) : null,
    };
  }

  function getSavedViewById(id) {
    if (!id) return null;
    const views = getSavedViews();
    return views.find(view => view.id === id) || null;
  }

  function computeSnapshotForView(view) {
    const entries = getDatasetEntries();
    if (!entries.length) return null;
    const rangeValue = view.rangeData ?? view.range;
    const subset = typeof rangeValue === "object" && rangeValue?.type === "custom"
      ? entries.filter(entry => {
          const ts = new Date(entry.timestamp || entry.time || entry.date);
          if (!ts || Number.isNaN(ts.getTime())) return false;
          const start = rangeValue.start ? new Date(rangeValue.start) : null;
          const end = rangeValue.end ? new Date(rangeValue.end) : null;
          if (start && ts < start) return false;
          if (end) {
            end.setHours(23, 59, 59, 999);
            if (ts > end) return false;
          }
          return true;
        })
      : entries;
    if (!subset.length) {
      return {
        generatedAt: new Date().toISOString(),
        totalMessages: 0,
        uniqueSenders: 0,
        systemEvents: 0,
        averageWords: 0,
        averageChars: 0,
        weeklyAverage: 0,
        dailyAverage: 0,
        dateRange: typeof rangeValue === "object" ? rangeValue : null,
        topSender: null,
        topHour: null,
      };
    }
    try {
      const analytics = computeAnalytics(subset);
      return buildViewSnapshot(analytics);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function ensureViewSnapshot(view) {
    if (!view) return null;
    if (view.snapshot) return view.snapshot;
    const snapshot = computeSnapshotForView(view);
    if (snapshot) {
      updateSavedView(view.id, { snapshot });
    }
    return snapshot;
  }

  function formatViewRange(view) {
    if (!view) return "—";
    if (typeof view.rangeData === "object" && view.rangeData) {
      const start = view.rangeData.start ? formatDisplayDate(view.rangeData.start) : "—";
      const end = view.rangeData.end ? formatDisplayDate(view.rangeData.end) : "—";
      return `${start} → ${end}`;
    }
    return describeRange(view.rangeData ?? view.range);
  }

  function formatSavedViewTopHour(snapshot) {
    if (!snapshot?.topHour) {
      return "No hourly data yet";
    }
    const weekday = WEEKDAY_SHORT?.[snapshot.topHour.dayIndex]
      ?? `Day ${snapshot.topHour.dayIndex + 1}`;
    return `${weekday} ${String(snapshot.topHour.hour).padStart(2, "0")}:00`;
  }

  function buildSavedViewCard(view) {
    if (!view) return "";
    const snapshot = ensureViewSnapshot(view);
    const viewId = String(view?.id ?? "");
    const viewName = view?.name || "Untitled view";
    const rangeLabel = view.rangeLabel || formatViewRange(view);
    const createdAtLabel = view.createdAt ? formatTimestampDisplay(view.createdAt) : "";
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
    const interactive = !snapshotMode;
    const accessibility = interactive
      ? `role="button" tabindex="0" aria-label="Apply saved view ${sanitizeText(viewName)}"`
      : "role=\"button\" aria-disabled=\"true\" tabindex=\"-1\"";
    return `
      <article class="saved-view-card${interactive ? "" : " disabled"}" data-view-id="${sanitizeText(viewId)}" ${accessibility}>
        <header class="saved-view-card-header">
          <div>
            <p class="saved-view-card-title">${sanitizeText(viewName)}</p>
            <p class="saved-view-card-range">${sanitizeText(rangeLabel)}</p>
          </div>
          ${createdAtLabel ? `<span class="saved-view-card-created">${sanitizeText(createdAtLabel)}</span>` : ""}
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
    if (!list.length) {
      gallery.innerHTML =
        '<div class="empty-state small"><div class="empty-illustration small" aria-hidden="true"><span></span><span></span><span></span></div><p class="saved-view-gallery-empty">Save views to see quick previews here.</p></div>';
      gallery.dataset.interactive = "false";
      return;
    }
    const cards = list.map(view => buildSavedViewCard(view)).join("");
    gallery.innerHTML = cards;
    gallery.dataset.interactive = snapshotMode || !dataAvailable ? "false" : "true";
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
    const disabled = snapshotMode || !dataAvailable;
    [nameInput, saveButton, listSelect, applyButton, deleteButton, compareSelectA, compareSelectB, compareButton].forEach(el => {
      if (el) el.disabled = disabled;
    });
  }

  function renderComparisonSummary(primaryId, secondaryId) {
    if (!compareSummaryEl) return;
    const allViews = getSavedViews();
    if (allViews.length < 2) {
      compareSummaryEl.classList.add("empty");
      compareSummaryEl.textContent = allViews.length
        ? "Save one more view to enable comparisons."
        : "Save a view to start building comparisons.";
      return;
    }
    const selection = getCompareSelection();
    const primaryView = getSavedViewById(primaryId ?? selection.primary);
    const secondaryView = getSavedViewById(secondaryId ?? selection.secondary);

    if (!primaryView || !secondaryView) {
      compareSummaryEl.classList.add("empty");
      compareSummaryEl.innerHTML = "<p>Pick two saved views to compare their activity side-by-side.</p>";
      return;
    }

    const primarySnapshot = ensureViewSnapshot(primaryView);
    const secondarySnapshot = ensureViewSnapshot(secondaryView);

    if (!primarySnapshot || !secondarySnapshot) {
      compareSummaryEl.classList.add("empty");
      compareSummaryEl.innerHTML = "<p>Unable to compute comparison for these views. Try re-saving them.</p>";
      return;
    }

    compareSummaryEl.classList.remove("empty");
    const metrics = [
      { key: "range", label: "Date Range", get: (snapshot, view) => formatViewRange(view), diff: false },
      { key: "totalMessages", label: "Messages", get: snapshot => snapshot.totalMessages, diff: true, digits: 0 },
      { key: "uniqueSenders", label: "Participants", get: snapshot => snapshot.uniqueSenders, diff: true, digits: 0 },
      { key: "averageWords", label: "Avg words per message", get: snapshot => snapshot.averageWords, diff: true, digits: 1 },
      { key: "averageChars", label: "Avg characters per message", get: snapshot => snapshot.averageChars, diff: true, digits: 1 },
      { key: "weeklyAverage", label: "Avg per week", get: snapshot => snapshot.weeklyAverage, diff: true, digits: 1 },
      { key: "dailyAverage", label: "Avg per day", get: snapshot => snapshot.dailyAverage, diff: true, digits: 1 },
      {
        key: "topSender",
        label: "Top Sender",
        get: snapshot =>
          snapshot.topSender
            ? `${snapshot.topSender.sender} (${formatNumber(snapshot.topSender.count)} msgs)`
            : null,
        diff: false,
      },
      {
        key: "topHour",
        label: "Top Hour",
        get: snapshot => {
          if (!snapshot.topHour) return null;
          const weekday = WEEKDAY_SHORT?.[snapshot.topHour.dayIndex]
            ?? `Day ${snapshot.topHour.dayIndex + 1}`;
          return `${weekday} ${String(snapshot.topHour.hour).padStart(2, "0")}:00 (${formatNumber(snapshot.topHour.count)} msgs)`;
        },
        diff: false,
      },
    ];

    const buildColumn = (heading, view, snapshot) => {
      const items = metrics
        .map(metric => {
          const value = metric.get(snapshot, view);
          const display =
            value === null || value === undefined
              ? "—"
              : typeof value === "number" && !Number.isNaN(value)
                ? metric.digits && metric.digits > 0
                  ? formatFloat(value, metric.digits)
                  : formatNumber(value)
                : sanitizeText(String(value));
          return `
            <li>
              <span class="compare-label">${sanitizeText(metric.label)}</span>
              <span class="compare-value">${display}</span>
            </li>
          `;
        })
        .join("");
      return `
        <div class="compare-column">
          <h3>${sanitizeText(heading)} · ${sanitizeText(view.name)}</h3>
          <ul class="compare-metrics">
            ${items}
          </ul>
        </div>
      `;
    };

    const buildDiffColumn = () => {
      const rows = metrics
        .filter(metric => metric.diff)
        .map(metric => {
          const valueA = metric.get(primarySnapshot);
          const valueB = metric.get(secondarySnapshot);
          if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
            return `
              <li>
                <span class="compare-label">${sanitizeText(metric.label)}</span>
                <span class="compare-value">—</span>
              </li>
            `;
          }
          const diff = valueB - valueA;
          const digits = metric.digits ?? 0;
          const formatted =
            Math.abs(diff) < 0.0001
              ? "0"
              : digits && digits > 0
                ? formatFloat(diff, digits)
                : formatNumber(diff);
          const prefix = diff > 0 && !formatted.startsWith("+") ? "+" : "";
          const className = diff > 0
            ? "compare-value compare-diff positive"
            : diff < 0
              ? "compare-value compare-diff negative"
              : "compare-value";
          return `
            <li>
              <span class="compare-label">${sanitizeText(metric.label)}</span>
              <span class="${className}">${sanitizeText(`${prefix}${formatted}`)}</span>
            </li>
          `;
        })
        .join("");
      return `
        <div class="compare-column">
          <h3>Difference (B - A)</h3>
          <ul class="compare-metrics">
            ${rows}
          </ul>
        </div>
      `;
    };

    compareSummaryEl.innerHTML = `
      <div class="compare-summary-grid">
        ${buildColumn("View A", primaryView, primarySnapshot)}
        ${buildColumn("View B", secondaryView, secondarySnapshot)}
        ${buildDiffColumn()}
      </div>
    `;
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

  function resetForNewDataset() {
    clearSavedViews();
    refreshUI();
  }

  async function applySavedView(view) {
    const rangeValue = typeof view.rangeData === "object" && view.rangeData ? view.rangeData : view.range;
    const isCustom = typeof rangeValue === "object";

    setCurrentRange(isCustom ? "custom" : rangeValue);
    setCustomRange(isCustom ? rangeValue : null);
    if (rangeSelect) rangeSelect.value = isCustom ? "custom" : String(rangeValue);
    showCustomControls(isCustom);
    if (isCustom) {
      if (customStartInput) customStartInput.value = rangeValue.start ?? "";
      if (customEndInput) customEndInput.value = rangeValue.end ?? "";
    }

    updateHourlyState({
      filters: { ...view.hourlyFilters },
      brush: { ...view.hourlyBrush },
    });
    ensureDayFilters();
    ensureHourFilters();
    syncHourlyControlsWithState();

    updateWeekdayState({
      filters: { ...view.weekdayFilters },
      brush: { ...view.weekdayBrush },
    });
    ensureWeekdayDayFilters();
    ensureWeekdayHourFilters();
    syncWeekdayControlsWithState();

    await applyRangeAndRender(rangeValue);
    updateStatus(`Applied saved view "${view.name}".`, "success");
  }

  function handleSaveView() {
    if (snapshotMode) {
      updateStatus("Saved views aren't available in shared link view.", "warning");
      return;
    }
    if (!dataAvailable) {
      updateStatus("Load a chat file before saving a view.", "warning");
      return;
    }
    const rawName = nameInput?.value.trim();
    const fallbackName = `View ${getSavedViews().length + 1}`;
    const name = rawName || fallbackName;
    const view = captureCurrentView(name);
    if (!view) {
      updateStatus("Couldn't save the current view. Try again after the data loads.", "error");
      return;
    }
    const record = addSavedView(view);
    refreshUI();
    if (listSelect) listSelect.value = record.id;
    if (nameInput) nameInput.value = "";
    updateStatus(`Saved view "${name}".`, "success");
  }

  async function handleApplySavedView() {
    if (snapshotMode) {
      updateStatus("Saved views aren't available in shared link view.", "warning");
      return;
    }
    const id = listSelect?.value;
    if (!id) {
      updateStatus("Choose a saved view to use.", "warning");
      return;
    }
    const view = getSavedViewById(id);
    if (!view) {
      updateStatus("That saved view is missing.", "error");
      refreshUI();
      return;
    }
    await applySavedView(view);
  }

  function handleDeleteSavedView() {
    if (snapshotMode) {
      updateStatus("Saved views aren't available in shared link view.", "warning");
      return;
    }
    const id = listSelect?.value;
    if (!id) {
      updateStatus("Choose a saved view to remove.", "warning");
      return;
    }
    const removed = removeSavedView(id);
    if (!removed) {
      updateStatus("Couldn't remove that saved view.", "error");
      return;
    }
    refreshUI();
    renderComparisonSummary();
    if (listSelect) listSelect.value = "";
    updateStatus("Saved view removed.", "success");
  }

  function handleCompareViews() {
    if (snapshotMode) {
      updateStatus("Comparisons aren't available in shared link view.", "warning");
      return;
    }
    const primaryId = compareSelectA?.value;
    const secondaryId = compareSelectB?.value;
    if (!primaryId || !secondaryId) {
      updateStatus("Pick two saved views to compare.", "warning");
      return;
    }
    if (primaryId === secondaryId) {
      updateStatus("Pick two different views to compare.", "warning");
      return;
    }
    setCompareSelection(primaryId, secondaryId);
    renderComparisonSummary(primaryId, secondaryId);
    updateStatus("Comparison updated.", "info");
  }

  async function handleSavedViewGalleryClick(event) {
    if (snapshotMode) return;
    const card = event.target.closest(".saved-view-card");
    if (!card) return;
    const viewId = card.dataset.viewId;
    if (!viewId) return;
    const view = getSavedViewById(viewId);
    if (!view) {
      updateStatus("That saved view is missing.", "error");
      refreshUI();
      return;
    }
    await applySavedView(view);
    if (listSelect) listSelect.value = viewId;
  }

  async function handleSavedViewGalleryKeydown(event) {
    if (snapshotMode) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".saved-view-card");
    if (!card) return;
    event.preventDefault();
    const viewId = card.dataset.viewId;
    if (!viewId) return;
    const view = getSavedViewById(viewId);
    if (!view) {
      updateStatus("That saved view is missing.", "error");
      refreshUI();
      return;
    }
    await applySavedView(view);
    if (listSelect) listSelect.value = viewId;
  }

  function attachEvents() {
    if (saveButton) saveButton.addEventListener("click", handleSaveView);
    if (applyButton) applyButton.addEventListener("click", handleApplySavedView);
    if (deleteButton) deleteButton.addEventListener("click", handleDeleteSavedView);
    if (gallery) {
      gallery.addEventListener("click", handleSavedViewGalleryClick);
      gallery.addEventListener("keydown", handleSavedViewGalleryKeydown);
    }
    if (compareButton) compareButton.addEventListener("click", handleCompareViews);
  }

  function setSnapshotModeState(flag) {
    snapshotMode = Boolean(flag);
    updateControlsDisabled();
    renderSavedViewGallery(getSavedViews());
  }

  function setDataAvailabilityState(flag) {
    dataAvailable = Boolean(flag);
    if (nameInput) {
      nameInput.placeholder = dataAvailable ? placeholderText : "Load a chat first";
      if (!dataAvailable) nameInput.value = "";
    }
    updateControlsDisabled();
  }

  return {
    init() {
      attachEvents();
      refreshUI();
    },
    refreshUI,
    resetForNewDataset,
    setSnapshotMode: setSnapshotModeState,
    setDataAvailability: setDataAvailabilityState,
  };
}
