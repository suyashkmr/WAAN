// @ts-check

/**
 * @param {number} start
 * @param {number} end
 */
export function buildHourLabels(start, end) {
  return {
    start: `${String(start).padStart(2, "0")}:00`,
    end: `${String(end).padStart(2, "0")}:00`,
  };
}

/**
 * @param {HTMLElement | null | undefined} startLabelEl
 * @param {HTMLElement | null | undefined} endLabelEl
 * @param {{ start: string, end: string }} labels
 * @param {(() => boolean) | undefined} hasRenderer
 * @param {(labels: { start: string, end: string }) => void} renderWithRenderer
 */
export function syncHourLabelPair(startLabelEl, endLabelEl, labels, hasRenderer, renderWithRenderer) {
  renderWithRenderer(labels);
  if (hasRenderer?.()) return;
  if (startLabelEl) startLabelEl.textContent = labels.start;
  if (endLabelEl) endLabelEl.textContent = labels.end;
}

/**
 * @param {{ filters: Record<string, boolean> }} state
 * @param {{ firstKey: string, secondKey: string, firstToggle: any, secondToggle: any, updateState: (partial: { filters: Record<string, boolean> }) => void }} params
 */
export function ensureFilterPair(state, { firstKey, secondKey, firstToggle, secondToggle, updateState }) {
  const filters = { ...state.filters };
  if (filters[firstKey] || filters[secondKey]) return;
  filters[firstKey] = true;
  filters[secondKey] = true;
  if (firstToggle) firstToggle.setAttribute('aria-checked', 'true');
  if (secondToggle) secondToggle.setAttribute('aria-checked', 'true');
  updateState({ filters });
}
