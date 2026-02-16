import {
  applyParticipantTopChange,
  applyParticipantSortChange,
  applyParticipantTimeframeChange,
  applyParticipantPreset,
  toggleParticipantRow,
} from "./dashboardRender.js";

export function createParticipantInteractionsController({ elements, deps }) {
  const {
    participantsTopSelect,
    participantsSortSelect,
    participantsTimeframeSelect,
    participantsBody,
  } = elements;

  const {
    participantFilters,
    getDatasetAnalytics,
    renderParticipants,
  } = deps;

  function rerenderParticipantsIfAvailable() {
    const analytics = getDatasetAnalytics();
    if (analytics) renderParticipants(analytics);
  }

  function handleParticipantsTopChange() {
    applyParticipantTopChange(participantFilters, participantsTopSelect?.value);
    rerenderParticipantsIfAvailable();
  }

  function handleParticipantsSortChange() {
    applyParticipantSortChange(participantFilters, participantsSortSelect?.value);
    rerenderParticipantsIfAvailable();
  }

  function handleParticipantsTimeframeChange() {
    applyParticipantTimeframeChange(participantFilters, participantsTimeframeSelect?.value);
    rerenderParticipantsIfAvailable();
  }

  function handleParticipantPresetClick(event) {
    const preset = event.currentTarget?.dataset?.participantsPreset;
    applyParticipantPreset(participantFilters, preset, {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
    });
    rerenderParticipantsIfAvailable();
  }

  function handleParticipantRowToggle(event) {
    toggleParticipantRow(event, participantsBody);
  }

  return {
    handleParticipantsTopChange,
    handleParticipantsSortChange,
    handleParticipantsTimeframeChange,
    handleParticipantPresetClick,
    handleParticipantRowToggle,
  };
}
