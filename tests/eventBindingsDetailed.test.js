import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventBindingsController } from "../js/appShell/eventBindings.js";

function createHandlers() {
  return {
    handleChatSelectionChange: vi.fn(),
    handleRangeChange: vi.fn(),
    exportParticipants: vi.fn(),
    exportHourly: vi.fn(),
    exportDaily: vi.fn(),
    exportWeekly: vi.fn(),
    exportWeekday: vi.fn(),
    exportTimeOfDay: vi.fn(),
    exportMessageTypes: vi.fn(),
    exportChatJson: vi.fn(),
    exportSentiment: vi.fn(),
    exportMessageSubtype: vi.fn(),
    handleDownloadMarkdownReport: vi.fn(),
    handleDownloadSlidesReport: vi.fn(),
    exportSearchResults: vi.fn(),
    handleDownloadPdfReport: vi.fn(),
    handleParticipantsTopChange: vi.fn(),
    handleParticipantsSortChange: vi.fn(),
    handleParticipantsTimeframeChange: vi.fn(),
    handleParticipantPresetClick: vi.fn(),
    handleParticipantRowToggle: vi.fn(),
  };
}

function createDeps(overrides = {}) {
  return {
    updateStatus: vi.fn(),
    applyCustomRange: vi.fn(async () => {}),
    updateWeekdayState: vi.fn(),
    ensureWeekdayDayFilters: vi.fn(),
    rerenderWeekdayFromState: vi.fn(),
    ensureWeekdayHourFilters: vi.fn(),
    updateHourlyState: vi.fn(),
    getHourlyState: vi.fn(() => ({
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    })),
    ensureDayFilters: vi.fn(),
    syncHourlyControlsWithState: vi.fn(),
    rerenderHourlyFromState: vi.fn(),
    ...overrides,
  };
}

describe("event bindings detailed", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wires export/download/participant actions", () => {
    const handlers = createHandlers();
    const deps = createDeps();

    const mkBtn = () => document.createElement("button");
    const participantsTopSelect = document.createElement("select");
    const participantsSortSelect = document.createElement("select");
    const participantsTimeframeSelect = document.createElement("select");
    const participantsBody = document.createElement("tbody");
    const presetA = document.createElement("button");
    const presetB = document.createElement("button");

    const statA = document.createElement("button");
    statA.className = "stat-download";
    statA.dataset.export = "links";
    const statB = document.createElement("button");
    statB.className = "stat-download";
    statB.dataset.export = "media";
    document.body.append(statA, statB);

    const downloadParticipantsButton = mkBtn();
    const downloadHourlyButton = mkBtn();
    const downloadDailyButton = mkBtn();
    const downloadWeeklyButton = mkBtn();
    const downloadWeekdayButton = mkBtn();
    const downloadTimeOfDayButton = mkBtn();
    const downloadMessageTypesButton = mkBtn();
    const downloadChatJsonButton = mkBtn();
    const downloadSentimentButton = mkBtn();
    const downloadMarkdownButton = mkBtn();
    const downloadSlidesButton = mkBtn();
    const downloadSearchButton = mkBtn();
    const downloadPdfButton = mkBtn();

    const { initEventHandlers } = createEventBindingsController({
      elements: {
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
        participantPresetButtons: [presetA, presetB],
        participantsBody,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    downloadParticipantsButton.click();
    downloadHourlyButton.click();
    downloadDailyButton.click();
    downloadWeeklyButton.click();
    downloadWeekdayButton.click();
    downloadTimeOfDayButton.click();
    downloadMessageTypesButton.click();
    downloadChatJsonButton.click();
    downloadSentimentButton.click();
    downloadMarkdownButton.click();
    downloadSlidesButton.click();
    downloadSearchButton.click();
    downloadPdfButton.click();
    statA.click();
    statB.click();
    participantsTopSelect.dispatchEvent(new Event("change"));
    participantsSortSelect.dispatchEvent(new Event("change"));
    participantsTimeframeSelect.dispatchEvent(new Event("change"));
    presetA.click();
    participantsBody.dispatchEvent(new Event("click"));

    expect(handlers.exportParticipants).toHaveBeenCalledTimes(1);
    expect(handlers.exportHourly).toHaveBeenCalledTimes(1);
    expect(handlers.exportDaily).toHaveBeenCalledTimes(1);
    expect(handlers.exportWeekly).toHaveBeenCalledTimes(1);
    expect(handlers.exportWeekday).toHaveBeenCalledTimes(1);
    expect(handlers.exportTimeOfDay).toHaveBeenCalledTimes(1);
    expect(handlers.exportMessageTypes).toHaveBeenCalledTimes(1);
    expect(handlers.exportChatJson).toHaveBeenCalledTimes(1);
    expect(handlers.exportSentiment).toHaveBeenCalledTimes(1);
    expect(handlers.handleDownloadMarkdownReport).toHaveBeenCalledTimes(1);
    expect(handlers.handleDownloadSlidesReport).toHaveBeenCalledTimes(1);
    expect(handlers.exportSearchResults).toHaveBeenCalledTimes(1);
    expect(handlers.handleDownloadPdfReport).toHaveBeenCalledTimes(1);
    expect(handlers.exportMessageSubtype).toHaveBeenCalledWith("links");
    expect(handlers.exportMessageSubtype).toHaveBeenCalledWith("media");
    expect(handlers.handleParticipantsTopChange).toHaveBeenCalledTimes(1);
    expect(handlers.handleParticipantsSortChange).toHaveBeenCalledTimes(1);
    expect(handlers.handleParticipantsTimeframeChange).toHaveBeenCalledTimes(1);
    expect(handlers.handleParticipantPresetClick).toHaveBeenCalledTimes(1);
    expect(handlers.handleParticipantRowToggle).toHaveBeenCalledTimes(1);
  });

  it("updates weekday filters and brush labels", () => {
    const handlers = createHandlers();
    const deps = createDeps();

    const weekdayToggleWeekdays = document.createElement("input");
    const weekdayToggleWeekends = document.createElement("input");
    const weekdayToggleWorking = document.createElement("input");
    const weekdayToggleOffhours = document.createElement("input");
    const weekdayHourStartInput = document.createElement("input");
    const weekdayHourEndInput = document.createElement("input");

    const startLabel = document.createElement("span");
    startLabel.id = "weekday-hour-start-label";
    const endLabel = document.createElement("span");
    endLabel.id = "weekday-hour-end-label";
    document.body.append(startLabel, endLabel);

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        weekdayToggleWeekdays,
        weekdayToggleWeekends,
        weekdayToggleWorking,
        weekdayToggleOffhours,
        weekdayHourStartInput,
        weekdayHourEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    weekdayToggleWeekdays.checked = false;
    weekdayToggleWeekends.checked = true;
    weekdayToggleWorking.checked = false;
    weekdayToggleOffhours.checked = true;
    weekdayToggleWeekdays.dispatchEvent(new Event("change"));
    weekdayToggleWeekends.dispatchEvent(new Event("change"));
    weekdayToggleWorking.dispatchEvent(new Event("change"));
    weekdayToggleOffhours.dispatchEvent(new Event("change"));

    weekdayHourStartInput.value = "22";
    weekdayHourEndInput.value = "6";
    weekdayHourStartInput.dispatchEvent(new Event("input"));

    expect(deps.updateWeekdayState).toHaveBeenCalledWith({ filters: { weekdays: false } });
    expect(deps.updateWeekdayState).toHaveBeenCalledWith({ filters: { weekends: true } });
    expect(deps.updateWeekdayState).toHaveBeenCalledWith({ filters: { working: false } });
    expect(deps.updateWeekdayState).toHaveBeenCalledWith({ filters: { offhours: true } });
    expect(deps.updateWeekdayState).toHaveBeenCalledWith({ brush: { start: 6, end: 22 } });
    expect(weekdayHourStartInput.value).toBe("6");
    expect(weekdayHourEndInput.value).toBe("22");
    expect(startLabel.textContent).toBe("06:00");
    expect(endLabel.textContent).toBe("22:00");
    expect(deps.ensureWeekdayDayFilters).toHaveBeenCalledTimes(2);
    expect(deps.ensureWeekdayHourFilters).toHaveBeenCalledTimes(2);
    expect(deps.rerenderWeekdayFromState).toHaveBeenCalled();
  });

  it("updates time-of-day filters, swaps brush values, and applies custom range", async () => {
    const handlers = createHandlers();
    const deps = createDeps();

    const timeOfDayWeekdayToggle = document.createElement("input");
    const timeOfDayWeekendToggle = document.createElement("input");
    const timeOfDayHourStartInput = document.createElement("input");
    const timeOfDayHourEndInput = document.createElement("input");

    const customApplyButton = document.createElement("button");
    const customStartInput = document.createElement("input");
    const customEndInput = document.createElement("input");

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        customApplyButton,
        customStartInput,
        customEndInput,
        timeOfDayWeekdayToggle,
        timeOfDayWeekendToggle,
        timeOfDayHourStartInput,
        timeOfDayHourEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    timeOfDayWeekdayToggle.checked = false;
    timeOfDayWeekdayToggle.dispatchEvent(new Event("change"));
    timeOfDayWeekendToggle.checked = true;
    timeOfDayWeekendToggle.dispatchEvent(new Event("change"));

    timeOfDayHourStartInput.value = "20";
    timeOfDayHourEndInput.value = "8";
    timeOfDayHourEndInput.dispatchEvent(new Event("input"));

    customApplyButton.click();
    await Promise.resolve();
    expect(deps.updateStatus).toHaveBeenCalledWith("Please pick both a start and end date.", "warning");

    customStartInput.value = "2025-01-01";
    customEndInput.value = "2025-01-05";
    customApplyButton.click();
    await Promise.resolve();

    expect(deps.updateHourlyState).toHaveBeenCalledWith({
      filters: {
        weekdays: false,
        weekends: true,
        working: true,
        offhours: true,
      },
    });
    expect(deps.updateHourlyState).toHaveBeenCalledWith({ brush: { start: 8, end: 20 } });
    expect(deps.ensureDayFilters).toHaveBeenCalledTimes(2);
    expect(deps.syncHourlyControlsWithState).toHaveBeenCalledTimes(3);
    expect(deps.rerenderHourlyFromState).toHaveBeenCalledTimes(3);
    expect(deps.applyCustomRange).toHaveBeenCalledWith("2025-01-01", "2025-01-05");
  });
});
