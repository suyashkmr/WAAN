import { toISODate } from "../utils.js";

export function buildDeliveryAnalytics({ ackCounts, ackStateOrder }) {
  const deliveryCounts = {};
  let ackSampleTotal = 0;
  ackCounts.forEach((count, state) => {
    const key = String(state);
    deliveryCounts[key] = count;
    ackSampleTotal += count;
  });
  ackStateOrder.forEach(state => {
    const key = String(state);
    if (deliveryCounts[key] === undefined) {
      deliveryCounts[key] = 0;
    }
  });
  const seenCount = (deliveryCounts["3"] || 0) + (deliveryCounts["4"] || 0);
  const deliveredCount = seenCount + (deliveryCounts["2"] || 0);
  return {
    total: ackSampleTotal,
    counts: deliveryCounts,
    seen_rate: ackSampleTotal ? seenCount / ackSampleTotal : 0,
    delivered_rate: ackSampleTotal ? deliveredCount / ackSampleTotal : 0,
  };
}

export function buildForwardAnalytics({
  forwardSenderCounts,
  forwardCount,
  totalMessages,
}) {
  const topSenders = Array.from(forwardSenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    total: forwardCount,
    share: totalMessages ? forwardCount / totalMessages : 0,
    top_senders: topSenders,
  };
}

export function buildReplyAnalytics({
  replySenderCounts,
  replyCount,
  totalMessages,
  replyEntries,
}) {
  const topSenders = Array.from(replySenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    total: replyCount,
    share: totalMessages ? replyCount / totalMessages : 0,
    top_senders: topSenders,
    entries: replyEntries.slice(-15).reverse(),
  };
}

export function buildMessageTypes({
  linkCount,
  mediaCount,
  pollCount,
  deletedMessageCount,
  linkSnapshots,
  mediaSnapshots,
  pollDetails,
  totalMessages,
}) {
  const summary = [
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
    summary.push({
      key: "deleted",
      label: "Deleted messages",
      count: deletedMessageCount,
      share: totalMessages ? deletedMessageCount / totalMessages : 0,
    });
  }
  if (mediaCount > 0) {
    summary.push({
      key: "media_total",
      label: "Media messages",
      count: mediaCount,
      share: totalMessages ? mediaCount / totalMessages : 0,
    });
  }
  return {
    summary: summary.filter(entry => entry.count > 0),
    media: {
      total: mediaCount,
      share: totalMessages ? mediaCount / totalMessages : 0,
      categories: [],
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
}

export function buildPollAnalytics({ pollCount, pollSenderCounts, pollDetails }) {
  const topCreators = Array.from(pollSenderCounts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    total: pollCount,
    unique_creators: pollSenderCounts.size,
    entries: pollDetails.slice(0, 25),
    top_creators: topCreators,
    messages: pollDetails,
  };
}

export function buildSentimentOverview({
  sentimentTotals,
  totalMessages,
  dailyCounts,
  weeklyCounts,
  topSenders,
  weekdayDetails,
}) {
  return {
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
}

export function buildAnalyticsPayload({
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
}) {
  const totalMessages = messages.length;
  return {
    total_entries: entries.length,
    total_messages: totalMessages,
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
      averagePerDay: totalMessages && dailyCounts.length ? totalMessages / dailyCounts.length : 0,
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
    highlights,
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
