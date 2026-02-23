import { describe, it, expect, vi, afterEach } from "vitest";
import { createRelayActionsController } from "../js/relayControls/actions.js";

describe("relay actions polling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts status polling without accessing document in non-DOM runtimes", async () => {
    const relayUiState = {};
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/relay/status")) return { status: "running", chatCount: 1 };
      return {};
    });
    const controller = createRelayActionsController({
      relayUiState,
      relayReloadAllButton: null,
      relayStatusEl: {},
      apiBase: "http://127.0.0.1:3334/api",
      relayBase: "http://127.0.0.1:4546",
      brandName: "ChatScope",
      relayServiceName: "ChatScope Relay",
      relayPollIntervalMs: 5000,
      remoteMessageLimit: 5000,
      electronAPI: null,
      visibilityAdapter: {
        isHidden: () => false,
        addChangeListener: () => () => {},
      },
      formatNumber: value => String(value),
      fetchJson,
      updateStatus: vi.fn(),
      withGlobalBusy: vi.fn(async task => task()),
      setRemoteChatList: vi.fn(),
      refreshChatSelector: vi.fn(async () => {}),
      applyEntriesToApp: vi.fn(async () => {}),
      encodeChatSelectorValue: vi.fn(),
      setRelayControlsDisabled: vi.fn(),
      applyRelayStatus: vi.fn(),
      beginManualSyncUi: vi.fn(),
      markChatsFetched: vi.fn(),
      markMessagesActive: vi.fn(),
      handleSyncError: vi.fn(),
    });

    expect(() => controller.startStatusPolling()).not.toThrow();
    await Promise.resolve();
    expect(fetchJson).toHaveBeenCalledWith("http://127.0.0.1:4546/relay/status");
    clearTimeout(relayUiState.pollTimer);
  });
});
