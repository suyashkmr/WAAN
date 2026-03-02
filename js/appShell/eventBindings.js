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
    subscribeAppShellUiState,
    updateWeekdayState,
    ensureWeekdayDayFilters,
    syncWeekdayControlsWithState,
    rerenderWeekdayFromState,
    ensureWeekdayHourFilters,
    updateHourlyState,
    getHourlyState,
    ensureDayFilters,
    syncHourlyControlsWithState,
    rerenderHourlyFromState,
  } = deps;

  const hasStateSubscription = typeof subscribeAppShellUiState === "function";

  function initEventHandlers() {
    if (chatSelector) {
      chatSelector.addEventListener("change", handleChatSelectionChange);
      chatSelector.addEventListener("dblclick", () => {
        if (!chatSelector.value) return;
        void handleChatSelectionChange({ target: chatSelector, force: true });
      });
      chatSelector.addEventListener("keydown", event => {
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

    document.querySelectorAll(".stat-download").forEach(button => {
      button.addEventListener("click", () => {
        const type = button.dataset.export;
        if (type) {
          exportMessageSubtype(type);
        }
      });
    });

    if (downloadMarkdownButton) {
      downloadMarkdownButton.addEventListener("click", handleDownloadMarkdownReport);
    }
    if (downloadSlidesButton) {
      downloadSlidesButton.addEventListener("click", handleDownloadSlidesReport);
    }
    if (downloadSearchButton) {
      downloadSearchButton.addEventListener("click", exportSearchResults);
    }
    if (downloadPdfButton) {
      downloadPdfButton.addEventListener("click", handleDownloadPdfReport);
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
      participantPresetButtons.forEach(button => {
        button.addEventListener("click", handleParticipantPresetClick);
      });
    }
    if (participantsBody) {
      participantsBody.addEventListener("click", handleParticipantRowToggle);
    }

    if (weekdayToggleWeekdays) {
      weekdayToggleWeekdays.addEventListener("change", () => {
        updateWeekdayState({ filters: { weekdays: weekdayToggleWeekdays.checked } });
        if (!hasStateSubscription) {
          ensureWeekdayDayFilters();
          rerenderWeekdayFromState();
        }
      });
    }
    if (weekdayToggleWeekends) {
      weekdayToggleWeekends.addEventListener("change", () => {
        updateWeekdayState({ filters: { weekends: weekdayToggleWeekends.checked } });
        if (!hasStateSubscription) {
          ensureWeekdayDayFilters();
          rerenderWeekdayFromState();
        }
      });
    }
    if (weekdayToggleWorking) {
      weekdayToggleWorking.addEventListener("change", () => {
        updateWeekdayState({ filters: { working: weekdayToggleWorking.checked } });
        if (!hasStateSubscription) {
          ensureWeekdayHourFilters();
          rerenderWeekdayFromState();
        }
      });
    }
    if (weekdayToggleOffhours) {
      weekdayToggleOffhours.addEventListener("change", () => {
        updateWeekdayState({ filters: { offhours: weekdayToggleOffhours.checked } });
        if (!hasStateSubscription) {
          ensureWeekdayHourFilters();
          rerenderWeekdayFromState();
        }
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
        if (!hasStateSubscription) {
          ensureDayFilters();
          syncHourlyControlsWithState();
          rerenderHourlyFromState();
        }
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
        if (!hasStateSubscription) {
          ensureDayFilters();
          syncHourlyControlsWithState();
          rerenderHourlyFromState();
        }
      });
    }
    if (timeOfDayHourStartInput && timeOfDayHourEndInput) {
      const updateTimeOfDayBrush = () => {
        let start = Number(timeOfDayHourStartInput.value);
        let end = Number(timeOfDayHourEndInput.value);
        if (start > end) [start, end] = [end, start];
        updateHourlyState({ brush: { start, end } });
        if (!hasStateSubscription) {
          syncHourlyControlsWithState();
          rerenderHourlyFromState();
        }
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
        weekdayHourStartInput.value = String(start);
        weekdayHourEndInput.value = String(end);
        const startLabel = document.getElementById("weekday-hour-start-label");
        const endLabel = document.getElementById("weekday-hour-end-label");
        if (startLabel) startLabel.textContent = `${String(start).padStart(2, "0")}:00`;
        if (endLabel) endLabel.textContent = `${String(end).padStart(2, "0")}:00`;
        if (!hasStateSubscription) {
          rerenderWeekdayFromState();
        }
      };
      weekdayHourStartInput.addEventListener("input", updateBrush);
      weekdayHourEndInput.addEventListener("input", updateBrush);
    }
  }

  return {
    initEventHandlers,
  };
}
