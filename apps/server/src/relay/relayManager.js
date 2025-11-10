const EventEmitter = require("events");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

class RelayManager extends EventEmitter {
  constructor({ config, store, logger }) {
    super();
    this.config = config;
    this.store = store;
    this.logger = logger;
    this.client = null;
    this.state = {
      status: "stopped",
      startedAt: null,
      readyAt: null,
      lastError: null,
      lastQr: null,
    };
    this.recentMessages = new Set();
    this.recentQueue = [];
  }

  getStatus() {
    return {
      status: this.state.status,
      startedAt: this.state.startedAt,
      readyAt: this.state.readyAt,
      lastError: this.state.lastError,
      lastQr: this.state.lastQr,
      version: this.config.version,
    };
  }

  async start() {
    if (this.client) {
      this.logger.warn("Relay already running.");
      return this.getStatus();
    }

    this.log("Starting WhatsApp relay…");
    this.state.status = "starting";
    this.state.startedAt = new Date().toISOString();
    this.emit("status", this.getStatus());

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.config.sessionDir }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: this.config.chromiumPath || undefined,
      },
    });

    this.attachClientEvents();

    try {
      await this.client.initialize();
    } catch (error) {
      this.logger.error("Relay failed to start: %s", error.stack || error);
      this.state.status = "error";
      this.state.lastError = error.message;
      this.emit("status", this.getStatus());
      this.client = null;
      throw error;
    }
    return this.getStatus();
  }

  async stop() {
    if (!this.client) {
      this.logger.info("Relay is not running.");
      return this.getStatus();
    }
    this.log("Stopping WhatsApp relay…");
    const client = this.client;
    this.client = null;
    try {
      await client.destroy();
    } finally {
      this.state = {
        status: "stopped",
        startedAt: null,
        readyAt: null,
        lastError: null,
        lastQr: null,
      };
      this.emit("status", this.getStatus());
    }
    return this.getStatus();
  }

  attachClientEvents() {
    if (!this.client) return;
    this.client.on("qr", qr => {
      this.state.lastQr = qr;
      this.emit("status", this.getStatus());
      this.log("Scan this QR code with WhatsApp to authenticate.");
      qrcode.generate(qr, { small: true });
      this.emit("qr", qr);
    });

    this.client.on("authenticated", () => {
      this.log("Authenticated with WhatsApp.");
    });

    this.client.on("auth_failure", message => {
      this.log(`Authentication failed: ${message}`);
      this.state.status = "error";
      this.state.lastError = message;
      this.emit("status", this.getStatus());
    });

    this.client.on("ready", async () => {
      this.state.status = "running";
      this.state.readyAt = new Date().toISOString();
      this.state.lastQr = null;
      this.log("Relay is ready.");
      this.emit("status", this.getStatus());
      await this.refreshChats();
    });

    this.client.on("disconnected", async reason => {
      this.log(`WhatsApp disconnected: ${reason}`);
      await this.stop();
    });

    const handler = message => this.handleMessage(message);
    this.client.on("message", handler);
    this.client.on("message_create", handler);
  }

  async refreshChats() {
    if (!this.client) return;
    try {
      const chats = await this.client.getChats();
      await Promise.all(
        chats.map(chat => {
          const lastTimestamp =
            chat?.timestamp ||
            chat?.lastMessage?.timestamp ||
            chat?.lastMessage?.messageTimestamp;
          const lastMessageAt = lastTimestamp
            ? new Date(lastTimestamp * 1000).toISOString()
            : null;
          return this.store.upsertChatMeta(chat.id._serialized, {
            id: chat.id._serialized,
            name: chat.name || chat.formattedTitle || chat.id.user,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount || 0,
            lastMessageAt,
          });
        })
      );
      this.log(`Synced ${chats.length} chats.`);
    } catch (error) {
      this.logger.warn("Failed to sync chats: %s", error.message);
    }
  }

  async handleMessage(message) {
    try {
      if (!message || !message.id) return;
      const messageId = message.id._serialized;
      if (this.recentMessages.has(messageId)) return;
      this.recentMessages.add(messageId);
      this.recentQueue.push(messageId);
      if (this.recentQueue.length > 5000) {
        const removed = this.recentQueue.shift();
        this.recentMessages.delete(removed);
      }

      const chat = await message.getChat();
      const contact = await message.getContact();
      const chatId = chat.id._serialized;
      const timestamp = message.timestamp
        ? new Date(message.timestamp * 1000).toISOString()
        : new Date().toISOString();
      const entry = {
        id: messageId,
        chat_id: chatId,
        timestamp,
        timestamp_text: new Date(timestamp).toLocaleString(),
        sender: contact.pushname || contact.name || contact.shortName || message.from,
        message: this.buildMessageBody(message),
        type: this.resolveEntryType(message),
      };

      await this.store.appendMessage(chatId, entry, {
        name: chat.name || chat.formattedTitle || chat.id.user,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount || 0,
      });

      this.emit("log", `[${chat.name || chatId}] ${entry.sender}: ${entry.message}`);
    } catch (error) {
      this.logger.warn("Failed to handle incoming message: %s", error.message);
    }
  }

  buildMessageBody(message) {
    if (message.type === "chat") {
      return message.body;
    }
    if (message.type === "image") return "[Image]";
    if (message.type === "video") return "[Video]";
    if (message.type === "ptt") return "[Voice note]";
    if (message.type === "audio") return "[Audio]";
    if (message.type === "document") return "[Document]";
    if (message.type === "sticker") return "[Sticker]";
    if (message.type === "vcard") return "[Contact card]";
    return message.body || `[${message.type}]`;
  }

  resolveEntryType(message) {
    if (message.type === "e2e_notification" || message.type === "ciphertext") {
      return "system";
    }
    return "message";
  }

  log(text) {
    this.logger.info(text);
    this.emit("log", text);
  }
}

module.exports = {
  RelayManager,
};
