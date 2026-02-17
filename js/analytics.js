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
