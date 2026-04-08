import { describe, it, expect, vi } from "vitest";

const { persistSyncedChatMeta } = (await import("../apps/server/src/relay/relaySync.js")).default;

describe("relaySync metadata persistence", () => {
  it("caps metadata enrichment concurrency for bulk persistence", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const chats = Array.from({ length: 12 }, (_, index) => ({
      id: `chat-${index}@g.us`,
    }));
    const store = {
      upsertChatMetaBulk: vi.fn(async () => []),
    };

    await persistSyncedChatMeta({
      chats,
      store,
      buildChatMetaUpdate: vi.fn(async chat => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(resolve => setTimeout(resolve, 5));
        inFlight -= 1;
        return {
          chatId: chat.id,
          patch: { name: chat.id, participants: [] },
        };
      }),
      persistChatMeta: vi.fn(async () => {}),
      enrichmentConcurrency: 3,
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(store.upsertChatMetaBulk).toHaveBeenCalledTimes(1);
    expect(store.upsertChatMetaBulk.mock.calls[0][0]).toHaveLength(12);
  });

  it("propagates enrichment failures instead of silently succeeding", async () => {
    const chats = [{ id: "a@g.us" }, { id: "b@g.us" }, { id: "c@g.us" }];
    const store = {
      upsertChatMetaBulk: vi.fn(async () => []),
    };

    await expect(
      persistSyncedChatMeta({
        chats,
        store,
        buildChatMetaUpdate: vi.fn(async chat => {
          if (chat.id === "b@g.us") throw new Error("participant fetch failed");
          return { chatId: chat.id, patch: { name: chat.id, participants: [] } };
        }),
        persistChatMeta: vi.fn(async () => {}),
        enrichmentConcurrency: 2,
      }),
    ).rejects.toThrow("participant fetch failed");
    expect(store.upsertChatMetaBulk).not.toHaveBeenCalled();
  });

  it("propagates flush failures on fallback path", async () => {
    const chats = [{ id: "fallback@c.us" }];
    const store = {
      flushMetadata: vi.fn(async () => {
        throw new Error("flush failed");
      }),
    };
    const persistChatMeta = vi.fn(async () => {});

    await expect(
      persistSyncedChatMeta({
        chats,
        store,
        buildChatMetaUpdate: vi.fn(async () => null),
        persistChatMeta,
      }),
    ).rejects.toThrow("flush failed");
    expect(persistChatMeta).toHaveBeenCalledWith(chats[0], { waitForPersist: false });
    expect(store.flushMetadata).toHaveBeenCalledTimes(1);
  });
});
