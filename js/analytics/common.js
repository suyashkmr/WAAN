const SENTIMENT_LEXICON = {
  good: 1,
  great: 1,
  awesome: 1,
  nice: 1,
  love: 1,
  happy: 1,
  thanks: 1,
  excellent: 2,
  amazing: 2,
  bad: -1,
  terrible: -1,
  awful: -2,
  hate: -2,
  sad: -1,
  angry: -1,
};

export const ACK_STATE_ORDER = [-1, 0, 1, 2, 3, 4];

export function scoreSentiment(text) {
  if (!text) return 0;
  let score = 0;
  const words = text.toLowerCase().match(/\b[\p{L}\p{N}']+\b/gu) || [];
  words.forEach(word => {
    if (SENTIMENT_LEXICON[word] !== undefined) {
      score += SENTIMENT_LEXICON[word];
    }
  });
  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
}

function parseTimestampText(text) {
  if (!text) return null;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})(?: (AM|PM))?/i);
  if (!match) return null;

  let [, day, month, year, hour, minute, period] = match;
  day = Number(day);
  month = Number(month) - 1;
  year = Number(year);
  if (year < 100) year += 2000;
  hour = Number(hour);
  minute = Number(minute);

  if (period) {
    period = period.toUpperCase();
    if (period === "PM" && hour < 12) hour += 12;
    else if (period === "AM" && hour === 12) hour = 0;
  }

  const date = new Date(year, month, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getTimestamp(entry) {
  if (entry.timestamp) {
    const parsed = new Date(entry.timestamp);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseTimestampText(entry.timestamp_text);
}

function pickField(entry, candidates = []) {
  if (!entry) return null;
  for (const path of candidates) {
    if (!path) continue;
    const segments = path.split(".");
    let value = entry;
    let missing = false;
    for (const segment of segments) {
      if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
        value = value[segment];
      } else {
        value = undefined;
        missing = true;
        break;
      }
    }
    if (!missing && value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
}

export function getMessageId(entry) {
  if (!entry) return null;
  const candidates = [
    "message_id",
    "id.id",
    "id._serialized",
    "id",
    "key.id",
    "key._serialized",
    "stanzaId",
    "stanza_id",
  ];
  for (const candidate of candidates) {
    const value = pickField(entry, [candidate]);
    if (value) {
      if (typeof value === "object") {
        if (value.id) return String(value.id);
        if (value._serialized) return String(value._serialized);
        continue;
      }
      return String(value);
    }
  }
  return null;
}

export function dedupeEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 2) {
    return Array.isArray(entries) ? entries : [];
  }
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const id = getMessageId(entry);
    if (id) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
    }
    result.push(entry);
  }
  return result;
}

export function getQuotedMessageId(entry) {
  return pickField(entry, ["quoted_message_id", "quotedMsgId", "quoted_stanza_id", "quotedStanzaId"]);
}

export function getAckValue(entry) {
  const value = pickField(entry, ["ack", "delivery_state", "deliveryState"]);
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

export function getForwardingScore(entry) {
  const score = pickField(entry, ["forwarding_score", "forwardingScore"]);
  if (score === null || score === undefined) return null;
  const numeric = Number(score);
  return Number.isNaN(numeric) ? null : numeric;
}

export function getBooleanFlag(entry, keys = []) {
  for (const key of keys) {
    const value = pickField(entry, [key]);
    if (value !== null && value !== undefined) {
      return Boolean(value);
    }
  }
  return false;
}

export function buildSnippet(text, limit = 160) {
  if (!text) return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

export function getISOWeekKey(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
