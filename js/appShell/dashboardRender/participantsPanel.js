import { renderParticipants as renderParticipantsSection } from "../../analytics/summary.js";

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
  } = deps;

  function renderParticipants(analytics) {
    if (!participantsBody) return;
    renderParticipantsSection({
      analytics,
      entries: getDatasetEntries(),
      participantFilters,
      participantsBody,
      participantsNote,
      participantPresetButtons,
      setParticipantView: next => {
        setParticipantView(Array.isArray(next) ? next : []);
      },
    });
  }

  return {
    renderParticipants,
  };
}

export function applyParticipantTopChange(participantFilters, value) {
  const numeric = Number(value ?? 0);
  participantFilters.topCount = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function applyParticipantSortChange(participantFilters, value) {
  participantFilters.sortMode = value || "most";
}

export function applyParticipantTimeframeChange(participantFilters, value) {
  participantFilters.timeframe = value || "all";
}

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

export function toggleParticipantRow(event, participantsBody) {
  const toggle = event.target.closest(".participant-toggle");
  if (!toggle) return;
  event.preventDefault();
  const row = toggle.closest("tr");
  if (!row) return;
  const rowId = row.dataset.rowId;
  if (!rowId || !participantsBody) return;
  const detailRow = participantsBody.querySelector(`tr.participant-detail-row[data-row-id="${rowId}"]`);
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isExpanded));
  const icon = toggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = !isExpanded ? "▾" : "▸";
  row.classList.toggle("expanded", !isExpanded);
  if (detailRow) {
    detailRow.classList.toggle("hidden", isExpanded);
  }
}
