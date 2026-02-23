import express from "express";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_STALE_MS = process.env.WAAN_CHAT_REFRESH_STALE_MS;
const ORIGINAL_TRACK_MAX = process.env.WAAN_CHAT_REFRESH_TRACK_MAX;

function restoreStaleMsEnv() {
  if (ORIGINAL_STALE_MS === undefined) {
    delete process.env.WAAN_CHAT_REFRESH_STALE_MS;
  } else {
    process.env.WAAN_CHAT_REFRESH_STALE_MS = ORIGINAL_STALE_MS;
  }
  if (ORIGINAL_TRACK_MAX === undefined) {
    delete process.env.WAAN_CHAT_REFRESH_TRACK_MAX;
    return;
  }
  process.env.WAAN_CHAT_REFRESH_TRACK_MAX = ORIGINAL_TRACK_MAX;
}

async function loadBuildApiRouter() {
  const routerModule = await import("../apps/server/src/http/apiRouter.js");
  const resolved = routerModule?.buildApiRouter || routerModule?.default?.buildApiRouter;
  if (!resolved) {
    throw new Error("buildApiRouter export not found");
  }
  return resolved;
}

function createStore({ metaById = new Map(), entriesById = new Map() } = {}) {
  return {
    listChats: vi.fn(() => []),
    clearAll: vi.fn(async () => {}),
    getChatMeta: vi.fn(chatId => metaById.get(chatId) || null),
    getEntries: vi.fn(async (chatId, limit = 500) => {
      const entries = entriesById.get(chatId) || [];
      if (!limit || limit >= entries.length) {
        return entries;
      }
      return entries.slice(entries.length - limit);
    }),
  };
}

function createRelayManager({ ready = true, onSyncChats, onEnsureChatSynced } = {}) {
  return {
    isReady: vi.fn(() => ready),
    syncChats: vi.fn(async () => {
      await onSyncChats?.();
    }),
    ensureChatSynced: vi.fn(async (chatId, options = {}) => {
      await onEnsureChatSynced?.(chatId, options);
    }),
  };
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

async function startServer(buildApiRouter, deps) {
  const app = express();
  app.use("/api", buildApiRouter(deps));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const { port } = server.address();
  return {
    port,
    close: async () =>
      new Promise((resolve, reject) => {
        server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

async function requestJson(baseUrl, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: baseUrl,
        path,
        method,
      },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => {
          const bodyText = Buffer.concat(chunks).toString("utf8");
          let payload = {};
          try {
            payload = bodyText ? JSON.parse(bodyText) : {};
          } catch (error) {
            reject(error);
            return;
          }
          resolve({ status: response.statusCode, payload });
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

describe("apiRouter chat refresh guards", () => {
  beforeEach(() => {
    process.env.WAAN_CHAT_REFRESH_STALE_MS = "60000";
    process.env.WAAN_CHAT_REFRESH_TRACK_MAX = "1000";
  });

  afterEach(() => {
    restoreStaleMsEnv();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.resetModules();
  });

  it("skips relay sync when chat metadata and entries already exist", async () => {
    const buildApiRouter = await loadBuildApiRouter();
    const chatId = "chat-1@c.us";
    const store = createStore({
      metaById: new Map([[chatId, { id: chatId, name: "Chat 1", participants: [] }]]),
      entriesById: new Map([[chatId, [{ id: "m1", timestamp: "2026-02-23T00:00:00.000Z" }]]]),
    });
    const relayManager = createRelayManager();
    const logger = createLogger();
    const { port, close } = await startServer(buildApiRouter, { store, relayManager, logger });

    try {
      const result = await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(result.status).toBe(200);
      expect(result.payload.chatId).toBe(chatId);
      expect(relayManager.syncChats).not.toHaveBeenCalled();
      expect(relayManager.ensureChatSynced).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("forces sync and ensure when refresh is explicitly requested", async () => {
    const buildApiRouter = await loadBuildApiRouter();
    const chatId = "chat-refresh@c.us";
    const store = createStore({
      metaById: new Map([[chatId, { id: chatId, name: "Chat Refresh", participants: [] }]]),
      entriesById: new Map([[chatId, [{ id: "m1", timestamp: "2026-02-23T00:00:00.000Z" }]]]),
    });
    const relayManager = createRelayManager();
    const logger = createLogger();
    const { port, close } = await startServer(buildApiRouter, { store, relayManager, logger });

    try {
      const result = await requestJson(
        port,
        `/api/chats/${encodeURIComponent(chatId)}/messages?refresh=true&full=321`,
      );
      expect(result.status).toBe(200);
      expect(relayManager.syncChats).toHaveBeenCalledTimes(1);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(1);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledWith(chatId, { limit: 321 });
    } finally {
      await close();
    }
  });

  it("throttles ensureChatSynced for empty chats inside the stale window", async () => {
    const buildApiRouter = await loadBuildApiRouter();
    const chatId = "chat-empty@c.us";
    const store = createStore({
      metaById: new Map([[chatId, { id: chatId, name: "Empty Chat", participants: [] }]]),
      entriesById: new Map([[chatId, []]]),
    });
    const relayManager = createRelayManager();
    const logger = createLogger();
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const { port, close } = await startServer(buildApiRouter, { store, relayManager, logger });

    try {
      await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(1);

      now += 61_000;
      await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(2);
    } finally {
      await close();
    }
  });

  it("throttles syncChats for missing metadata inside the stale window", async () => {
    const buildApiRouter = await loadBuildApiRouter();
    const chatId = "missing@c.us";
    const store = createStore({
      metaById: new Map(),
      entriesById: new Map([[chatId, []]]),
    });
    const relayManager = createRelayManager();
    const logger = createLogger();
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const { port, close } = await startServer(buildApiRouter, { store, relayManager, logger });

    try {
      const first = await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      const second = await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(first.status).toBe(404);
      expect(second.status).toBe(404);
      expect(relayManager.syncChats).toHaveBeenCalledTimes(1);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(1);

      now += 61_000;
      await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(relayManager.syncChats).toHaveBeenCalledTimes(2);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(2);
    } finally {
      await close();
    }
  });

  it("resets throttle state after chats clear so next load can repopulate", async () => {
    const buildApiRouter = await loadBuildApiRouter();
    const chatId = "clearable@c.us";
    const metaById = new Map([[chatId, { id: chatId, name: "Clearable", participants: [] }]]);
    const entriesById = new Map([[chatId, []]]);
    const store = createStore({
      metaById,
      entriesById,
    });
    store.clearAll = vi.fn(async () => {
      metaById.clear();
      entriesById.clear();
    });
    const relayManager = createRelayManager({
      onSyncChats: async () => {
        metaById.set(chatId, { id: chatId, name: "Clearable", participants: [] });
      },
      onEnsureChatSynced: async targetId => {
        entriesById.set(targetId, [{ id: "restored", timestamp: "2026-02-23T00:00:00.000Z" }]);
      },
    });
    const logger = createLogger();
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const { port, close } = await startServer(buildApiRouter, { store, relayManager, logger });

    try {
      const first = await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(first.status).toBe(200);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(1);

      const clear = await requestJson(port, "/api/chats/clear", "POST");
      expect(clear.status).toBe(200);

      metaById.clear();
      entriesById.set(chatId, []);
      now += 1_000;
      const second = await requestJson(port, `/api/chats/${encodeURIComponent(chatId)}/messages`);
      expect(second.status).toBe(200);
      expect(relayManager.syncChats).toHaveBeenCalledTimes(1);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(2);
    } finally {
      await close();
    }
  });

  it("evicts old throttle entries when track max is exceeded", async () => {
    process.env.WAAN_CHAT_REFRESH_TRACK_MAX = "2";
    process.env.WAAN_CHAT_REFRESH_STALE_MS = "3600000";
    const buildApiRouter = await loadBuildApiRouter();
    const store = createStore({
      metaById: new Map(),
      entriesById: new Map(),
    });
    const relayManager = createRelayManager();
    const logger = createLogger();
    const { port, close } = await startServer(buildApiRouter, { store, relayManager, logger });
    const makePath = chatId => `/api/chats/${encodeURIComponent(chatId)}/messages`;

    try {
      await requestJson(port, makePath("old-1@c.us"));
      await requestJson(port, makePath("old-2@c.us"));
      await requestJson(port, makePath("new-3@c.us"));
      await requestJson(port, makePath("old-1@c.us"));

      // old-1 was evicted when new-3 was inserted, so it should sync again.
      expect(relayManager.syncChats).toHaveBeenCalledTimes(4);
      expect(relayManager.ensureChatSynced).toHaveBeenCalledTimes(4);
    } finally {
      await close();
    }
  });
});
