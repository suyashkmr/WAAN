import "dotenv/config.js";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import qrcode from "qrcode-terminal";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import Pino from "pino";

import { appendMessage, listChats, getChat } from "./store.js";
import { extractText, detectType } from "./message-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.BAILEYS_PORT || 5050);
const DATA_DIR = path.join(__dirname, "..", "auth");

const logger = Pino({
  level: process.env.BAILEYS_LOG_LEVEL || "info",
});

const status = {
  state: "initialising",
  qr: null,
  connection: "closed",
};

let socket;
let startPromise = null;
const groupMetadataCache = new Map();

async function getChatLabel(jid) {
  if (!jid.endsWith("@g.us")) return null;
  if (groupMetadataCache.has(jid)) {
    return groupMetadataCache.get(jid);
  }
  try {
    const metadata = await socket.groupMetadata(jid);
    const subject = metadata?.subject || null;
    if (subject) {
      groupMetadataCache.set(jid, subject);
    }
    return subject;
  } catch (error) {
    logger.warn({ error, jid }, "failed to fetch group metadata");
    return null;
  }
}

async function createSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(DATA_DIR);
  const { version } = await fetchLatestBaileysVersion();
  socket = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: ["WAAN", "Chrome", "1.0.0"],
    syncFullHistory: true,
  });

  socket.ev.on("connection.update", update => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      status.qr = qr;
      status.state = "qr";
      qrcode.generate(qr, { small: true });
    }
    if (connection) {
      status.connection = connection;
      if (connection === "open") {
        status.state = "connected";
        status.qr = null;
      } else if (connection === "close") {
        status.state = "disconnected";
        status.qr = null;
        const shouldReconnect =
          (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          setTimeout(() => {
            ensureSocket().catch(err => logger.error({ err }, "baileys restart failed"));
          }, 2000);
        } else {
          logger.warn("Logged out of WhatsApp. Delete auth folder to relink.");
        }
      }
    }
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    messages.forEach(async message => {
      if (!message.message) return;
      const jid = message.key.remoteJid;
      const timestamp = Number(message.messageTimestamp) * 1000;
      const text = extractText(message.message);
      const groupLabel = jid.endsWith("@g.us") ? await getChatLabel(jid) : null;
      const entry = {
        id: message.key.id,
        sender: message.pushName || message.key.participant || jid,
        sender_jid: message.key.participant || jid,
        timestamp,
        message: text,
        type: detectType(message.message),
        chatLabel: groupLabel || message.pushName || jid,
      };
      appendMessage(jid, entry);
    });
  });

  return socket;
}

async function ensureSocket() {
  if (socket) return socket;
  if (startPromise) return startPromise;
  status.state = "connecting";
  startPromise = createSocket()
    .catch(error => {
      logger.error({ error }, "Failed to start Baileys socket");
      status.state = "error";
      throw error;
    })
    .finally(() => {
      startPromise = null;
    });
  return startPromise;
}

async function restartSocket({ logout = false } = {}) {
  if (socket) {
    try {
      if (logout) {
        await socket.logout();
      }
    } catch (error) {
      logger.warn({ error }, "logout failed");
    }
    try {
      socket.end(undefined);
    } catch (error) {
      logger.warn({ error }, "socket end failed");
    }
    socket = null;
  }
  return ensureSocket();
}

function clearAuthState() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

await ensureSocket();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/relay/status", (_req, res) => {
  res.json(status);
});

app.post("/relay/start", async (_req, res) => {
  try {
    await ensureSocket();
    res.json({ ok: true, status });
  } catch (error) {
    logger.error({ error }, "relay/start failed");
    res.status(500).json({ error: error.message });
  }
});

app.post("/relay/reload", async (_req, res) => {
  try {
    await restartSocket();
    res.json({ ok: true, status });
  } catch (error) {
    logger.error({ error }, "relay/reload failed");
    res.status(500).json({ error: error.message });
  }
});

app.post("/relay/logout", async (_req, res) => {
  try {
    clearAuthState();
    await restartSocket({ logout: true });
    res.json({ ok: true, status });
  } catch (error) {
    logger.error({ error }, "relay/logout failed");
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/chats", (_req, res) => {
  res.json(listChats());
});

app.get("/api/chats/:id", (req, res) => {
  const chat = getChat(req.params.id);
  if (!chat) {
    return res.sendStatus(404);
  }
  res.json(chat);
});

app.listen(PORT, () => {
  logger.info(`Baileys relay listening on http://localhost:${PORT}`);
  logger.info("Use the QR printed above to link your WhatsApp account.");
});
