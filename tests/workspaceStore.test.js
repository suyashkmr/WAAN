import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore, useWorkspaceStoreActions } from "../src/store/useWorkspaceStore.js";

describe("workspace store", () => {
  const store = useWorkspaceStore();
  const actions = useWorkspaceStoreActions();

  beforeEach(() => {
    actions.resetWorkspaceState();
  });

  it("normalizes relay and sync payloads", () => {
    actions.setRelayStatus({
      status: "running",
      account: "Alice",
      relayError: "none",
      statusText: "Relay connected.",
      accountText: "Logged in as Alice",
    });
    actions.setSyncProgress({
      isSyncing: true,
      syncStep: "messages",
      syncChatsMeta: "12 chats",
      syncProgressPercent: 250,
    });

    expect(store.relay.status).toBe("running");
    expect(store.relay.account).toBe("Alice");
    expect(store.relay.statusText).toBe("Relay connected.");
    expect(store.relay.accountText).toBe("Logged in as Alice");
    expect(store.sync.isSyncing).toBe(true);
    expect(store.sync.syncStep).toBe("messages");
    expect(store.sync.syncChatsMeta).toBe("12 chats");
    expect(store.sync.syncProgressPercent).toBe(100);
  });

  it("normalizes relay fallbacks and preserves copy when copy payload is invalid", () => {
    actions.setRelayStatus({
      status: "",
      account: 42,
      lastError: "relay down",
      statusText: 123,
      accountText: null,
    });

    expect(store.relay.status).toBe("offline");
    expect(store.relay.account).toBe("");
    expect(store.relay.relayError).toBe("relay down");
    expect(store.relay.statusText).toBe("Relay offline.");
    expect(store.relay.accountText).toBe("Workspace locked until relay starts.");
  });

  it("clamps sync percent and handles invalid sync payload values", () => {
    actions.setSyncProgress({
      isSyncing: 0,
      syncStep: "",
      syncChatsMeta: null,
      syncProgressPercent: -10,
    });
    expect(store.sync.isSyncing).toBe(false);
    expect(store.sync.syncStep).toBe("idle");
    expect(store.sync.syncChatsMeta).toBe("");
    expect(store.sync.syncProgressPercent).toBe(0);

    actions.setSyncProgress({ syncProgressPercent: "87.6" });
    expect(store.sync.syncProgressPercent).toBeCloseTo(87.6);

    actions.setSyncProgress({ syncProgressPercent: Infinity });
    expect(store.sync.syncProgressPercent).toBe(0);
  });

  it("derives QR visibility unless an explicit showQR boolean is provided", () => {
    actions.setQrState({
      qrSrc: "data:image/png;base64,abc123",
      helpText: "Scan with linked devices.",
    });
    expect(store.qr.showQR).toBe(true);
    expect(store.qr.qrCodeUrl).toContain("data:image/png");
    expect(store.qr.qrHelpText).toBe("Scan with linked devices.");

    actions.setQrState({
      qrCodeUrl: "data:image/png;base64,next",
      showQR: false,
      qrHelpText: "QR intentionally hidden.",
    });
    expect(store.qr.showQR).toBe(false);
    expect(store.qr.qrCodeUrl).toContain("data:image/png");
    expect(store.qr.qrHelpText).toBe("QR intentionally hidden.");
  });

  it("normalizes selection and stage updates", () => {
    actions.setSelectionState({
      activeChatId: "remote:chat-1",
      activeRange: "custom",
      customRange: { start: "2026-01-01", end: "2026-01-31" },
    });
    actions.setActiveStage("deepdive");

    expect(store.selection.activeChatId).toBe("remote:chat-1");
    expect(store.selection.activeRange).toBe("custom");
    expect(store.selection.customRange.start).toBe("2026-01-01");
    expect(store.selection.customRange.end).toBe("2026-01-31");
    expect(store.ui.activeStage).toBe("deepdive");

    actions.setActiveStage("invalid-stage");
    expect(store.ui.activeStage).toBe("workspace");
  });

  it("updates selection incrementally and normalizes malformed custom range payloads", () => {
    actions.setSelectionState({
      activeChatId: "remote:chat-1",
      activeRange: "7",
      customRange: { start: "2026-03-01", end: "2026-03-31" },
    });
    actions.setSelectionState({ activeRange: "all" });

    expect(store.selection.activeChatId).toBe("remote:chat-1");
    expect(store.selection.activeRange).toBe("all");
    expect(store.selection.customRange).toEqual({ start: "2026-03-01", end: "2026-03-31" });

    actions.setSelectionState({ customRange: null });
    expect(store.selection.customRange).toEqual({ start: "", end: "" });
    expect(store.selection.activeChatId).toBe("remote:chat-1");
  });

  it("resets the entire workspace state tree", () => {
    actions.setRelayStatus({
      status: "running",
      account: "Alice",
      relayError: "transient",
      statusText: "Connected",
      accountText: "Alice connected",
    });
    actions.setSyncProgress({
      isSyncing: true,
      syncStep: "messages",
      syncChatsMeta: "42 chats",
      syncProgressPercent: 42,
    });
    actions.setQrState({
      showQR: true,
      qrCodeUrl: "data:image/png;base64,abc",
      qrHelpText: "Scan now",
    });
    actions.setSelectionState({
      activeChatId: "remote:chat-99",
      activeRange: "custom",
      customRange: { start: "2026-01-01", end: "2026-01-02" },
    });
    actions.setActiveStage("support");

    actions.resetWorkspaceState();

    expect(store.relay).toEqual({
      status: "offline",
      account: "",
      relayError: "",
      statusText: "Relay offline.",
      accountText: "Workspace locked until relay starts.",
    });
    expect(store.sync).toEqual({
      isSyncing: false,
      syncStep: "idle",
      syncChatsMeta: "",
      syncProgressPercent: 0,
    });
    expect(store.qr).toEqual({
      showQR: false,
      qrCodeUrl: "",
      qrHelpText: "",
    });
    expect(store.selection).toEqual({
      activeChatId: "",
      activeRange: "all",
      customRange: { start: "", end: "" },
    });
    expect(store.ui.activeStage).toBe("workspace");
  });
});
