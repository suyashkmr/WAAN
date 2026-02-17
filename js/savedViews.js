import { formatViewRange, getNormalizedRangeForView } from "./savedViewsRange.js";
import {
  buildViewSnapshot,
  computeSnapshotForView as computeSavedViewSnapshotForView,
  ensureViewSnapshot as ensureSavedViewSnapshot,
} from "./savedViewsSnapshot.js";
import { createSavedViewsUiController } from "./savedViewsUi.js";

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
    filterEntriesByRange,
    normalizeRangeValue,
  } = dependencies;

  const placeholderText = nameInput?.getAttribute("placeholder") || "";
  let dataAvailable = false;

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

  const normalizeRangeForView = view => getNormalizedRangeForView(view, normalizeRangeValue);

  const computeSnapshotForView = view =>
    computeSavedViewSnapshotForView({
      view,
      getDatasetEntries,
      filterEntriesByRange,
      getNormalizedRangeForView: normalizeRangeForView,
    });

  const ensureViewSnapshot = view =>
    ensureSavedViewSnapshot({
      view,
      updateSavedView,
      computeSnapshotForView,
    });

  const formatSavedViewRange = view => formatViewRange(view, describeRange);

  const savedViewsUiController = createSavedViewsUiController({
    elements: {
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
    },
    deps: {
      getSavedViews,
      getCompareSelection,
      setCompareSelection,
      getSavedViewById,
      ensureViewSnapshot,
      formatSavedViewRange,
      dataAvailableGetter: () => dataAvailable,
    },
  });
  const {
    refreshUI,
    renderComparisonSummary,
    updateControlsDisabled,
  } = savedViewsUiController;

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
    setDataAvailability: setDataAvailabilityState,
  };
}
