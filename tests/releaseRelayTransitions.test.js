import { describe, it, expect, vi } from "vitest";
import { createRelayController } from "../js/relayControls.js";

function buildRelayElements() {
  const relayLiveCard = document.createElement("section");
  const chatSelector = document.createElement("select");
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
  const relayOnboardingSteps = [];
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
    relaySyncChatsStep: chatsStep,
    relaySyncMessagesStep: messagesStep,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
    firstRunSetup,
    firstRunSetupSteps,
    firstRunOpenRelayButton,
    firstRunPrimaryActionButton,
    relayLiveCard,
    chatSelector,
  };
}

describe("release reliability: relay transitions", () => {
  it("handles offline -> starting -> waiting_qr -> running transitions and sync-path shifts", async () => {
    const elements = buildRelayElements();
    let remoteChats = [];
    let statusCalls = 0;
    const statusSequence = [
      { status: "starting" },
      { status: "waiting_qr", lastQr: "data:image/png;base64,qr" },
      { status: "running", account: { pushName: "Alice" }, chatCount: 2, syncingChats: false, syncPath: "primary" },
      { status: "running", account: { pushName: "Alice" }, chatCount: 2, syncingChats: false, syncPath: "fallback" },
    ];

    const controller = createRelayController({
      elements,
      helpers: {
        updateStatus: vi.fn(),
        withGlobalBusy: vi.fn(async task => task()),
        fetchJson: vi.fn(async url => {
          if (url.endsWith("/relay/status")) {
            const next = statusSequence[Math.min(statusCalls, statusSequence.length - 1)];
            statusCalls += 1;
            return next;
          }
          if (url.endsWith("/api/chats")) {
            return { chats: [{ id: "chat-1", name: "General", messageCount: 20 }] };
          }
          return {};
        }),
        setRemoteChatList: vi.fn(list => {
          remoteChats = Array.isArray(list) ? list : [];
        }),
        getRemoteChatList: vi.fn(() => remoteChats),
        getRemoteChatsLastFetchedAt: vi.fn(() => 0),
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
    expect(elements.relayBannerEl.dataset.status).toBe("starting");
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Starting…");

    await controller.refreshRelayStatus({ silent: true });
    expect(elements.relayBannerEl.dataset.status).toBe("waiting_qr");
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Link your phone");

    await controller.refreshRelayStatus({ silent: true });
    expect(elements.relayBannerEl.dataset.status).toBe("running");
    expect(elements.relayBannerMeta.textContent).toContain("Primary sync");
    expect(elements.firstRunPrimaryActionButton.textContent).toBe("Choose chat");

    await controller.refreshRelayStatus({ silent: true });
    expect(elements.relayBannerEl.dataset.status).toBe("running");
    expect(elements.relayBannerMeta.textContent).toContain("Fallback sync");
  });
});
