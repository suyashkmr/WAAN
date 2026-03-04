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
 * }} params
 */
export function createEventBindingsController({ elements, handlers, deps }) {
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
    downloadMarkdownButton,
    downloadSlidesButton,
    downloadSearchButton,
    downloadPdfButton,
    participantsTopSelect,
    participantsSortSelect,
    participantsTimeframeSelect,
    participantPresetButtons,
    participantsBody,
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
    handleParticipantRowToggle,
  } = handlers;

  const {
    updateStatus,
    applyCustomRange,
    updateWeekdayState,
    updateHourlyState,
    getHourlyState,
  } = deps;

  const documentRef = globalThis.document ?? null;

  function initEventHandlers() {
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
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
      chatSelector.addEventListener("dblclick", () => {
        if (!chatSelector.value) return;
        void handleChatSelectionChange({ target: chatSelector, force: true });
      });
      chatSelector.addEventListener("keydown", /** @param {KeyboardEvent} event */ event => {
        if (event.key !== "Enter" || !chatSelector.value) return;
        event.preventDefault();
        void handleChatSelectionChange({ target: chatSelector, force: true });
      });
    }
    if (rangeSelect) {
      rangeSelect.addEventListener("change", handleRangeChange);
    }

    if (customApplyButton) {
      customApplyButton.addEventListener("click", async () => {
        const start = customStartInput?.value;
        const end = customEndInput?.value;
        if (!start || !end) {
          updateStatus("Please pick both a start and end date.", "warning");
          return;
        }
        await applyCustomRange(start, end);
      });
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

    if (documentRef) {
      documentRef.querySelectorAll(".stat-download").forEach(
        /** @param {Element} button */ function bindStatDownload(button) {
        button.addEventListener("click", () => {
          const type = /** @type {HTMLElement} */ (button).dataset.export;
          if (type) {
            exportMessageSubtype(type);
          }
        });
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
    const dashboardPanelsBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels);
    const vueOwnsParticipantInteractions = Boolean(dashboardPanelsBridge?.ownsParticipantInteractions);
    if (!vueOwnsParticipantInteractions) {
      throw new Error("Dashboard panels bridge participant interaction ownership is required.");
    }
    void participantsBody;
    void handleParticipantRowToggle;

    if (weekdayToggleWeekdays) {
      weekdayToggleWeekdays.addEventListener("change", () => {
        updateWeekdayState({ filters: { weekdays: weekdayToggleWeekdays.checked } });
      });
    }
    if (weekdayToggleWeekends) {
      weekdayToggleWeekends.addEventListener("change", () => {
        updateWeekdayState({ filters: { weekends: weekdayToggleWeekends.checked } });
      });
    }
    if (weekdayToggleWorking) {
      weekdayToggleWorking.addEventListener("change", () => {
        updateWeekdayState({ filters: { working: weekdayToggleWorking.checked } });
      });
    }
    if (weekdayToggleOffhours) {
      weekdayToggleOffhours.addEventListener("change", () => {
        updateWeekdayState({ filters: { offhours: weekdayToggleOffhours.checked } });
      });
    }

    if (timeOfDayWeekdayToggle) {
      timeOfDayWeekdayToggle.addEventListener("change", () => {
        updateHourlyState({
          filters: {
            ...getHourlyState().filters,
            weekdays: timeOfDayWeekdayToggle.checked,
          },
        });
      });
    }
    if (timeOfDayWeekendToggle) {
      timeOfDayWeekendToggle.addEventListener("change", () => {
        updateHourlyState({
          filters: {
            ...getHourlyState().filters,
            weekends: timeOfDayWeekendToggle.checked,
          },
        });
      });
    }
    if (timeOfDayHourStartInput && timeOfDayHourEndInput) {
      const updateTimeOfDayBrush = () => {
        let start = Number(timeOfDayHourStartInput.value);
        let end = Number(timeOfDayHourEndInput.value);
        if (start > end) [start, end] = [end, start];
        updateHourlyState({ brush: { start, end } });
      };
      timeOfDayHourStartInput.addEventListener("input", updateTimeOfDayBrush);
      timeOfDayHourEndInput.addEventListener("input", updateTimeOfDayBrush);
    }

    if (weekdayHourStartInput && weekdayHourEndInput) {
      const updateBrush = () => {
        let start = Number(weekdayHourStartInput.value);
        let end = Number(weekdayHourEndInput.value);
        if (start > end) [start, end] = [end, start];
        updateWeekdayState({ brush: { start, end } });
      };
      weekdayHourStartInput.addEventListener("input", updateBrush);
      weekdayHourEndInput.addEventListener("input", updateBrush);
    }
  }

  return {
    initEventHandlers,
  };
}
