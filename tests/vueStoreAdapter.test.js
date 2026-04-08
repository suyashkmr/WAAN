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

  it("maps ready and link relay states into stable sync contracts", () => {
    syncWorkspaceRelayStatus({
      status: "running",
      account: "Alice",
      syncingChats: false,
      chatCount: 11,
      lastQr: "",
    });
    expect(store.sync.isSyncing).toBe(false);
    expect(store.sync.syncStep).toBe("ready");
    expect(store.sync.syncProgressPercent).toBe(100);
    expect(store.sync.syncChatsMeta).toBe("11 chats");
    expect(store.qr.showQR).toBe(false);

    syncWorkspaceRelayStatus({
      status: "waiting_qr",
      syncingChats: false,
      lastQr: "data:image/png;base64,def456",
    });
    expect(store.sync.syncStep).toBe("link");
    expect(store.sync.syncProgressPercent).toBe(10);
    expect(store.qr.showQR).toBe(true);
  });

  it("normalizes malformed status payloads without corrupting stage state", () => {
    storeActions.setActiveStage("support");

    syncWorkspaceRelayStatus({
      status: null,
      syncingChats: null,
      chatCount: "not-a-number",
      lastError: 42,
      account: { bad: "value" },
      lastQr: null,
    });

    expect(store.relay.status).toBe("offline");
    expect(store.relay.account).toBe("");
    expect(store.relay.relayError).toBe("");
    expect(store.sync.syncStep).toBe("idle");
    expect(store.sync.syncChatsMeta).toBe("");
    expect(store.sync.syncProgressPercent).toBe(0);
    expect(store.ui.activeStage).toBe("support");
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

  it("keeps existing relay text untouched when relay surface payload omits string fields", () => {
    storeActions.setRelayStatus({
      statusText: "Existing status text",
      accountText: "Existing account text",
    });

    syncWorkspaceRelaySurface({
      statusText: 123,
      accountText: null,
      helpText: null,
      qrSrc: null,
    });

    expect(store.relay.statusText).toBe("Existing status text");
    expect(store.relay.accountText).toBe("Existing account text");
    expect(store.qr.showQR).toBe(false);
    expect(store.qr.qrCodeUrl).toBe("");
    expect(store.qr.qrHelpText).toBe("");
  });

  it("gates adapter writes when disabled", () => {
    initVueStoreAdapter({ enabled: false });

    syncWorkspaceRelayStatus({
      status: "running",
      account: "Blocked",
      syncingChats: true,
      syncPath: "messages",
      chatCount: 99,
      lastQr: "data:image/png;base64,blocked",
    });
    syncWorkspaceRelaySurface({
      statusText: "Blocked status",
      accountText: "Blocked account",
      helpText: "Blocked help",
      qrSrc: "data:image/png;base64,blocked",
    });
    syncWorkspaceSelectionState({
      activeChatId: "remote:blocked",
      activeRange: "30",
      customRange: { start: "2026-01-01", end: "2026-01-31" },
    });

    expect(store.relay.status).toBe("offline");
    expect(store.relay.account).toBe("");
    expect(store.selection.activeChatId).toBe("");
    expect(store.selection.activeRange).toBe("all");
    expect(store.ui.activeStage).toBe("workspace");
  });
});
