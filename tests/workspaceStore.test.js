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
});
