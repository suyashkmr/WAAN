import os from "os";
import path from "path";
import fs from "fs-extra";
import { describe, it, expect, vi, afterEach } from "vitest";

const { ChatStore } = (await import("../apps/server/src/store/chatStore.js")).default;

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

describe("chatStore metadata persistence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("coalesces rapid metadata updates into a single chats.json write", async () => {
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    const persistSpy = vi.spyOn(store, "persistMetadata");

    await Promise.all([
      store.upsertChatMeta("chat-a@c.us", { name: "Chat A" }, { waitForPersist: false }),
      store.upsertChatMeta("chat-b@c.us", { name: "Chat B" }, { waitForPersist: false }),
      store.upsertChatMeta("chat-c@c.us", { name: "Chat C" }, { waitForPersist: false }),
    ]);
    await store.flushMetadata();

    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(store.listChats()).toHaveLength(3);
    await fs.remove(storageDir);
  });

  it("batches appendMessage metadata persistence by default", async () => {
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    store.metadataPersistDelayMs = 60_000;
    const persistSpy = vi.spyOn(store, "persistMetadata");

    await store.appendMessage("chat-a@c.us", {
      id: "m-1",
      timestamp: new Date(1_700_000_000_000).toISOString(),
      sender: "A",
      message: "hello",
    });
    await store.appendMessage("chat-a@c.us", {
      id: "m-2",
      timestamp: new Date(1_700_000_001_000).toISOString(),
      sender: "B",
      message: "world",
    });

    expect(persistSpy).toHaveBeenCalledTimes(0);
    expect(store.metadataDirty).toBe(true);

    await store.flushMetadata();
    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(store.metadataDirty).toBe(false);
    await fs.remove(storageDir);
  });

  it("supports immediate metadata persistence for appendMessage when requested", async () => {
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    store.metadataPersistDelayMs = 60_000;
    const persistSpy = vi.spyOn(store, "persistMetadata");

    await store.appendMessage(
      "chat-a@c.us",
      {
        id: "m-1",
        timestamp: new Date(1_700_000_000_000).toISOString(),
        sender: "A",
        message: "hello",
      },
      {},
      { waitForPersist: true },
    );

    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(store.metadataDirty).toBe(false);
    await fs.remove(storageDir);
  });

  it("skips metadata writes when a patch does not change chat metadata", async () => {
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    const persistSpy = vi.spyOn(store, "persistMetadata");

    await store.upsertChatMeta("chat-a@c.us", { name: "Chat A", unreadCount: 2 });
    await store.flushMetadata();
    const writesAfterFirstUpdate = persistSpy.mock.calls.length;

    await store.upsertChatMeta("chat-a@c.us", { name: "Chat A", unreadCount: 2 });
    await store.flushMetadata();
    const writesAfterSecondUpdate = persistSpy.mock.calls.length;

    expect(writesAfterSecondUpdate).toBe(writesAfterFirstUpdate);
    await fs.remove(storageDir);
  });

  it("surfaces metadata persistence failures to normal update callers", async () => {
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    const persistSpy = vi.spyOn(store, "persistMetadata").mockRejectedValue(new Error("disk full"));

    await expect(store.upsertChatMeta("chat-a@c.us", { name: "Chat A" })).rejects.toThrow("disk full");
    expect(persistSpy).toHaveBeenCalledTimes(1);
    await fs.remove(storageDir);
  });

  it("retries deferred metadata flush failures without requiring new updates", async () => {
    vi.useFakeTimers();
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    store.metadataPersistDelayMs = 10;
    store.metadataPersistRetryDelayMs = 20;
    store.metadataPersistRetryMaxDelayMs = 20;
    store.metadataPersistNextRetryDelayMs = 20;

    const persistSpy = vi
      .spyOn(store, "persistMetadata")
      .mockRejectedValueOnce(new Error("transient fs error"))
      .mockResolvedValue(undefined);
    const errorListener = vi.fn();
    store.on("metadata:persist:error", errorListener);

    await store.upsertChatMeta("chat-a@c.us", { name: "Chat A" }, { waitForPersist: false });
    expect(persistSpy).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(10);
    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(store.metadataDirty).toBe(true);

    await vi.advanceTimersByTimeAsync(20);
    expect(persistSpy).toHaveBeenCalledTimes(2);
    expect(store.metadataDirty).toBe(false);
    await fs.remove(storageDir);
  });

  it("retries a previously failed metadata flush even when the next patch is unchanged", async () => {
    const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chat-store-"));
    const store = new ChatStore(storageDir, createLogger());
    const persistSpy = vi
      .spyOn(store, "persistMetadata")
      .mockRejectedValueOnce(new Error("transient fs error"))
      .mockResolvedValue(undefined);

    await expect(store.upsertChatMeta("chat-a@c.us", { name: "Chat A" })).rejects.toThrow("transient fs error");
    await expect(store.upsertChatMeta("chat-a@c.us", { name: "Chat A" })).resolves.toBeTruthy();

    expect(persistSpy).toHaveBeenCalledTimes(2);
    await fs.remove(storageDir);
  });
});
