import { describe, it, expect, vi } from "vitest";
import { createRelayBootstrapController } from "../js/appShell/relayBootstrap.js";
import { createDataStatusController } from "../js/appShell/dataStatus.js";
import { VUE_RUNTIME_REGISTRY_KEY, VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";

describe("relay integration", () => {
  it("wires relay bootstrap controls and clear-storage flow, then updates hero status", async () => {
    const relayStartButton = document.createElement("button");
    const relayStopButton = document.createElement("button");
    const relayLogoutButton = document.createElement("button");
    const relayReloadAllButton = document.createElement("button");
    const relayClearStorageButton = document.createElement("button");
    const logDrawerToggleButton = document.createElement("button");
    const logDrawerCloseButton = document.createElement("button");
    const logDrawerExportButton = document.createElement("button");
    const logDrawerReportButton = document.createElement("button");
    const logDrawerClearButton = document.createElement("button");
    const relayStatusEl = document.createElement("div");

    const dashboardRoot = document.createElement("main");
    const heroStatusBadge = document.createElement("span");
    const heroStatusCopy = document.createElement("span");

    const datasetEmptyStateManager = {
      setAvailability: vi.fn(),
    };

    const savedViewsController = {
      setDataAvailability: vi.fn(),
      refreshUI: vi.fn(),
    };

    const dataStatus = createDataStatusController({
      elements: {
        dashboardRoot,
        heroStatusBadge,
        heroStatusCopy,
        datasetEmptyStateManager,
      },
      deps: {
        setDatasetEmptyMessage: vi.fn(),
        savedViewsController,
        formatRelayAccount: vi.fn(() => "Alice"),
        formatNumber: vi.fn(value => String(value)),
      },
    });

    const handlers = {
      handleRelayPrimaryActionClick: vi.fn(),
      stopRelaySession: vi.fn(),
      logoutRelaySession: vi.fn(),
      handleReloadAllChats: vi.fn(),
      openLogDrawer: vi.fn(),
      closeLogDrawer: vi.fn(),
      handleExportDiagnostics: vi.fn(),
      handleReportIssue: vi.fn(),
      handleLogClear: vi.fn(),
      handleLogDrawerDocumentClick: vi.fn(),
      handleLogDrawerKeydown: vi.fn(),
      refreshRelayStatus: vi.fn(async () => {}),
      startStatusPolling: vi.fn(),
      initLogStream: vi.fn(),
    };

    const deps = {
      fetchJson: vi.fn(async () => ({})),
      apiBase: "http://127.0.0.1:3334",
      setRemoteChatList: vi.fn(),
      refreshChatSelector: vi.fn(async () => {}),
      updateStatus: vi.fn(),
    };

    const { initRelayControls } = createRelayBootstrapController({
      elements: {
        relayStartButton,
        relayStatusEl,
        relayStopButton,
        relayLogoutButton,
        relayReloadAllButton,
        relayClearStorageButton,
        logDrawerToggleButton,
        logDrawerCloseButton,
        logDrawerExportButton,
        logDrawerReportButton,
        logDrawerClearButton,
      },
      handlers,
      deps,
    });

    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn(() => true),
    });

    initRelayControls();

    relayStartButton.click();
    relayStopButton.click();
    relayLogoutButton.click();
    relayReloadAllButton.click();
    logDrawerToggleButton.click();
    logDrawerCloseButton.click();
    logDrawerExportButton.click();
    logDrawerReportButton.click();
    logDrawerClearButton.click();
    document.dispatchEvent(new Event("click"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));

    relayClearStorageButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(handlers.handleRelayPrimaryActionClick).toHaveBeenCalledTimes(1);
    expect(handlers.stopRelaySession).toHaveBeenCalledTimes(1);
    expect(handlers.logoutRelaySession).toHaveBeenCalledTimes(1);
    expect(handlers.handleReloadAllChats).toHaveBeenCalledTimes(1);
    expect(handlers.openLogDrawer).toHaveBeenCalledTimes(1);
    expect(handlers.closeLogDrawer).toHaveBeenCalledTimes(1);
    expect(handlers.handleExportDiagnostics).toHaveBeenCalledTimes(1);
    expect(handlers.handleReportIssue).toHaveBeenCalledTimes(1);
    expect(handlers.handleLogClear).toHaveBeenCalledTimes(1);
    expect(handlers.handleLogDrawerDocumentClick).toHaveBeenCalledTimes(1);
    expect(handlers.handleLogDrawerKeydown).toHaveBeenCalledTimes(1);

    expect(handlers.refreshRelayStatus).toHaveBeenCalledWith({ silent: true });
    expect(handlers.startStatusPolling).toHaveBeenCalledTimes(1);
    expect(handlers.initLogStream).toHaveBeenCalledTimes(1);

    expect(deps.fetchJson).toHaveBeenCalledWith("http://127.0.0.1:3334/chats/clear", { method: "POST" });
    expect(deps.setRemoteChatList).toHaveBeenCalledWith([]);
    expect(deps.refreshChatSelector).toHaveBeenCalledTimes(1);

    dataStatus.updateHeroRelayStatus({
      status: "running",
      account: { wid: "alice@c.us" },
      chatCount: 12,
    });
    expect(heroStatusBadge.textContent).toContain("Connected");
    expect(heroStatusCopy.textContent).toContain("12 chats indexed.");
  });

  it("registers relay action handlers with Vue shell bridge dispatcher when available", () => {
    const relayStartButton = document.createElement("button");
    const relayStatusEl = document.createElement("div");
    const logDrawerToggleButton = document.createElement("button");
    const relayRecoveryReconnectButton = document.createElement("button");
    const relayRecoveryResyncButton = document.createElement("button");
    const relayRecoveryExportButton = document.createElement("button");

    /** @type {Record<string, Function>} */
    let registeredHandlers = {};
    const setRelayActionHandlers = vi.fn(handlers => {
      registeredHandlers = handlers;
    });
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setRelayActionHandlers,
          dispatchRelayAction: vi.fn(),
        },
      },
    };

    const handlers = {
      handleRelayPrimaryActionClick: vi.fn(),
      stopRelaySession: vi.fn(),
      logoutRelaySession: vi.fn(),
      handleReloadAllChats: vi.fn(),
      openLogDrawer: vi.fn(),
      closeLogDrawer: vi.fn(),
      handleExportDiagnostics: vi.fn(),
      handleReportIssue: vi.fn(),
      handleLogClear: vi.fn(),
      handleLogDrawerDocumentClick: vi.fn(),
      handleLogDrawerKeydown: vi.fn(),
      handleFirstRunOpenRelay: vi.fn(),
      handleFirstRunPrimaryAction: vi.fn(),
      handleRecoveryReconnect: vi.fn(),
      handleRecoveryResync: vi.fn(),
      handleRecoveryExportDiagnostics: vi.fn(),
      refreshRelayStatus: vi.fn(async () => {}),
      startStatusPolling: vi.fn(),
      initLogStream: vi.fn(),
    };

    const deps = {
      fetchJson: vi.fn(async () => ({})),
      apiBase: "http://127.0.0.1:3334",
      setRemoteChatList: vi.fn(),
      refreshChatSelector: vi.fn(async () => {}),
      updateStatus: vi.fn(),
    };

    const { initRelayControls } = createRelayBootstrapController({
      elements: {
        relayStartButton,
        relayStatusEl,
        logDrawerToggleButton,
        relayRecoveryReconnectButton,
        relayRecoveryResyncButton,
        relayRecoveryExportButton,
      },
      handlers,
      deps,
    });

    initRelayControls();

    expect(setRelayActionHandlers).toHaveBeenCalledTimes(1);
    expect(typeof registeredHandlers["relay.logDrawerOpen"]).toBe("function");
    expect(typeof registeredHandlers["relay.recoveryReconnect"]).toBe("function");
    expect(typeof registeredHandlers["relay.recoveryResync"]).toBe("function");
    expect(typeof registeredHandlers["relay.recoveryExportDiagnostics"]).toBe("function");

    registeredHandlers["relay.logDrawerOpen"]();
    registeredHandlers["relay.recoveryReconnect"]();
    registeredHandlers["relay.recoveryResync"]();
    registeredHandlers["relay.recoveryExportDiagnostics"]();
    expect(handlers.openLogDrawer).toHaveBeenCalledTimes(1);
    expect(handlers.handleRecoveryReconnect).toHaveBeenCalledTimes(1);
    expect(handlers.handleRecoveryResync).toHaveBeenCalledTimes(1);
    expect(handlers.handleRecoveryExportDiagnostics).toHaveBeenCalledTimes(1);

    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
  });
});
