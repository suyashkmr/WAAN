// @ts-check

/**
 * @param {{
 *   getHourlyState: () => { filters: Record<string, boolean>, brush: { start: number, end: number } },
 *   updateHourlyState: (next: Record<string, any>) => void,
 *   ensureDayFilters: () => void,
 *   ensureHourFilters: () => void,
 *   documentRef?: Document | null,
 * }} params
 */
export function initActivityHourlyControls({
  getHourlyState,
  updateHourlyState,
  ensureDayFilters,
  ensureHourFilters,
  documentRef = globalThis.document ?? null,
}) {
  if (!documentRef) return;

  const weekdayToggle = /** @type {HTMLInputElement | null} */ (documentRef.getElementById("filter-weekdays"));
  const weekendToggle = /** @type {HTMLInputElement | null} */ (documentRef.getElementById("filter-weekends"));
  const workingToggle = /** @type {HTMLInputElement | null} */ (documentRef.getElementById("filter-working"));
  const offToggle = /** @type {HTMLInputElement | null} */ (documentRef.getElementById("filter-offhours"));
  const brushStart = /** @type {HTMLInputElement | null} */ (documentRef.getElementById("hourly-brush-start"));
  const brushEnd = /** @type {HTMLInputElement | null} */ (documentRef.getElementById("hourly-brush-end"));

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
      const startLabel = documentRef.getElementById("hourly-brush-start-label");
      const endLabel = documentRef.getElementById("hourly-brush-end-label");
      if (startLabel) startLabel.textContent = `${String(start).padStart(2, "0")}:00`;
      if (endLabel) endLabel.textContent = `${String(end).padStart(2, "0")}:00`;
    };
    brushStart.addEventListener("input", updateBrush);
    brushEnd.addEventListener("input", updateBrush);
    brushStart.value = String(getHourlyState().brush.start);
    brushEnd.value = String(getHourlyState().brush.end);
  }
}
