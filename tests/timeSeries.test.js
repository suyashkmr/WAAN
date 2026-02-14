import { describe, it, expect } from "vitest";
import { computeTimeSeriesAnalytics } from "../js/analytics/timeSeries.js";
import { createMessageTypeAccumulator } from "../js/analytics/messageTypesData.js";

function getISOWeekKey(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getTimestamp(entry) {
  return entry.timestamp ? new Date(entry.timestamp) : null;
}

function scoreSentiment(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("good")) return 1;
  if (lower.includes("bad")) return -1;
  return 0;
}

function buildDailySentimentState(messages) {
  const dailyStatsMap = new Map();
  const weekdaySentiments = Array.from({ length: 7 }, () => ({
    positive: 0,
    neutral: 0,
    negative: 0,
    score: 0,
  }));

  messages.forEach(entry => {
    const ts = getTimestamp(entry);
    if (!ts) return;
    const sentimentScore = scoreSentiment(entry.message);
    const sentimentLabel = sentimentScore > 0 ? "positive" : sentimentScore < 0 ? "negative" : "neutral";
    const key = ts.toISOString().slice(0, 10);
    const day = dailyStatsMap.get(key) || { count: 0, positive: 0, neutral: 0, negative: 0, score: 0 };
    day.count += 1;
    day[sentimentLabel] += 1;
    day.score += sentimentScore;
    dailyStatsMap.set(key, day);

    const weekday = weekdaySentiments[ts.getDay()];
    weekday[sentimentLabel] += 1;
    weekday.score += sentimentScore;
  });

  return { dailyStatsMap, weekdaySentiments };
}

describe("timeSeries analytics module", () => {
  it("computes time-series aggregates and updates message type accumulator", () => {
    const messages = [
      { sender: "Ana", message: "good day", timestamp: "2025-01-01T10:00:00Z" },
      { sender: "Ben", message: "poll: lunch?", timestamp: "2025-01-01T11:00:00Z", has_poll: true },
      { sender: "Ana", message: "https://example.com", timestamp: "2025-01-02T08:00:00Z" },
      { sender: "Cara", message: "<image omitted>", timestamp: "2025-01-03T12:00:00Z" },
      { sender: "Ana", message: "bad timing", timestamp: "2025-01-04T09:00:00Z" },
    ];
    const { dailyStatsMap, weekdaySentiments } = buildDailySentimentState(messages);
    const messageTypeAccumulator = createMessageTypeAccumulator();

    const result = computeTimeSeriesAnalytics({
      messages,
      dailyStatsMap,
      weekdaySentiments,
      messageTypeAccumulator,
      buildMessageSnapshot: entry => ({ sender: entry.sender, message: entry.message, timestamp: entry.timestamp }),
      getTimestamp,
      scoreSentiment,
      getISOWeekKey,
    });

    expect(result.dailyCounts.length).toBe(4);
    expect(result.hourlyCounts.reduce((sum, item) => sum + item.count, 0)).toBe(messages.length);
    expect(result.weeklyCounts.length).toBeGreaterThan(0);
    expect(Array.isArray(result.weekdayDetails)).toBe(true);
    expect(result.hourlyStats.maxHeatmapCount).toBeGreaterThan(0);

    expect(messageTypeAccumulator.pollCount).toBe(1);
    expect(messageTypeAccumulator.linkCount).toBe(1);
    expect(messageTypeAccumulator.mediaCount).toBe(1);
  });
});
