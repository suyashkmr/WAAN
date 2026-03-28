const express = require("express");
const { formatErrorMessage } = require("../errorUtils");

const DEFAULT_CHAT_REFRESH_STALE_MS = 60_000;
const DEFAULT_CHAT_REFRESH_TRACK_MAX = 1_000;

function resolveChatRefreshStaleMs(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_CHAT_REFRESH_STALE_MS;
}

function isRefreshAttemptStale(lastAttemptAt, staleMs, now = Date.now()) {
  return !lastAttemptAt || now - lastAttemptAt >= staleMs;
}

function resolveChatRefreshTrackMax(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.floor(parsed);
  }
  return DEFAULT_CHAT_REFRESH_TRACK_MAX;
}

function buildApiRouter({ store, relayManager, logger, config }) {
  const router = express.Router();
  const staleMs = resolveChatRefreshStaleMs(process.env.WAAN_CHAT_REFRESH_STALE_MS);
  const trackMax = resolveChatRefreshTrackMax(process.env.WAAN_CHAT_REFRESH_TRACK_MAX);
  const chatRefreshAttempts = new Map();

  function getAttemptState(chatId) {
    const current = chatRefreshAttempts.get(chatId);
    if (!current) return {};
    // Refresh insertion order so active chats stay in the cache.
    chatRefreshAttempts.delete(chatId);
    chatRefreshAttempts.set(chatId, current);
    return current;
  }

  function setAttemptState(chatId, attemptState) {
    if (!attemptState) return;
    chatRefreshAttempts.set(chatId, attemptState);
    while (chatRefreshAttempts.size > trackMax) {
      const oldestKey = chatRefreshAttempts.keys().next().value;
      if (oldestKey === undefined) break;
      chatRefreshAttempts.delete(oldestKey);
    }
  }

  router.get("/health", (req, res) => {
    res.json({
      ok: true,
      version: config?.version ?? null,
      buildFingerprint: config?.buildFingerprint ?? null,
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/chats", async (req, res) => {
    const chats = store.listChats();
    res.json({ chats });
  });

  router.post("/chats/reload", async (req, res) => {
    try {
      await relayManager?.syncChats();
      res.json({ ok: true });
    } catch (error) {
      logger?.error("Failed to reload chats: %s", formatErrorMessage(error, "Unable to reload chats"));
      res.status(500).json({ error: "Unable to reload chats" });
    }
  });

  router.get("/chats/:chatId/messages", async (req, res) => {
    const chatId = decodeURIComponent(req.params.chatId);
    const limit = Number(req.query.limit) || 500;
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const fullLimit = Number(req.query.full) || undefined;
    const autoSync = relayManager?.isReady();
    const attemptState = getAttemptState(chatId);
    let meta = store.getChatMeta(chatId);
    try {
      if ((!meta || refresh) && autoSync) {
        const shouldSync = refresh || isRefreshAttemptStale(attemptState.lastSyncChatsAt, staleMs);
        if (shouldSync) {
          await relayManager.syncChats();
          attemptState.lastSyncChatsAt = Date.now();
          setAttemptState(chatId, attemptState);
          meta = store.getChatMeta(chatId);
        }
      }
      if (autoSync) {
        const currentEntries = await store.getEntries(chatId, 1);
        const syncLimit = fullLimit ?? limit;
        const shouldEnsure =
          refresh ||
          (currentEntries.length === 0 &&
            isRefreshAttemptStale(attemptState.lastEnsureChatSyncAt, staleMs));
        if (shouldEnsure) {
          await relayManager.ensureChatSynced(chatId, { limit: syncLimit });
          attemptState.lastEnsureChatSyncAt = Date.now();
          setAttemptState(chatId, attemptState);
        }
      }
    } catch (error) {
      logger?.warn("Failed to refresh chat %s: %s", chatId, formatErrorMessage(error, "Unable to refresh chat"));
    }
    meta = store.getChatMeta(chatId);
    if (!meta) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const entries = await store.getEntries(chatId, limit);
    res.json({
      chatId,
      label: meta.name || chatId,
      entries,
      participants: meta.participants || [],
    });
  });

  router.post("/chats/clear", async (req, res) => {
    try {
      await store.clearAll();
      chatRefreshAttempts.clear();
      res.json({ ok: true });
    } catch (error) {
      logger?.error("Failed to clear chats: %s", formatErrorMessage(error, "Unable to clear stored chats"));
      res.status(500).json({ error: "Unable to clear stored chats" });
    }
  });

  return router;
}

module.exports = {
  buildApiRouter,
};
