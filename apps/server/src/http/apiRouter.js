const express = require("express");

function buildApiRouter({ store }) {
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
    const meta = store.getChatMeta(chatId);
    if (!meta) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const entries = await store.getEntries(chatId, limit);
    res.json({
      chatId,
      label: meta.name || chatId,
      entries,
    });
  });

  return router;
}

module.exports = {
  buildApiRouter,
};
