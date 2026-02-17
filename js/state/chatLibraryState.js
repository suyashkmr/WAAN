const chatLibrary = new Map();
const chatOrder = [];
let activeChatId = null;

function generateChatId() {
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveChatDataset(record = {}) {
  const id = (record.id || record.datasetId || generateChatId()).toString();
  const existing = chatLibrary.get(id);
  const timestamp = new Date().toISOString();
  const next = {
    id,
    label: record.label ?? existing?.label ?? `Chat ${chatOrder.length + 1}`,
    entries: record.entries ?? existing?.entries ?? [],
    analytics: record.analytics ?? existing?.analytics ?? null,
    fingerprint: record.fingerprint ?? existing?.fingerprint ?? null,
    participantDirectory: record.participantDirectory ?? existing?.participantDirectory ?? null,
    meta: {
      ...(existing?.meta ?? {}),
      ...(record.meta ?? {}),
    },
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
  };
  chatLibrary.set(id, next);
  if (!existing) {
    chatOrder.push(id);
  }
  return next;
}

export function listChatDatasets() {
  return chatOrder
    .map(id => chatLibrary.get(id))
    .filter(Boolean)
    .map(entry => {
      const metaCount = Number(entry.meta?.messageCount);
      return {
        id: entry.id,
        label: entry.label,
        messageCount: Number.isFinite(entry.analytics?.total_messages)
          ? entry.analytics.total_messages
          : Number.isFinite(metaCount)
            ? metaCount
            : null,
        dateRange: entry.analytics?.date_range ?? entry.meta?.dateRange ?? null,
        updatedAt: entry.updatedAt,
      };
    });
}

export function getChatDatasetById(id) {
  if (!id) return null;
  return chatLibrary.get(id) ?? null;
}

export function setActiveChatId(id) {
  activeChatId = id ?? null;
}

export function getActiveChatId() {
  return activeChatId;
}
