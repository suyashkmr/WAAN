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

  router.get("/chats/:chatId/messages", async (req, res) => {
    const chatId = decodeURIComponent(req.params.chatId);
    const limit = Number(req.query.limit) || 500;
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const fullLimit = Number(req.query.full) || undefined;
    const autoSync = relayManager?.isReady();
    let meta = store.getChatMeta(chatId);
    try {
      if ((!meta || refresh) && autoSync) {
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
    const entries = await store.getEntries(chatId, limit);
    res.json({
      chatId,
      label: meta.name || chatId,
      entries,
      participants: meta.participants || [],
    });
  });

  return router;
}

module.exports = {
  buildApiRouter,
};
