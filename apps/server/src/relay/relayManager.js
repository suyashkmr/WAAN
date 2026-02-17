const EventEmitter = require("events");
const QRCode = require("qrcode");
const { fetchChatsWithStrategy } = require("./syncStrategy");
const {
  getRelayConfig,
} = require("./relayConfig");
const {
  waitBeforeRetry,
  getChatsFromStoreFallback,
  persistSyncedChatMeta,
} = require("./relaySync");
const {
  extractAccountInfo,
  refreshContactCache,
} = require("./relayContacts");
const {
  updateRelayState,
  handleAuthFailure,
  handleDisconnect,
  handleFatalError,
  handleQr,
} = require("./relayState");
const {
  normaliseJid,
  buildChatMetaUpdate,
  persistChatMeta,
  serializeMessage,
} = require("./relayData");
const { openRelayBrowserWindow } = require("./relayBrowserWindow");
const { setupRelayClient } = require("./relayLifecycleSetup");
const {
  resolveEffectiveSyncMode,
  applySyncSuccessState,
  applySyncFailureState,
} = require("./relayManagerSync");
const { syncSingleChatMessages } = require("./relayMessageSync");
const {
  scheduleStartupPrimaryResync,
  clearStartupPrimaryResync,
} = require("./relayStartupResync");

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
    this.relayConfig = getRelayConfig();
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

    setupRelayClient(this);

    try {
      await this.client.initialize();
    } catch (error) {
      handleFatalError(this, error);
      await this.stop();
      throw error;
    }

    return this.getStatus();
  }

  async stop() {
    clearStartupPrimaryResync(this);
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
    const effectiveMode = resolveEffectiveSyncMode(options, this.relayConfig.RELAY_SYNC_MODE);
    this.syncingChats = true;
    this.emit("status", this.getStatus());
    const syncStartedAt = Date.now();
    try {
      this.log("Synchronising chat list from ChatScope…");
      const syncResult = await fetchChatsWithStrategy({
        client,
        mode: effectiveMode,
        retryAttempts: this.relayConfig.PRIMARY_SYNC_RETRY_ATTEMPTS,
        retryDelayMs: this.relayConfig.PRIMARY_SYNC_RETRY_DELAY_MS,
        waitBeforeRetry: delayMs => this.waitBeforePrimaryRetry(delayMs),
        logger: this.logger,
        loggedGetChatsFallback: this.loggedGetChatsFallback,
        getChatsFromStoreFallback: () => this.getChatsFromStoreFallback(),
      });
      const chats = Array.isArray(syncResult.chats) ? syncResult.chats : [];
      const syncPath = syncResult.syncPath;
      this.loggedGetChatsFallback = syncResult.loggedGetChatsFallback;
      const persistDurationMs = await persistSyncedChatMeta({
        chats,
        store: this.store,
        buildChatMetaUpdate: chat => this.buildChatMetaUpdate(chat),
        persistChatMeta: chat => this.persistChatMeta(chat),
      });
      applySyncSuccessState(this, {
        chats,
        syncPath,
        persistDurationMs,
        syncStartedAt,
      });
    } catch (error) {
      applySyncFailureState(this, error);
    } finally {
      this.syncingChats = false;
      this.emit("status", this.getStatus());
    }
    return this.getStatus();
  }

  waitBeforePrimaryRetry(delayMs) {
    return waitBeforeRetry(delayMs);
  }

  async getChatsFromStoreFallback() {
    const chats = await getChatsFromStoreFallback(this.client);
    this.log(`Fallback chat sync path loaded ${chats.length} chats.`);
    return chats;
  }

  async ensureChatSynced(chatId, options = {}) {
    const client = this.requireClient();
    return syncSingleChatMessages({
      manager: this,
      client,
      chatId,
      options,
    });
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
      headless: this.relayConfig.RELAY_HEADLESS,
    });
  }

  async handleReady() {
    this.updateState({
      status: "running",
      readyAt: new Date().toISOString(),
      lastQr: null,
      account: extractAccountInfo(this.client),
    });
    this.log("ChatScope relay is ready.");
    await this.refreshContacts();
    const syncStatus = await this.syncChats();
    scheduleStartupPrimaryResync(this, syncStatus);
  }

  async refreshContacts() {
    await refreshContactCache({
      client: this.client,
      contactCache: this.contactCache,
      logger: this.logger,
      log: text => this.log(text),
    });
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
    handleAuthFailure(this, message);
  }

  handleDisconnect(reason) {
    handleDisconnect(this, reason);
  }

  handleFatalError(error) {
    handleFatalError(this, error);
  }

  async handleQr(qr) {
    await handleQr(this, QRCode, qr);
  }

  updateState(patch = {}) {
    updateRelayState(this, patch);
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
