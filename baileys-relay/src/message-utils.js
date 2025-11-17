export function extractText(message) {
  if (!message) return "";
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.buttonsResponseMessage?.selectedButtonId) {
    return `[button:${message.buttonsResponseMessage.selectedButtonId}]`;
  }
  if (message.listResponseMessage?.title) {
    return `[list:${message.listResponseMessage.title}]`;
  }
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  return "[unsupported message]";
}

export function detectType(message) {
  if (!message) return "unknown";
  if (message.conversation || message.extendedTextMessage) return "text";
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.stickerMessage) return "sticker";
  if (message.documentMessage) return "document";
  return Object.keys(message)[0] || "unknown";
}
