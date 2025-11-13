import {
  SYSTEM_PREFIXES,
  SYSTEM_PATTERNS,
  SYSTEM_JOIN_TEXT_PATTERNS,
  SYSTEM_JOIN_REQUEST_TEXT_PATTERNS,
  SYSTEM_JOIN_SUBTYPES,
  SYSTEM_JOIN_REQUEST_SUBTYPES,
  SYSTEM_ADD_SUBTYPES,
  SYSTEM_REMOVE_SUBTYPES,
  SYSTEM_LEAVE_SUBTYPES,
  SYSTEM_CHANGE_SUBTYPES,
  WEEKDAY_SHORT,
  WEEKDAY_LONG,
} from "./constants.js";
import { isoWeekDateRange, toISODate } from "./utils.js";
import { parseString } from "./vendor/whatsapp-chat-parser.js";

const LINK_REGEX = /(https?:\/\/\S+)/i;
const POLL_PREFIX_REGEX = /^poll:/i;
const ACK_STATE_ORDER = [-1, 0, 1, 2, 3, 4];
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

function scoreSentiment(text) {
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

function isMediaMessage(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  if (
    lower.includes("<media omitted>") ||
    lower.includes("<image omitted>") ||
    lower.includes("<video omitted>") ||
    lower.includes("<gif omitted>") ||
    lower.includes("<audio omitted>") ||
    lower.includes("voice message") ||
    lower.includes("voice note") ||
    lower.includes("<sticker omitted>") ||
    (lower.includes("sticker") && lower.includes("omitted"))
  ) {
    return true;
  }
  if (/^img-\d+/i.test(message) || /^vid-\d+/i.test(message) || /^ptt-\d+/i.test(message)) {
    return true;
  }
  if (/\.(?:jpe?g|png|gif|heic|webp)\b/i.test(message)) return true;
  if (/\.(?:mp4|mov|mkv|avi|gifv?)\b/i.test(message)) return true;
  if (/\.(?:mp3|m4a|aac|wav|opus|ogg)\b/i.test(message)) return true;
  if (/\.(?:pdf|docx?|pptx?|xls[xm]?|zip|rar|7z|csv|txt)\b/i.test(message)) return true;
  if (/\bsticker\b/i.test(message)) return true;
  return false;
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

function isSystemContent(content) {
  const trimmed = (content || "").trimStart();
  if (SYSTEM_PREFIXES.some(prefix => trimmed.startsWith(prefix))) return true;
  return SYSTEM_PATTERNS.some(pattern => pattern.test(trimmed));
}

function countAffectedParticipants(message, verbs = ["added"]) {
  if (!message) return 0;
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized.length) return 0;
  const verbsPattern = verbs.map(verb => verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`^(?:you|[^:]+)\\s+(?:${verbsPattern})\\s+(.+)$`, "i");
  const match = normalized.match(pattern);
  if (!match) return 0;

  let namesFragment = match[1].trim();
  namesFragment = namesFragment.replace(/\s+(?:to|into)\s+(?:the|this)\s+group.*$/i, "");
  namesFragment = namesFragment.replace(/\s+(?:from|out of)\s+(?:the|this)\s+group.*$/i, "");
  namesFragment = namesFragment.replace(/[.。]+$/g, "");
  namesFragment = namesFragment.replace(/\s+(?:and|&)\s+/gi, ",");

  return namesFragment
    .split(/\s*,\s*/)
    .map(name => name.trim())
    .filter(Boolean).length;
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

function getMessageId(entry) {
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

function dedupeEntries(entries) {
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

function getQuotedMessageId(entry) {
  return pickField(entry, ["quoted_message_id", "quotedMsgId", "quoted_stanza_id", "quotedStanzaId"]);
}

function getAckValue(entry) {
  const value = pickField(entry, ["ack", "delivery_state", "deliveryState"]);
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function getForwardingScore(entry) {
  const score = pickField(entry, ["forwarding_score", "forwardingScore"]);
  if (score === null || score === undefined) return null;
  const numeric = Number(score);
  return Number.isNaN(numeric) ? null : numeric;
}

function getBooleanFlag(entry, keys = []) {
  for (const key of keys) {
    const value = pickField(entry, [key]);
    if (value !== null && value !== undefined) {
      return Boolean(value);
    }
  }
  return false;
}

function buildSnippet(text, limit = 160) {
  if (!text) return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

function formatTimestampFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

export function parseChatText(text) {
  if (!text) return [];
  const parsed = parseString(text, { parseAttachments: true }) || [];
  return parsed.map(message => {
    const timestamp = message.date instanceof Date ? message.date.toISOString() : null;
    const timestampText = formatTimestampFromDate(message.date);
    let sender = message.author || null;
    let body = message.message || "";
    let type = sender ? "message" : "system";
    if (type === "message" && isSystemContent(body)) {
      type = "system";
      sender = null;
    }
    return {
      timestamp,
      timestamp_text: timestampText,
      sender,
      message: body,
      type,
      has_poll: false,
      poll_title: null,
      poll_options: null,
    };
  });
}

function getSystemParticipantCount(entry) {
  if (!entry) return null;
  const declaredCount = Number(entry.system_participant_count);
  if (Number.isFinite(declaredCount) && declaredCount > 0) {
    return declaredCount;
  }
  if (Array.isArray(entry.system_participants) && entry.system_participants.length) {
    return entry.system_participants.length;
  }
  return null;
}

function matchesAnyPattern(patterns, text) {
  if (!text) return false;
  return patterns.some(pattern => pattern.test(text));
}

function isJoinSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_JOIN_SUBTYPES.has(entry.system_subtype)) {
    return true;
  }
  return matchesAnyPattern(SYSTEM_JOIN_TEXT_PATTERNS, entry.message);
}

function isJoinRequestEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_JOIN_REQUEST_SUBTYPES.has(entry.system_subtype)) {
    return true;
  }
  return matchesAnyPattern(SYSTEM_JOIN_REQUEST_TEXT_PATTERNS, entry.message);
}

function containsWord(text, word) {
  if (!text || !word) return false;
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(text);
}

function isAddSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_ADD_SUBTYPES.has(entry.system_subtype)) return true;
  const lower = (entry.message || "").toLowerCase();
  return containsWord(lower, "added") || containsWord(lower, "invited");
}

function isLeaveSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_LEAVE_SUBTYPES.has(entry.system_subtype)) return true;
  const lower = (entry.message || "").toLowerCase();
  return containsWord(lower, "left");
}

function isRemoveSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_REMOVE_SUBTYPES.has(entry.system_subtype)) return true;
  const lower = (entry.message || "").toLowerCase();
  return containsWord(lower, "removed");
}

function isChangeSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_CHANGE_SUBTYPES.has(entry.system_subtype)) return true;
  const lower = (entry.message || "").toLowerCase();
  return containsWord(lower, "changed");
}

function getAdditionIncrement(entry) {
  if (!entry) return 0;
  if (entry.system_subtype && SYSTEM_ADD_SUBTYPES.has(entry.system_subtype)) {
    return getSystemParticipantCount(entry) || 1;
  }
  const fromText = countAffectedParticipants(entry.message, ["added", "invited"]);
  if (fromText > 0) return fromText;
  const lower = (entry.message || "").toLowerCase();
  if (containsWord(lower, "added") || containsWord(lower, "invited")) {
    return 1;
  }
  return 0;
}

function getRemovalIncrement(entry) {
  if (!entry) return 0;
  if (entry.system_subtype && SYSTEM_REMOVE_SUBTYPES.has(entry.system_subtype)) {
    return getSystemParticipantCount(entry) || 1;
  }
  const fromText = countAffectedParticipants(entry.message, ["removed"]);
  if (fromText > 0) return fromText;
  const lower = (entry.message || "").toLowerCase();
  if (containsWord(lower, "removed")) return 1;
  return 0;
}

function getLeaveIncrement(entry) {
  if (!entry) return 0;
  if (entry.system_subtype && SYSTEM_LEAVE_SUBTYPES.has(entry.system_subtype)) {
    return getSystemParticipantCount(entry) || 1;
  }
  const lower = (entry.message || "").toLowerCase();
  if (containsWord(lower, "left")) return 1;
  return 0;
}

export function computeAnalytics(entries = []) {
  entries = dedupeEntries(entries);
  const messages = entries.filter(entry => entry.type === "message");
  const systems = entries.filter(entry => entry.type === "system");

  const timestamps = entries
    .map(entry => getTimestamp(entry))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const messageTimestamps = messages
    .map(entry => getTimestamp(entry))
    .filter(Boolean)
    .sort((a, b) => a - b);

  let mediaCount = 0;
  let joinEvents = 0;
  let addedEvents = 0;
  let leftEvents = 0;
  let removedEvents = 0;
  let changedEvents = 0;
  let linkCount = 0;
  let deletedMessageCount = 0;
  let linkCountPrev = 0;
  let systemJoinRequests = 0;
  let classifiedSystemEntries = 0;
  let pollCount = 0;
  let forwardCount = 0;
  let replyCount = 0;

  const sentimentTotals = { positive: 0, neutral: 0, negative: 0, score: 0 };
  const dailyStatsMap = new Map();
  const weekdaySentiments = Array.from({ length: 7 }, () => ({
    positive: 0,
    neutral: 0,
    negative: 0,
    score: 0,
  }));

  const senderStats = new Map();
  const pollEntries = [];
  const pollSenderCounts = new Map();
  const ackCounts = new Map();
  const forwardSenderCounts = new Map();
  const replySenderCounts = new Map();
  const replyEntries = [];
  const messageById = new Map();
  messages.forEach(entry => {
    const trimmedMessage = (entry.message || "").trim();
    const lowerMessage = trimmedMessage.toLowerCase();
    const sentimentScore = scoreSentiment(entry.message);
    const sentimentLabel = sentimentScore > 0 ? "positive" : sentimentScore < 0 ? "negative" : "neutral";
    const fromMe = getBooleanFlag(entry, ["from_me", "fromMe"]);
    const ackValue = getAckValue(entry);
    if (Number.isFinite(ackValue)) {
      ackCounts.set(ackValue, (ackCounts.get(ackValue) || 0) + 1);
    }
    const forwardingScore = getForwardingScore(entry);
    const forwardedFlag = getBooleanFlag(entry, ["is_forwarded", "isForwarded", "forwarded"]);
    const isForwarded =
      (Number.isFinite(forwardingScore) && forwardingScore > 0) ||
      (forwardingScore === null && forwardedFlag);
    if (isForwarded) {
      forwardCount += 1;
      const forwardSender = entry.sender || (fromMe ? "You" : "Unknown");
      forwardSenderCounts.set(forwardSender, (forwardSenderCounts.get(forwardSender) || 0) + 1);
    }
    const messageId = getMessageId(entry);
    if (messageId) {
      messageById.set(messageId, {
        sender: entry.sender || (fromMe ? "You" : "Unknown"),
        message: entry.message,
        timestamp: entry.timestamp || null,
      });
    }
    const quotedId = getQuotedMessageId(entry);
    if (quotedId) {
      replyCount += 1;
      const replySender = entry.sender || (fromMe ? "You" : "Unknown");
      replySenderCounts.set(replySender, (replySenderCounts.get(replySender) || 0) + 1);
      const target = messageById.get(quotedId);
      replyEntries.push({
        sender: replySender,
        target_sender: target?.sender || "Unknown",
        snippet: buildSnippet(trimmedMessage || entry.message || ""),
        target_snippet: buildSnippet(target?.message || ""),
        timestamp: entry.timestamp || null,
        timestamp_text: entry.timestamp_text || "",
      });
    }

    sentimentTotals[sentimentLabel] += 1;
    sentimentTotals.score += sentimentScore;

    let stats = null;
    if (entry.sender) {
      stats = senderStats.get(entry.sender);
      if (!stats) {
        stats = {
          count: 0,
          chars: 0,
          words: 0,
          hourly: Array.from({ length: 24 }, () => 0),
          weekday: Array.from({ length: 7 }, () => 0),
          first: null,
          last: null,
          sentiment: {
            positive: 0,
            neutral: 0,
            negative: 0,
            score: 0,
          },
        };
        senderStats.set(entry.sender, stats);
      }
      stats.count += 1;
      stats.chars += entry.message.length;
      if (trimmedMessage) {
        stats.words += trimmedMessage.split(/\s+/).length;
      }
      stats.sentiment[sentimentLabel] += 1;
      stats.sentiment.score += sentimentScore;
    }

    const ts = getTimestamp(entry);
    if (ts) {
      if (stats) {
        const hour = ts.getHours();
        const dayIndex = ts.getDay();
        stats.hourly[hour] += 1;
        stats.weekday[dayIndex] += 1;
        if (!stats.first || ts < stats.first) stats.first = ts;
        if (!stats.last || ts > stats.last) stats.last = ts;
      }

      const dayKey = toISODate(ts);
      let dayStats = dailyStatsMap.get(dayKey);
      if (!dayStats) {
        dayStats = { count: 0, positive: 0, neutral: 0, negative: 0, score: 0 };
        dailyStatsMap.set(dayKey, dayStats);
      }
      dayStats.count += 1;
      dayStats[sentimentLabel] += 1;
      dayStats.score += sentimentScore;

      const weekdayBucket = weekdaySentiments[ts.getDay()];
      weekdayBucket[sentimentLabel] += 1;
      weekdayBucket.score += sentimentScore;
    }
  });

  function deriveTopHour(hourlyCounts) {
    let top = null;
    hourlyCounts.forEach((count, hour) => {
      if (count <= 0) return;
      if (!top || count > top.count || (count === top.count && hour < top.hour)) {
        top = { hour, count };
      }
    });
    return top;
  }

  function deriveTopWeekday(weekdayCounts) {
    let top = null;
    weekdayCounts.forEach((count, dayIndex) => {
      if (count <= 0) return;
      if (!top || count > top.count || (count === top.count && dayIndex < top.dayIndex)) {
        top = { dayIndex, count };
      }
    });
    return top;
  }

  const topSenders = Array.from(senderStats.entries())
    .sort((a, b) => {
      if (b[1].count === a[1].count) return a[0].localeCompare(b[0]);
      return b[1].count - a[1].count;
    })
    .map(([sender, stats]) => {
      const share = messages.length ? stats.count / messages.length : 0;
      const avgChars = stats.count ? stats.chars / stats.count : 0;
      const avgWords = stats.count ? stats.words / stats.count : 0;
      const sentimentAverage = stats.count ? stats.sentiment.score / stats.count : 0;
      return {
        sender,
        count: stats.count,
        share,
        avg_chars: avgChars,
        avg_words: avgWords,
        first_message: stats.first ? toISODate(stats.first) : null,
        last_message: stats.last ? toISODate(stats.last) : null,
        top_hour: deriveTopHour(stats.hourly),
        top_weekday: deriveTopWeekday(stats.weekday),
        sentiment: {
          positive: stats.sentiment.positive,
          neutral: stats.sentiment.neutral,
          negative: stats.sentiment.negative,
          score: stats.sentiment.score,
          average: sentimentAverage,
        },
      };
    });

  const dailyCounts = [];
  if (messageTimestamps.length) {
    const cursor = new Date(messageTimestamps[0]);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(messageTimestamps[messageTimestamps.length - 1]);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const key = toISODate(cursor);
      const stats = dailyStatsMap.get(key);
      dailyCounts.push({
        date: key,
        count: stats ? stats.count : 0,
        positive: stats ? stats.positive : 0,
        neutral: stats ? stats.neutral : 0,
        negative: stats ? stats.negative : 0,
        score: stats ? stats.score : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const dailyPeriodCount = dailyCounts.length || 1;
  let prevStartDateObj = null;
  let prevEndDateObj = null;
  if (dailyCounts.length) {
    const selectionStart = new Date(dailyCounts[0].date);
    const prevEnd = new Date(selectionStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (dailyPeriodCount - 1));
    prevStartDateObj = prevStart;
    prevEndDateObj = prevEnd;
  }

  const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const hourlyCountsPrev = Array.from({ length: 24 }, () => 0);
  const hourlyMatrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const hourlyTopSenders = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => new Map()));
  const weekdayCounts = Array.from({ length: 7 }, (_, index) => ({
    dayIndex: index,
    label: WEEKDAY_SHORT[index],
    count: 0,
  }));
  const weekdaySenderMap = Array.from({ length: 7 }, () => new Map());
  const weekdayWeekHourMap = Array.from({ length: 7 }, () => new Map());
  const hourlyByDate = new Map();

  const weeklyMap = new Map();

  messages.forEach(entry => {
    const sentimentScore = scoreSentiment(entry.message);
    const sentimentLabel = sentimentScore > 0 ? "positive" : sentimentScore < 0 ? "negative" : "neutral";
    const ts = getTimestamp(entry);
    if (!ts) return;
    const day = ts.getDay();
    const hour = ts.getHours();
    const weekKey = getISOWeekKey(ts);

    hourlyCounts[hour].count += 1;
    const inPreviousWindow =
      prevStartDateObj && prevEndDateObj && ts >= prevStartDateObj && ts <= prevEndDateObj;

    if (inPreviousWindow) {
      hourlyCountsPrev[hour] += 1;
    }

    hourlyMatrix[day][hour] += 1;
    weekdayCounts[day].count += 1;

    if (entry.sender) {
      const senderMap = hourlyTopSenders[day][hour];
      senderMap.set(entry.sender, (senderMap.get(entry.sender) || 0) + 1);
      const daySenderMap = weekdaySenderMap[day];
      daySenderMap.set(entry.sender, (daySenderMap.get(entry.sender) || 0) + 1);
    }

    const dayWeekMap = weekdayWeekHourMap[day];
    dayWeekMap.set(weekKey, (dayWeekMap.get(weekKey) || 0) + 1);

    const dateKey = toISODate(ts);
    let hoursForDate = hourlyByDate.get(dateKey);
    if (!hoursForDate) {
      hoursForDate = Array(24).fill(0);
      hourlyByDate.set(dateKey, hoursForDate);
    }
    hoursForDate[hour] += 1;

    const trimmedMessage = (entry.message || "").trim();
    const lowerMessage = trimmedMessage.toLowerCase();
    if (lowerMessage === "this message was deleted") {
      deletedMessageCount += 1;
    }

    if (LINK_REGEX.test(trimmedMessage)) {
      linkCount += 1;
      if (inPreviousWindow) linkCountPrev += 1;
    }
    if (isMediaMessage(trimmedMessage)) {
      mediaCount += 1;
    }

    const hasPoll =
      Boolean(entry.has_poll) ||
      Boolean(entry.poll_title) ||
      (Array.isArray(entry.poll_options) && entry.poll_options.length > 0) ||
      POLL_PREFIX_REGEX.test(trimmedMessage);
    if (hasPoll) {
      pollCount += 1;
      const pollOptions = Array.isArray(entry.poll_options)
        ? entry.poll_options
            .map(option => {
              if (option == null) return null;
              if (typeof option === "string") return option.trim();
              if (typeof option === "object") {
                const text = option.name || option.title || option.label || option.localizedText;
                return text ? String(text).trim() : null;
              }
              return String(option).trim();
            })
            .filter(Boolean)
        : [];
      pollEntries.push({
        sender: entry.sender || "Unknown",
        title: entry.poll_title || trimmedMessage.split("\n")[0] || "Poll",
        options: pollOptions,
        timestamp: entry.timestamp || null,
        timestamp_text: entry.timestamp_text || "",
      });
      const pollSender = entry.sender || "Unknown";
      pollSenderCounts.set(pollSender, (pollSenderCounts.get(pollSender) || 0) + 1);
    }

    let weekInfo = weeklyMap.get(weekKey);
    if (!weekInfo) {
      const range = isoWeekDateRange(weekKey);
      weekInfo = {
        count: 0,
        startDate: range.startDate,
        endDate: range.endDate,
        startMs: range.startDateObj ? range.startDateObj.getTime() : 0,
        sentiment: {
          positive: 0,
          neutral: 0,
          negative: 0,
          score: 0,
        },
      };
      weeklyMap.set(weekKey, weekInfo);
    } else if (!weekInfo.sentiment) {
      weekInfo.sentiment = { positive: 0, neutral: 0, negative: 0, score: 0 };
    }
    weekInfo.count += 1;
    weekInfo.sentiment[sentimentLabel] += 1;
    weekInfo.sentiment.score += sentimentScore;
  });

  systems.forEach(entry => {
    const lowerMessage = (entry.message || "").toLowerCase();
    const participantCount = getSystemParticipantCount(entry) || 1;
    let classified = false;

    if (isJoinSystemEntry(entry)) {
      joinEvents += participantCount;
      classified = true;
    } else if (containsWord(lowerMessage, "joined")) {
      joinEvents += 1;
      classified = true;
    }

    const additions = getAdditionIncrement(entry);
    if (additions > 0) {
      addedEvents += additions;
      classified = true;
    }

    const leaves = getLeaveIncrement(entry);
    if (leaves > 0) {
      leftEvents += leaves;
      classified = true;
    }

    const removals = getRemovalIncrement(entry);
    if (removals > 0) {
      removedEvents += removals;
      classified = true;
    }

    if (isChangeSystemEntry(entry)) {
      changedEvents += 1;
      classified = true;
    } else if (containsWord(lowerMessage, "changed")) {
      changedEvents += 1;
      classified = true;
    }

    if (isJoinRequestEntry(entry)) {
      systemJoinRequests += participantCount;
      classified = true;
    } else if (SYSTEM_PATTERNS[3].test(lowerMessage)) {
      systemJoinRequests += 1;
      classified = true;
    }

    if (classified) {
      classifiedSystemEntries += 1;
    }
  });

  const weeklyCounts = Array.from(weeklyMap.entries())
    .map(([week, info]) => ({
      week,
      count: info.count,
      startDate: info.startDate,
      endDate: info.endDate,
      startMs: info.startMs,
      positive: info.sentiment?.positive ?? 0,
      neutral: info.sentiment?.neutral ?? 0,
      negative: info.sentiment?.negative ?? 0,
      score: info.sentiment?.score ?? 0,
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const totalMessages = messages.length;
  const hourlyValues = hourlyCounts.map(item => item.count);
  const hourlyMean = hourlyValues.reduce((sum, val) => sum + val, 0) / hourlyValues.length;
  const hourlyVariance = hourlyValues.reduce((sum, val) => sum + Math.pow(val - hourlyMean, 2), 0) / hourlyValues.length;
  const hourlyStd = Math.sqrt(hourlyVariance);
  const anomalyThreshold = hourlyMean + 2 * hourlyStd;

  const perHourComparison = hourlyCounts.map((entry, hour) => {
    const previous = hourlyCountsPrev[hour] || 0;
    const diff = entry.count - previous;
    return {
      hour,
      current: entry.count,
      previous,
      diff,
      diffPercent: previous ? diff / previous : null,
    };
  });

  const currentTotal = perHourComparison.reduce((sum, item) => sum + item.current, 0);
  const previousTotal = perHourComparison.reduce((sum, item) => sum + item.previous, 0);
  const diffTotal = currentTotal - previousTotal;
  const diffPercent = previousTotal ? diffTotal / previousTotal : null;

  const comparisonSummary = {
    currentTotal,
    previousTotal,
    diffTotal,
    diffPercent,
    perHour: perHourComparison,
  };

  let cumulative = 0;
  let maxCumulative = 0;
  weeklyCounts.forEach((entry, idx) => {
    cumulative += entry.count;
    entry.cumulative = cumulative;
    if (cumulative > maxCumulative) maxCumulative = cumulative;
    const prev = idx > 0 ? weeklyCounts[idx - 1].count : null;
    entry.delta = prev !== null ? entry.count - prev : null;
    entry.deltaPercent = prev && prev !== 0 ? entry.delta / prev : null;
    const windowStart = Math.max(0, idx - 2);
    const window = weeklyCounts.slice(windowStart, idx + 1);
    entry.rolling = window.reduce((sum, item) => sum + item.count, 0) / window.length;
  });

  let maxHeatmapCount = 0;
  let topHourCell = null;
  hourlyMatrix.forEach((hours, dayIndex) => {
    hours.forEach((count, hour) => {
      if (count > maxHeatmapCount) maxHeatmapCount = count;
      if (!topHourCell || count > topHourCell.count) topHourCell = { dayIndex, hour, count };
    });
  });

  const hourlyDetails = hourlyMatrix.map((row, dayIdx) =>
    row.map((count, hour) => {
      const topSenders = Array.from(hourlyTopSenders[dayIdx][hour].entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sender, senderCount]) => ({
          sender,
          count: senderCount,
          percent: count ? senderCount / count : 0,
        }));
      return {
        count,
        share: totalMessages ? count / totalMessages : 0,
        topSenders,
      };
    }),
  );

  const weekdayValues = weekdayCounts.map(item => item.count);
  const weekdayMean = weekdayValues.length
    ? weekdayValues.reduce((sum, value) => sum + value, 0) / weekdayValues.length
    : 0;
  const weekdayVariance = weekdayValues.length
    ? weekdayValues.reduce((sum, value) => sum + Math.pow(value - weekdayMean, 2), 0) / weekdayValues.length
    : 0;
  const weekdayStd = Math.sqrt(weekdayVariance);

  const weekdayDetails = weekdayCounts.map((entry, dayIndex) => {
    const daySenderMap = weekdaySenderMap[dayIndex];
    const topSenders = Array.from(daySenderMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sender, senderCount]) => ({
        sender,
        count: senderCount,
        share: entry.count ? senderCount / entry.count : 0,
      }));

    const hourlyBreakdown = hourlyMatrix[dayIndex].slice();
    const amCount = hourlyBreakdown.slice(0, 12).reduce((sum, value) => sum + value, 0);
    const pmCount = hourlyBreakdown.slice(12).reduce((sum, value) => sum + value, 0);

    const deviation = weekdayStd ? (entry.count - weekdayMean) / weekdayStd : 0;
    const deltaPercent = weekdayMean ? (entry.count - weekdayMean) / weekdayMean : 0;
    const sentiments = weekdaySentiments[dayIndex];
    const sentimentAverage = entry.count ? sentiments.score / entry.count : 0;

    return {
      ...entry,
      share: totalMessages ? entry.count / totalMessages : 0,
      deviation,
      deltaPercent,
      topSenders,
      hourly: hourlyBreakdown,
      periods: [
        { label: "AM", count: amCount },
        { label: "PM", count: pmCount },
      ],
      sentiment: {
        positive: sentiments.positive,
        neutral: sentiments.neutral,
        negative: sentiments.negative,
        score: sentiments.score,
        average: sentimentAverage,
      },
    };
  });

  const totalChars = messages.reduce((sum, entry) => sum + entry.message.length, 0);
  const totalWords = messages.reduce((sum, entry) => {
    const trimmed = entry.message.trim();
    if (!trimmed) return sum;
    return sum + trimmed.split(/\s+/).length;
  }, 0);

  const otherSystemEvents = Math.max(0, systems.length - classifiedSystemEntries);

  const avgChars = messages.length ? totalChars / messages.length : 0;
  const avgWords = messages.length ? totalWords / messages.length : 0;

  const weeklySummary = {
    cumulativeTotal: weeklyCounts.length ? weeklyCounts[weeklyCounts.length - 1].cumulative : 0,
    latestRolling: weeklyCounts.length ? weeklyCounts[weeklyCounts.length - 1].rolling : 0,
    latestDelta: weeklyCounts.length ? weeklyCounts[weeklyCounts.length - 1].delta : null,
    latestDeltaPercent: weeklyCounts.length ? weeklyCounts[weeklyCounts.length - 1].deltaPercent : null,
    weekCount: weeklyCounts.length,
    averagePerWeek: weeklyCounts.length
      ? weeklyCounts.reduce((sum, item) => sum + item.count, 0) / weeklyCounts.length
      : 0,
  };

  weeklyCounts.forEach(entry => {
    delete entry.startMs;
  });

  const deliveryCounts = {};
  let ackSampleTotal = 0;
  ackCounts.forEach((count, state) => {
    const key = String(state);
    deliveryCounts[key] = count;
    ackSampleTotal += count;
  });
  ACK_STATE_ORDER.forEach(state => {
    const key = String(state);
    if (deliveryCounts[key] === undefined) {
      deliveryCounts[key] = 0;
    }
  });
  const seenCount = (deliveryCounts["3"] || 0) + (deliveryCounts["4"] || 0);
  const deliveredCount = seenCount + (deliveryCounts["2"] || 0);
  const deliveryAnalytics = {
    total: ackSampleTotal,
    counts: deliveryCounts,
    seen_rate: ackSampleTotal ? seenCount / ackSampleTotal : 0,
    delivered_rate: ackSampleTotal ? deliveredCount / ackSampleTotal : 0,
  };

  const forwardTopSenders = Array.from(forwardSenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const forwardAnalytics = {
    total: forwardCount,
    share: totalMessages ? forwardCount / totalMessages : 0,
    top_senders: forwardTopSenders,
  };

  const replyTopSenders = Array.from(replySenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const replyDetails = replyEntries.slice(-15).reverse();
  const replyAnalytics = {
    total: replyCount,
    share: totalMessages ? replyCount / totalMessages : 0,
    top_senders: replyTopSenders,
    entries: replyDetails,
  };

  const messageTypeSummary = [
    {
      key: "links",
      label: "Links",
      count: linkCount,
      share: totalMessages ? linkCount / totalMessages : 0,
    },
    {
      key: "polls",
      label: "Polls",
      count: pollCount,
      share: totalMessages ? pollCount / totalMessages : 0,
    },
  ];

  if (deletedMessageCount > 0) {
    messageTypeSummary.push({
      key: "deleted",
      label: "Deleted messages",
      count: deletedMessageCount,
      share: totalMessages ? deletedMessageCount / totalMessages : 0,
    });
  }

  if (mediaCount > 0) {
    messageTypeSummary.push({
      key: "media_total",
      label: "Media messages",
      count: mediaCount,
      share: totalMessages ? mediaCount / totalMessages : 0,
    });
  }

  const mediaCategories = [];

  const pollDetails = pollEntries
    .map(entry => ({
      sender: entry.sender || "Unknown",
      title: entry.title || "Poll",
      options: Array.isArray(entry.options) ? entry.options.slice(0, 10) : [],
      timestamp: entry.timestamp || null,
      timestamp_text: entry.timestamp_text || "",
    }))
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  const pollTopCreators = Array.from(pollSenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const pollAnalytics = {
    total: pollCount,
    unique_creators: pollSenderCounts.size,
    entries: pollDetails.slice(0, 25),
    top_creators: pollTopCreators,
  };

  const messageTypes = {
    summary: messageTypeSummary.filter(entry => entry.count > 0),
    media: {
      total: mediaCount,
      share: totalMessages ? mediaCount / totalMessages : 0,
      categories: mediaCategories,
    },
  };

  const sentimentOverview = {
    totals: {
      positive: sentimentTotals.positive,
      neutral: sentimentTotals.neutral,
      negative: sentimentTotals.negative,
    },
    average: totalMessages ? sentimentTotals.score / totalMessages : 0,
    daily: dailyCounts.map(item => ({
      date: item.date,
      count: item.count,
      positive: item.positive,
      neutral: item.neutral,
      negative: item.negative,
      average: item.count ? item.score / item.count : 0,
      score: item.score,
    })),
    weekly: weeklyCounts.map(entry => ({
      week: entry.week,
      startDate: entry.startDate,
      endDate: entry.endDate,
      count: entry.count,
      positive: entry.positive,
      neutral: entry.neutral,
      negative: entry.negative,
      average: entry.count ? entry.score / entry.count : 0,
      score: entry.score,
    })),
    participants: topSenders.map(item => ({
      sender: item.sender,
      count: item.count,
      positive: item.sentiment.positive,
      neutral: item.sentiment.neutral,
      negative: item.sentiment.negative,
      average: item.sentiment.average,
      score: item.sentiment.score,
    })),
    weekdays: weekdayDetails.map(item => ({
      dayIndex: item.dayIndex,
      label: item.label,
      count: item.count,
      positive: item.sentiment.positive,
      neutral: item.sentiment.neutral,
      negative: item.sentiment.negative,
      average: item.sentiment.average,
      score: item.sentiment.score,
    })),
  };

  return {
    total_entries: entries.length,
    total_messages: messages.length,
    total_system: systems.length,
    unique_senders: senderStats.size,
    date_range: {
      start: timestamps.length ? toISODate(timestamps[0]) : null,
      end: timestamps.length ? toISODate(timestamps[timestamps.length - 1]) : null,
    },
    top_senders: topSenders,
    daily_counts: dailyCounts,
    hourly_distribution: hourlyCounts,
    hourly_distribution_prev: hourlyCountsPrev,
    hourly_heatmap: hourlyMatrix,
    hourly_details: hourlyDetails,
    weekly_counts: weeklyCounts,
    weekly_summary: weeklySummary,
    weekday_distribution: weekdayDetails,
    weekday_stats: {
      mean: weekdayMean,
      std: weekdayStd,
    },
    hourly_summary: {
      topHour: topHourCell && topHourCell.count > 0 ? topHourCell : null,
      averagePerDay: messages.length && dailyCounts.length ? messages.length / dailyCounts.length : 0,
      maxCount: maxHeatmapCount,
      totalMessages,
      comparison: comparisonSummary,
      stats: {
        mean: hourlyMean,
        std: hourlyStd,
        threshold: anomalyThreshold,
      },
    },
    system_summary: {
      count: systems.length,
      share: entries.length ? systems.length / entries.length : 0,
      joins: joinEvents,
      added: addedEvents,
      left: leftEvents,
      removed: removedEvents,
      changed: changedEvents,
      other: otherSystemEvents,
      join_requests: systemJoinRequests,
    },
    averages: {
      characters: avgChars,
      words: avgWords,
    },
    message_types: messageTypes,
    polls: pollAnalytics,
    delivery: deliveryAnalytics,
    forwards: forwardAnalytics,
    replies: replyAnalytics,
    sentiment: sentimentOverview,
    highlights: buildHighlights({
      dailyCounts,
      weeklyCounts,
      weekdayDetails,
      topSenders,
      linkCount,
      linkCountPrev,
      totalMessages,
      sentimentOverview,
      hourlySeries: Array.from(hourlyByDate.entries())
        .map(([date, hours]) => ({
          date,
          hours: Array.from({ length: 24 }, (_, hour) => Number(hours?.[hour]) || 0),
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    }),
    media_count: mediaCount,
    link_count: linkCount,
    poll_count: pollCount,
    deleted_message_count: deletedMessageCount,
    join_events: joinEvents,
    added_events: addedEvents,
    left_events: leftEvents,
    removed_events: removedEvents,
    changed_events: changedEvents,
    other_system_events: otherSystemEvents,
  };
}

function getISOWeekKey(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function buildHighlights({ dailyCounts, weeklyCounts, weekdayDetails, topSenders, hourlySeries }) {
  const highlights = [];

  const contributorHighlight = buildTopContributorsHighlight(weeklyCounts, topSenders);
  if (contributorHighlight) highlights.push(contributorHighlight);

  const busiestDayHighlight = buildMostActiveDayHighlight(dailyCounts);
  if (busiestDayHighlight) highlights.push(busiestDayHighlight);

  const busiestWeekdayHighlight = buildBusiestWeekdayHighlight(weekdayDetails);
  if (busiestWeekdayHighlight) highlights.push(busiestWeekdayHighlight);

  const engagementToday = buildEngagementForecastHighlight(dailyCounts, {
    offsetDays: 0,
    label: "Activity outlook",
  });
  if (engagementToday) highlights.push(engagementToday);

  const engagementTomorrow = buildEngagementForecastHighlight(dailyCounts, {
    offsetDays: 1,
    label: "Activity outlook (day after session)",
  });
  if (engagementTomorrow) highlights.push(engagementTomorrow);

  const nextWeekdayHighlight = buildNextBusiestWeekdayHighlight(dailyCounts);
  if (nextWeekdayHighlight) highlights.push(nextWeekdayHighlight);

  return highlights.slice(0, 6);
}

function buildTopContributorsHighlight(weeklyCounts, topSenders) {
  const recentWeeks = Array.isArray(weeklyCounts) ? weeklyCounts.slice(-3) : [];
  const aggregated = new Map();

  recentWeeks.forEach(week => {
    week.topSenders?.forEach(sender => {
      const prev = aggregated.get(sender.sender) || 0;
      aggregated.set(sender.sender, prev + sender.count);
    });
  });

  if (!aggregated.size && Array.isArray(weeklyCounts) && weeklyCounts.length) {
    weeklyCounts[weeklyCounts.length - 1].topSenders?.forEach(sender => {
      aggregated.set(sender.sender, sender.count);
    });
  }

  let topWeekSenders = Array.from(aggregated.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (!topWeekSenders.length && Array.isArray(topSenders) && topSenders.length) {
    topWeekSenders = topSenders.slice(0, 3).map(item => [item.sender, item.count]);
  }

  if (!topWeekSenders.length) return null;

  const contributorItems = topWeekSenders.map(([sender, count], index) => ({
    label: `${index + 1}. ${sender}`,
    value: formatHighlightCount(count, "message"),
  }));

  return {
    type: "contributors",
    label: "Recent top senders",
    value: `${formatHighlightCount(
      topWeekSenders.reduce((sum, [, count]) => sum + count, 0),
      "message",
    )} across top 3`,
    items: contributorItems,
  };
}

function buildMostActiveDayHighlight(dailyCounts) {
  if (!Array.isArray(dailyCounts) || !dailyCounts.length) return null;
  const busiestDay = dailyCounts.reduce((prev, current) => (current.count > prev.count ? current : prev), dailyCounts[0]);
  if (!busiestDay || busiestDay.count <= 0) return null;

  return {
    type: "activity",
    label: "Busiest day",
    value: formatHighlightCount(busiestDay.count, "message"),
    descriptor: formatHighlightDate(busiestDay.date),
  };
}

function buildBusiestWeekdayHighlight(weekdayDetails) {
  if (!Array.isArray(weekdayDetails) || !weekdayDetails.length) return null;
  const totalFiltered = weekdayDetails.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  if (totalFiltered <= 0) return null;

  const topWeekday = weekdayDetails.reduce((prev, current) => (current.count > prev.count ? current : prev), weekdayDetails[0]);
  if (!topWeekday || topWeekday.count <= 0) return null;

  return {
    type: "weekday",
    label: "Busiest weekday",
    value: topWeekday.label,
    descriptor: `${formatHighlightCount(topWeekday.count, "message")} (${formatHighlightPercent(
      topWeekday.count / totalFiltered,
    )})`,
  };
}

function formatHighlightCount(count, noun) {
  const formatted = count.toLocaleString();
  if (!noun) return formatted;
  const plural = count === 1 ? noun : `${noun}s`;
  return `${formatted} ${plural}`;
}

function formatHighlightPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(Number.isFinite(digits) ? digits : 1)}%`;
}

function formatHighlightDate(date) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

function buildNextBusiestWeekdayHighlight(dailyCounts) {
  if (!Array.isArray(dailyCounts) || dailyCounts.length < 5) return null;

  const sorted = [...dailyCounts]
    .filter(entry => Number.isFinite(Number(entry?.count)) && entry?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!sorted.length) return null;

  const windowSize = Math.min(sorted.length, 21);
  const recent = sorted.slice(-windowSize);
  const totals = Array(7).fill(0);
  const occurrences = Array(7).fill(0);

  recent.forEach(entry => {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) return;
    const index = date.getDay();
    totals[index] += Number(entry.count) || 0;
    occurrences[index] += 1;
  });

  let bestIndex = null;
  let bestAverage = -Infinity;

  for (let day = 0; day < 7; day += 1) {
    if (!occurrences[day]) continue;
    const average = totals[day] / occurrences[day];
    if (average > bestAverage) {
      bestAverage = average;
      bestIndex = day;
    }
  }

  if (bestIndex === null || bestAverage <= 0) return null;

  const totalRecent = recent.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
  const share = totalRecent ? totals[bestIndex] / totalRecent : 0;

  const sessionEnd = new Date(sorted[sorted.length - 1].date);
  if (Number.isNaN(sessionEnd.getTime())) return null;

  const nextDate = new Date(sessionEnd.getTime());
  do {
    nextDate.setDate(nextDate.getDate() + 1);
  } while (nextDate.getDay() !== bestIndex);

  const nextDateLabel = formatHighlightDate(nextDate.toISOString());
  const windowLabel = recent.length === 1 ? "last day" : `last ${recent.length} days`;
  const weekdayName = WEEKDAY_LONG[bestIndex] ?? `Day ${bestIndex + 1}`;

  return {
    type: "weekday-forecast",
    label: "Next Busy Weekday",
    value: `${weekdayName} · ≈ ${formatHighlightCount(Math.round(bestAverage), "message")}/day`,
    descriptor: `${windowLabel} · About ${formatHighlightPercent(share, 1)} of recent messages · Next ${weekdayName} falls on ${nextDateLabel}.`,
  };
}

function buildEngagementForecastHighlight(dailyCounts, { offsetDays = 0, label = "Activity outlook" } = {}) {
  if (!Array.isArray(dailyCounts) || dailyCounts.length < 5) return null;
  const sorted = [...dailyCounts]
    .filter(entry => Number.isFinite(entry?.count))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 5) return null;

  const values = sorted.map(entry => Number(entry.count) || 0);
  const alpha = 0.35;
  let smoothed = values[0];
  for (let i = 1; i < values.length; i += 1) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }
  const forecast = smoothed;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  const diff = forecast - avg;
  const threshold = (std || 1) * 0.6;
  let classification;
  if (diff > threshold) classification = "More than usual";
  else if (diff < -threshold) classification = "Quieter than usual";
  else classification = "About the same";
  const trendSymbol = diff > threshold ? "↑" : diff < -threshold ? "↓" : "→";

  const forecastDate = new Date();
  if (Number.isFinite(offsetDays)) {
    forecastDate.setDate(forecastDate.getDate() + offsetDays);
  }

  return {
    type: "engagement",
    label,
    value: `${trendSymbol} ${classification}`,
    descriptor: `${formatHighlightDate(forecastDate.toISOString())} · Expect about ${formatHighlightCount(
      Math.round(forecast),
      "message",
    )} (typical is ${formatHighlightCount(Math.round(avg), "message")})`,
  };
}

function hourlyDistributionFromDaily(dailyCounts) {
  return Array.isArray(dailyCounts) ? dailyCounts.map(entry => entry.count || 0) : [];
}

function computeHourSpikeHighlights(hourlyDistribution) {
  if (!Array.isArray(hourlyDistribution) || hourlyDistribution.length < 24) return [];

  // Create normalized per-hour averages for each hour position across days.
  const hourBuckets = Array.from({ length: 24 }, () => []);
  hourlyDistribution.forEach((count, index) => {
    const hour = index % 24;
    hourBuckets[hour].push(Number(count) || 0);
  });

  const hourStats = hourBuckets.map((bucket, hour) => {
    if (!bucket.length) {
      return { hour, mean: 0, std: 0, latest: 0 };
    }
    const mean = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    const variance = bucket.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / bucket.length;
    const std = Math.sqrt(variance);
    return { hour, mean, std, latest: bucket[bucket.length - 1] };
  });

  const spikes = hourStats
    .map(stat => {
      const deviation = stat.std ? (stat.latest - stat.mean) / stat.std : 0;
      return {
        hour: stat.hour,
        count: stat.latest,
        share: stat.mean ? stat.latest / (stat.mean * 24) : 0,
        deviation,
      };
    })
    .filter(item => item.deviation > 2)
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 3)
    .map(item => ({
      label: `${String(item.hour).padStart(2, "0")}:00`,
      count: Math.round(item.count),
      share: item.share,
    }));

  return spikes;
}
