async function waitBeforeRetry(delayMs) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return;
  }
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

async function getChatsFromStoreFallback(client) {
  if (!client || !client.pupPage) {
    throw new Error("Fallback chat sync unavailable: browser page is not ready.");
  }
  const payload = await client.pupPage.evaluate(() => {
    if (!window.Store) {
      return { ok: false, error: "window.Store is unavailable" };
    }
    if (!window.Store.Chat || typeof window.Store.Chat.getModelsArray !== "function") {
      return { ok: false, error: "window.Store.Chat.getModelsArray is unavailable" };
    }
    const chatModels = window.Store.Chat.getModelsArray();
    const chats = chatModels
      .map(chat => {
        try {
          const chatId = chat.id?._serialized || chat.id?.id || chat.id?.user || null;
          if (!chatId) return null;
          return {
            id: chatId,
            name:
              chat.name ||
              chat.formattedTitle ||
              chat.contact?.name ||
              chat.contact?.pushname ||
              null,
            timestamp: Number(chat.t || chat.timestamp || 0) || 0,
            isGroup: Boolean(chat.isGroup),
            unreadCount: Number(chat.unreadCount) || 0,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return { ok: true, chats };
  });
  if (!payload || payload.ok !== true) {
    const message = payload && payload.error
      ? String(payload.error)
      : "window.Store.Chat fallback returned invalid payload";
    throw new Error(`Fallback chat sync unavailable: ${message}`);
  }
  return Array.isArray(payload.chats) ? payload.chats : [];
}

async function persistSyncedChatMeta({
  chats,
  store,
  buildChatMetaUpdate,
  persistChatMeta,
}) {
  let persistDurationMs = 0;
  const bulkMetaUpdates =
    store && typeof store.upsertChatMetaBulk === "function" ? [] : null;

  for (const chat of chats) {
    const persistStartedAt = Date.now();
    if (bulkMetaUpdates) {
      const update = await buildChatMetaUpdate(chat);
      if (update) bulkMetaUpdates.push(update);
    } else {
      await persistChatMeta(chat);
    }
    persistDurationMs += Math.max(0, Date.now() - persistStartedAt);
  }

  if (bulkMetaUpdates && bulkMetaUpdates.length) {
    const bulkPersistStartedAt = Date.now();
    await store.upsertChatMetaBulk(bulkMetaUpdates);
    persistDurationMs += Math.max(0, Date.now() - bulkPersistStartedAt);
  }

  return persistDurationMs;
}

module.exports = {
  waitBeforeRetry,
  getChatsFromStoreFallback,
  persistSyncedChatMeta,
};
