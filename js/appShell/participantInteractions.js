// @ts-check

import {
  applyParticipantTopChange,
  applyParticipantSortChange,
  applyParticipantTimeframeChange,
  applyParticipantPreset,
  toggleParticipantRow,
} from "./dashboardRender.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
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

  /**
   * @param {MouseEvent & { currentTarget?: Element | null }} event
   */
  function handleParticipantPresetClick(event) {
    const preset = /** @type {any} */ (event.currentTarget)?.dataset?.participantsPreset;
    applyParticipantPreset(participantFilters, preset, {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
    });
    rerenderParticipantsIfAvailable();
  }

  /**
   * @param {MouseEvent} event
   */
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
