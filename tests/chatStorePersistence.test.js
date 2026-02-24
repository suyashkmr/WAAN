import os from "os";
import path from "path";
import fs from "fs-extra";
import { createRequire } from "module";
import { describe, it, expect, vi, afterEach } from "vitest";

const require = createRequire(import.meta.url);
const { ChatStore } = require("../apps/server/src/store/chatStore.js");

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

describe("chatStore metadata persistence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
