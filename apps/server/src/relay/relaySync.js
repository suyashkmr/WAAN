async function waitBeforeRetry(delayMs) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return;
  }
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

function isTransientStoreFallbackError(error) {
  const message = error instanceof Error
    ? error.message
    : (error && typeof error === "object" && typeof error.message === "string")
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("detached frame") ||
    normalized.includes("execution context was destroyed") ||
    normalized.includes("cannot find context with specified id") ||
    normalized.includes("navigating frame was detached") ||
    normalized.includes("target closed")
  );
}

function clampEnrichmentConcurrency(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  const rounded = Math.trunc(parsed);
  if (rounded < 1) return 1;
  if (rounded > 24) return 24;
  return rounded;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (!normalizedItems.length) return [];
  const limit = Math.min(clampEnrichmentConcurrency(concurrency), normalizedItems.length);
  const results = new Array(normalizedItems.length);
  let cursor = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= normalizedItems.length) return;
      results[index] = await worker(normalizedItems[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function getChatsFromStoreFallback(client, options = {}) {
  if (!client || !client.pupPage) {
    throw new Error("Fallback chat sync unavailable: browser page is not ready.");
  }
  const retryAttemptsRaw = Number(options.retryAttempts);
  const retryAttempts = Number.isFinite(retryAttemptsRaw)
    ? Math.min(Math.max(Math.trunc(retryAttemptsRaw), 1), 5)
    : 2;
  const retryDelayMsRaw = Number(options.retryDelayMs);
  const retryDelayMs = Number.isFinite(retryDelayMsRaw)
    ? Math.max(Math.trunc(retryDelayMsRaw), 0)
    : 250;
  const pause = typeof options.waitBeforeRetry === "function" ? options.waitBeforeRetry : waitBeforeRetry;

  let payload = null;
  let lastError = null;
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const page = client?.pupPage;
      if (!page || typeof page.evaluate !== "function") {
        throw new Error("Fallback chat sync unavailable: browser page is not ready.");
      }
      payload = await page.evaluate(() => {
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
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (!isTransientStoreFallbackError(error) || attempt >= retryAttempts) {
        throw error;
      }
      await pause(retryDelayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }
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
  getExistingChatMeta = null,
  enrichmentConcurrency = 6,
}) {
  let persistDurationMs = 0;
  const normalizedChats = Array.isArray(chats) ? chats : [];
  const bulkMetaUpdates =
    store && typeof store.upsertChatMetaBulk === "function" ? [] : null;

  if (bulkMetaUpdates) {
    const enrichmentResults = await mapWithConcurrency(
      normalizedChats,
      enrichmentConcurrency,
      async chat => {
        const persistStartedAt = Date.now();
        const existingMeta = typeof getExistingChatMeta === "function"
          ? getExistingChatMeta(chat)
          : null;
        const update = await buildChatMetaUpdate(chat, {
          existingMeta,
          skipUnchanged: true,
        });
        const durationMs = Math.max(0, Date.now() - persistStartedAt);
        return { update, durationMs };
      },
    );
    enrichmentResults.forEach(result => {
      persistDurationMs += result?.durationMs || 0;
      if (result?.update) {
        bulkMetaUpdates.push(result.update);
      }
    });
  } else {
    for (const chat of normalizedChats) {
      const persistStartedAt = Date.now();
      await persistChatMeta(chat, { waitForPersist: false });
      persistDurationMs += Math.max(0, Date.now() - persistStartedAt);
    }
  }

  if (!bulkMetaUpdates && store && typeof store.flushMetadata === "function") {
    const flushStartedAt = Date.now();
    await store.flushMetadata();
    persistDurationMs += Math.max(0, Date.now() - flushStartedAt);
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
  isTransientStoreFallbackError,
  getChatsFromStoreFallback,
  persistSyncedChatMeta,
};
