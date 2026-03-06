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
}) {
  const range = getCurrentRange();
  const customRange = getCustomRange();
  const rangeData = range === "custom" && customRange
    ? { type: "custom", start: customRange.start ?? "", end: customRange.end ?? "" }
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

export function bindSavedViewDirtyWatchers({
  rangeSelect,
  customStartInput,
  customEndInput,
  filterControls = [],
  onStateChange,
}) {
  if (typeof onStateChange !== "function") return;
  const controls = [
    rangeSelect,
    customStartInput,
    customEndInput,
    ...(Array.isArray(filterControls) ? filterControls : []),
  ];
  controls.forEach(control => {
    if (!control) return;
    control.addEventListener("change", onStateChange);
    control.addEventListener("input", onStateChange);
  });
}

export { createStateSignature };
