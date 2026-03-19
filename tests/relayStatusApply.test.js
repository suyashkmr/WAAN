import { describe, expect, it, vi } from "vitest";

import { createRelayStatusApplyController } from "../js/relayControls/statusApply.js";

function createElements() {
  return {
    relayStatusEl: document.createElement("div"),
    relayAccountEl: document.createElement("div"),
    relayQrContainer: document.createElement("div"),
    relayQrImage: document.createElement("img"),
    relayHelpText: document.createElement("div"),
    relayBannerEl: document.createElement("div"),
    relayBannerMessage: document.createElement("div"),
    relayBannerMeta: document.createElement("div"),
    relayBannerActions: document.createElement("div"),
    relayRecoveryReconnectButton: document.createElement("button"),
    relayRecoveryResyncButton: document.createElement("button"),
    relayRecoveryExportButton: document.createElement("button"),
    relayOnboardingSteps: [],
    relayOnboardingStepDetails: {},
    relayStopButton: document.createElement("button"),
    relayLogoutButton: document.createElement("button"),
    relayReloadAllButton: document.createElement("button"),
    relayClearStorageButton: document.createElement("button"),
  };
}

describe("relay status apply", () => {
  it("preserves DOM fallback when a partial relayStatusRenderer omits renderStatusSurface", () => {
    const elements = createElements();
    const relayUiState = {
      status: null,
      lastAppliedStateKind: null,
      lastStatusKind: null,
      controlsLocked: false,
    };
    const controller = createRelayStatusApplyController({
      relayUiState,
      elements,
      deps: {
        brandName: "WAAN",
        relayServiceName: "WAAN Relay",
        remoteChatRefreshIntervalMs: 60_000,
        now: () => Date.now(),
        formatNumber: value => String(value),
        formatDisplayDate: () => "today",
        formatRelativeTime: () => "just now",
        describeRelayStatusForUi: status => ({ message: `Relay ${status?.status || "offline"}.` }),
        formatRelayAccountLabel: account => account?.pushName || "",
        electronAPI: null,
        updateHeroRelayStatus: vi.fn(),
        updateRelayBanner: vi.fn(),
        updateRelayOnboarding: vi.fn(),
        relayStatusViewRenderer: null,
        applyRelayPrimaryAction: vi.fn(),
        updateFirstRunSetup: vi.fn(),
        updateSyncProgressFromStatus: vi.fn(),
        getRemoteChatList: () => [],
        getRemoteChatsLastFetchedAt: () => 0,
        setRemoteChatList: vi.fn(),
        refreshChatSelector: vi.fn(),
        setDashboardLoadingState: vi.fn(),
        setDatasetEmptyMessage: vi.fn(),
        setDataAvailabilityState: vi.fn(),
        refreshRemoteChats: vi.fn(),
        updateStatus: vi.fn(),
        getDataAvailable: () => false,
        relayStatusRenderer: {},
      },
    });

    controller.applyRelayStatus({
      status: "running",
      account: { pushName: "Alice" },
      chatCount: 2,
      syncingChats: false,
      syncPath: "primary",
      lastSyncDurationMs: 800,
    });

    expect(elements.relayStatusEl.textContent).toBe("Relay running.");
    expect(elements.relayAccountEl.textContent).toBe("Logged in as Alice");
    expect(elements.relayHelpText.textContent).toContain("Pick a chat");
  });
});
