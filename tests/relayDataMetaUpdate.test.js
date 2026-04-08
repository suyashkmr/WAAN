import { describe, it, expect, vi } from "vitest";

const { buildChatMetaUpdate } = (await import("../apps/server/src/relay/relayData.js")).default;

describe("relayData buildChatMetaUpdate", () => {
  it("skips unchanged metadata updates without fetching participants", async () => {
    const timestampSeconds = 1_700_000_000;
    const existingMeta = {
      id: "group-1@g.us",
      name: "Team",
      isGroup: true,
      unreadCount: 2,
      lastMessageAt: new Date(timestampSeconds * 1000).toISOString(),
      participants: [
        { id: "alice@c.us", label: "Alice" },
        { id: "bob@c.us", label: "Bob" },
      ],
    };
    const chat = {
      id: "group-1@g.us",
      name: "Team",
      isGroup: true,
      unreadCount: 2,
      timestamp: timestampSeconds,
      fetchParticipants: vi.fn(async () => []),
    };

    const update = await buildChatMetaUpdate({
      chat,
      contactCache: new Map(),
      logger: { warn: vi.fn() },
      existingMeta,
      skipUnchanged: true,
    });

    expect(update).toBeNull();
    expect(chat.fetchParticipants).not.toHaveBeenCalled();
  });

  it("gracefully handles participant fetch failures under degraded network", async () => {
    const chat = {
      id: "group-2@g.us",
      name: "Ops",
      isGroup: true,
      unreadCount: 0,
      timestamp: 1_700_000_100,
      participants: null,
      fetchParticipants: vi.fn(async () => {
        throw new Error("network timeout");
      }),
    };
    const logger = { warn: vi.fn() };

    const update = await buildChatMetaUpdate({
      chat,
      contactCache: new Map(),
      logger,
      skipUnchanged: false,
    });

    expect(update).toBeTruthy();
    expect(update.chatId).toBe("group-2@g.us");
    expect(update.patch.participants).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to fetch participants for %s: %s",
      "group-2@g.us",
      "network timeout",
    );
  });
});
