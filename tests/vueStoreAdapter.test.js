import { beforeEach, describe, expect, it } from "vitest";
import {
  initVueStoreAdapter,
  syncWorkspaceRelayStatus,
  syncWorkspaceRelaySurface,
  syncWorkspaceSelectionState,
} from "../js/appShell/vueStoreAdapter.js";
import { useWorkspaceStore, useWorkspaceStoreActions } from "../src/store/useWorkspaceStore.js";

describe("vueStoreAdapter", () => {
  const store = useWorkspaceStore();
  const storeActions = useWorkspaceStoreActions();

  beforeEach(() => {
    storeActions.resetWorkspaceState();
    initVueStoreAdapter({ enabled: true });
  });

  it("maps relay status payload into workspace store", () => {
    syncWorkspaceRelayStatus({
      status: "running",
      account: "Alice",
      syncingChats: true,
      syncPath: "messages",
      chatCount: 24,
      lastQr: "data:image/png;base64,abc123",
      lastError: "",
    });

    expect(store.relay.status).toBe("running");
    expect(store.relay.account).toBe("Alice");
    expect(store.sync.isSyncing).toBe(true);
    expect(store.sync.syncStep).toBe("messages");
    expect(store.sync.syncChatsMeta).toBe("24 chats");
    expect(store.qr.showQR).toBe(true);
    expect(store.qr.qrCodeUrl).toContain("data:image/png");
  });

  it("maps relay surface and selection payloads", () => {
    syncWorkspaceRelaySurface({
      statusText: "Relay ready.",
      accountText: "Logged in as Bob",
      helpText: "Scan QR if requested",
      qrSrc: "",
    });
    syncWorkspaceSelectionState({
      activeChatId: "remote:chat-99",
      activeRange: "30",
      customRange: { start: "", end: "" },
    });

    expect(store.relay.statusText).toBe("Relay ready.");
    expect(store.relay.accountText).toBe("Logged in as Bob");
    expect(store.qr.qrHelpText).toBe("Scan QR if requested");
    expect(store.selection.activeChatId).toBe("remote:chat-99");
    expect(store.selection.activeRange).toBe("30");
  });
});
