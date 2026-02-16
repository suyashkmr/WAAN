const EventEmitter = require("events");
const QRCode = require("qrcode");
const { formatErrorMessage, formatErrorDetails } = require("../errorUtils");
const { fetchChatsWithStrategy } = require("./syncStrategy");
const {
  normaliseJid,
  stripRelaySuffix,
  buildChatMetaUpdate,
  persistChatMeta,
  serializeMessage,
} = require("./relayData");
const { createRelayClient, wireRelayClientEvents } = require("./relayLifecycle");
const { openRelayBrowserWindow } = require("./relayBrowserWindow");

const DEFAULT_MESSAGE_LIMIT = Number(process.env.WAAN_CHAT_FETCH_LIMIT || 2500);
const RELAY_HEADLESS =
  process.env.WAAN_RELAY_HEADLESS !== undefined
    ? process.env.WAAN_RELAY_HEADLESS === "true"
    : true;
const RELAY_SYNC_MODE = (() => {
  const raw = (process.env.WAAN_RELAY_SYNC_MODE || "").trim().toLowerCase();
  if (raw === "auto" || raw === "primary" || raw === "fallback") {
    return raw;
  }
  // Keep primary-first behavior by default; fallback is opt-in or failover.
  return "auto";
})();
const PRIMARY_SYNC_RETRY_ATTEMPTS = (() => {
  const raw = Number(process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_ATTEMPTS);
  if (!Number.isFinite(raw)) return 2;
  const rounded = Math.trunc(raw);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded;
})();
const PRIMARY_SYNC_RETRY_DELAY_MS = (() => {
  const raw = Number(process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_DELAY_MS);
  if (!Number.isFinite(raw)) return 250;
  const rounded = Math.trunc(raw);
  if (rounded < 0) return 0;
  if (rounded > 5000) return 5000;
  return rounded;
})();
const STARTUP_PRIMARY_RESYNC_DELAY_MS = (() => {
  const raw = Number(process.env.WAAN_RELAY_STARTUP_PRIMARY_RESYNC_DELAY_MS);
  if (!Number.isFinite(raw)) return 15000;
  const rounded = Math.trunc(raw);
  if (rounded < 0) return 0;
  if (rounded > 120000) return 120000;
  return rounded;
})();

class RelayManager extends EventEmitter {
  constructor({ config, store, logger }) {
    super();
    this.config = config;
    this.store = store;
    this.logger = logger;
    this.client = null;
    this.contactCache = new Map();
    this.syncingChats = false;
    this.state = {
      status: "stopped",
      startedAt: null,
      readyAt: null,
      lastError: null,
      lastQr: null,
      account: null,
      chatsSyncedAt: null,
      chatCount: 0,
      syncPath: null,
      lastSyncDurationMs: null,
      lastSyncPersistDurationMs: null,
    };
    this.loggedGetChatsFallback = false;
    this.startupPrimaryResyncTimer = null;
    this.startupPrimaryResyncScheduled = false;
  }

  getStatus() {
    return {
      status: this.state.status,
      startedAt: this.state.startedAt,
      readyAt: this.state.readyAt,
      lastError: this.state.lastError,
      lastQr: this.state.lastQr,
      version: this.config.version,
      account: this.state.account,
      chatsSyncedAt: this.state.chatsSyncedAt,
      chatCount: this.state.chatCount,
      syncPath: this.state.syncPath,
      lastSyncDurationMs: this.state.lastSyncDurationMs,
      lastSyncPersistDurationMs: this.state.lastSyncPersistDurationMs,
      syncingChats: this.syncingChats,
    };
  }

  async start() {
    if (this.client) {
      this.logger.warn("Relay already running.");
      return this.getStatus();
    }

    this.updateState({
      status: "starting",
      startedAt: new Date().toISOString(),
      readyAt: null,
      lastError: null,
      lastQr: null,
    });

    this.client = createRelayClient({
      dataDir: this.config.dataDir,
      headless: RELAY_HEADLESS,
    });

    wireRelayClientEvents(this.client, {
      onQr: qr => this.handleQr(qr),
      onAuthenticated: () => this.log("Authenticated with ChatScope Web."),
      onAuthFailure: message => this.handleAuthFailure(message),
      onReady: () => this.handleReady(),
      onChangeState: state => this.log(`Client state changed: ${state}`),
      onDisconnected: reason => this.handleDisconnect(reason),
      onLoadingScreen: (percent, message) => {
        this.log(`Loading ChatScope… ${percent || 0}% ${message || ""}`.trim());
      },
      onMessage: message => {
        this.handleIncomingMessage(message).catch(error => {
          this.logger.warn("Failed to record incoming message: %s", error.message);
        });
      },
    });

    try {
      await this.client.initialize();
    } catch (error) {
      this.handleFatalError(error);
      await this.stop();
      throw error;
    }

    return this.getStatus();
  }

  async stop() {
    this.clearStartupPrimaryResync();
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        this.logger.warn("Failed to destroy ChatScope client: %s", error.message);
      }
      this.client = null;
    }
    this.contactCache.clear();
    this.syncingChats = false;
    this.updateState({
      status: "stopped",
      readyAt: null,
      lastQr: null,
      account: null,
    });
    return this.getStatus();
  }

  async logout() {
    if (this.client && typeof this.client.logout === "function") {
      try {
        await this.client.logout();
        this.log("ChatScope session logged out.");
      } catch (error) {
        this.logger.warn("Failed to logout session: %s", error.message);
      }
    }
    return this.stop();
  }

  isReady() {
    return this.client !== null && this.state.status === "running";
  }

  async syncChats(options = {}) {
    const client = this.requireClient();
    if (this.syncingChats) {
      return this.getStatus();
    }
    const requestedMode =
      options && typeof options.mode === "string"
        ? options.mode.trim().toLowerCase()
        : "";
    const effectiveMode =
      requestedMode === "auto" || requestedMode === "primary" || requestedMode === "fallback"
        ? requestedMode
        : RELAY_SYNC_MODE;
    this.syncingChats = true;
    this.emit("status", this.getStatus());
    const syncStartedAt = Date.now();
    try {
      this.log("Synchronising chat list from ChatScope…");
      const syncResult = await fetchChatsWithStrategy({
        client,
        mode: effectiveMode,
        retryAttempts: PRIMARY_SYNC_RETRY_ATTEMPTS,
        retryDelayMs: PRIMARY_SYNC_RETRY_DELAY_MS,
        waitBeforeRetry: delayMs => this.waitBeforePrimaryRetry(delayMs),
        logger: this.logger,
        loggedGetChatsFallback: this.loggedGetChatsFallback,
        getChatsFromStoreFallback: () => this.getChatsFromStoreFallback(),
      });
      const chats = Array.isArray(syncResult.chats) ? syncResult.chats : [];
      const syncPath = syncResult.syncPath;
      this.loggedGetChatsFallback = syncResult.loggedGetChatsFallback;
      let persistDurationMs = 0;
      const bulkMetaUpdates =
        this.store && typeof this.store.upsertChatMetaBulk === "function" ? [] : null;
      for (const chat of chats) {
        const persistStartedAt = Date.now();
        if (bulkMetaUpdates) {
          const update = await this.buildChatMetaUpdate(chat);
          if (update) bulkMetaUpdates.push(update);
        } else {
          await this.persistChatMeta(chat);
        }
        persistDurationMs += Math.max(0, Date.now() - persistStartedAt);
      }
      if (bulkMetaUpdates && bulkMetaUpdates.length) {
        const bulkPersistStartedAt = Date.now();
        await this.store.upsertChatMetaBulk(bulkMetaUpdates);
        persistDurationMs += Math.max(0, Date.now() - bulkPersistStartedAt);
      }
      const previousSyncPath = this.state.syncPath;
      const syncDurationMs = Math.max(0, Date.now() - syncStartedAt);
      this.state.chatCount = chats.length;
      this.state.chatsSyncedAt = new Date().toISOString();
      this.state.syncPath = syncPath;
      this.state.lastSyncDurationMs = syncDurationMs;
      this.state.lastSyncPersistDurationMs = persistDurationMs;
      if (previousSyncPath && previousSyncPath !== syncPath) {
        this.log(`Sync path transition detected: ${previousSyncPath} -> ${syncPath}.`);
      }
      this.log(
        `Synced ${chats.length} chats via ${syncPath} in ${syncDurationMs}ms (meta persist ${persistDurationMs}ms).`,
      );
    } catch (error) {
      const message = formatErrorMessage(error, "Chat sync failed");
      const details = formatErrorDetails(error, "Chat sync failed");
      this.logger.error("Failed to sync chats: %s", details);
      this.state.lastError = message;
    } finally {
      this.syncingChats = false;
      this.emit("status", this.getStatus());
    }
    return this.getStatus();
  }

  waitBeforePrimaryRetry(delayMs) {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  async getChatsFromStoreFallback() {
    if (!this.client || !this.client.pupPage) {
      throw new Error("Fallback chat sync unavailable: browser page is not ready.");
    }
    const payload = await this.client.pupPage.evaluate(() => {
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
    const chats = Array.isArray(payload.chats) ? payload.chats : [];
    this.log(`Fallback chat sync path loaded ${chats.length} chats.`);
    return chats;
  }

  async ensureChatSynced(chatId, options = {}) {
    const client = this.requireClient();
    const targetId = decodeURIComponent(chatId);
    const limit = Number(options.limit) || DEFAULT_MESSAGE_LIMIT;
    const chat = await client.getChatById(targetId);
    if (!chat) {
      throw new Error(`Chat ${targetId} not found on ChatScope`);
    }
    await this.persistChatMeta(chat);
    this.log(`Fetching ${limit} messages for ${chat.name || targetId}…`);
    const messages = await chat.fetchMessages({ limit });
    const entries = messages
      .map(message => this.serializeMessage(message))
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
        const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
        return aTime - bTime;
      });
    await this.store.replaceEntries(targetId, entries, {
      name: chat.name || chat.formattedTitle || stripRelaySuffix(targetId),
      isGroup: Boolean(chat.isGroup),
      unreadCount: Number(chat.unreadCount) || 0,
    });
    this.log(
      `Saved ${entries.length} messages for ${chat.name || targetId}.`
    );
    return entries;
  }

  requireClient() {
    if (!this.client) {
      const error = new Error("Relay is not running.");
      error.code = "RELAY_STOPPED";
      throw error;
    }
    return this.client;
  }

  async showBrowserWindow() {
    const client = this.requireClient();
    await openRelayBrowserWindow({
      client,
      headless: RELAY_HEADLESS,
    });
  }

  async handleReady() {
    this.updateState({
      status: "running",
      readyAt: new Date().toISOString(),
      lastQr: null,
      account: this.extractAccountInfo(),
    });
    this.log("ChatScope relay is ready.");
    await this.refreshContacts();
    const syncStatus = await this.syncChats();
    this.scheduleStartupPrimaryResync(syncStatus);
  }

  scheduleStartupPrimaryResync(syncStatus) {
    if (RELAY_SYNC_MODE !== "auto") return;
    if (!syncStatus || syncStatus.syncPath !== "fallback") return;
    if (this.startupPrimaryResyncScheduled || this.startupPrimaryResyncTimer) return;
    this.startupPrimaryResyncScheduled = true;
    this.log(
      `Scheduling deferred primary chat sync in ${STARTUP_PRIMARY_RESYNC_DELAY_MS}ms after fallback startup sync.`,
    );
    this.startupPrimaryResyncTimer = setTimeout(() => {
      this.startupPrimaryResyncTimer = null;
      this.runDeferredPrimaryResync();
    }, STARTUP_PRIMARY_RESYNC_DELAY_MS);
  }

  async runDeferredPrimaryResync() {
    if (!this.client) return;
    try {
      this.log("Running deferred primary chat sync.");
      await this.syncChats({ mode: "primary" });
    } catch (error) {
      const details = formatErrorDetails(error, "Deferred primary sync failed");
      this.logger.debug("Deferred primary sync failed: %s", details);
    }
  }

  clearStartupPrimaryResync() {
    if (this.startupPrimaryResyncTimer) {
      clearTimeout(this.startupPrimaryResyncTimer);
      this.startupPrimaryResyncTimer = null;
    }
    this.startupPrimaryResyncScheduled = false;
  }

  async refreshContacts() {
    if (!this.client || !this.client.pupPage) {
      return;
    }
    try {
      // Access WhatsApp Web store directly to avoid getIsMyContact error
      const contacts = await this.client.pupPage.evaluate(() => {
        if (!window.Store || !window.Store.Contact) {
          return [];
        }

        const contactModels = window.Store.Contact.getModelsArray();
        return contactModels.map(contact => {
          try {
            return {
              id: contact.id?._serialized || contact.id?.user || null,
              name: contact.name || null,
              pushname: contact.pushname || null,
              shortName: contact.shortName || null,
              formattedName: contact.formattedName || null,
              displayName: contact.displayName || null,
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      });

      let mapped = 0;
      contacts.forEach(contact => {
        const contactId = normaliseJid(contact?.id);
        if (!contactId) return;
        const label =
          contact?.name ||
          contact?.pushname ||
          contact?.shortName ||
          contact?.formattedName ||
          contact?.displayName ||
          stripRelaySuffix(contactId);
        if (label) {
          this.contactCache.set(contactId, label);
          mapped += 1;
        }
      });
      if (mapped) {
        this.log(`Loaded ${mapped} contacts from ChatScope Web.`);
      }
    } catch (error) {
      this.logger.warn("Failed to load contacts: %s", error.message);
    }
  }

  async handleIncomingMessage(message) {
    if (!message || !message.id) return;
    const chatId = normaliseJid(message.from);
    if (!chatId) return;
    const entry = this.serializeMessage(message);
    if (!entry) return;
    await this.store.appendMessage(chatId, entry, {
      isGroup: Boolean(message.isGroupMsg),
    });
  }

  handleAuthFailure(message) {
    const error = message || "Authentication failed.";
    this.state.lastError = error;
    this.log(`Authentication failed: ${error}`);
  }

  handleDisconnect(reason) {
    this.log(`ChatScope disconnected: ${reason}`);
    this.stop().catch(err => {
      this.logger.error("Failed to stop relay after disconnect: %s", err.message);
    });
  }

  handleFatalError(error) {
    this.logger.error("ChatScope relay error: %s", error.message);
    this.state.lastError = error.message;
    this.emit("status", this.getStatus());
  }

  async handleQr(qr) {
    this.log("ChatScope requests a QR code scan.");
    try {
      const dataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 320 });
      this.updateState({
        status: "waiting_qr",
        lastQr: dataUrl,
      });
    } catch (error) {
      this.logger.error("Failed to render QR code: %s", error.message);
      this.state.lastError = error.message;
      this.emit("status", this.getStatus());
    }
  }

  updateState(patch = {}) {
    this.state = {
      ...this.state,
      ...patch,
    };
    this.emit("status", this.getStatus());
  }

  extractAccountInfo() {
    const info = this.client?.info;
    if (!info) return null;
    return {
      wid: info.wid?._serialized || info.wid?.user || null,
      pushName: info.pushname || null,
      platform: info.platform || null,
      battery: info.battery ?? null,
      plugged: info.plugged ?? null,
    };
  }

  async persistChatMeta(chat) {
    await persistChatMeta({
      chat,
      store: this.store,
      contactCache: this.contactCache,
      logger: this.logger,
    });
  }

  async buildChatMetaUpdate(chat) {
    return buildChatMetaUpdate({
      chat,
      contactCache: this.contactCache,
      logger: this.logger,
    });
  }

  serializeMessage(message) {
    return serializeMessage({
      message,
      contactCache: this.contactCache,
    });
  }

  log(text) {
    this.logger.info(text);
    this.emit("log", text);
  }
}

module.exports = {
  RelayManager,
};
