import { WEEKDAY_SHORT } from "../constants.js";
import { isoWeekDateRange, toISODate } from "../utils.js";
import { recordMessageTypeEntry } from "./messageTypesData.js";

export function computeTimeSeriesAnalytics({
  messages,
  dailyStatsMap,
  weekdaySentiments,
  messageTypeAccumulator,
  buildMessageSnapshot,
  getTimestamp,
  scoreSentiment,
  getISOWeekKey,
}) {
  const messageTimestamps = messages
    .map(entry => getTimestamp(entry))
    .filter(Boolean)
    .sort((a, b) => a - b);

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
  const weeklySenderCounts = new Map();
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
      let weeklySenderMap = weeklySenderCounts.get(weekKey);
      if (!weeklySenderMap) {
        weeklySenderMap = new Map();
        weeklySenderCounts.set(weekKey, weeklySenderMap);
      }
      weeklySenderMap.set(entry.sender, (weeklySenderMap.get(entry.sender) || 0) + 1);
    }

    const trimmedMessage = (entry.message || "").trim();
    const snapshot = buildMessageSnapshot(entry);
    recordMessageTypeEntry({
      accumulator: messageTypeAccumulator,
      entry,
      trimmedMessage,
      snapshot,
    });

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

  const recentWeekKeys = weeklyCounts.slice(-3).map(entry => entry.week);
  const recentSenderCounts = new Map();
  recentWeekKeys.forEach(weekKey => {
    const weekSenders = weeklySenderCounts.get(weekKey);
    if (!weekSenders) return;
    weekSenders.forEach((count, sender) => {
      recentSenderCounts.set(sender, (recentSenderCounts.get(sender) || 0) + count);
    });
  });
  const recentTopSenders = Array.from(recentSenderCounts.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    })
    .map(([sender, count]) => ({ sender, count }));

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
  weeklyCounts.forEach((entry, idx) => {
    cumulative += entry.count;
    entry.cumulative = cumulative;
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

  return {
    dailyCounts,
    hourlyCounts,
    hourlyCountsPrev,
    hourlyMatrix,
    hourlyDetails,
    weeklyCounts,
    weeklySummary,
    weekdayDetails,
    weekdayStats: {
      mean: weekdayMean,
      std: weekdayStd,
    },
    recentTopSenders,
    comparisonSummary,
    hourlyStats: {
      mean: hourlyMean,
      std: hourlyStd,
      threshold: anomalyThreshold,
      topHourCell,
      maxHeatmapCount,
    },
  };
}
