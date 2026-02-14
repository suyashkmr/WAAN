import { toISODate } from "../utils.js";

function buildEmptySenderStats() {
  return {
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
}

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

export function computeMessageCore({
  messages,
  scoreSentiment,
  getBooleanFlag,
  getAckValue,
  getForwardingScore,
  getMessageId,
  getQuotedMessageId,
  buildSnippet,
  getTimestamp,
}) {
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
  const ackCounts = new Map();
  const forwardSenderCounts = new Map();
  const replySenderCounts = new Map();
  const replyEntries = [];
  const messageById = new Map();

  messages.forEach(entry => {
    const trimmedMessage = (entry.message || "").trim();
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
        stats = buildEmptySenderStats();
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

  const totalMessages = messages.length;
  const topSenders = Array.from(senderStats.entries())
    .sort((a, b) => {
      if (b[1].count === a[1].count) return a[0].localeCompare(b[0]);
      return b[1].count - a[1].count;
    })
    .map(([sender, stats]) => {
      const share = totalMessages ? stats.count / totalMessages : 0;
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

  return {
    uniqueSenders: senderStats.size,
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
  };
}
