import { buildHourLabels, syncHourLabelPair } from "./activityPanelFilterUtils.js";

export function syncWeekdayControls({
  state,
  renderWithDashboardPanelsBridge,
  weekdayToggleWeekdays,
  weekdayToggleWeekends,
  weekdayToggleWorking,
  weekdayToggleOffhours,
  weekdayHourStartInput,
  weekdayHourEndInput,
  weekdayHourStartLabel,
  weekdayHourEndLabel,
  activityPanelsMetaRenderer,
}) {
  const { filters, brush } = state;
  const labels = buildHourLabels(brush.start, brush.end);
  const handled = renderWithDashboardPanelsBridge("syncWeekdayControls", { filters, brush, labels });
  if (handled) return;
  if (weekdayToggleWeekdays) weekdayToggleWeekdays.setAttribute('aria-checked', String(filters.weekdays));
  if (weekdayToggleWeekends) weekdayToggleWeekends.setAttribute('aria-checked', String(filters.weekends));
  if (weekdayToggleWorking) weekdayToggleWorking.setAttribute('aria-checked', String(filters.working));
  if (weekdayToggleOffhours) weekdayToggleOffhours.setAttribute('aria-checked', String(filters.offhours));
  if (weekdayHourStartInput) weekdayHourStartInput.value = String(brush.start);
  if (weekdayHourEndInput) weekdayHourEndInput.value = String(brush.end);
  syncHourLabelPair(
    weekdayHourStartLabel,
    weekdayHourEndLabel,
    labels,
    () => typeof activityPanelsMetaRenderer?.renderWeekdayBrushLabels === "function",
    nextLabels => activityPanelsMetaRenderer?.renderWeekdayBrushLabels?.(nextLabels),
  );
}

export function syncHourlyControls({
  state,
  renderWithDashboardPanelsBridge,
  filterWeekdays,
  filterWeekends,
  filterWorking,
  filterOffhours,
  hourlyBrushStartInput,
  hourlyBrushEndInput,
  hourlyBrushStartLabel,
  hourlyBrushEndLabel,
  timeOfDayWeekdayToggle,
  timeOfDayWeekendToggle,
  timeOfDayHourStartInput,
  timeOfDayHourEndInput,
  timeOfDayHourStartLabel,
  timeOfDayHourEndLabel,
  activityPanelsMetaRenderer,
}) {
  const labels = buildHourLabels(state.brush.start, state.brush.end);
  const handledHourlyControls = renderWithDashboardPanelsBridge("syncHourlyControls", {
    filters: state.filters,
    brush: state.brush,
    labels,
  });
  if (!handledHourlyControls) {
    if (filterWeekdays) filterWeekdays.setAttribute('aria-checked', String(state.filters.weekdays));
    if (filterWeekends) filterWeekends.setAttribute('aria-checked', String(state.filters.weekends));
    if (filterWorking) filterWorking.setAttribute('aria-checked', String(state.filters.working));
    if (filterOffhours) filterOffhours.setAttribute('aria-checked', String(state.filters.offhours));
    if (hourlyBrushStartInput) hourlyBrushStartInput.value = String(state.brush.start);
    if (hourlyBrushEndInput) hourlyBrushEndInput.value = String(state.brush.end);
    syncHourLabelPair(
      hourlyBrushStartLabel,
      hourlyBrushEndLabel,
      labels,
      () => typeof activityPanelsMetaRenderer?.renderHourlyBrushLabels === "function",
      nextLabels => activityPanelsMetaRenderer?.renderHourlyBrushLabels?.(nextLabels),
    );
  }
  const handledTimeOfDayControls = renderWithDashboardPanelsBridge("syncTimeOfDayControls", {
    filters: {
      weekdays: state.filters.weekdays,
      weekends: state.filters.weekends,
    },
    brush: state.brush,
    labels,
  });
  if (handledTimeOfDayControls) return;
  if (timeOfDayWeekdayToggle) timeOfDayWeekdayToggle.setAttribute('aria-checked', String(state.filters.weekdays));
  if (timeOfDayWeekendToggle) timeOfDayWeekendToggle.setAttribute('aria-checked', String(state.filters.weekends));
  if (timeOfDayHourStartInput) timeOfDayHourStartInput.value = String(state.brush.start);
  if (timeOfDayHourEndInput) timeOfDayHourEndInput.value = String(state.brush.end);
  syncHourLabelPair(
    timeOfDayHourStartLabel,
    timeOfDayHourEndLabel,
    labels,
    () => typeof activityPanelsMetaRenderer?.renderTimeOfDayBrushLabels === "function",
    nextLabels => activityPanelsMetaRenderer?.renderTimeOfDayBrushLabels?.(nextLabels),
  );
}
