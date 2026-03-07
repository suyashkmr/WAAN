// @ts-check

import { renderParticipants as renderParticipantsSection } from "../../analytics/summary.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
export function createParticipantsPanelController({ elements, deps }) {
  const {
    participantsBody,
    participantsNote,
    participantPresetButtons,
  } = elements;

  const {
    getDatasetEntries,
    participantFilters,
    setParticipantView,
    resolveDashboardPanelsBridge,
  } = deps;

  /**
   * @param {AnyRecord} analytics
   */
  function renderParticipants(analytics) {
    if (!participantsBody) return;
    renderParticipantsSection(/** @type {any} */ ({
      analytics,
      entries: getDatasetEntries(),
      participantFilters,
      participantsBody,
      participantsNote,
      participantPresetButtons,
      setParticipantView: /** @param {any[]} next */ next => {
        setParticipantView(Array.isArray(next) ? next : []);
      },
      resolveDashboardPanelsBridgeFn: resolveDashboardPanelsBridge,
    }));
  }

  return {
    renderParticipants,
  };
}

/**
 * @param {AnyRecord} participantFilters
 * @param {any} value
 */
export function applyParticipantTopChange(participantFilters, value) {
  const numeric = Number(value ?? 0);
  participantFilters.topCount = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * @param {AnyRecord} participantFilters
 * @param {any} value
 */
export function applyParticipantSortChange(participantFilters, value) {
  participantFilters.sortMode = value || "most";
}

/**
 * @param {AnyRecord} participantFilters
 * @param {any} value
 */
export function applyParticipantTimeframeChange(participantFilters, value) {
  participantFilters.timeframe = value || "all";
}

/**
 * @param {AnyRecord} participantFilters
 * @param {string | undefined} preset
 * @param {{ participantsTopSelect: HTMLSelectElement | null | undefined, participantsSortSelect: HTMLSelectElement | null | undefined, participantsTimeframeSelect: HTMLSelectElement | null | undefined }} controls
 */
export function applyParticipantPreset(participantFilters, preset, controls) {
  const { participantsTopSelect, participantsSortSelect, participantsTimeframeSelect } = controls;
  if (!preset) return;

  if (preset === "top-week") {
    if (participantsTopSelect) participantsTopSelect.value = "5";
    if (participantsSortSelect) participantsSortSelect.value = "most";
    if (participantsTimeframeSelect) participantsTimeframeSelect.value = "week";
    participantFilters.topCount = 5;
    participantFilters.sortMode = "most";
    participantFilters.timeframe = "week";
    return;
  }

  if (preset === "quiet") {
    if (participantsTopSelect) participantsTopSelect.value = "5";
    if (participantsSortSelect) participantsSortSelect.value = "quiet";
    if (participantsTimeframeSelect) participantsTimeframeSelect.value = "all";
    participantFilters.topCount = 5;
    participantFilters.sortMode = "quiet";
    participantFilters.timeframe = "all";
  }
}

/**
 * @param {Element | null | undefined} row
 * @param {string} rowId
 */
function resolveParticipantDetailRow(row, rowId) {
  const nextRow = row?.nextElementSibling;
  if (
    nextRow instanceof HTMLElement &&
    nextRow.matches("tr.participant-detail-row") &&
    nextRow.dataset.rowId === rowId
  ) {
    return nextRow;
  }
  return null;
}

/**
 * @param {MouseEvent} event
 */
export function toggleParticipantRow(event) {
  const target = /** @type {Element | null} */ (event.target instanceof Element ? event.target : null);
  const toggle = target?.closest(".participant-toggle");
  if (!toggle) return;
  event.preventDefault();
  const row = toggle.closest("tr");
  if (!row) return;
  const rowId = row.dataset.rowId;
  if (!rowId) return;
  const detailRow = resolveParticipantDetailRow(row, rowId);
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isExpanded));
  const participantName = toggle.querySelector(".participant-name")?.textContent?.trim() || "participant";
  toggle.setAttribute("aria-label", `${!isExpanded ? "Hide" : "Show"} details for ${participantName}`);
  const icon = toggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = !isExpanded ? "▾" : "▸";
  row.classList.toggle("expanded", !isExpanded);
  if (detailRow) {
    detailRow.classList.toggle("hidden", isExpanded);
  }
}
