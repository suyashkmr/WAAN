const { stripRelaySuffix } = require("./relayData");

async function syncSingleChatMessages({
  manager,
  client,
  chatId,
  options = {},
}) {
  const targetId = decodeURIComponent(chatId);
  const messageLimit = Number(options.limit) || manager.relayConfig.DEFAULT_MESSAGE_LIMIT;
  const chat = await client.getChatById(targetId);
  if (!chat) {
    throw new Error(`Chat ${targetId} not found on ChatScope`);
  }
  await manager.persistChatMeta(chat);
  manager.log(`Fetching ${messageLimit} messages for ${chat.name || targetId}…`);
  const messages = await chat.fetchMessages({ limit: messageLimit });
  const entries = messages
    .map(message => manager.serializeMessage(message))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
      const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
      return aTime - bTime;
    });
  await manager.store.replaceEntries(targetId, entries, {
    name: chat.name || chat.formattedTitle || stripRelaySuffix(targetId),
    isGroup: Boolean(chat.isGroup),
    unreadCount: Number(chat.unreadCount) || 0,
  });
  manager.log(`Saved ${entries.length} messages for ${chat.name || targetId}.`);
  return entries;
}

module.exports = {
  syncSingleChatMessages,
};
