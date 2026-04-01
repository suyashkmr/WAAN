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
 *   syncBrushLabels?: ((labels: { start: string, end: string }) => void) | null,
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
  syncBrushLabels = null,
}) {
  if (weekdayToggle) {
    weekdayToggle.addEventListener("click", () => {
      const isChecked = weekdayToggle.getAttribute('aria-checked') === 'true';
      weekdayToggle.setAttribute('aria-checked', String(!isChecked));
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekdays: !isChecked,
        },
      });
      ensureDayFilters();
    });
  }

  if (weekendToggle) {
    weekendToggle.addEventListener("click", () => {
      const isChecked = weekendToggle.getAttribute('aria-checked') === 'true';
      weekendToggle.setAttribute('aria-checked', String(!isChecked));
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekends: !isChecked,
        },
      });
      ensureDayFilters();
    });
  }

  if (workingToggle) {
    workingToggle.addEventListener("click", () => {
      const isChecked = workingToggle.getAttribute('aria-checked') === 'true';
      workingToggle.setAttribute('aria-checked', String(!isChecked));
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          working: !isChecked,
        },
      });
      ensureHourFilters();
    });
  }

  if (offToggle) {
    offToggle.addEventListener("click", () => {
      const isChecked = offToggle.getAttribute('aria-checked') === 'true';
      offToggle.setAttribute('aria-checked', String(!isChecked));
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          offhours: !isChecked,
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
      const labels = {
        start: `${String(start).padStart(2, "0")}:00`,
        end: `${String(end).padStart(2, "0")}:00`,
      };
      if (typeof syncBrushLabels === "function") {
        syncBrushLabels(labels);
      } else {
        if (startLabel) startLabel.textContent = labels.start;
        if (endLabel) endLabel.textContent = labels.end;
      }
    };
    brushStart.addEventListener("input", updateBrush);
    brushEnd.addEventListener("input", updateBrush);
    brushStart.value = String(getHourlyState().brush.start);
    brushEnd.value = String(getHourlyState().brush.end);
  }
}
