import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventBindingsController } from "../js/appShell/eventBindings.js";
import { VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";
import * as primeDateBridgeModule from "../js/vue/primeDateBridge.js";
import * as primeSelectBridgeModule from "../js/vue/primeSelectBridge.js";

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
  };
}

function createDeps(overrides = {}) {
  return {
    updateStatus: vi.fn(),
    applyCustomRange: vi.fn(async () => {}),
    updateWeekdayState: vi.fn(),
    updateHourlyState: vi.fn(),
    getHourlyState: vi.fn(() => ({
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    })),
    ...overrides,
  };
}

describe("event bindings detailed", () => {
  /** @type {Record<string, Function>} */
  let shellActionHandlers;

  beforeEach(() => {
    document.body.innerHTML = "";
    shellActionHandlers = {};
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setShellActionHandlers: handlersMap => {
            shellActionHandlers = handlersMap;
          },
          dispatchShellAction: vi.fn(),
        },
        [VUE_BRIDGE_NAMES.dashboardPanels]: {
          ownsParticipantInteractions: true,
          ownsActivityFilterInteractions: true,
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
  });

  it("wires export/download/participant actions", () => {
    const handlers = createHandlers();
    const deps = createDeps();

    const mkBtn = () => document.createElement("button");
    const participantsTopSelect = document.createElement("select");
    const participantsSortSelect = document.createElement("select");
    const participantsTimeframeSelect = document.createElement("select");
    const presetA = document.createElement("button");
    const presetB = document.createElement("button");

    const statA = document.createElement("button");
    statA.className = "stat-download";
    statA.dataset.export = "links";
    const statB = document.createElement("button");
    statB.className = "stat-download";
    statB.dataset.export = "media";
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
        statDownloadButtons: [statA, statB],
        downloadMarkdownButton,
        downloadSlidesButton,
        downloadSearchButton,
        downloadPdfButton,
        participantsTopSelect,
        participantsSortSelect,
        participantsTimeframeSelect,
        participantPresetButtons: [presetA, presetB],
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
    downloadSearchButton.click();
    shellActionHandlers["export.markdown"]?.();
    shellActionHandlers["export.slides"]?.();
    shellActionHandlers["export.pdf"]?.();
    statA.click();
    statB.click();
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
    expect(handlers.handleParticipantsTopChange).not.toHaveBeenCalled();
    expect(handlers.handleParticipantsSortChange).not.toHaveBeenCalled();
    expect(handlers.handleParticipantsTimeframeChange).not.toHaveBeenCalled();
    expect(handlers.handleParticipantPresetClick).not.toHaveBeenCalled();
  });

  it("registers toolbar export actions with shell dispatcher when available", () => {
    const handlers = createHandlers();
    const deps = createDeps();
    /** @type {Record<string, Function>} */
    let registeredHandlers = {};
    const setShellActionHandlers = vi.fn(handlersMap => {
      registeredHandlers = handlersMap;
    });
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setShellActionHandlers,
          dispatchShellAction: vi.fn(),
        },
        [VUE_BRIDGE_NAMES.dashboardPanels]: {
          ownsParticipantInteractions: true,
          ownsActivityFilterInteractions: true,
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };

    const downloadMarkdownButton = document.createElement("button");
    const downloadSlidesButton = document.createElement("button");
    const downloadPdfButton = document.createElement("button");

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        downloadMarkdownButton,
        downloadSlidesButton,
        downloadPdfButton,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    expect(setShellActionHandlers).toHaveBeenCalledTimes(1);
    expect(typeof registeredHandlers["export.pdf"]).toBe("function");
    expect(typeof registeredHandlers["export.markdown"]).toBe("function");
    expect(typeof registeredHandlers["export.slides"]).toBe("function");

    registeredHandlers["export.pdf"]();
    registeredHandlers["export.markdown"]();
    registeredHandlers["export.slides"]();
    expect(handlers.handleDownloadPdfReport).toHaveBeenCalledTimes(1);
    expect(handlers.handleDownloadMarkdownReport).toHaveBeenCalledTimes(1);
    expect(handlers.handleDownloadSlidesReport).toHaveBeenCalledTimes(1);
  });

  it("resolves shell and dashboard bridges from injected global scope", () => {
    const handlers = createHandlers();
    const deps = createDeps();
    /** @type {Record<string, Function>} */
    let registeredHandlers = {};
    const globalScope = {
      [VUE_RUNTIME_REGISTRY_KEY]: {
        bridges: {
          [VUE_BRIDGE_NAMES.shell]: {
            setShellActionHandlers: handlersMap => {
              registeredHandlers = handlersMap;
            },
            dispatchShellAction: vi.fn(),
          },
          [VUE_BRIDGE_NAMES.dashboardPanels]: {
            ownsParticipantInteractions: true,
            ownsActivityFilterInteractions: true,
            setPanelActionHandlers: vi.fn(() => true),
          },
        },
      },
    };

    const downloadSearchButton = document.createElement("button");

    const { initEventHandlers } = createEventBindingsController({
      elements: { downloadSearchButton },
      handlers,
      deps,
      globalScope,
    });

    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
    initEventHandlers();

    expect(typeof registeredHandlers["export.pdf"]).toBe("function");
    downloadSearchButton.click();
    expect(handlers.exportSearchResults).toHaveBeenCalledTimes(1);
  });

  it("supports forced chat reselect via double-click and Enter", () => {
    const handlers = createHandlers();
    const deps = createDeps();
    const chatSelector = document.createElement("select");
    chatSelector.innerHTML = '<option value="remote:chat-1">Chat 1</option>';
    chatSelector.value = "remote:chat-1";

    const { initEventHandlers } = createEventBindingsController({
      elements: { chatSelector },
      handlers,
      deps,
    });

    initEventHandlers();
    shellActionHandlers["page.chat.force-select"]?.({ value: "remote:chat-1" });
    shellActionHandlers["page.chat.force-select"]?.({ value: "remote:chat-1" });

    expect(handlers.handleChatSelectionChange).toHaveBeenCalledTimes(2);
    expect(handlers.handleChatSelectionChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ force: true }),
    );
    expect(handlers.handleChatSelectionChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ force: true }),
    );
  });

  it("does not bind weekday filters and brush state directly", () => {
    const handlers = createHandlers();
    const deps = createDeps();

    const weekdayToggleWeekdays = document.createElement("input");
    const weekdayToggleWeekends = document.createElement("input");
    const weekdayToggleWorking = document.createElement("input");
    const weekdayToggleOffhours = document.createElement("input");
    const weekdayHourStartInput = document.createElement("input");
    const weekdayHourEndInput = document.createElement("input");

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

    expect(deps.updateWeekdayState).not.toHaveBeenCalled();
  });

  it("does not bind time-of-day filters and brush directly", async () => {
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

    expect(deps.updateHourlyState).not.toHaveBeenCalled();
    expect(deps.applyCustomRange).toHaveBeenCalledWith("2025-01-01", "2025-01-05");
  });

  it("registers page control actions with shell dispatcher", async () => {
    const handlers = createHandlers();
    const deps = createDeps();
    const chatSelector = document.createElement("select");
    const rangeSelect = document.createElement("select");
    ["all", "30", "custom"].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      rangeSelect.appendChild(option);
    });
    const customStartInput = document.createElement("input");
    const customEndInput = document.createElement("input");
    const customApplyButton = document.createElement("button");

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        chatSelector,
        rangeSelect,
        customStartInput,
        customEndInput,
        customApplyButton,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    shellActionHandlers["page.chat.select"]?.({ value: "remote:chat-2" });
    shellActionHandlers["page.range.select"]?.({ value: "30" });
    shellActionHandlers["page.range.apply-custom"]?.({ start: "2025-01-01", end: "2025-01-05" });
    await Promise.resolve();

    expect(handlers.handleChatSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "remote:chat-2" } }),
    );
    expect(handlers.handleRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "30" } }),
    );
    expect(rangeSelect.value).toBe("30");
    expect(deps.applyCustomRange).toHaveBeenCalledWith("2025-01-01", "2025-01-05");
  });

  it("syncs Prime range/date bridge state for shell-driven page control updates", () => {
    const handlers = createHandlers();
    const deps = createDeps();
    const rangeSelect = document.createElement("select");
    rangeSelect.innerHTML = '<option value="all">All time</option><option value="30">Last 30 days</option>';
    rangeSelect.value = "all";
    const customStartInput = document.createElement("input");
    customStartInput.type = "date";
    customStartInput.min = "2025-01-01";
    customStartInput.max = "2025-12-31";
    const customEndInput = document.createElement("input");
    customEndInput.type = "date";
    customEndInput.min = "2025-01-01";
    customEndInput.max = "2025-12-31";
    const syncRangeSpy = vi.spyOn(primeSelectBridgeModule, "syncPrimeSelectBridgeValue");
    const syncDateSpy = vi.spyOn(primeDateBridgeModule, "syncPrimeDateBridgeValue");

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        rangeSelect,
        customStartInput,
        customEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    shellActionHandlers["page.range.select"]?.({ value: "30" });
    shellActionHandlers["page.range.set-custom-start"]?.({ value: "2025-01-05" });
    shellActionHandlers["page.range.set-custom-end"]?.({ value: "2025-01-07" });

    expect(syncRangeSpy).toHaveBeenCalledWith({
      selectEl: rangeSelect,
      value: "30",
      disabled: false,
    });
    expect(syncDateSpy).toHaveBeenNthCalledWith(1, {
      inputEl: customStartInput,
      value: "2025-01-05",
      disabled: false,
      min: "2025-01-01",
      max: "2025-12-31",
    });
    expect(syncDateSpy).toHaveBeenNthCalledWith(2, {
      inputEl: customEndInput,
      value: "2025-01-07",
      disabled: false,
      min: "2025-01-01",
      max: "2025-12-31",
    });
  });

  it("avoids direct filter rerenders from event bindings", () => {
    const handlers = createHandlers();
    const deps = createDeps();

    const timeOfDayWeekdayToggle = document.createElement("input");
    const timeOfDayWeekendToggle = document.createElement("input");

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        timeOfDayWeekdayToggle,
        timeOfDayWeekendToggle,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    timeOfDayWeekdayToggle.checked = false;
    timeOfDayWeekdayToggle.dispatchEvent(new Event("change"));
    timeOfDayWeekendToggle.checked = true;
    timeOfDayWeekendToggle.dispatchEvent(new Event("change"));

    expect(deps.updateHourlyState).not.toHaveBeenCalled();
  });

  it("does not require legacy participant row-toggle handler wiring when Vue dashboard bridge owns interactions", () => {
    const handlers = createHandlers();
    const deps = createDeps();

    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setShellActionHandlers: vi.fn(),
          dispatchShellAction: vi.fn(),
        },
        [VUE_BRIDGE_NAMES.dashboardPanels]: {
          ownsParticipantInteractions: true,
          ownsActivityFilterInteractions: true,
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };

    const { initEventHandlers } = createEventBindingsController({
      elements: {},
      handlers,
      deps,
    });

    expect(() => initEventHandlers()).not.toThrow();
  });

  it("keeps native page-control fallback listeners bound only for the native path", () => {
    const handlers = createHandlers();
    const deps = createDeps();
    const chatSelector = document.createElement("select");
    chatSelector.innerHTML = '<option value="">None</option><option value="remote:chat-1">Chat 1</option>';
    const rangeSelect = document.createElement("select");
    rangeSelect.innerHTML = '<option value="all">All time</option><option value="180">Last 180 days</option>';
    const customApplyButton = document.createElement("button");
    const customStartInput = document.createElement("input");
    const customEndInput = document.createElement("input");

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        chatSelector,
        rangeSelect,
        customApplyButton,
        customStartInput,
        customEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    expect(chatSelector.dataset.eventBindingsPageControlBound).toBe("true");
    expect(rangeSelect.dataset.eventBindingsPageControlBound).toBe("true");
    expect(customApplyButton.dataset.eventBindingsPageControlBound).toBe("true");
  });

  it("updates preserved custom date refs from shell draft-range actions without synthetic native events", () => {
    const handlers = createHandlers();
    const deps = createDeps();
    const customStartInput = document.createElement("input");
    const customEndInput = document.createElement("input");

    const shellActionHandlers = {};
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setShellActionHandlers: vi.fn(nextHandlers => {
            Object.assign(shellActionHandlers, nextHandlers);
          }),
          dispatchShellAction: vi.fn(),
          ownsPageControlInteractions: true,
        },
        [VUE_BRIDGE_NAMES.dashboardPanels]: {
          ownsParticipantInteractions: true,
          ownsActivityFilterInteractions: true,
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        customStartInput,
        customEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    const startInputSpy = vi.fn();
    const startChangeSpy = vi.fn();
    const endInputSpy = vi.fn();
    const endChangeSpy = vi.fn();
    customStartInput.addEventListener("input", startInputSpy);
    customStartInput.addEventListener("change", startChangeSpy);
    customEndInput.addEventListener("input", endInputSpy);
    customEndInput.addEventListener("change", endChangeSpy);

    shellActionHandlers["page.range.set-custom-start"]?.({ value: "2025-01-05" });
    shellActionHandlers["page.range.set-custom-end"]?.({ value: "2025-01-07" });

    expect(customStartInput.value).toBe("2025-01-05");
    expect(customEndInput.value).toBe("2025-01-07");
    expect(startInputSpy).not.toHaveBeenCalled();
    expect(startChangeSpy).not.toHaveBeenCalled();
    expect(endInputSpy).not.toHaveBeenCalled();
    expect(endChangeSpy).not.toHaveBeenCalled();
  });

  it("uses shell bridge page-control state when bridge-owned page controls have no native refs", async () => {
    const handlers = createHandlers();
    const deps = createDeps();
    const syncPageControls = vi.fn(() => true);
    const getPageControlState = vi.fn(() => ({
      customStart: "2025-03-01",
      customEnd: "2025-03-07",
    }));

    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setShellActionHandlers: vi.fn(nextHandlers => {
            Object.assign(shellActionHandlers, nextHandlers);
          }),
          dispatchShellAction: vi.fn(),
          ownsPageControlInteractions: true,
          syncPageControls,
          getPageControlState,
        },
        [VUE_BRIDGE_NAMES.dashboardPanels]: {
          ownsParticipantInteractions: true,
          ownsActivityFilterInteractions: true,
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };

    const syncRangeSpy = vi.spyOn(primeSelectBridgeModule, "syncPrimeSelectBridgeValue");
    const syncDateSpy = vi.spyOn(primeDateBridgeModule, "syncPrimeDateBridgeValue");

    const { initEventHandlers } = createEventBindingsController({
      elements: {},
      handlers,
      deps,
    });

    initEventHandlers();

    shellActionHandlers["page.range.select"]?.({ value: "30" });
    shellActionHandlers["page.range.set-custom-start"]?.({ value: "2025-03-01" });
    shellActionHandlers["page.range.set-custom-end"]?.({ value: "2025-03-07" });
    shellActionHandlers["page.range.apply-custom"]?.();
    await Promise.resolve();

    expect(syncPageControls).toHaveBeenCalledWith({ rangeValue: "30" });
    expect(syncPageControls).toHaveBeenCalledWith({ customStart: "2025-03-01" });
    expect(syncPageControls).toHaveBeenCalledWith({ customEnd: "2025-03-07" });
    expect(getPageControlState).toHaveBeenCalled();
    expect(handlers.handleRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "30" } }),
    );
    expect(deps.applyCustomRange).toHaveBeenCalledWith("2025-03-01", "2025-03-07");
    expect(syncRangeSpy).toHaveBeenCalledWith({
      selectEl: undefined,
      value: "30",
      disabled: undefined,
    });
    expect(syncDateSpy).toHaveBeenNthCalledWith(1, {
      inputEl: undefined,
      value: "2025-03-01",
      disabled: undefined,
      min: undefined,
      max: undefined,
    });
    expect(syncDateSpy).toHaveBeenNthCalledWith(2, {
      inputEl: undefined,
      value: "2025-03-07",
      disabled: undefined,
      min: undefined,
      max: undefined,
    });
  });
});
