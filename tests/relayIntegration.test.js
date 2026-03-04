import { describe, it, expect, vi, afterEach } from "vitest";
import { createRelayBootstrapController } from "../js/appShell/relayBootstrap.js";
import { createDataStatusController } from "../js/appShell/dataStatus.js";
import { VUE_RUNTIME_REGISTRY_KEY, VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";

describe("relay integration", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
    vi.restoreAllMocks();
  });

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
      handleRelayPrimaryActionClick: vi.fn(event => {
        if (!event?.currentTarget) throw new Error("missing currentTarget");
      }),
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

  it("registers relay action handlers with Vue shell bridge dispatcher when available", async () => {
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
    expect(typeof registeredHandlers["relay.primaryAction"]).toBe("function");
    expect(typeof registeredHandlers["relay.stop"]).toBe("function");
    expect(typeof registeredHandlers["relay.logout"]).toBe("function");
    expect(typeof registeredHandlers["relay.reloadAll"]).toBe("function");
    expect(typeof registeredHandlers["relay.clearStorage"]).toBe("function");
    expect(typeof registeredHandlers["relay.logDrawerOpen"]).toBe("function");
    expect(typeof registeredHandlers["relay.firstRunOpenRelay"]).toBe("function");
    expect(typeof registeredHandlers["relay.firstRunPrimaryAction"]).toBe("function");
    expect(typeof registeredHandlers["relay.recoveryReconnect"]).toBe("function");
    expect(typeof registeredHandlers["relay.recoveryResync"]).toBe("function");
    expect(typeof registeredHandlers["relay.recoveryExportDiagnostics"]).toBe("function");

    registeredHandlers["relay.primaryAction"]();
    registeredHandlers["relay.stop"]();
    registeredHandlers["relay.logout"]();
    registeredHandlers["relay.reloadAll"]();
    await registeredHandlers["relay.clearStorage"]();
    registeredHandlers["relay.logDrawerOpen"]();
    registeredHandlers["relay.firstRunOpenRelay"]();
    registeredHandlers["relay.firstRunPrimaryAction"]();
    registeredHandlers["relay.recoveryReconnect"]();
    registeredHandlers["relay.recoveryResync"]();
    registeredHandlers["relay.recoveryExportDiagnostics"]();
    expect(handlers.handleRelayPrimaryActionClick).toHaveBeenCalledTimes(1);
    expect(handlers.handleRelayPrimaryActionClick).toHaveBeenCalledWith(
      expect.objectContaining({ currentTarget: relayStartButton }),
    );
    expect(handlers.stopRelaySession).toHaveBeenCalledTimes(1);
    expect(handlers.logoutRelaySession).toHaveBeenCalledTimes(1);
    expect(handlers.handleReloadAllChats).toHaveBeenCalledTimes(1);
    expect(deps.fetchJson).toHaveBeenCalledWith("http://127.0.0.1:3334/chats/clear", { method: "POST" });
    expect(handlers.openLogDrawer).toHaveBeenCalledTimes(1);
    expect(handlers.handleFirstRunOpenRelay).toHaveBeenCalledTimes(1);
    expect(handlers.handleFirstRunPrimaryAction).toHaveBeenCalledTimes(1);
    expect(handlers.handleRecoveryReconnect).toHaveBeenCalledTimes(1);
    expect(handlers.handleRecoveryResync).toHaveBeenCalledTimes(1);
    expect(handlers.handleRecoveryExportDiagnostics).toHaveBeenCalledTimes(1);

    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
  });

  it("disables live clear-storage button for dispatcher action even when cached ref is stale", async () => {
    const relayStartButton = document.createElement("button");
    const relayStatusEl = document.createElement("div");
    const staleClearStorageButton = document.createElement("button");
    const liveClearStorageButton = document.createElement("button");
    liveClearStorageButton.id = "relay-clear-storage";
    document.body.appendChild(liveClearStorageButton);

    /** @type {Record<string, Function>} */
    let registeredHandlers = {};
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setRelayActionHandlers: handlers => {
            registeredHandlers = handlers;
          },
          dispatchRelayAction: vi.fn(),
        },
      },
    };

    let resolveClear;
    const clearPromise = new Promise(resolve => {
      resolveClear = resolve;
    });
    const deps = {
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/chats/clear")) {
          await clearPromise;
          return {};
        }
        return {};
      }),
      apiBase: "http://127.0.0.1:3334",
      setRemoteChatList: vi.fn(),
      refreshChatSelector: vi.fn(async () => {}),
      updateStatus: vi.fn(),
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

    const { initRelayControls } = createRelayBootstrapController({
      elements: {
        relayStartButton,
        relayStatusEl,
        relayClearStorageButton: staleClearStorageButton,
      },
      handlers,
      deps,
    });

    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn(() => true),
    });
    initRelayControls();

    const pending = registeredHandlers["relay.clearStorage"]({
      currentTarget: liveClearStorageButton,
      target: liveClearStorageButton,
    });
    await Promise.resolve();
    expect(liveClearStorageButton.disabled).toBe(true);
    resolveClear();
    await pending;
    expect(liveClearStorageButton.disabled).toBe(false);
  });

  it("does not attach legacy live-action listeners when only live actions are Vue-managed", () => {
    const liveActionsContainer = document.createElement("div");
    liveActionsContainer.className = "live-actions";
    liveActionsContainer.dataset.vuePrimitiveMounted = "true";
    const relayStartButton = document.createElement("button");
    liveActionsContainer.appendChild(relayStartButton);
    document.body.appendChild(liveActionsContainer);

    const relayStatusEl = document.createElement("div");
    /** @type {Record<string, Function>} */
    let registeredHandlers = {};
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setRelayActionHandlers: handlers => {
            registeredHandlers = handlers;
          },
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
      },
      handlers,
      deps,
    });
    initRelayControls();

    relayStartButton.click();
    expect(handlers.handleRelayPrimaryActionClick).toHaveBeenCalledTimes(0);

    registeredHandlers["relay.primaryAction"]?.();
    expect(handlers.handleRelayPrimaryActionClick).toHaveBeenCalledTimes(1);
  });
});
