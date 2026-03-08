// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   elements: AnyRecord,
 *   handlers: AnyRecord,
 *   deps: AnyRecord,
 *   globalScope?: any,
 * }} params
 */
export function createEventBindingsController({
  elements,
  handlers,
  deps,
  globalScope = globalThis,
}) {
  const {
    chatSelector,
    rangeSelect,
    customApplyButton,
    customStartInput,
    customEndInput,
    downloadParticipantsButton,
    downloadHourlyButton,
    downloadDailyButton,
    downloadWeeklyButton,
    downloadWeekdayButton,
    downloadTimeOfDayButton,
    downloadMessageTypesButton,
    downloadChatJsonButton,
    downloadSentimentButton,
    statDownloadButtons,
    downloadSearchButton,
    participantsTopSelect,
    participantsSortSelect,
    participantsTimeframeSelect,
    participantPresetButtons,
    weekdayToggleWeekdays,
    weekdayToggleWeekends,
    weekdayToggleWorking,
    weekdayToggleOffhours,
    timeOfDayWeekdayToggle,
    timeOfDayWeekendToggle,
    timeOfDayHourStartInput,
    timeOfDayHourEndInput,
    weekdayHourStartInput,
    weekdayHourEndInput,
  } = elements;

  const {
    handleChatSelectionChange,
    handleRangeChange,
    exportParticipants,
    exportHourly,
    exportDaily,
    exportWeekly,
    exportWeekday,
    exportTimeOfDay,
    exportMessageTypes,
    exportChatJson,
    exportSentiment,
    exportMessageSubtype,
    handleDownloadMarkdownReport,
    handleDownloadSlidesReport,
    exportSearchResults,
    handleDownloadPdfReport,
    handleParticipantsTopChange,
    handleParticipantsSortChange,
    handleParticipantsTimeframeChange,
    handleParticipantPresetClick,
  } = handlers;

  const {
    updateStatus,
    applyCustomRange,
    updateWeekdayState,
    updateHourlyState,
    getHourlyState,
  } = deps;

  function handleForcedChatSelection() {
    if (!chatSelector?.value) return;
    void handleChatSelectionChange({ target: chatSelector, force: true });
  }

  /**
   * @param {KeyboardEvent} event
   */
  function handleChatSelectorKeydown(event) {
    if (event.key !== "Enter" || !chatSelector?.value) return;
    event.preventDefault();
    handleForcedChatSelection();
  }

  async function handleCustomApplyClick() {
    const start = customStartInput?.value;
    const end = customEndInput?.value;
    if (!start || !end) {
      updateStatus("Please pick both a start and end date.", "warning");
      return;
    }
    await applyCustomRange(start, end);
  }

  /**
   * @param {string} filterKey
   * @param {HTMLInputElement | null | undefined} input
   */
  function updateWeekdayFilter(filterKey, input) {
    if (!input) return;
    updateWeekdayState({ filters: { [filterKey]: input.checked } });
  }

  /**
   * @param {"weekdays" | "weekends"} filterKey
   * @param {HTMLInputElement | null | undefined} input
   */
  function updateHourlyFilter(filterKey, input) {
    if (!input) return;
    updateHourlyState({
      filters: {
        ...getHourlyState().filters,
        [filterKey]: input.checked,
      },
    });
  }

  /**
   * @param {HTMLInputElement | null | undefined} startInput
   * @param {HTMLInputElement | null | undefined} endInput
   * @param {(payload: { start: number, end: number }) => void} applyBrush
   */
  function applyNormalizedBrush(startInput, endInput, applyBrush) {
    let start = Number(startInput?.value);
    let end = Number(endInput?.value);
    if (start > end) [start, end] = [end, start];
    applyBrush({ start, end });
  }

  /**
   * @param {Element} button
   */
  function handleStatDownloadClick(button) {
    const type = /** @type {HTMLElement} */ (button).dataset.export;
    if (type) {
      exportMessageSubtype(type);
    }
  }

  function initEventHandlers() {
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
    const supportsShellActionDispatch =
      typeof shellBridge?.setShellActionHandlers === "function" &&
      typeof shellBridge?.dispatchShellAction === "function";
    if (!supportsShellActionDispatch) {
      throw new Error("Shell bridge dispatch contracts are required for event bindings.");
    }
    shellBridge.setShellActionHandlers({
      "export.pdf": handleDownloadPdfReport,
      "export.markdown": handleDownloadMarkdownReport,
      "export.slides": handleDownloadSlidesReport,
    });

    if (chatSelector) {
      chatSelector.addEventListener("change", handleChatSelectionChange);
      chatSelector.addEventListener("dblclick", handleForcedChatSelection);
      chatSelector.addEventListener("keydown", handleChatSelectorKeydown);
    }
    if (rangeSelect) {
      rangeSelect.addEventListener("change", handleRangeChange);
    }

    if (customApplyButton) {
      customApplyButton.addEventListener("click", handleCustomApplyClick);
    }

    if (downloadParticipantsButton) {
      downloadParticipantsButton.addEventListener("click", exportParticipants);
    }
    if (downloadHourlyButton) {
      downloadHourlyButton.addEventListener("click", exportHourly);
    }
    if (downloadDailyButton) {
      downloadDailyButton.addEventListener("click", exportDaily);
    }
    if (downloadWeeklyButton) {
      downloadWeeklyButton.addEventListener("click", exportWeekly);
    }
    if (downloadWeekdayButton) {
      downloadWeekdayButton.addEventListener("click", exportWeekday);
    }
    if (downloadTimeOfDayButton) {
      downloadTimeOfDayButton.addEventListener("click", exportTimeOfDay);
    }
    if (downloadMessageTypesButton) {
      downloadMessageTypesButton.addEventListener("click", exportMessageTypes);
    }
    if (downloadChatJsonButton) {
      downloadChatJsonButton.addEventListener("click", exportChatJson);
    }
    if (downloadSentimentButton) {
      downloadSentimentButton.addEventListener("click", exportSentiment);
    }

    if (statDownloadButtons?.length) {
      statDownloadButtons.forEach(
        /** @param {Element} button */ function bindStatDownload(button) {
        button.addEventListener("click", () => handleStatDownloadClick(button));
      });
    }

    if (downloadSearchButton) {
      downloadSearchButton.addEventListener("click", exportSearchResults);
    }

    if (participantsTopSelect) {
      participantsTopSelect.addEventListener("change", handleParticipantsTopChange);
    }
    if (participantsSortSelect) {
      participantsSortSelect.addEventListener("change", handleParticipantsSortChange);
    }
    if (participantsTimeframeSelect) {
      participantsTimeframeSelect.addEventListener("change", handleParticipantsTimeframeChange);
    }
    if (participantPresetButtons?.length) {
      participantPresetButtons.forEach(/** @param {Element} button */ button => {
        button.addEventListener("click", handleParticipantPresetClick);
      });
    }
    const dashboardPanelsBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope });
    const vueOwnsParticipantInteractions = Boolean(dashboardPanelsBridge?.ownsParticipantInteractions);
    if (!vueOwnsParticipantInteractions) {
      throw new Error("Dashboard panels bridge participant interaction ownership is required.");
    }

    if (weekdayToggleWeekdays) {
      weekdayToggleWeekdays.addEventListener("change", () => updateWeekdayFilter("weekdays", weekdayToggleWeekdays));
    }
    if (weekdayToggleWeekends) {
      weekdayToggleWeekends.addEventListener("change", () => updateWeekdayFilter("weekends", weekdayToggleWeekends));
    }
    if (weekdayToggleWorking) {
      weekdayToggleWorking.addEventListener("change", () => updateWeekdayFilter("working", weekdayToggleWorking));
    }
    if (weekdayToggleOffhours) {
      weekdayToggleOffhours.addEventListener("change", () => updateWeekdayFilter("offhours", weekdayToggleOffhours));
    }

    if (timeOfDayWeekdayToggle) {
      timeOfDayWeekdayToggle.addEventListener("change", () => updateHourlyFilter("weekdays", timeOfDayWeekdayToggle));
    }
    if (timeOfDayWeekendToggle) {
      timeOfDayWeekendToggle.addEventListener("change", () => updateHourlyFilter("weekends", timeOfDayWeekendToggle));
    }
    if (timeOfDayHourStartInput && timeOfDayHourEndInput) {
      const updateTimeOfDayBrush = () =>
        applyNormalizedBrush(
          timeOfDayHourStartInput,
          timeOfDayHourEndInput,
          brush => updateHourlyState({ brush }),
        );
      timeOfDayHourStartInput.addEventListener("input", updateTimeOfDayBrush);
      timeOfDayHourEndInput.addEventListener("input", updateTimeOfDayBrush);
    }

    if (weekdayHourStartInput && weekdayHourEndInput) {
      const updateBrush = () =>
        applyNormalizedBrush(
          weekdayHourStartInput,
          weekdayHourEndInput,
          brush => updateWeekdayState({ brush }),
        );
      weekdayHourStartInput.addEventListener("input", updateBrush);
      weekdayHourEndInput.addEventListener("input", updateBrush);
    }
  }

  return {
    initEventHandlers,
  };
}
