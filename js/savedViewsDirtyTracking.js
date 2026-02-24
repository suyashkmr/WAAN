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
  onStateChange,
  documentRef = typeof document !== "undefined" ? document : null,
}) {
  if (typeof onStateChange !== "function") return;
  const ids = [
    "filter-weekdays",
    "filter-weekends",
    "filter-working",
    "filter-offhours",
    "hourly-brush-start",
    "hourly-brush-end",
    "weekday-toggle-weekdays",
    "weekday-toggle-weekends",
    "weekday-toggle-working",
    "weekday-toggle-offhours",
    "weekday-hour-start",
    "weekday-hour-end",
  ];
  const controls = [
    rangeSelect,
    customStartInput,
    customEndInput,
    ...ids.map(id => documentRef?.getElementById(id) || null),
  ];
  controls.forEach(control => {
    if (!control) return;
    control.addEventListener("change", onStateChange);
    control.addEventListener("input", onStateChange);
  });
}

export { createStateSignature };
