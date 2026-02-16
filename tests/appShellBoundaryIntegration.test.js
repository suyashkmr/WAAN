import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const handleChatSelectionChange = vi.fn();
  const controllerResult = {
    encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
    setRemoteChatList: vi.fn(),
    getRemoteChatList: vi.fn(() => []),
    getRemoteChatsLastFetchedAt: vi.fn(() => 0),
    refreshChatSelector: vi.fn(async () => {}),
    handleChatSelectionChangeCore: vi.fn(),
    analyticsRequestTracker: {
      nextToken: vi.fn(() => 1),
      isCurrent: vi.fn(() => true),
    },
    computeAnalyticsWithWorker: vi.fn(async () => ({ total_messages: 0 })),
    normalizeRangeValue: vi.fn(value => value),
    filterEntriesByRange: vi.fn(entries => entries),
    describeRange: vi.fn(() => "All"),
    updateCustomRangeBounds: vi.fn(),
    handleRangeChange: vi.fn(),
    applyCustomRange: vi.fn(),
    searchController: {
      resetState: vi.fn(),
      populateParticipants: vi.fn(),
      renderResults: vi.fn(),
    },
    savedViewsController: {
      resetForNewDataset: vi.fn(),
    },
    setDashboardLoadingState: vi.fn(),
    setDataAvailabilityState: vi.fn(),
    updateHeroRelayStatus: vi.fn(),
    getDataAvailable: vi.fn(() => false),
    handleParticipantsTopChange: vi.fn(),
    handleParticipantsSortChange: vi.fn(),
    handleParticipantsTimeframeChange: vi.fn(),
    handleParticipantPresetClick: vi.fn(),
    handleParticipantRowToggle: vi.fn(),
    getExportFilterSummary: vi.fn(() => []),
    getParticipantView: vi.fn(() => ({})),
    renderDashboard: vi.fn(),
    ensureWeekdayDayFilters: vi.fn(),
    ensureWeekdayHourFilters: vi.fn(),
    rerenderHourlyFromState: vi.fn(),
    rerenderWeekdayFromState: vi.fn(),
    ensureDayFilters: vi.fn(),
    syncHourlyControlsWithState: vi.fn(),
    initThemeControls: vi.fn(),
    getExportThemeConfig: vi.fn(() => ({ id: "clean" })),
  };
  const compositionResult = {
    exportParticipants: vi.fn(),
    exportHourly: vi.fn(),
    exportDaily: vi.fn(),
    exportWeekly: vi.fn(),
    exportWeekday: vi.fn(),
    exportTimeOfDay: vi.fn(),
    exportMessageTypes: vi.fn(),
    exportChatJson: vi.fn(),
    exportSentiment: vi.fn(),
    exportSearchResults: vi.fn(),
    handleDownloadMarkdownReport: vi.fn(),
    handleDownloadSlidesReport: vi.fn(),
    exportMessageSubtype: vi.fn(),
    handleDownloadPdfReport: vi.fn(),
    startRelaySession: vi.fn(),
    stopRelaySession: vi.fn(),
    syncRelayChats: vi.fn(),
    isLogDrawerOpen: vi.fn(() => false),
    openLogDrawer: vi.fn(),
    closeLogDrawer: vi.fn(),
    initRelayControls: vi.fn(),
    handleChatSelectionChange,
  };

  return {
    handleChatSelectionChange,
    controllerResult,
    compositionResult,
    createAppControllerWiring: vi.fn(() => controllerResult),
    createAppCompositionAssembly: vi.fn(() => compositionResult),
    bootstrapAppShellRuntime: vi.fn(),
  };
});

vi.mock("../js/appShell/controllerWiring.js", () => ({
  createAppControllerWiring: h.createAppControllerWiring,
}));

vi.mock("../js/appShell/compositionAssembly.js", () => ({
  createAppCompositionAssembly: h.createAppCompositionAssembly,
}));

vi.mock("../js/appShell/runtimeBootstrap.js", () => ({
  bootstrapAppShellRuntime: h.bootstrapAppShellRuntime,
}));

function seedMinimumDom() {
  document.body.innerHTML = `
    <main></main>
    <table id="top-senders"><tbody></tbody></table>
    <select id="chat-selector"></select>
    <select id="global-range"></select>
    <div class="section-nav-inner"></div>
  `;
}

describe("appShell boundary integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes extracted wiring boundaries during appShell bootstrap", async () => {
    seedMinimumDom();
    vi.resetModules();

    await expect(import("../js/appShell.js")).resolves.toBeTruthy();

    expect(h.createAppControllerWiring).toHaveBeenCalledTimes(1);
    expect(h.createAppCompositionAssembly).toHaveBeenCalledTimes(1);
    expect(h.bootstrapAppShellRuntime).toHaveBeenCalledTimes(1);

    const compositionArgs = h.createAppCompositionAssembly.mock.calls[0][0];
    expect(compositionArgs.wiring).toEqual(
      expect.objectContaining({
        handleChatSelectionChangeCore: h.controllerResult.handleChatSelectionChangeCore,
        refreshChatSelector: h.controllerResult.refreshChatSelector,
        getExportFilterSummary: h.controllerResult.getExportFilterSummary,
        getExportThemeConfig: h.controllerResult.getExportThemeConfig,
      }),
    );

    const runtimeArgs = h.bootstrapAppShellRuntime.mock.calls[0][0];
    expect(runtimeArgs.eventBindings.handlers.handleChatSelectionChange).toBe(h.handleChatSelectionChange);
  });
});
