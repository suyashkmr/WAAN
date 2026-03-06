// @ts-check

/**
 * @param {{
 *   getHourlyState: () => { filters: Record<string, boolean>, brush: { start: number, end: number } },
 *   updateHourlyState: (next: Record<string, any>) => void,
 *   ensureDayFilters: () => void,
 *   ensureHourFilters: () => void,
 *   weekdayToggle?: HTMLInputElement | null,
 *   weekendToggle?: HTMLInputElement | null,
 *   workingToggle?: HTMLInputElement | null,
 *   offToggle?: HTMLInputElement | null,
 *   brushStart?: HTMLInputElement | null,
 *   brushEnd?: HTMLInputElement | null,
 *   startLabel?: HTMLElement | null,
 *   endLabel?: HTMLElement | null,
 * }} params
 */
export function initActivityHourlyControls({
  getHourlyState,
  updateHourlyState,
  ensureDayFilters,
  ensureHourFilters,
  weekdayToggle = null,
  weekendToggle = null,
  workingToggle = null,
  offToggle = null,
  brushStart = null,
  brushEnd = null,
  startLabel = null,
  endLabel = null,
}) {
  if (weekdayToggle) {
    weekdayToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekdays: weekdayToggle.checked,
        },
      });
      ensureDayFilters();
    });
  }

  if (weekendToggle) {
    weekendToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekends: weekendToggle.checked,
        },
      });
      ensureDayFilters();
    });
  }

  if (workingToggle) {
    workingToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          working: workingToggle.checked,
        },
      });
      ensureHourFilters();
    });
  }

  if (offToggle) {
    offToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          offhours: offToggle.checked,
        },
      });
      ensureHourFilters();
    });
  }

  if (brushStart && brushEnd) {
    const updateBrush = () => {
      let start = Number(brushStart.value);
      let end = Number(brushEnd.value);
      if (start > end) [start, end] = [end, start];
      updateHourlyState({
        brush: { start, end },
      });
      brushStart.value = String(start);
      brushEnd.value = String(end);
      if (startLabel) startLabel.textContent = `${String(start).padStart(2, "0")}:00`;
      if (endLabel) endLabel.textContent = `${String(end).padStart(2, "0")}:00`;
    };
    brushStart.addEventListener("input", updateBrush);
    brushEnd.addEventListener("input", updateBrush);
    brushStart.value = String(getHourlyState().brush.start);
    brushEnd.value = String(getHourlyState().brush.end);
  }
}
