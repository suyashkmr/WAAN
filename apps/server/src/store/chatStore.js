const path = require("path");
const fs = require("fs-extra");
const EventEmitter = require("events");

class ChatStore extends EventEmitter {
  constructor(storageDir, logger) {
    super();
    this.storageDir = storageDir;
    this.logger = logger;
    this.metadataPath = path.join(this.storageDir, "chats.json");
    this.chatsDir = path.join(this.storageDir, "chats");
    this.metadata = new Map();
    this.entriesCache = new Map();
    fs.ensureDirSync(this.chatsDir);
  }

  async hydrate() {
    try {
      const payload = await fs.readJson(this.metadataPath);
      if (Array.isArray(payload.chats)) {
        payload.chats.forEach(chat => {
          if (chat && chat.id) {
            this.metadata.set(chat.id, { ...chat });
          }
        });
      }
      this.logger.info(
        "Loaded chat metadata for %d chats.",
        this.metadata.size
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.logger.warn("Failed to load chat metadata: %s", error.message);
      }
    }
  }

  async persistMetadata() {
    const payload = {
      updatedAt: new Date().toISOString(),
      chats: Array.from(this.metadata.values()),
    };
    await fs.outputJson(this.metadataPath, payload, { spaces: 2 });
  }

  async loadEntries(chatId) {
    if (this.entriesCache.has(chatId)) {
      return this.entriesCache.get(chatId);
    }
    const filePath = this.getChatPath(chatId);
    try {
      const payload = await fs.readJson(filePath);
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      this.entriesCache.set(chatId, entries);
      return entries;
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.logger.warn(
          "Failed to load entries for %s: %s",
          chatId,
          error.message
        );
      }
      const fallback = [];
      this.entriesCache.set(chatId, fallback);
      return fallback;
    }
  }

  async saveEntries(chatId) {
    const entries = await this.loadEntries(chatId);
    const payload = { chatId, entries };
    await fs.outputJson(this.getChatPath(chatId), payload, { spaces: 2 });
  }

  getChatPath(chatId) {
    return path.join(this.chatsDir, `${chatId.replace(/[:/]/g, "_")}.json`);
  }

  listChats() {
    return Array.from(this.metadata.values()).sort((a, b) => {
      const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return bTime - aTime;
    });
  }

  getChatMeta(chatId) {
    return this.metadata.get(chatId) || null;
  }

  async getEntries(chatId, limit = 500) {
    const entries = await this.loadEntries(chatId);
    if (!limit || limit >= entries.length) {
      return entries;
    }
    return entries.slice(entries.length - limit);
  }

  async upsertChatMeta(chatId, patch = {}) {
    const existing = this.metadata.get(chatId) || {
      id: chatId,
      name: patch.name || chatId,
      isGroup: Boolean(patch.isGroup),
      unreadCount: 0,
      lastMessageAt: null,
      messageCount: 0,
      participants: [],
    };
    const updated = {
      ...existing,
      ...patch,
    };
    if (patch.participants) {
      updated.participants = patch.participants;
    }
    this.metadata.set(chatId, updated);
    await this.persistMetadata();
    this.emit("chats:updated", this.listChats());
    return updated;
  }

  async appendMessage(chatId, entry, meta = {}) {
    const entries = await this.loadEntries(chatId);
    entries.push(entry);
    this.entriesCache.set(chatId, entries);
    const patch = {
      lastMessageAt: entry.timestamp || new Date().toISOString(),
      messageCount: entries.length,
    };
    if (meta.name) patch.name = meta.name;
    if (typeof meta.isGroup === "boolean") patch.isGroup = meta.isGroup;
    if (typeof meta.unreadCount === "number") patch.unreadCount = meta.unreadCount;
    await this.upsertChatMeta(chatId, patch);
    await this.saveEntries(chatId);
    this.emit("chat:message", { chatId, entry });
    return entry;
  }

  async replaceEntries(chatId, entries = [], meta = {}) {
    const normalized = Array.isArray(entries) ? entries : [];
    this.entriesCache.set(chatId, normalized);
    await fs.outputJson(this.getChatPath(chatId), { chatId, entries: normalized }, { spaces: 2 });
    const lastEntry = normalized.length ? normalized[normalized.length - 1] : null;
    const patch = {
      lastMessageAt: lastEntry?.timestamp || null,
      messageCount: normalized.length,
      ...meta,
    };
    await this.upsertChatMeta(chatId, patch);
    this.emit("chat:replaced", { chatId, count: normalized.length });
    return normalized;
  }

  async clearAll() {
    this.metadata.clear();
    this.entriesCache.clear();
    await fs.remove(this.metadataPath).catch(() => {});
    await fs.emptyDir(this.chatsDir);
    this.emit("chats:cleared");
  }
}

module.exports = {
  ChatStore,
};
