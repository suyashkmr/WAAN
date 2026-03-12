import { WAAN_PAGE_CONTROL_DRAFT_EVENT } from "./vue/pageControlDraftSignal.js";

function createComparableViewState(viewLike) {
  const rawRangeData = viewLike?.rangeData;
  const rangeData = rawRangeData && typeof rawRangeData === "object"
    ? {
        type: "custom",
        start: rawRangeData.start ?? "",
        end: rawRangeData.end ?? "",
      }
    : (rawRangeData ?? viewLike?.range ?? "all");
  return {
    rangeData,
    hourlyFilters: { ...(viewLike?.hourlyFilters || {}) },
    hourlyBrush: { ...(viewLike?.hourlyBrush || {}) },
    weekdayFilters: { ...(viewLike?.weekdayFilters || {}) },
    weekdayBrush: { ...(viewLike?.weekdayBrush || {}) },
  };
}

function createStateSignature(viewLike) {
  return JSON.stringify(createComparableViewState(viewLike));
}

export function captureCurrentViewSignature({
  getCurrentRange,
  getCustomRange,
  getHourlyState,
  getWeekdayState,
  rangeSelect,
  customStartInput,
  customEndInput,
  readDraftRangeState = null,
}) {
  const draftRangeState =
    typeof readDraftRangeState === "function" ? readDraftRangeState() : null;
  const draftRangeValue = draftRangeState?.rangeValue ?? rangeSelect?.value ?? null;
  const range = draftRangeValue || getCurrentRange();
  const customRange = getCustomRange();
  const rangeData = range === "custom"
    ? {
        type: "custom",
        start: draftRangeState?.customStart ?? customStartInput?.value ?? customRange?.start ?? "",
        end: draftRangeState?.customEnd ?? customEndInput?.value ?? customRange?.end ?? "",
      }
    : range;
  const hourly = getHourlyState();
  const weekday = getWeekdayState();
  return createStateSignature({
    rangeData,
    hourlyFilters: hourly?.filters || {},
    hourlyBrush: hourly?.brush || {},
    weekdayFilters: weekday?.filters || {},
    weekdayBrush: weekday?.brush || {},
  });
}

export function subscribeSavedViewDirtyState({
  subscribeAppShellUiState,
  rangeSelect,
  customStartInput,
  customEndInput,
  readDraftRangeState = null,
  hasBridgeOwnedPageControls = null,
  globalScope = globalThis,
  onStateChange,
}) {
  if (typeof onStateChange !== "function") {
    return () => {};
  }
  const unsubscribers = [];
  if (typeof subscribeAppShellUiState === "function") {
    unsubscribers.push(
      subscribeAppShellUiState(event => {
        const type = event?.type || "";
        if (
          type === "filters.range.current" ||
          type === "filters.range.custom" ||
          type === "filters.hourly" ||
          type === "filters.weekday"
        ) {
          onStateChange();
        }
      }),
    );
  }

  const handleDraftRangeChange = () => onStateChange();

  if (typeof globalScope?.addEventListener === "function") {
    globalScope.addEventListener(WAAN_PAGE_CONTROL_DRAFT_EVENT, handleDraftRangeChange);
    unsubscribers.push(() => {
      globalScope.removeEventListener?.(WAAN_PAGE_CONTROL_DRAFT_EVENT, handleDraftRangeChange);
    });
  }

  const bridgeOwnsPageControls = typeof hasBridgeOwnedPageControls === "function"
    ? Boolean(hasBridgeOwnedPageControls())
    : false;

  if (!bridgeOwnsPageControls) {
    const handleDraftCustomInput = () => onStateChange();

    if (rangeSelect) {
      rangeSelect.addEventListener("change", handleDraftRangeChange);
      unsubscribers.push(() => {
        rangeSelect.removeEventListener("change", handleDraftRangeChange);
      });
    }

    if (customStartInput) {
      customStartInput.addEventListener("input", handleDraftCustomInput);
      customStartInput.addEventListener("change", handleDraftCustomInput);
      unsubscribers.push(() => {
        customStartInput.removeEventListener("input", handleDraftCustomInput);
        customStartInput.removeEventListener("change", handleDraftCustomInput);
      });
    }

    if (customEndInput) {
      customEndInput.addEventListener("input", handleDraftCustomInput);
      customEndInput.addEventListener("change", handleDraftCustomInput);
      unsubscribers.push(() => {
        customEndInput.removeEventListener("input", handleDraftCustomInput);
        customEndInput.removeEventListener("change", handleDraftCustomInput);
      });
    }
  }

  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe?.());
  };
}

export { createStateSignature };
