const path = require("path");
const EventEmitter = require("events");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

const DEFAULT_MESSAGE_LIMIT = Number(process.env.WAAN_CHAT_FETCH_LIMIT || 2500);

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

function stripWhatsAppSuffix(id) {
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
    };
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

    const sessionDir = path.join(this.config.dataDir, "whatsapp-session");
    this.client = new Client({
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-extensions",
        ],
      },
      authStrategy: new LocalAuth({ dataPath: sessionDir, clientId: "waan" }),
    });

    this.client.on("qr", qr => this.handleQr(qr));
    this.client.on("authenticated", () => this.log("Authenticated with WhatsApp Web."));
    this.client.on("auth_failure", message => this.handleAuthFailure(message));
    this.client.on("ready", () => this.handleReady());
    this.client.on("change_state", state => this.log(`Client state changed: ${state}`));
    this.client.on("disconnected", reason => this.handleDisconnect(reason));
    this.client.on("loading_screen", (percent, message) => {
      this.log(`Loading WhatsApp… ${percent || 0}% ${message || ""}`.trim());
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
        this.logger.warn("Failed to destroy WhatsApp client: %s", error.message);
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
      this.log("Synchronising chat list from WhatsApp…");
      const chats = await client.getChats();
      for (const chat of chats) {
        await this.persistChatMeta(chat);
      }
      this.state.chatCount = chats.length;
      this.state.chatsSyncedAt = new Date().toISOString();
      this.log(`Synced ${chats.length} chats.`);
    } catch (error) {
      this.logger.error("Failed to sync chats: %s", error.message);
      this.state.lastError = error.message;
    } finally {
      this.syncingChats = false;
      this.emit("status", this.getStatus());
    }
    return this.getStatus();
  }

  async ensureChatSynced(chatId, options = {}) {
    const client = this.requireClient();
    const targetId = decodeURIComponent(chatId);
    const limit = Number(options.limit) || DEFAULT_MESSAGE_LIMIT;
    const chat = await client.getChatById(targetId);
    if (!chat) {
      throw new Error(`Chat ${targetId} not found on WhatsApp`);
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
      name: chat.name || chat.formattedTitle || stripWhatsAppSuffix(targetId),
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

  async handleReady() {
    this.updateState({
      status: "running",
      readyAt: new Date().toISOString(),
      lastQr: null,
      account: this.extractAccountInfo(),
    });
    this.log("WhatsApp relay is ready.");
    await this.syncChats();
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
    this.log(`WhatsApp disconnected: ${reason}`);
    this.stop().catch(err => {
      this.logger.error("Failed to stop relay after disconnect: %s", err.message);
    });
  }

  handleFatalError(error) {
    this.logger.error("WhatsApp relay error: %s", error.message);
    this.state.lastError = error.message;
    this.emit("status", this.getStatus());
  }

  async handleQr(qr) {
    this.log("WhatsApp requests a QR code scan.");
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
      stripWhatsAppSuffix(chatId);
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
          stripWhatsAppSuffix(participantId || "");
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
    const fallback = stripWhatsAppSuffix(authorId);
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
