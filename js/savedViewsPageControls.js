export function syncSavedViewPageControls(syncPageControls, rangeValue) {
  if (typeof syncPageControls !== "function") return false;
  const isCustom = typeof rangeValue === "object" && rangeValue;
  return Boolean(syncPageControls({
    rangeValue: isCustom ? "custom" : String(rangeValue),
    customVisible: Boolean(isCustom),
    customStart: isCustom ? (rangeValue.start ?? "") : "",
    customEnd: isCustom ? (rangeValue.end ?? "") : "",
  }));
}
