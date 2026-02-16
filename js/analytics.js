import { toISODate } from "./utils.js";
import { buildHighlights } from "./analytics/highlights.js";
import {
  analyzeSystemEvents,
} from "./analytics/systemEvents.js";
import {
  createMessageTypeAccumulator,
} from "./analytics/messageTypesData.js";
import { computeTimeSeriesAnalytics } from "./analytics/timeSeries.js";
import { computeMessageCore } from "./analytics/messageCore.js";
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

function buildMessageSnapshot(entry, extras = {}) {
  return {
    type: "message",
    sender: entry.sender || (getBooleanFlag(entry, ["from_me", "fromMe"]) ? "You" : "Unknown"),
    sender_id: entry.sender_id || entry.sender || null,
    message: entry.message || "",
    timestamp: entry.timestamp || null,
    timestamp_text: entry.timestamp_text || "",
    ...extras,
  };
}

function buildSystemSnapshot(entry, extras = {}) {
  return {
    type: "system",
    sender: entry.sender || "System",
    message: entry.message || "",
    timestamp: entry.timestamp || null,
    timestamp_text: entry.timestamp_text || "",
    system_subtype: entry.system_subtype || null,
    ...extras,
  };
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
  const firstTimestamp = messageTimestamps.length ? new Date(messageTimestamps[0]).toISOString() : null;
  const lastTimestamp = messageTimestamps.length
    ? new Date(messageTimestamps[messageTimestamps.length - 1]).toISOString()
    : null;

  const messageTypeAccumulator = createMessageTypeAccumulator();
  const {
    uniqueSenders,
    forwardCount,
    replyCount,
    sentimentTotals,
    dailyStatsMap,
    weekdaySentiments,
    ackCounts,
    forwardSenderCounts,
    replySenderCounts,
    replyEntries,
    topSenders,
  } = computeMessageCore({
    messages,
    scoreSentiment,
    getBooleanFlag,
    getAckValue,
    getForwardingScore,
    getMessageId,
    getQuotedMessageId,
    buildSnippet,
    getTimestamp,
  });

  const {
    dailyCounts,
    hourlyCounts,
    hourlyCountsPrev,
    hourlyMatrix,
    hourlyDetails,
    weeklyCounts,
    weeklySummary,
    weekdayDetails,
    weekdayStats,
    recentTopSenders,
    comparisonSummary,
    hourlyStats,
  } = computeTimeSeriesAnalytics({
    messages,
    dailyStatsMap,
    weekdaySentiments,
    messageTypeAccumulator,
    buildMessageSnapshot,
    getTimestamp,
    scoreSentiment,
    getISOWeekKey,
  });

  const {
    joinEvents,
    addedEvents,
    leftEvents,
    removedEvents,
    changedEvents,
    systemJoinRequests,
    systemSnapshots,
  } = analyzeSystemEvents(systems, { buildSystemSnapshot });

  const totalMessages = messages.length;

  const totalChars = messages.reduce((sum, entry) => sum + entry.message.length, 0);
  const totalWords = messages.reduce((sum, entry) => {
    const trimmed = entry.message.trim();
    if (!trimmed) return sum;
    return sum + trimmed.split(/\s+/).length;
  }, 0);

  const otherSystemEvents = systemSnapshots.other.length;

  const avgChars = messages.length ? totalChars / messages.length : 0;
  const avgWords = messages.length ? totalWords / messages.length : 0;

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
  const {
    linkCount,
    mediaCount,
    pollCount,
    deletedMessageCount,
    linkSnapshots,
    mediaSnapshots,
    pollEntries,
    pollSenderCounts,
  } = messageTypeAccumulator;

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
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  const pollTopCreators = Array.from(pollSenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const messageTypes = {
    summary: messageTypeSummary.filter(entry => entry.count > 0),
    media: {
      total: mediaCount,
      share: totalMessages ? mediaCount / totalMessages : 0,
      categories: mediaCategories,
      entries: mediaSnapshots,
    },
    links: {
      total: linkCount,
      share: totalMessages ? linkCount / totalMessages : 0,
      entries: linkSnapshots,
    },
    polls: {
      total: pollCount,
      share: totalMessages ? pollCount / totalMessages : 0,
      entries: pollDetails,
    },
  };

  const pollAnalytics = {
    total: pollCount,
    unique_creators: pollSenderCounts.size,
    entries: pollDetails.slice(0, 25),
    top_creators: pollTopCreators,
    messages: pollDetails,
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
    unique_senders: uniqueSenders,
    date_range: {
      start: timestamps.length ? toISODate(timestamps[0]) : null,
      end: timestamps.length ? toISODate(timestamps[timestamps.length - 1]) : null,
    },
    first_timestamp: firstTimestamp,
    last_timestamp: lastTimestamp,
    top_senders: topSenders,
    daily_counts: dailyCounts,
    hourly_distribution: hourlyCounts,
    hourly_distribution_prev: hourlyCountsPrev,
    hourly_heatmap: hourlyMatrix,
    hourly_details: hourlyDetails,
    weekly_counts: weeklyCounts,
    weekly_summary: weeklySummary,
    weekday_distribution: weekdayDetails,
    weekday_stats: weekdayStats,
    hourly_summary: {
      topHour: hourlyStats.topHourCell && hourlyStats.topHourCell.count > 0 ? hourlyStats.topHourCell : null,
      averagePerDay: messages.length && dailyCounts.length ? messages.length / dailyCounts.length : 0,
      maxCount: hourlyStats.maxHeatmapCount,
      totalMessages,
      comparison: comparisonSummary,
      stats: {
        mean: hourlyStats.mean,
        std: hourlyStats.std,
        threshold: hourlyStats.threshold,
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
      details: {
        joins: systemSnapshots.joins,
        added: systemSnapshots.added,
        left: systemSnapshots.left,
        removed: systemSnapshots.removed,
        changed: systemSnapshots.changed,
        join_requests: systemSnapshots.join_requests,
        other: systemSnapshots.other,
      },
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
      weekdayDetails,
      topSenders,
      recentTopSenders,
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
