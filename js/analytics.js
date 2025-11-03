import { MESSAGE_START, SYSTEM_PREFIXES, SYSTEM_PATTERNS, WEEKDAY_SHORT } from "./constants.js";
import { isoWeekDateRange, toISODate } from "./utils.js";

const LINK_REGEX = /(https?:\/\/\S+)/i;
const POLL_PREFIX_REGEX = /^poll:/i;
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

function countAddedMembers(message) {
  if (!message) return 0;
  const match = message.match(/^you added (.+)$/i);
  if (!match) return 0;

  let namesFragment = match[1].trim();
  namesFragment = namesFragment.replace(/\s+(?:to|into)\s+(?:the|this)\s+group.*$/i, "");
  namesFragment = namesFragment.replace(/[.。]+$/g, "");
  namesFragment = namesFragment.replace(/\s+(?:and|&)\s+/gi, ",");

  return namesFragment
    .split(/\s*,\s*/)
    .map(name => name.trim())
    .filter(Boolean).length;
}

export function parseChatText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (let rawLine of lines) {
    if (rawLine.endsWith("\r")) rawLine = rawLine.slice(0, -1);
    if (!rawLine.length) {
      if (current) current.message += "\n";
      continue;
    }

    if (rawLine.charCodeAt(0) === 0xfeff) rawLine = rawLine.slice(1);

    const match = MESSAGE_START.exec(rawLine);
    if (match) {
      if (current) {
        current.message = current.message.replace(/\n+$/, "");
        entries.push(current);
      }

      const [, day, month, year, hour, minute, periodRaw, contentRaw] = match;
      const period = periodRaw ? periodRaw.toUpperCase() : null;
      const timestampISO = buildTimestampISO(day, month, year, hour, minute, period);
      let timestampText = `${day}/${month}/${year}, ${hour}:${minute}`;
      if (period) timestampText += ` ${period}`;

      const content = contentRaw ?? "";
      let sender = null;
      let messageBody = content;
      let type = "system";

      if (!isSystemContent(content)) {
        const delimiterIndex = content.indexOf(": ");
        if (delimiterIndex !== -1) {
          sender = content.slice(0, delimiterIndex);
          messageBody = content.slice(delimiterIndex + 2);
          type = "message";

          if (isSystemContent(messageBody)) {
            sender = null;
            messageBody = content;
            type = "system";
          }
        }
      }

      current = {
        timestamp: timestampISO,
        timestamp_text: timestampText,
        sender,
        message: messageBody,
        type,
      };
    } else if (current) {
      current.message += `\n${rawLine}`;
    }
  }

  if (current) {
    current.message = current.message.replace(/\n+$/, "");
    entries.push(current);
  }

  return entries;
}

function buildTimestampISO(dayStr, monthStr, yearStr, hourStr, minuteStr, period) {
  let day = Number(dayStr);
  let month = Number(monthStr) - 1;
  let year = Number(yearStr);
  if (year < 100) year += 2000;
  let hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (period) {
    const upper = period.toUpperCase();
    if (upper === "PM" && hour < 12) hour += 12;
    else if (upper === "AM" && hour === 12) hour = 0;
  }

  const date = new Date(year, month, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function computeAnalytics(entries) {
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
  let pollCount = 0;
  let linkCountPrev = 0;
  let systemJoinRequests = 0;

  const sentimentTotals = { positive: 0, neutral: 0, negative: 0, score: 0 };
  const dailyStatsMap = new Map();
  const weekdaySentiments = Array.from({ length: 7 }, () => ({
    positive: 0,
    neutral: 0,
    negative: 0,
    score: 0,
  }));

  const senderStats = new Map();
  messages.forEach(entry => {
    const trimmedMessage = (entry.message || "").trim();
    const lowerMessage = trimmedMessage.toLowerCase();
    const sentimentScore = scoreSentiment(entry.message);
    const sentimentLabel = sentimentScore > 0 ? "positive" : sentimentScore < 0 ? "negative" : "neutral";

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
    if (POLL_PREFIX_REGEX.test(trimmedMessage)) {
      pollCount += 1;
    }
    if (isMediaMessage(trimmedMessage)) {
      mediaCount += 1;
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
    const message = (entry.message || "").toLowerCase();
    if (message.includes("joined")) joinEvents += 1;
    if (message.includes("added")) {
      const addedCount = countAddedMembers(entry.message);
      addedEvents += addedCount || 1;
    }
    if (message.includes("left")) leftEvents += 1;
    if (message.includes("removed")) removedEvents += 1;
    if (message.includes("changed")) changedEvents += 1;
    if (SYSTEM_PATTERNS[3].test(message)) {
      systemJoinRequests += 1;
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

  const otherSystemEvents = Math.max(
    systems.length - (joinEvents + addedEvents + leftEvents + removedEvents + changedEvents),
    0,
  );

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
    label: "Engagement outlook",
  });
  if (engagementToday) highlights.push(engagementToday);

  const engagementTomorrow = buildEngagementForecastHighlight(dailyCounts, {
    offsetDays: 1,
    label: "Engagement outlook (Tomorrow)",
  });
  if (engagementTomorrow) highlights.push(engagementTomorrow);

  const hourDriftHighlight = buildHourDriftHighlight(hourlySeries);
  if (hourDriftHighlight) highlights.push(hourDriftHighlight);

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
    label: "Top Contributors",
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
    label: "Most active day",
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
    label: "Busiest day of the week",
    value: topWeekday.label,
    descriptor: `${formatHighlightCount(topWeekday.count, "message")} (${formatHighlightPercent(
      topWeekday.count / totalFiltered,
    )})`,
  };
}

function buildHourDriftHighlight(hourlySeries) {
  if (!Array.isArray(hourlySeries) || hourlySeries.length < 3) return null;

  const sortedSeries = hourlySeries
    .filter(entry => Array.isArray(entry?.hours) && entry.hours.length === 24)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sortedSeries.length < 3) return null;

  const alpha = 0.35;
  const smoothed = Array.from({ length: 24 }, () => null);

  sortedSeries.forEach(day => {
    day.hours.forEach((rawCount, hour) => {
      const value = Number(rawCount);
      if (!Number.isFinite(value)) return;
      smoothed[hour] = smoothed[hour] === null ? value : alpha * value + (1 - alpha) * smoothed[hour];
    });
  });

  const forecasts = smoothed.map((value, hour) => ({
    hour,
    value: value === null ? 0 : value,
  }));

  const peak = forecasts.reduce(
    (best, candidate) => (candidate.value > best.value ? candidate : best),
    { hour: 0, value: -Infinity },
  );

  if (!Number.isFinite(peak.value) || peak.value <= 0) return null;

  const wrapHour = hour => ((hour % 24) + 24) % 24;
  const formatHour = hour => `${String(hour).padStart(2, "0")}:00`;

  const neighborHours = [-1, 0, 1].map(offset => wrapHour(peak.hour + offset));
  const neighborhoodAverage =
    neighborHours.reduce((sum, hour) => sum + (forecasts[hour]?.value || 0), 0) / neighborHours.length || 0;

  const secondBest = forecasts
    .filter(entry => entry.hour !== peak.hour)
    .reduce(
      (best, candidate) => (candidate.value > best.value ? candidate : best),
      { hour: null, value: -Infinity },
    );

  const comparativeText =
    Number.isFinite(secondBest.value) && secondBest.value > 0
      ? ` · +${formatHighlightPercent((peak.value - secondBest.value) / secondBest.value, 0)} vs ${formatHour(
          secondBest.hour,
        )}`
      : "";

  const rangeLabel = `${formatHour(wrapHour(peak.hour - 1))}–${formatHour(wrapHour(peak.hour + 1))}`;
  const trailingDays = sortedSeries.length;

  return {
    type: "hour-drift",
    label: "Hour Drift Forecast",
    value: `Tomorrow most likely peak: ${formatHour(peak.hour)} ±1h`,
    descriptor: `EWMA ≈ ${formatHighlightCount(Math.round(neighborhoodAverage), "message")} between ${rangeLabel} (based on ${
      trailingDays === 1 ? "1 day" : `${trailingDays} days`
    })${comparativeText}`,
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

function buildEngagementForecastHighlight(dailyCounts, { offsetDays = 0, label = "Engagement outlook" } = {}) {
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
  if (diff > threshold) classification = "Above normal";
  else if (diff < -threshold) classification = "Soft";
  else classification = "Steady";
  const trendSymbol = diff > threshold ? "↑" : diff < -threshold ? "↓" : "→";

  const forecastDate = new Date();
  if (Number.isFinite(offsetDays)) {
    forecastDate.setDate(forecastDate.getDate() + offsetDays);
  }

  return {
    type: "engagement",
    label,
    value: `${trendSymbol} ${classification}`,
    descriptor: `${formatHighlightDate(forecastDate.toISOString())} · forecast ${formatHighlightCount(
      Math.round(forecast),
      "message",
    )} vs avg ${formatHighlightCount(Math.round(avg), "message")}`,
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
