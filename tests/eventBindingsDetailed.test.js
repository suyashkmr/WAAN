import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventBindingsController } from "../js/appShell/eventBindings.js";
import { VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";
import {
  createDashboardPanelsBridgeStub,
  createShellBridgeHarness,
  installVueRuntimeRegistry,
} from "./vueBridgeTestUtils.js";

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
  let shellHarness;

  beforeEach(() => {
    document.body.innerHTML = "";
    shellHarness = createShellBridgeHarness();
    installVueRuntimeRegistry({
      [VUE_BRIDGE_NAMES.shell]: shellHarness.shellBridge,
      [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
    });
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
    statA.dataset.export = "links";
    const statB = document.createElement("button");
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
    downloadMarkdownButton.click();
    downloadSlidesButton.click();
    downloadPdfButton.click();
    shellHarness.getShellActionHandlers()["export.markdown"]?.();
    shellHarness.getShellActionHandlers()["export.slides"]?.();
    shellHarness.getShellActionHandlers()["export.pdf"]?.();
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
    expect(handlers.handleDownloadMarkdownReport).toHaveBeenCalledTimes(2);
    expect(handlers.handleDownloadSlidesReport).toHaveBeenCalledTimes(2);
    expect(handlers.exportSearchResults).toHaveBeenCalledTimes(1);
    expect(handlers.handleDownloadPdfReport).toHaveBeenCalledTimes(2);
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
    shellHarness = createShellBridgeHarness();
    installVueRuntimeRegistry({
      [VUE_BRIDGE_NAMES.shell]: shellHarness.shellBridge,
      [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
    });

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

    expect(shellHarness.shellBridge.setShellActionHandlers).toHaveBeenCalledTimes(1);
    const registeredHandlers = shellHarness.getShellActionHandlers();
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
          [VUE_BRIDGE_NAMES.shell]: createShellBridgeHarness({
            setShellActionHandlers: handlersMap => {
              registeredHandlers = handlersMap;
              return true;
            },
          }).shellBridge,
          [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
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
    shellHarness.getShellActionHandlers()["page.chat.force-select"]?.({ value: "remote:chat-1" });
    shellHarness.getShellActionHandlers()["page.chat.force-select"]?.({ value: "remote:chat-1" });

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

    shellHarness.getShellActionHandlers()["page.chat.select"]?.({ value: "remote:chat-2" });
    shellHarness.getShellActionHandlers()["page.range.select"]?.({ value: "30" });
    shellHarness.getShellActionHandlers()["page.range.apply-custom"]?.({ start: "2025-01-01", end: "2025-01-05" });
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

  it("updates native page-control refs for shell-driven page control updates", () => {
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
    document.body.append(rangeSelect, customStartInput, customEndInput);

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

    shellHarness.getShellActionHandlers()["page.range.select"]?.({ value: "30" });
    shellHarness.getShellActionHandlers()["page.range.set-custom-start"]?.({ value: "2025-01-05" });
    shellHarness.getShellActionHandlers()["page.range.set-custom-end"]?.({ value: "2025-01-07" });

    expect(rangeSelect.value).toBe("30");
    expect(customStartInput.value).toBe("2025-01-05");
    expect(customEndInput.value).toBe("2025-01-07");
  });

  it("routes shell-driven custom date updates through the shell bridge when native refs are detached", () => {
    const handlers = createHandlers();
    const syncPageControls = vi.fn(() => true);
    const deps = createDeps();
    const customStartInput = document.createElement("input");
    customStartInput.type = "date";
    customStartInput.value = "2025-01-01";
    const customEndInput = document.createElement("input");
    customEndInput.type = "date";
    customEndInput.value = "2025-01-02";
    document.body.append(customStartInput, customEndInput);
    customStartInput.remove();
    customEndInput.remove();

    shellHarness = createShellBridgeHarness({
      syncPageControls,
      getPageControlState: vi.fn(() => ({
        customStart: "2025-01-01",
        customEnd: "2025-01-02",
      })),
      ownsPageControlInteractions: true,
    });
    installVueRuntimeRegistry({
      [VUE_BRIDGE_NAMES.shell]: shellHarness.shellBridge,
      [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
    });

    const { initEventHandlers } = createEventBindingsController({
      elements: {
        customStartInput,
        customEndInput,
      },
      handlers,
      deps,
    });

    initEventHandlers();

    shellHarness.getShellActionHandlers()["page.range.set-custom-start"]?.({ value: "2025-03-01" });
    shellHarness.getShellActionHandlers()["page.range.set-custom-end"]?.({ value: "2025-03-07" });

    expect(syncPageControls).toHaveBeenCalledWith({ customStart: "2025-03-01" });
    expect(syncPageControls).toHaveBeenCalledWith({ customEnd: "2025-03-07" });
    expect(customStartInput.value).toBe("2025-01-01");
    expect(customEndInput.value).toBe("2025-01-02");
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

    installVueRuntimeRegistry({
      [VUE_BRIDGE_NAMES.shell]: createShellBridgeHarness().shellBridge,
      [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
    });

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
    document.body.append(customStartInput, customEndInput);

    const ownedShellHarness = createShellBridgeHarness({
      ownsPageControlInteractions: true,
    });
    installVueRuntimeRegistry({
      [VUE_BRIDGE_NAMES.shell]: ownedShellHarness.shellBridge,
      [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
    });

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

    ownedShellHarness.getShellActionHandlers()["page.range.set-custom-start"]?.({ value: "2025-01-05" });
    ownedShellHarness.getShellActionHandlers()["page.range.set-custom-end"]?.({ value: "2025-01-07" });

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

    shellHarness = createShellBridgeHarness({
      ownsPageControlInteractions: true,
      syncPageControls,
      getPageControlState,
    });
    installVueRuntimeRegistry({
      [VUE_BRIDGE_NAMES.shell]: shellHarness.shellBridge,
      [VUE_BRIDGE_NAMES.dashboardPanels]: createDashboardPanelsBridgeStub(),
    });

    const { initEventHandlers } = createEventBindingsController({
      elements: {},
      handlers,
      deps,
    });

    initEventHandlers();

    shellHarness.getShellActionHandlers()["page.range.select"]?.({ value: "30" });
    shellHarness.getShellActionHandlers()["page.range.set-custom-start"]?.({ value: "2025-03-01" });
    shellHarness.getShellActionHandlers()["page.range.set-custom-end"]?.({ value: "2025-03-07" });
    shellHarness.getShellActionHandlers()["page.range.apply-custom"]?.();
    await Promise.resolve();

    expect(syncPageControls).toHaveBeenCalledWith({ rangeValue: "30" });
    expect(syncPageControls).toHaveBeenCalledWith({ customStart: "2025-03-01" });
    expect(syncPageControls).toHaveBeenCalledWith({ customEnd: "2025-03-07" });
    expect(getPageControlState).toHaveBeenCalled();
    expect(handlers.handleRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "30" } }),
    );
    expect(deps.applyCustomRange).toHaveBeenCalledWith("2025-03-01", "2025-03-07");
  });
});
