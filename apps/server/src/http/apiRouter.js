const express = require("express");

function buildApiRouter({ store, relayManager, logger }) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
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
      logger?.error("Failed to reload chats: %s", error.message);
      res.status(500).json({ error: "Unable to reload chats" });
    }
  });

  router.get("/chats/:chatId/messages", async (req, res) => {
    const chatId = decodeURIComponent(req.params.chatId);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 500, 5000));
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const fullLimit = Number(req.query.full) || undefined;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
    const autoSync = relayManager?.isReady();
    let meta = store.getChatMeta(chatId);
    try {
      if (!meta && autoSync) {
        await relayManager.syncChats();
        meta = store.getChatMeta(chatId);
      }
      if (autoSync) {
        const currentEntries = await store.getEntries(chatId, 1);
        if (refresh || currentEntries.length === 0) {
          await relayManager.ensureChatSynced(chatId, { limit: fullLimit });
        }
      }
    } catch (error) {
      logger?.warn("Failed to refresh chat %s: %s", chatId, error.message);
    }
    meta = store.getChatMeta(chatId);
    if (!meta) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const page = await store.getEntriesPage(chatId, { limit, before: cursor });
    res.json({
      chatId,
      label: meta.name || chatId,
      entries: page.entries,
      paging: {
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        remaining: page.remaining,
        total: page.total,
      },
      participants: meta.participants || [],
    });
  });

  router.post("/chats/clear", async (req, res) => {
    try {
      await store.clearAll();
      res.json({ ok: true });
    } catch (error) {
      logger?.error("Failed to clear chats: %s", error.message);
      res.status(500).json({ error: "Unable to clear stored chats" });
    }
  });

  return router;
}

module.exports = {
  buildApiRouter,
};
