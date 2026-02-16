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

async function buildChatMetaUpdate({ chat, contactCache, logger }) {
  const chatId = normaliseJid(chat.id);
  if (!chatId) return null;
  const name =
    chat.name ||
    chat.formattedTitle ||
    chat.pushname ||
    (chat.contact && (chat.contact.name || chat.contact.pushname)) ||
    stripRelaySuffix(chatId);
  const lastMessageTimestamp = chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : null;

  let participantList = Array.isArray(chat.participants) ? chat.participants : null;
  if ((!participantList || !participantList.length) && typeof chat.fetchParticipants === "function") {
    try {
      participantList = await chat.fetchParticipants();
    } catch (error) {
      logger.warn("Failed to fetch participants for %s: %s", chatId, error.message);
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
        contactCache.get(participantId) ||
        stripRelaySuffix(participantId || "");
      if (label) {
        contactCache.set(participantId, label);
        participants.push({
          id: participantId,
          label,
        });
      }
    });
  }

  return {
    chatId,
    patch: {
      name,
      isGroup: Boolean(chat.isGroup),
      unreadCount: Number(chat.unreadCount) || 0,
      lastMessageAt: lastMessageTimestamp,
      participants,
    },
  };
}

async function persistChatMeta({ chat, store, contactCache, logger }) {
  const update = await buildChatMetaUpdate({ chat, contactCache, logger });
  if (!update) return;
  await store.upsertChatMeta(update.chatId, {
    ...update.patch,
  });
}

function extractPollInfo(message) {
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
    Boolean(title) || options.length > 0 || message.type === "poll_creation" || Boolean(message.pollUpdates);
  return {
    hasPoll,
    title,
    options: options.length ? options : null,
  };
}

function extractTimestamp(message) {
  const source = Number(message.timestamp || message.t || message._data?.t);
  if (!Number.isFinite(source)) return null;
  const ms = source > 10_000_000_000 ? source : source * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function resolveEntryType(message, systemSubtype) {
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

function resolveSenderLabel(message, contactCache) {
  if (!message) return null;
  if (message.fromMe) return "You";
  const data = message._data || {};
  const candidates = [data.notifyName, data.pushname, data.sender?.shortName, data.sender?.name, data.name];
  const resolved = candidates.find(Boolean);
  if (resolved) return resolved;
  const authorId =
    normaliseJid(message.author) ||
    normaliseJid(message.from) ||
    normaliseJid(message.id?.participant);
  if (!authorId) return null;
  if (contactCache.has(authorId)) {
    return contactCache.get(authorId);
  }
  const fallback = stripRelaySuffix(authorId);
  contactCache.set(authorId, fallback);
  return fallback;
}

function resolveSenderJid(message) {
  return (
    normaliseJid(message.author) ||
    normaliseJid(message.from) ||
    normaliseJid(message.id?.participant) ||
    null
  );
}

function extractMessageText(message) {
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

function extractSystemSubtype(message) {
  const candidates = [message.subtype, message._data?.subtype, message._data?.eventType];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "number") continue;
    const normalized = String(candidate).toLowerCase();
    if (normalized.length) return normalized;
  }
  return null;
}

function serializeMessage({ message, contactCache }) {
  if (!message) return null;
  const timestamp = extractTimestamp(message);
  const textContent = extractMessageText(message);
  const content = textContent || describeMedia(message);
  const systemSubtype = extractSystemSubtype(message);
  const senderJid = resolveSenderJid(message);
  const entryType = resolveEntryType(message, systemSubtype);
  const poll = extractPollInfo(message);
  return {
    timestamp,
    timestamp_text: formatTimestampLabel(timestamp),
    sender: resolveSenderLabel(message, contactCache),
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
    forwarding_score: Number.isFinite(message.forwardingScore) ? Number(message.forwardingScore) : null,
    system_subtype: systemSubtype,
  };
}

module.exports = {
  normaliseJid,
  stripRelaySuffix,
  buildChatMetaUpdate,
  persistChatMeta,
  serializeMessage,
};
