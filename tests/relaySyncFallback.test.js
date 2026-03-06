import { createRequire } from "module";
import { describe, it, expect, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
  getChatsFromStoreFallback,
  isTransientStoreFallbackError,
} = require("../apps/server/src/relay/relaySync.js");

describe("relaySync fallback retry hardening", () => {
  it("classifies detached-frame style errors as transient", () => {
    expect(isTransientStoreFallbackError(new Error("Attempted to use detached Frame 'abc'."))).toBe(true);
    expect(isTransientStoreFallbackError(new Error("Execution context was destroyed, most likely because of a navigation."))).toBe(true);
    expect(isTransientStoreFallbackError(new Error("window.Store unavailable"))).toBe(false);
  });

  it("retries store fallback after transient detached-frame failures", async () => {
    const waitBeforeRetry = vi.fn(async () => {});
    const client = {
      pupPage: {
        evaluate: vi
          .fn()
          .mockRejectedValueOnce(new Error("Attempted to use detached Frame 'abc'.")) 
          .mockResolvedValueOnce({
            ok: true,
            chats: [{ id: "chat-1@c.us", name: "Chat 1", timestamp: 1, isGroup: false, unreadCount: 0 }],
          }),
      },
    };

    const chats = await getChatsFromStoreFallback(client, {
      retryAttempts: 2,
      retryDelayMs: 25,
      waitBeforeRetry,
    });

    expect(client.pupPage.evaluate).toHaveBeenCalledTimes(2);
    expect(waitBeforeRetry).toHaveBeenCalledWith(25);
    expect(chats).toEqual([
      { id: "chat-1@c.us", name: "Chat 1", timestamp: 1, isGroup: false, unreadCount: 0 },
    ]);
  });

  it("surfaces detached-frame failures after retry budget is exhausted", async () => {
    const waitBeforeRetry = vi.fn(async () => {});
    const client = {
      pupPage: {
        evaluate: vi.fn(async () => {
          throw new Error("Attempted to use detached Frame 'abc'.");
        }),
      },
    };

    await expect(
      getChatsFromStoreFallback(client, {
        retryAttempts: 2,
        retryDelayMs: 10,
        waitBeforeRetry,
      }),
    ).rejects.toThrow("Attempted to use detached Frame");

    expect(client.pupPage.evaluate).toHaveBeenCalledTimes(2);
    expect(waitBeforeRetry).toHaveBeenCalledTimes(1);
  });
});
