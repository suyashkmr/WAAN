import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { Fragment, h, render } from "vue";
import { createRelayController } from "../js/relayControls.js";
import { clearVueBridgeRuntime, installShellVueBridge } from "./vueBridgeTestUtils.js";
import { installTestUiGlobals, resetTestUiGlobals } from "./uiTestHarness.js";

function buildRelayElements() {
  const chatSelector = document.createElement("select");
  chatSelector.id = "chat-selector";
  document.body.appendChild(chatSelector);

  const relayStartButton = document.createElement("button");
  const relayStopButton = document.createElement("button");
  const relayLogoutButton = document.createElement("button");
  const relayReloadAllButton = document.createElement("button");
  const relayClearStorageButton = document.createElement("button");
  const relayStatusEl = document.createElement("div");
  relayStatusEl.id = "relay-connection-status";
  const relayAccountEl = document.createElement("div");
  relayAccountEl.id = "relay-account-name";
  const relayQrContainer = document.createElement("div");
  const relayQrImage = document.createElement("img");
  const relayHelpText = document.createElement("div");
  const relayBannerEl = document.createElement("div");
  const relayBannerMessage = relayStatusEl;
  const relayBannerMeta = relayAccountEl;
  const relayBannerActions = document.createElement("div");
  relayBannerActions.setAttribute("hidden", "");
  const relayRecoveryReconnectButton = document.createElement("button");
  const relayRecoveryResyncButton = document.createElement("button");
  const relayRecoveryExportButton = document.createElement("button");
  relayBannerActions.append(
    relayRecoveryReconnectButton,
    relayRecoveryResyncButton,
    relayRecoveryExportButton,
  );
  const logDrawerToggleButton = document.createElement("button");
  const logDrawerEl = document.createElement("div");
  const logDrawerList = document.createElement("div");
  const logDrawerConnectionLabel = document.createElement("div");
  const relaySyncProgressEl = document.createElement("div");
  relaySyncProgressEl.classList.add("hidden");
  relaySyncProgressEl.setAttribute("hidden", "");
  const chatsStep = document.createElement("div");
  chatsStep.dataset.step = "chats";
  const messagesStep = document.createElement("div");
  messagesStep.dataset.step = "messages";
  relaySyncProgressEl.append(chatsStep, messagesStep);
  const relaySyncChatsMeta = document.createElement("div");
  const relaySyncMessagesMeta = document.createElement("div");
  const firstRunSetup = document.createElement("div");
  const firstRunStepConnect = document.createElement("div");
  firstRunStepConnect.dataset.setupStep = "connect";
  const firstRunStepLink = document.createElement("div");
  firstRunStepLink.dataset.setupStep = "link";
  const firstRunStepLoad = document.createElement("div");
  firstRunStepLoad.dataset.setupStep = "load";
  const firstRunSetupSteps = [firstRunStepConnect, firstRunStepLink, firstRunStepLoad];
  const firstRunOpenRelayButton = document.createElement("button");
  const firstRunPrimaryActionButton = document.createElement("button");

  return {
    relayStartButton,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayClearStorageButton,
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
    relayBannerEl,
    relayBannerMessage,
    relayBannerMeta,
    relayBannerActions,
    relayRecoveryReconnectButton,
    relayRecoveryResyncButton,
    relayRecoveryExportButton,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relaySyncProgressEl,
    relaySyncChatsStep: chatsStep,
    relaySyncMessagesStep: messagesStep,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    firstRunSetup,
    firstRunSetupSteps,
    firstRunOpenRelayButton,
    firstRunPrimaryActionButton,
    chatSelector,
  };
}

function createController(overrides = {}) {
  let remoteChats = [];
  const helpers = {
    updateStatus: vi.fn(),
    withGlobalBusy: vi.fn(async task => task()),
    fetchJson: vi.fn(async () => ({})),
    setRemoteChatList: vi.fn(list => {
      remoteChats = Array.isArray(list) ? list : [];
    }),
    getRemoteChatList: vi.fn(() => remoteChats),
    getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
    refreshChatSelector: vi.fn(async () => {}),
    setDashboardLoadingState: vi.fn(),
    setDatasetEmptyMessage: vi.fn(),
    setDataAvailabilityState: vi.fn(),
    updateHeroRelayStatus: vi.fn(),
    applyEntriesToApp: vi.fn(async () => {}),
    encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
    ...overrides,
  };

  const electronAPI = {
    setRelayAutostart: vi.fn(),
    updateRelayStatus: vi.fn(),
    notifySyncSummary: vi.fn(),
  };

  const controller = createRelayController({
    elements: buildRelayElements(),
    helpers,
    electronAPI,
  });

  return { controller, helpers, electronAPI };
}

describe("relayControls", () => {
  beforeEach(() => {
    installTestUiGlobals({
      vueRuntime: { h, render, Fragment },
    });
  });

  afterEach(() => {
    clearVueBridgeRuntime();
    resetTestUiGlobals({
      clearBridgeRuntime: false,
      clearPrimeVueRuntime: false,
      clearBody: true,
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("startRelaySession starts relay, refreshes status, and enables autostart", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 3,
    };

    const { controller, helpers, electronAPI } = createController({
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/relay/start")) return { ok: true };
        if (url.endsWith("/relay/status")) return runningStatus;
        if (url.endsWith("/api/chats")) return { chats: [] };
        throw new Error(`Unexpected URL: ${url}`);
      }),
    });

    await controller.startRelaySession();

    expect(helpers.fetchJson).toHaveBeenCalledWith(
      "http://127.0.0.1:4546/relay/start",
      { method: "POST" },
    );
    expect(helpers.fetchJson).toHaveBeenCalledWith("http://127.0.0.1:4546/relay/status");
    expect(helpers.updateStatus).toHaveBeenCalledWith("Starting WAAN Relay…", "info");
    expect(electronAPI.setRelayAutostart).toHaveBeenCalledWith(true);
  });

  it("refreshRelayStatus handles relay offline and resets UI state", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { controller, helpers } = createController({
      fetchJson: vi.fn(async () => {
        throw new Error("offline");
      }),
    });

    const result = await controller.refreshRelayStatus({ silent: false });

    expect(result).toBeNull();
    expect(helpers.updateStatus).toHaveBeenCalledWith(
      "WAAN Relay is offline. Start the desktop relay to load chats.",
      "warning",
    );
    expect(helpers.setRemoteChatList).toHaveBeenCalledWith([]);
    expect(helpers.setDashboardLoadingState).toHaveBeenCalledWith(true);
    expect(helpers.setDatasetEmptyMessage).toHaveBeenCalled();
    expect(helpers.setDataAvailabilityState).toHaveBeenCalledWith(false);
    expect(helpers.refreshChatSelector).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("shows recovery actions when relay status is stopped", async () => {
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) return { status: "stopped" };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayBannerActions.hasAttribute("hidden")).toBe(false);
  });

  it("hides recovery actions for healthy running status even with stale lastError", async () => {
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) {
            return {
              status: "running",
              account: { pushName: "Alice" },
              chatCount: 7,
              syncingChats: false,
              syncPath: "primary",
              lastSyncDurationMs: 820,
              lastError: "stale transient error",
            };
          }
          if (url.endsWith("/api/chats")) return { chats: [{ id: "chat-1", name: "General" }] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => [{ id: "chat-1", name: "General" }]),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayBannerActions.hasAttribute("hidden")).toBe(true);
  });

  it("updates the visible sidebar connected state when banner and status nodes are shared", async () => {
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) {
            return {
              status: "running",
              account: { pushName: "Alice" },
              chatCount: 7,
              syncingChats: false,
              syncPath: "primary",
              lastSyncDurationMs: 820,
            };
          }
          if (url.endsWith("/api/chats")) return { chats: [{ id: "chat-1", name: "General" }] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayStatusEl.textContent).toBe("Connected: Alice.");
    expect(elements.relayAccountEl.textContent).toBe("Logged in as Alice");
  });

  it("reveals the visible QR panel when relay status enters waiting_qr", async () => {
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) {
            return {
              status: "waiting_qr",
              lastQr: "data:image/png;base64,qr",
            };
          }
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayQrContainer.classList.contains("hidden")).toBe(false);
    expect(elements.relayQrContainer.hasAttribute("hidden")).toBe(false);
    expect(elements.relayQrImage.getAttribute("src")).toBe("data:image/png;base64,qr");
  });

  it("reveals the visible sync panel when relay status is syncing chats", async () => {
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) {
            return {
              status: "running",
              account: { pushName: "Alice" },
              chatCount: 4,
              syncingChats: true,
              syncPath: "primary",
            };
          }
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relaySyncProgressEl.classList.contains("hidden")).toBe(false);
    expect(elements.relaySyncProgressEl.hasAttribute("hidden")).toBe(false);
    expect(elements.relaySyncChatsStep.dataset.state).toBe("complete");
    expect(elements.relaySyncMessagesStep.dataset.state).toBe("active");
  });

  it("primary action switches to resync when running and triggers sync path", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 5,
      syncingChats: false,
    };

    const { controller, helpers } = createController({
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/relay/status")) return runningStatus;
        if (url.endsWith("/relay/sync")) return { ok: true };
        if (url.endsWith("/api/chats")) {
          return { chats: [{ id: "chat-1", name: "General", messageCount: 10 }] };
        }
        throw new Error(`Unexpected URL: ${url}`);
      }),
      getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
    });

    await controller.refreshRelayStatus({ silent: true });

    const button = document.createElement("button");
    button.dataset.relayAction = "resync";
    Object.defineProperty(button, "disabled", { value: false, configurable: true });
    controller.handlePrimaryActionClick({ currentTarget: button });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(helpers.fetchJson).toHaveBeenCalledWith(
      "http://127.0.0.1:4546/relay/sync",
      { method: "POST" },
    );
    expect(helpers.fetchJson).toHaveBeenCalledWith("http://127.0.0.1:3334/api/chats");
    expect(helpers.setRemoteChatList).toHaveBeenCalledWith([
      { id: "chat-1", name: "General", messageCount: 10 },
    ], { successfulFetch: true });
  });

  it("updates first-run setup guide state from relay status", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 3,
      syncingChats: false,
    };
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) return runningStatus;
          if (url.endsWith("/api/chats")) return { chats: [] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.firstRunSetupSteps[0].dataset.state).toBe("complete");
    expect(elements.firstRunSetupSteps[1].dataset.state).toBe("complete");
    expect(elements.firstRunSetupSteps[2].dataset.state).toBe("active");
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Pick a chat");
  });

  it("shows an empty-account fallback instead of a perpetual loading state", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 0,
      syncingChats: false,
    };
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) return runningStatus;
          if (url.endsWith("/api/chats")) return { chats: [] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayHelpText.textContent).toBe("This linked account has no chats yet.");
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("No chats yet");
    expect(elements.firstRunPrimaryActionButton.disabled).toBe(true);
  });

  it("keeps first-run setup in loading mode before the initial chat fetch completes", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 0,
      syncingChats: false,
    };
    const elements = buildRelayElements();
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) return runningStatus;
          if (url.endsWith("/api/chats")) return { chats: [] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayHelpText.textContent).toBe("Chat and range controls unlock once chats finish loading.");
    expect(elements.firstRunSetupSteps[2].dataset.state).toBe("pending");
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Loading chats");
    expect(elements.firstRunPrimaryActionButton.disabled).toBe(true);
  });

  it("uses shell bridge page-control targets for first-run chat selection when startup chat ref is missing", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 2,
      syncingChats: false,
    };
    const elements = buildRelayElements();
    elements.chatSelector = null;
    const focusPageControl = vi.fn(() => true);
    const scrollPageControl = vi.fn(() => true);
    installShellVueBridge({
      focusPageControl,
      scrollPageControl,
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) return runningStatus;
          if (url.endsWith("/api/chats")) return { chats: [] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });
    controller.handleFirstRunPrimaryAction();

    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Pick a chat");
    expect(scrollPageControl).toHaveBeenCalledWith("chat");
    expect(focusPageControl).toHaveBeenCalledWith("chat");
  });

  it("falls back to the live chat selector when first-run chat selection runs without shell bridge controls", async () => {
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 2,
      syncingChats: false,
    };
    const elements = buildRelayElements();
    const scrollSpy = vi.spyOn(elements.chatSelector, "scrollIntoView").mockImplementation(() => {});
    const focusSpy = vi.spyOn(elements.chatSelector, "focus").mockImplementation(() => {});
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) return runningStatus;
          if (url.endsWith("/api/chats")) return { chats: [] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });
    controller.handleFirstRunPrimaryAction();

    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Pick a chat");
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("scrolls the visible relay banner when first-run open relay is triggered", () => {
    const elements = buildRelayElements();
    const scrollSpy = vi.spyOn(elements.relayBannerEl, "scrollIntoView").mockImplementation(() => {});
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async () => ({})),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    controller.handleFirstRunOpenRelay();

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });

  it("uses the live relay start button when first-run primary action is triggered offline", () => {
    const elements = buildRelayElements();
    const clickSpy = vi.spyOn(elements.relayStartButton, "click").mockImplementation(() => {});
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async () => ({})),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    controller.handleFirstRunPrimaryAction();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("shows guided recovery actions for degraded sync and runs recovery handlers", async () => {
    const runningFallbackStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 2,
      syncingChats: false,
      syncPath: "fallback",
      lastSyncPathReason: "Primary sync unavailable: session stale",
      lastSyncDurationMs: 16123,
    };
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const createObjectUrlSpy = vi.fn(() => "blob:test");
    const revokeObjectUrlSpy = vi.fn();
    URL.createObjectURL = /** @type {any} */ (createObjectUrlSpy);
    URL.revokeObjectURL = /** @type {any} */ (revokeObjectUrlSpy);
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const elements = buildRelayElements();
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) return runningFallbackStatus;
      if (url.endsWith("/relay/start")) return { ok: true };
      if (url.endsWith("/relay/stop")) return { ok: true };
      if (url.endsWith("/relay/sync")) return { ok: true };
      if (url.endsWith("/api/chats")) return { chats: [{ id: "chat-1", name: "General" }] };
      return {};
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson,
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => [{ id: "chat-1", name: "General" }]),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        getDatasetLabel: vi.fn(() => "General"),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(elements.relayBannerActions.hasAttribute("hidden")).toBe(false);
    expect(elements.relayRecoveryReconnectButton.disabled).toBe(false);
    expect(elements.relayRecoveryResyncButton.disabled).toBe(false);
    expect(elements.relayRecoveryExportButton.disabled).toBe(false);

    await controller.handleRecoveryReconnect();
    await controller.handleRecoveryResync();
    controller.handleRecoveryExportDiagnostics();

    expect(fetchJson).toHaveBeenCalledWith("http://127.0.0.1:4546/relay/stop", { method: "POST" });
    expect(fetchJson).toHaveBeenCalledWith("http://127.0.0.1:4546/relay/start", { method: "POST" });
    expect(anchorClickSpy).toHaveBeenCalled();
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    anchorClickSpy.mockRestore();
  });

  it("disables recovery buttons immediately when reconnect starts", async () => {
    let resolveStop = () => {};
    const stopGate = new Promise(resolve => {
      resolveStop = resolve;
    });
    const elements = buildRelayElements();
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) {
        return {
          status: "running",
          account: { pushName: "Alice" },
          chatCount: 2,
          syncingChats: false,
          syncPath: "fallback",
          lastSyncPathReason: "Primary sync unavailable: session stale",
        };
      }
      if (url.endsWith("/relay/stop")) {
        await stopGate;
        return { ok: true };
      }
      if (url.endsWith("/relay/start")) return { ok: true };
      if (url.endsWith("/api/chats")) return { chats: [{ id: "chat-1", name: "General" }] };
      return {};
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson,
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => [{ id: "chat-1", name: "General" }]),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        getDatasetLabel: vi.fn(() => "General"),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });
    const reconnectPromise = controller.handleRecoveryReconnect();

    expect(elements.relayRecoveryReconnectButton.disabled).toBe(true);
    expect(elements.relayRecoveryResyncButton.disabled).toBe(true);

    resolveStop();
    await reconnectPromise;
  });

  it("routes recovery action state updates through Vue shell bridge when available", async () => {
    const bridgeSpy = vi.fn();
    installShellVueBridge({
      updateRelayRecoveryActions: bridgeSpy,
    });
    const elements = buildRelayElements();
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) {
        return {
          status: "running",
          account: { pushName: "Alice" },
          chatCount: 2,
          syncingChats: false,
          syncPath: "fallback",
          lastSyncPathReason: "Primary sync unavailable: session stale",
        };
      }
      if (url.endsWith("/api/chats")) return { chats: [] };
      return {};
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson,
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        getDatasetLabel: vi.fn(() => "General"),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(bridgeSpy).toHaveBeenCalled();
    const payload = bridgeSpy.mock.calls.at(-1)?.[0];
    expect(payload?.show).toBe(true);
    expect(payload?.resyncDisabled).toBe(false);
  });

  it("locks recovery actions through Vue shell bridge immediately when reconnect starts", async () => {
    let resolveStop = () => {};
    const stopGate = new Promise(resolve => {
      resolveStop = resolve;
    });
    const recoverySpy = vi.fn();
    installShellVueBridge({
      updateRelayRecoveryActions: recoverySpy,
    });
    const elements = buildRelayElements();
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) {
        return {
          status: "running",
          account: { pushName: "Alice" },
          chatCount: 2,
          syncingChats: false,
          syncPath: "fallback",
          lastSyncPathReason: "Primary sync unavailable: session stale",
        };
      }
      if (url.endsWith("/relay/stop")) {
        await stopGate;
        return { ok: true };
      }
      if (url.endsWith("/relay/start")) return { ok: true };
      if (url.endsWith("/api/chats")) return { chats: [{ id: "chat-1", name: "General" }] };
      return {};
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson,
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => [{ id: "chat-1", name: "General" }]),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        getDatasetLabel: vi.fn(() => "General"),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });
    recoverySpy.mockClear();

    const reconnectPromise = controller.handleRecoveryReconnect();

    expect(recoverySpy).toHaveBeenCalled();
    const disabledPayloadSeen = recoverySpy.mock.calls.some(([payload]) =>
      payload?.show === true && payload?.reconnectDisabled === true && payload?.resyncDisabled === true
    );
    expect(disabledPayloadSeen).toBe(true);

    resolveStop();
    await reconnectPromise;
  });

  it("routes primary relay control button updates through Vue shell bridge when available", async () => {
    const recoverySpy = vi.fn();
    const controlsSpy = vi.fn();
    installShellVueBridge({
      updateRelayRecoveryActions: recoverySpy,
      updateRelayControlButtons: controlsSpy,
    });
    const elements = buildRelayElements();
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) {
        return {
          status: "running",
          account: { pushName: "Alice" },
          chatCount: 2,
          syncingChats: false,
        };
      }
      if (url.endsWith("/api/chats")) return { chats: [] };
      return {};
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson,
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        getDatasetLabel: vi.fn(() => "General"),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(controlsSpy).toHaveBeenCalled();
    const payloads = controlsSpy.mock.calls.map(call => call[0]);
    expect(payloads.some(payload => payload?.start?.action === "resync")).toBe(true);
    expect(payloads.some(payload => payload?.reloadAllDisabled === false)).toBe(true);
  });

  it("routes relay status apply bridge updates through injected global scope", async () => {
    const fakeWindow = {};
    const recoverySpy = vi.fn();
    const controlsSpy = vi.fn();
    installShellVueBridge(
      {
        updateRelayRecoveryActions: recoverySpy,
        updateRelayControlButtons: controlsSpy,
      },
      { globalScope: fakeWindow },
    );
    const elements = buildRelayElements();
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) {
        return {
          status: "running",
          account: { pushName: "Alice" },
          chatCount: 2,
          syncingChats: false,
        };
      }
      if (url.endsWith("/api/chats")) return { chats: [] };
      return {};
    });
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson,
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        getDatasetLabel: vi.fn(() => "General"),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
      globalScope: fakeWindow,
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(recoverySpy).toHaveBeenCalled();
    expect(controlsSpy).toHaveBeenCalled();
  });

  it("disables logout and page controls in the offline relay state", async () => {
    const controlsSpy = vi.fn();
    const syncPageControlsSpy = vi.fn();
    installShellVueBridge({
      updateRelayControlButtons: controlsSpy,
      syncPageControls: syncPageControlsSpy,
    });
    const { controller } = createController({
      fetchJson: vi.fn(async () => {
        throw new Error("offline");
      }),
      getDataAvailable: vi.fn(() => false),
    });

    await controller.refreshRelayStatus({ silent: false });

    expect(controlsSpy).toHaveBeenCalledWith(expect.objectContaining({
      stopDisabled: true,
      logoutDisabled: true,
      reloadAllDisabled: true,
    }));
    expect(syncPageControlsSpy).toHaveBeenCalledWith(expect.objectContaining({
      chatDisabled: true,
      rangeDisabled: true,
      customDisabled: true,
      customVisible: false,
      rangeValue: "all",
    }));
  });

  it("re-enables the time-range control once the relay is running", async () => {
    const syncPageControlsSpy = vi.fn();
    installShellVueBridge({
      syncPageControls: syncPageControlsSpy,
    });
    const { controller } = createController({
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/relay/status")) {
          return {
            status: "running",
            account: { pushName: "Alice" },
            chatCount: 3,
            syncingChats: false,
          };
        }
        if (url.endsWith("/api/chats")) return { chats: [{ id: "chat-1", name: "General" }] };
        return {};
      }),
      getRemoteChatList: vi.fn(() => [{ id: "chat-1", name: "General" }]),
    });

    await controller.refreshRelayStatus({ silent: true });

    expect(syncPageControlsSpy).toHaveBeenCalledWith(expect.objectContaining({
      chatDisabled: false,
      rangeDisabled: false,
    }));
  });

  it("keeps last known relay status during transient polling failures and shows retry timing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const runningStatus = {
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 4,
      syncingChats: false,
    };
    let statusCalls = 0;
    const elements = buildRelayElements();
    const helpers = {
      updateStatus: vi.fn(),
      withGlobalBusy: vi.fn(async task => task()),
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/relay/status")) {
          statusCalls += 1;
          if (statusCalls === 1) return runningStatus;
          throw new Error("offline");
        }
        if (url.endsWith("/api/chats")) return { chats: [] };
        return {};
      }),
      setRemoteChatList: vi.fn(),
      getRemoteChatList: vi.fn(() => []),
      getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
      refreshChatSelector: vi.fn(async () => {}),
      setDashboardLoadingState: vi.fn(),
      setDatasetEmptyMessage: vi.fn(),
      setDataAvailabilityState: vi.fn(),
      getDataAvailable: vi.fn(() => false),
      updateHeroRelayStatus: vi.fn(),
      applyEntriesToApp: vi.fn(async () => {}),
      encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
    };
    const controller = createRelayController({
      elements,
      helpers,
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });
    const statusBeforeFailure = elements.relayStatusEl.textContent;

    const failedStatus = await controller.refreshRelayStatus({ silent: true, fromPolling: true });

    expect(failedStatus).toBeNull();
    expect(elements.relayStatusEl.textContent).toBe(statusBeforeFailure);
    expect(helpers.updateStatus).toHaveBeenCalledWith("Relay connection lost. Retrying in 10s…", "warning");
    expect(helpers.setDashboardLoadingState).not.toHaveBeenCalledWith(true);
    errorSpy.mockRestore();
    randomSpy.mockRestore();
  });

  it("avoids repeated reset churn when status remains waiting_qr", async () => {
    const waitingStatus = {
      status: "waiting_qr",
      account: null,
      chatCount: 0,
      lastQr: "data:image/png;base64,abc",
    };

    const { controller, helpers } = createController({
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/relay/status")) return waitingStatus;
        if (url.endsWith("/api/chats")) return { chats: [] };
        return {};
      }),
      getDataAvailable: vi.fn(() => false),
    });

    await controller.refreshRelayStatus({ silent: true });
    await controller.refreshRelayStatus({ silent: true });

    expect(helpers.setRemoteChatList).toHaveBeenCalledTimes(1);
    expect(helpers.refreshChatSelector).toHaveBeenCalledTimes(1);
    expect(helpers.setDashboardLoadingState).toHaveBeenCalledTimes(1);
  });

  it("applies offline state when manual refresh joins an in-flight polling request", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { controller, helpers } = createController({
      fetchJson: vi.fn(async () => {
        await Promise.resolve();
        throw new Error("offline");
      }),
      getDataAvailable: vi.fn(() => false),
    });

    const pollingRequest = controller.refreshRelayStatus({ silent: true, fromPolling: true });
    const manualRequest = controller.refreshRelayStatus({ silent: false });
    const [pollResult, manualResult] = await Promise.all([pollingRequest, manualRequest]);

    expect(pollResult).toBeNull();
    expect(manualResult).toBeNull();
    expect(helpers.setRemoteChatList).toHaveBeenCalledWith([]);
    expect(helpers.setDashboardLoadingState).toHaveBeenCalledWith(true);
    expect(helpers.setDataAvailabilityState).toHaveBeenCalledWith(false);
    expect(helpers.updateStatus).toHaveBeenCalledWith(
      "WAAN Relay is offline. Start the desktop relay to load chats.",
      "warning",
    );
    errorSpy.mockRestore();
  });

  it("pauses status polling while hidden and resumes on visibility restore", async () => {
    vi.useFakeTimers();
    let hidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (hidden ? "hidden" : "visible"),
    });

    const { controller, helpers } = createController({
      fetchJson: vi.fn(async url => {
        if (url.endsWith("/relay/status")) {
          return {
            status: "running",
            account: { pushName: "Alice" },
            chatCount: 2,
            syncingChats: false,
          };
        }
        if (url.endsWith("/api/chats")) return { chats: [] };
        return {};
      }),
      getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
    });

    controller.startStatusPolling();
    await Promise.resolve();
    expect(helpers.fetchJson).not.toHaveBeenCalledWith("http://127.0.0.1:4546/relay/status");

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    expect(helpers.fetchJson).toHaveBeenCalledWith("http://127.0.0.1:4546/relay/status");

    await vi.advanceTimersByTimeAsync(5000);
    expect(
      helpers.fetchJson.mock.calls.filter(([url]) => url === "http://127.0.0.1:4546/relay/status").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("loads remote chat without full-fetch by default and supports explicit full fetch", async () => {
    const { controller, helpers } = createController({
      fetchJson: vi.fn(async url => {
        if (url.includes("/api/chats/chat-1%40c.us/messages?")) {
          return {
            entries: [{ id: "m1", timestamp: "2026-02-23T00:00:00.000Z", message: "hello" }],
            label: "General",
            participants: [],
          };
        }
        return {};
      }),
    });

    await controller.loadRemoteChat("chat-1@c.us");
    expect(helpers.fetchJson).toHaveBeenCalledWith(
      "http://127.0.0.1:3334/api/chats/chat-1%40c.us/messages?limit=5000&refresh=1",
    );

    await controller.loadRemoteChat("chat-1@c.us", { full: true, limit: 2500 });
    expect(helpers.fetchJson).toHaveBeenCalledWith(
      "http://127.0.0.1:3334/api/chats/chat-1%40c.us/messages?limit=2500&refresh=1&full=2500",
    );
  });

  it("updates live relay control buttons via shell bridge when cached refs are stale", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const elements = buildRelayElements();

    const liveStopButton = document.createElement("button");
    liveStopButton.id = "relay-stop";
    liveStopButton.disabled = true;
    const liveLogoutButton = document.createElement("button");
    liveLogoutButton.id = "relay-logout";
    liveLogoutButton.disabled = true;
    const liveReloadButton = document.createElement("button");
    liveReloadButton.id = "relay-reload-all";
    liveReloadButton.disabled = true;
    const liveClearButton = document.createElement("button");
    liveClearButton.id = "relay-clear-storage";
    liveClearButton.disabled = true;
    document.body.append(liveStopButton, liveLogoutButton, liveReloadButton, liveClearButton);
    installShellVueBridge({
      updateRelayControlButtons: payload => {
        if (payload && typeof payload.stopDisabled === "boolean") liveStopButton.disabled = payload.stopDisabled;
        if (payload && typeof payload.logoutDisabled === "boolean") liveLogoutButton.disabled = payload.logoutDisabled;
        if (payload && typeof payload.reloadAllDisabled === "boolean") liveReloadButton.disabled = payload.reloadAllDisabled;
        if (payload && typeof payload.clearStorageDisabled === "boolean") {
          liveClearButton.disabled = payload.clearStorageDisabled;
        }
      },
    });

    let statusCallCount = 0;
    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) {
            statusCallCount += 1;
            if (statusCallCount === 1) {
              return {
                status: "running",
                account: { pushName: "Alice" },
                chatCount: 5,
                syncingChats: false,
              };
            }
            throw new Error("relay offline");
          }
          if (url.endsWith("/api/chats")) return { chats: [] };
          return {};
        }),
        setRemoteChatList: vi.fn(),
        getRemoteChatList: vi.fn(() => []),
        getRemoteChatsLastFetchedAt: vi.fn(() => Date.now()),
        refreshChatSelector: vi.fn(async () => {}),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        getDataAvailable: vi.fn(() => false),
        updateHeroRelayStatus: vi.fn(),
        applyEntriesToApp: vi.fn(async () => {}),
        encodeChatSelectorValue: vi.fn((source, id) => `${source}:${id}`),
      },
      electronAPI: {
        setRelayAutostart: vi.fn(),
        updateRelayStatus: vi.fn(),
        notifySyncSummary: vi.fn(),
      },
    });

    await controller.refreshRelayStatus({ silent: true });
    expect(liveStopButton.disabled).toBe(false);
    expect(liveReloadButton.disabled).toBe(false);
    expect(liveLogoutButton.disabled).toBe(false);
    expect(liveClearButton.disabled).toBe(false);

    await controller.refreshRelayStatus({ silent: true });
    expect(liveStopButton.disabled).toBe(true);
    expect(liveReloadButton.disabled).toBe(true);
    expect(liveClearButton.disabled).toBe(false);
    errorSpy.mockRestore();
  });
});
