import { buildHighlights } from "./analytics/highlights.js";
import {
  analyzeSystemEvents,
} from "./analytics/systemEvents.js";
import {
  createMessageTypeAccumulator,
} from "./analytics/messageTypesData.js";
import { computeTimeSeriesAnalytics } from "./analytics/timeSeries.js";
import { computeMessageCore } from "./analytics/messageCore.js";
import {
  buildDeliveryAnalytics,
  buildForwardAnalytics,
  buildReplyAnalytics,
  buildMessageTypes,
  buildPollAnalytics,
  buildSentimentOverview,
  buildAnalyticsPayload,
} from "./analytics/output.js";
import {
  ACK_STATE_ORDER,
  scoreSentiment,
  getTimestamp,
  getMessageId,
  dedupeEntries,
  getQuotedMessageId,
  getAckValue,
  getForwardingScore,
  getBooleanFlag,
  buildSnippet,
  getISOWeekKey,
} from "./analytics/common.js";

export { getTimestamp } from "./analytics/common.js";

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

  const deliveryAnalytics = buildDeliveryAnalytics({
    ackCounts,
    ackStateOrder: ACK_STATE_ORDER,
  });
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

  const forwardAnalytics = buildForwardAnalytics({
    forwardSenderCounts,
    forwardCount,
    totalMessages,
  });

  const replyAnalytics = buildReplyAnalytics({
    replySenderCounts,
    replyCount,
    totalMessages,
    replyEntries,
  });

  const pollDetails = pollEntries
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  const messageTypes = buildMessageTypes({
    linkCount,
    mediaCount,
    pollCount,
    deletedMessageCount,
    linkSnapshots,
    mediaSnapshots,
    pollDetails,
    totalMessages,
  });
  const pollAnalytics = buildPollAnalytics({
    pollCount,
    pollSenderCounts,
    pollDetails,
  });
  const sentimentOverview = buildSentimentOverview({
    sentimentTotals,
    totalMessages,
    dailyCounts,
    weeklyCounts,
    topSenders,
    weekdayDetails,
  });
  const highlights = buildHighlights({
    dailyCounts,
    weekdayDetails,
    topSenders,
    recentTopSenders,
  });

  return buildAnalyticsPayload({
    entries,
    messages,
    systems,
    timestamps,
    firstTimestamp,
    lastTimestamp,
    uniqueSenders,
    topSenders,
    dailyCounts,
    hourlyCounts,
    hourlyCountsPrev,
    hourlyMatrix,
    hourlyDetails,
    weeklyCounts,
    weeklySummary,
    weekdayDetails,
    weekdayStats,
    hourlyStats,
    comparisonSummary,
    joinEvents,
    addedEvents,
    leftEvents,
    removedEvents,
    changedEvents,
    otherSystemEvents,
    systemJoinRequests,
    systemSnapshots,
    avgChars,
    avgWords,
    messageTypes,
    pollAnalytics,
    deliveryAnalytics,
    forwardAnalytics,
    replyAnalytics,
    sentimentOverview,
    highlights,
    mediaCount,
    linkCount,
    pollCount,
    deletedMessageCount,
  });
}
