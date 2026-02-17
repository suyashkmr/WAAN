import { describe, it, expect, vi, afterEach } from "vitest";
import { createRelayController } from "../js/relayControls.js";

function buildRelayElements() {
  const relayLiveCard = document.createElement("section");
  relayLiveCard.id = "relay-live-card";
  document.body.appendChild(relayLiveCard);
  const chatSelector = document.createElement("select");
  chatSelector.id = "chat-selector";
  document.body.appendChild(chatSelector);

  const relayStartButton = document.createElement("button");
  const relayStopButton = document.createElement("button");
  const relayLogoutButton = document.createElement("button");
  const relayReloadAllButton = document.createElement("button");
  const relayClearStorageButton = document.createElement("button");
  const relayStatusEl = document.createElement("div");
  const relayAccountEl = document.createElement("div");
  const relayQrContainer = document.createElement("div");
  const relayQrImage = document.createElement("img");
  const relayHelpText = document.createElement("div");
  const relayBannerEl = document.createElement("div");
  const relayBannerMessage = document.createElement("div");
  const relayBannerMeta = document.createElement("div");
  const relayOnboardingSteps = document.querySelectorAll(".no-steps");
  const logDrawerToggleButton = document.createElement("button");
  const logDrawerEl = document.createElement("div");
  const logDrawerList = document.createElement("div");
  const logDrawerConnectionLabel = document.createElement("div");
  const relaySyncProgressEl = document.createElement("div");
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
    relayOnboardingSteps,
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relaySyncProgressEl,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    firstRunSetup,
    firstRunSetupSteps,
    firstRunOpenRelayButton,
    firstRunPrimaryActionButton,
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
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(helpers.updateStatus).toHaveBeenCalledWith("Starting ChatScope Relay…", "info");
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
      "ChatScope Relay is offline. Launch the desktop relay and press Connect to enable live loading.",
      "warning",
    );
    expect(helpers.setRemoteChatList).toHaveBeenCalledWith([]);
    expect(helpers.setDashboardLoadingState).toHaveBeenCalledWith(true);
    expect(helpers.setDatasetEmptyMessage).toHaveBeenCalled();
    expect(helpers.setDataAvailabilityState).toHaveBeenCalledWith(false);
    expect(helpers.refreshChatSelector).toHaveBeenCalled();
    errorSpy.mockRestore();
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
    ]);
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
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Choose Loaded Chat");
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
      "ChatScope Relay is offline. Launch the desktop relay and press Connect to enable live loading.",
      "warning",
    );
    errorSpy.mockRestore();
  });
});
