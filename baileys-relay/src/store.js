import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(__dirname, "..", "storage");
const CHATS_FILE = path.join(STORAGE_DIR, "chats.json");

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHATS_FILE)) {
    fs.writeFileSync(CHATS_FILE, JSON.stringify({ chats: {} }, null, 2));
  }
}

function readStore() {
  ensureStorage();
  const raw = fs.readFileSync(CHATS_FILE, "utf8");
  return JSON.parse(raw);
}

function writeStore(data) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(data, null, 2));
}

export function appendMessage(chatId, entry) {
  const data = readStore();
  if (!data.chats[chatId]) {
    data.chats[chatId] = {
      id: chatId,
      label: entry.chatLabel || chatId,
      entries: [],
    };
  }
  data.chats[chatId].entries.push(entry);
  writeStore(data);
}

export function listChats() {
  const data = readStore();
  return Object.values(data.chats).map(chat => ({
    id: chat.id,
    label: chat.label || chat.id,
    type: "baileys",
  }));
}

export function getChat(chatId) {
  const data = readStore();
  return data.chats[chatId] || null;
}
