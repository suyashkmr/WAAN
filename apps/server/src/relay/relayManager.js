const path = require("path");
const EventEmitter = require("events");
const { spawn } = require("child_process");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { formatErrorMessage, formatErrorDetails } = require("../errorUtils");

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

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

const SYSTEM_MESSAGE_TYPES = new Set(["notification", "gp2"]);
const SYSTEM_MESSAGE_SUBTYPES = new Set([
  "system",
  "add",
  "invite",
  "remove",
  "leave",
  "linked_group_join",
  "v4_add_invite_join",
  "membership_approval_request",
  "membership_approval",
  "description",
  "subject",
  "announce",
  "icon",
  "create",
  "limit_sharing_system_message",
  "member_add_mode",
  "restrict",
  "admin",
]);

function normaliseJid(id) {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (typeof id === "object") {
    if (id._serialized) return id._serialized;
    if (id.id) return id.id;
  }
  return String(id);
}

function stripRelaySuffix(id) {
  if (!id) return id;
  return id.replace(/@(?:c|g)\.us$/, "");
}

function describeMedia(message) {
  if (!message) return "";
  if (message.type === "image") return "<image omitted>";
  if (message.type === "video") return "<video omitted>";
  if (message.type === "audio") return "<audio omitted>";
  if (message.type === "ptt") return "<voice note>";
  if (message.type === "sticker") return "<sticker>";
  if (message.type === "document") return `<document: ${message._data?.mimetype || "file"}>`;
  if (message.type === "ciphertext") return "<encrypted message>";
  if (message.type === "revoked") return "<message deleted>";
  if (message.type && message.type !== "chat") {
    return `<${message.type}>`;
  }
  return "";
}

function formatTimestampLabel(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

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
    };
    this.loggedGetChatsFallback = false;
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

    const sessionDir = path.join(this.config.dataDir, "relay-session");
    const puppeteerArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
    ];
    if (!RELAY_HEADLESS) {
      puppeteerArgs.push("--start-minimized");
    }

    this.client = new Client({
      puppeteer: {
        headless: RELAY_HEADLESS,
        args: puppeteerArgs,
      },
      authStrategy: new LocalAuth({ dataPath: sessionDir, clientId: "waan" }),
    });

    this.client.on("qr", qr => this.handleQr(qr));
    this.client.on("authenticated", () => this.log("Authenticated with ChatScope Web."));
    this.client.on("auth_failure", message => this.handleAuthFailure(message));
    this.client.on("ready", () => this.handleReady());
    this.client.on("change_state", state => this.log(`Client state changed: ${state}`));
    this.client.on("disconnected", reason => this.handleDisconnect(reason));
    this.client.on("loading_screen", (percent, message) => {
      this.log(`Loading ChatScope… ${percent || 0}% ${message || ""}`.trim());
    });
    this.client.on("message", message => {
      this.handleIncomingMessage(message).catch(error => {
        this.logger.warn("Failed to record incoming message: %s", error.message);
      });
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

  async syncChats() {
    const client = this.requireClient();
    if (this.syncingChats) {
      return this.getStatus();
    }
    this.syncingChats = true;
    this.emit("status", this.getStatus());
    try {
      this.log("Synchronising chat list from ChatScope…");
      let chats = [];
      let syncPath = RELAY_SYNC_MODE === "fallback" ? "fallback" : "primary";
      if (RELAY_SYNC_MODE === "fallback") {
        this.logger.info("Relay sync mode=fallback; skipping client.getChats().");
        chats = await this.getChatsFromStoreFallback();
      } else if (RELAY_SYNC_MODE === "primary") {
        chats = await client.getChats();
      } else {
        try {
          chats = await client.getChats();
        } catch (error) {
          const details = formatErrorDetails(error, "ChatScope getChats failed");
          if (!this.loggedGetChatsFallback) {
            this.logger.info("client.getChats() unavailable; using Store.Chat fallback sync.");
            this.loggedGetChatsFallback = true;
          }
          this.logger.debug("client.getChats() fallback details: %s", details);
          chats = await this.getChatsFromStoreFallback();
          syncPath = "fallback";
        }
      }
      for (const chat of chats) {
        await this.persistChatMeta(chat);
      }
      this.state.chatCount = chats.length;
      this.state.chatsSyncedAt = new Date().toISOString();
      this.state.syncPath = syncPath;
      this.log(`Synced ${chats.length} chats via ${syncPath}.`);
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
    if (RELAY_HEADLESS) {
      throw new Error("Relay is running in headless mode. Set WAAN_RELAY_HEADLESS=false to enable the browser UI.");
    }
    if (!client.pupBrowser || typeof client.pupBrowser.process !== "function") {
      throw new Error("ChatScope browser not available yet.");
    }
    const browserProcess = client.pupBrowser.process();
    if (!browserProcess) {
      throw new Error("Browser process not initialized.");
    }
    if (process.platform === "darwin") {
      const executable =
        browserProcess.spawnfile ||
        (Array.isArray(browserProcess.spawnargs) ? browserProcess.spawnargs[0] : null);
      if (!executable) {
        throw new Error("Unable to resolve ChatScope browser executable.");
      }
      const macosSegment = "/Contents/MacOS/";
      let appPath = executable;
      if (executable.includes(macosSegment)) {
        appPath = executable.slice(0, executable.indexOf(macosSegment));
      } else {
        appPath = path.dirname(executable);
      }
      await runCommand("open", ["-a", appPath]);
      return;
    }
    if (process.platform === "win32") {
      const executable =
        browserProcess.spawnfile ||
        (Array.isArray(browserProcess.spawnargs) ? browserProcess.spawnargs[0] : null);
      if (!executable) {
        throw new Error("Unable to resolve ChatScope browser executable.");
      }
      await runCommand("cmd", ["/c", "start", "", executable]);
      return;
    }
    if (process.platform === "linux") {
      const executable =
        browserProcess.spawnfile ||
        (Array.isArray(browserProcess.spawnargs) ? browserProcess.spawnargs[0] : null);
      if (!executable) {
        throw new Error("Unable to resolve ChatScope browser executable.");
      }
      await runCommand("xdg-open", [executable]);
      return;
    }
    throw new Error("Showing the ChatScope browser is not supported on this platform.");
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
    await this.syncChats();
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
    const chatId = normaliseJid(chat.id);
    if (!chatId) return;
    const name =
      chat.name ||
      chat.formattedTitle ||
      chat.pushname ||
      (chat.contact && (chat.contact.name || chat.contact.pushname)) ||
      stripRelaySuffix(chatId);
    const lastMessageTimestamp = chat.timestamp
      ? new Date(chat.timestamp * 1000).toISOString()
      : null;

    let participantList = Array.isArray(chat.participants) ? chat.participants : null;
    if ((!participantList || !participantList.length) && typeof chat.fetchParticipants === "function") {
      try {
        participantList = await chat.fetchParticipants();
      } catch (error) {
        this.logger.warn("Failed to fetch participants for %s: %s", chatId, error.message);
        participantList = [];
      }
    }

    const participants = [];
    if (Array.isArray(participantList)) {
      participantList.forEach(participant => {
        const participantId = normaliseJid(participant?.id);
        if (!participantId) return;
        const label =
          participant?.name ||
          participant?.pushname ||
          participant?.shortName ||
          participant?.notifyName ||
          this.contactCache.get(participantId) ||
          stripRelaySuffix(participantId || "");
        if (label) {
          this.contactCache.set(participantId, label);
          participants.push({
            id: participantId,
            label,
          });
        }
      });
    }
    await this.store.upsertChatMeta(chatId, {
      name,
      isGroup: Boolean(chat.isGroup),
      unreadCount: Number(chat.unreadCount) || 0,
      lastMessageAt: lastMessageTimestamp,
      participants,
    });
  }

  serializeMessage(message) {
    if (!message) return null;
    const timestamp = this.extractTimestamp(message);
    const textContent = this.extractMessageText(message);
    const content = textContent || describeMedia(message);
    const systemSubtype = this.extractSystemSubtype(message);
    const senderJid = this.resolveSenderJid(message);
    const entryType = this.resolveEntryType(message, systemSubtype);
    const poll = this.extractPollInfo(message);
    const entry = {
      timestamp,
      timestamp_text: formatTimestampLabel(timestamp),
      sender: this.resolveSenderLabel(message),
      sender_jid: senderJid,
      message: content || "",
      type: entryType,
      has_poll: poll.hasPoll,
      poll_title: poll.title,
      poll_options: poll.options,
      from_me: Boolean(message.fromMe),
      message_id: message.id?._serialized || message.id?.id || null,
      quoted_message_id: message.quotedMsgId || null,
      ack: Number.isFinite(message.ack) ? Number(message.ack) : null,
      is_forwarded: Boolean(message.isForwarded),
      forwarding_score: Number.isFinite(message.forwardingScore)
        ? Number(message.forwardingScore)
        : null,
      system_subtype: systemSubtype,
    };
    return entry;
  }

  extractPollInfo(message) {
    const options = [];
    const optionSources = [
      message.pollOptions,
      message.pollUpdates?.pollCreationMessageKeyData?.options,
      message._data?.pollCreationMessageKeyData?.options,
    ];
    optionSources.forEach(source => {
      if (Array.isArray(source)) {
        source.forEach(option => {
          if (!option) return;
          if (typeof option === "string") {
            options.push(option.trim());
            return;
          }
          const name =
            option.name ||
            option.label ||
            option.title ||
            option.optionName?.defaultText ||
            option.optionName ||
            option.optionNameMessage?.text ||
            option.localizedText ||
            option.displayText;
          if (name) options.push(String(name).trim());
        });
      }
    });
    const title =
      message.pollName ||
      message.pollTitle ||
      message.pollUpdates?.pollCreationMessageKeyData?.name ||
      message._data?.pollCreationMessageKeyData?.name ||
      null;
    const hasPoll =
      Boolean(title) ||
      (options.length > 0) ||
      message.type === "poll_creation" ||
      Boolean(message.pollUpdates);
    return {
      hasPoll,
      title,
      options: options.length ? options : null,
    };
  }

  extractTimestamp(message) {
    const source = Number(message.timestamp || message.t || message._data?.t);
    if (!Number.isFinite(source)) return null;
    const ms = source > 10_000_000_000 ? source : source * 1000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  resolveEntryType(message, systemSubtype) {
    if (!message) return "message";
    const messageType = message.type || message._data?.type || "";
    if (SYSTEM_MESSAGE_TYPES.has(messageType)) {
      return "system";
    }
    if (systemSubtype && SYSTEM_MESSAGE_SUBTYPES.has(systemSubtype)) {
      return "system";
    }
    return "message";
  }

  resolveSenderLabel(message) {
    if (!message) return null;
    if (message.fromMe) return "You";
    const data = message._data || {};
    const candidates = [
      data.notifyName,
      data.pushname,
      data.sender?.shortName,
      data.sender?.name,
      data.name,
    ];
    const resolved = candidates.find(Boolean);
    if (resolved) return resolved;
    const authorId =
      normaliseJid(message.author) ||
      normaliseJid(message.from) ||
      normaliseJid(message.id?.participant);
    if (!authorId) return null;
    if (this.contactCache.has(authorId)) {
      return this.contactCache.get(authorId);
    }
    const fallback = stripRelaySuffix(authorId);
    this.contactCache.set(authorId, fallback);
    return fallback;
  }

  resolveSenderJid(message) {
    return (
      normaliseJid(message.author) ||
      normaliseJid(message.from) ||
      normaliseJid(message.id?.participant) ||
      null
    );
  }

  extractMessageText(message) {
    const candidates = [
      message.body,
      message.caption,
      message.description,
      message._data?.body,
      message._data?.caption,
      message._data?.canonicalUrl,
      message._data?.text,
    ];
    for (const value of candidates) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length) {
          return trimmed;
        }
      }
    }
    return "";
  }

  extractSystemSubtype(message) {
    const candidates = [
      message.subtype,
      message._data?.subtype,
      message._data?.eventType,
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate === "number") continue;
      const normalized = String(candidate).toLowerCase();
      if (normalized.length) return normalized;
    }
    return null;
  }

  log(text) {
    this.logger.info(text);
    this.emit("log", text);
  }
}

module.exports = {
  RelayManager,
};
