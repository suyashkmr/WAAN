import { describe, it, expect, vi, afterEach } from "vitest";
import { createRelayActionsController } from "../js/relayControls/actions.js";

describe("relay actions polling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
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
      brandName: "WAAN",
      relayServiceName: "WAAN Relay",
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

  it("disables live reload-all button during async reload even when fallback ref is stale", async () => {
    const relayUiState = {};
    const staleReloadButton = document.createElement("button");
    const liveReloadButton = document.createElement("button");
    liveReloadButton.id = "relay-reload-all";
    document.body.appendChild(liveReloadButton);

    let resolveReload;
    const reloadPromise = new Promise(resolve => {
      resolveReload = resolve;
    });
    const fetchJson = vi.fn(async url => {
      if (url.endsWith("/chats/reload")) {
        await reloadPromise;
        return { ok: true };
      }
      if (url.endsWith("/chats")) return { chats: [] };
      if (url.endsWith("/relay/status")) return { status: "running", chatCount: 1 };
      return {};
    });

    const controller = createRelayActionsController({
      relayUiState,
      relayReloadAllButton: staleReloadButton,
      relayStatusEl: {},
      apiBase: "http://127.0.0.1:3334/api",
      relayBase: "http://127.0.0.1:4546",
      brandName: "WAAN",
      relayServiceName: "WAAN Relay",
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

    const pending = controller.handleReloadAllChats();
    await Promise.resolve();
    expect(liveReloadButton.disabled).toBe(true);

    resolveReload();
    await pending;
    expect(liveReloadButton.disabled).toBe(false);
  });
});
