import { describe, it, expect, vi, afterEach } from "vitest";

const ORIGINAL_SYNC_MODE = process.env.WAAN_RELAY_SYNC_MODE;
const ORIGINAL_RETRY_ATTEMPTS = process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_ATTEMPTS;
const ORIGINAL_RETRY_DELAY_MS = process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_DELAY_MS;

function restoreSyncMode() {
  if (ORIGINAL_SYNC_MODE === undefined) {
    delete process.env.WAAN_RELAY_SYNC_MODE;
  } else {
    process.env.WAAN_RELAY_SYNC_MODE = ORIGINAL_SYNC_MODE;
  }
  if (ORIGINAL_RETRY_ATTEMPTS === undefined) {
    delete process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_ATTEMPTS;
  } else {
    process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_ATTEMPTS = ORIGINAL_RETRY_ATTEMPTS;
  }
  if (ORIGINAL_RETRY_DELAY_MS === undefined) {
    delete process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_DELAY_MS;
  } else {
    process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_DELAY_MS = ORIGINAL_RETRY_DELAY_MS;
  }
}

async function loadRelayManager(syncMode, { retryAttempts = 2, retryDelayMs = 0 } = {}) {
  if (syncMode === undefined) {
    delete process.env.WAAN_RELAY_SYNC_MODE;
  } else {
    process.env.WAAN_RELAY_SYNC_MODE = syncMode;
  }
  process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_ATTEMPTS = String(retryAttempts);
  process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_DELAY_MS = String(retryDelayMs);
  vi.resetModules();
  const relayModule = await import("../apps/server/src/relay/relayManager.js");
  const resolved = relayModule?.RelayManager || relayModule?.default?.RelayManager;
  if (!resolved) {
    throw new Error("RelayManager export not found");
  }
  return resolved;
}

function createManager(RelayManager) {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const store = {
    upsertChatMeta: vi.fn(async () => {}),
  };
  const manager = new RelayManager({
    config: { version: "test", dataDir: "/tmp/waan" },
    store,
    logger,
  });
  return { manager, logger, store };
}

function buildChat(id = "123@c.us") {
  return {
    id,
    name: "Sample",
    timestamp: 0,
    isGroup: false,
    unreadCount: 0,
  };
}

describe("relayManager sync mode behavior", () => {
  afterEach(() => {
    restoreSyncMode();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("auto mode uses client.getChats() first", async () => {
    const RelayManager = await loadRelayManager("auto");
    const { manager, store } = createManager(RelayManager);
    const chat = buildChat();
    manager.client = {
      getChats: vi.fn(async () => [chat]),
    };
    manager.getChatsFromStoreFallback = vi.fn(async () => [buildChat("fallback@c.us")]);

    const status = await manager.syncChats();

    expect(manager.client.getChats).toHaveBeenCalledTimes(1);
    expect(manager.getChatsFromStoreFallback).not.toHaveBeenCalled();
    expect(store.upsertChatMeta).toHaveBeenCalledTimes(1);
    expect(status.lastError).toBeNull();
    expect(status.chatCount).toBe(1);
    expect(status.syncPath).toBe("primary");
  });

  it("auto mode falls back when client.getChats() fails", async () => {
    const RelayManager = await loadRelayManager("auto");
    const { manager, logger, store } = createManager(RelayManager);
    manager.waitBeforePrimaryRetry = vi.fn(async () => {});
    const fallbackChat = buildChat("fallback@c.us");
    manager.client = {
      getChats: vi.fn(async () => {
        throw new Error("primary path failed");
      }),
    };
    manager.getChatsFromStoreFallback = vi.fn(async () => [fallbackChat]);

    const status = await manager.syncChats();

    expect(manager.client.getChats).toHaveBeenCalledTimes(2);
    expect(manager.waitBeforePrimaryRetry).toHaveBeenCalledTimes(1);
    expect(manager.getChatsFromStoreFallback).toHaveBeenCalledTimes(1);
    expect(store.upsertChatMeta).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "client.getChats() unavailable; using Store.Chat fallback sync.",
    );
    expect(status.lastError).toBeNull();
    expect(status.chatCount).toBe(1);
    expect(status.syncPath).toBe("fallback");
  });

  it("fallback mode surfaces Store API unavailability as sync failure", async () => {
    const RelayManager = await loadRelayManager("fallback");
    const { manager, logger, store } = createManager(RelayManager);
    manager.client = {
      getChats: vi.fn(async () => [buildChat()]),
      pupPage: {
        evaluate: vi.fn(async () => ({
          ok: false,
          error: "window.Store.Chat.getModelsArray is unavailable",
        })),
      },
    };

    const status = await manager.syncChats();

    expect(manager.client.getChats).not.toHaveBeenCalled();
    expect(store.upsertChatMeta).not.toHaveBeenCalled();
    expect(status.chatCount).toBe(0);
    expect(status.syncPath).toBeNull();
    expect(status.lastError).toContain("Fallback chat sync unavailable");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/^Failed to sync chats: /),
      expect.any(String),
    );
  });

  it("logs sync path transitions across successful sync cycles", async () => {
    const RelayManager = await loadRelayManager("auto");
    const { manager, logger } = createManager(RelayManager);
    manager.client = {
      getChats: vi.fn(async () => [buildChat("primary@c.us")]),
    };
    manager.getChatsFromStoreFallback = vi.fn(async () => [buildChat("fallback@c.us")]);

    await manager.syncChats();
    expect(manager.getStatus().syncPath).toBe("primary");

    manager.client.getChats = vi.fn(async () => {
      throw new Error("primary path failed");
    });
    await manager.syncChats();

    expect(manager.getStatus().syncPath).toBe("fallback");
    expect(logger.info).toHaveBeenCalledWith(
      "Sync path transition detected: primary -> fallback.",
    );
  });

  it("retries primary getChats in auto mode and stays on primary when retry succeeds", async () => {
    const RelayManager = await loadRelayManager("auto");
    const { manager } = createManager(RelayManager);
    manager.waitBeforePrimaryRetry = vi.fn(async () => {});
    manager.client = {
      getChats: vi
        .fn()
        .mockRejectedValueOnce(new Error("transient failure"))
        .mockResolvedValueOnce([buildChat("primary-retry@c.us")]),
    };
    manager.getChatsFromStoreFallback = vi.fn(async () => [buildChat("fallback@c.us")]);

    const status = await manager.syncChats();

    expect(manager.client.getChats).toHaveBeenCalledTimes(2);
    expect(manager.waitBeforePrimaryRetry).toHaveBeenCalledTimes(1);
    expect(manager.getChatsFromStoreFallback).not.toHaveBeenCalled();
    expect(status.syncPath).toBe("primary");
    expect(status.lastError).toBeNull();
  });

  it("falls back only after auto-mode primary retries are exhausted", async () => {
    const RelayManager = await loadRelayManager("auto");
    const { manager } = createManager(RelayManager);
    manager.waitBeforePrimaryRetry = vi.fn(async () => {});
    manager.client = {
      getChats: vi.fn(async () => {
        throw new Error("persistent primary failure");
      }),
    };
    manager.getChatsFromStoreFallback = vi.fn(async () => [buildChat("fallback-after-retries@c.us")]);

    const status = await manager.syncChats();

    expect(manager.client.getChats).toHaveBeenCalledTimes(2);
    expect(manager.waitBeforePrimaryRetry).toHaveBeenCalledTimes(1);
    expect(manager.getChatsFromStoreFallback).toHaveBeenCalledTimes(1);
    expect(status.syncPath).toBe("fallback");
    expect(status.lastError).toBeNull();
  });
});
