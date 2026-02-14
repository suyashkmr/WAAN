import { WEEKDAY_LONG } from "../constants.js";

export function buildHighlights({
  dailyCounts,
  weekdayDetails,
  topSenders,
  recentTopSenders,
}) {
  const highlights = [];

  const contributorHighlight = buildTopContributorsHighlight(recentTopSenders, topSenders);
  if (contributorHighlight) highlights.push(contributorHighlight);

  const busiestDayHighlight = buildMostActiveDayHighlight(dailyCounts);
  if (busiestDayHighlight) highlights.push(busiestDayHighlight);

  const busiestWeekdayHighlight = buildBusiestWeekdayHighlight(weekdayDetails);
  if (busiestWeekdayHighlight) highlights.push(busiestWeekdayHighlight);

  const engagementToday = buildEngagementForecastHighlight(dailyCounts, {
    offsetDays: 0,
    label: "Today’s activity outlook",
  });
  if (engagementToday) highlights.push(engagementToday);

  const engagementTomorrow = buildEngagementForecastHighlight(dailyCounts, {
    offsetDays: 1,
    label: "Tomorrow’s activity outlook",
  });
  if (engagementTomorrow) highlights.push(engagementTomorrow);

  const nextWeekdayHighlight = buildNextBusiestWeekdayHighlight(dailyCounts);
  if (nextWeekdayHighlight) highlights.push(nextWeekdayHighlight);

  return highlights.slice(0, 6);
}

function buildTopContributorsHighlight(recentTopSenders, topSenders) {
  let topWeekSenders = Array.isArray(recentTopSenders)
    ? recentTopSenders.slice(0, 3)
    : [];

  if (!topWeekSenders.length && Array.isArray(topSenders) && topSenders.length) {
    topWeekSenders = topSenders.slice(0, 3).map(item => ({
      sender: item.sender,
      count: item.count,
    }));
  }

  if (!topWeekSenders.length) return null;

  const contributorItems = topWeekSenders.map((item, index) => ({
    label: `${index + 1}. ${item.sender}`,
    value: formatHighlightCount(item.count, "message"),
  }));
  const totalCount = topWeekSenders.reduce((sum, item) => sum + item.count, 0);
  const topCountLabel =
    topWeekSenders.length === 1 ? "top sender" : `top ${topWeekSenders.length}`;

  return {
    type: "contributors",
    label: "Recent top senders",
    value: `${formatHighlightCount(totalCount, "message")} across ${topCountLabel}`,
    items: contributorItems,
  };
}

function buildMostActiveDayHighlight(dailyCounts) {
  if (!Array.isArray(dailyCounts) || !dailyCounts.length) return null;
  const busiestDay = dailyCounts.reduce((prev, current) => (
    current.count > prev.count ? current : prev
  ), dailyCounts[0]);
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

  const topWeekday = weekdayDetails.reduce((prev, current) => (
    current.count > prev.count ? current : prev
  ), weekdayDetails[0]);
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
  const friendlyHeadline = (() => {
    if (bestIndex === 0 || bestIndex === 6) return "Weekend spike ahead";
    if (bestIndex === 2 || bestIndex === 3) return "Mid-week spike ahead";
    return `Expect a ${weekdayName} surge`;
  })();
  const referenceWindow = recent.length === 1 ? "the last day" : `the last ${recent.length} days`;
  const tooltip = `Based on ${referenceWindow} of weekday activity (≈${occurrences[bestIndex]} ${weekdayName} samples).`;

  return {
    type: "weekday-forecast",
    label: "Next Busy Day",
    headline: friendlyHeadline,
    value: `${weekdayName} · ≈ ${formatHighlightCount(Math.round(bestAverage), "message")}/day`,
    descriptor: `${windowLabel} · About ${formatHighlightPercent(share, 1)} of recent messages · Next ${weekdayName} falls on ${nextDateLabel}.`,
    tooltip,
  };
}

function buildEngagementForecastHighlight(
  dailyCounts,
  { offsetDays = 0, label = "Activity outlook" } = {},
) {
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

  const weekdayBuckets = Array.from({ length: 7 }, () => []);
  sorted.forEach(entry => {
    if (!entry?.date) return;
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) return;
    const day = date.getDay();
    weekdayBuckets[day].push(Number(entry.count) || 0);
  });

  const baseDate = new Date(sorted[sorted.length - 1].date);
  if (Number.isNaN(baseDate.getTime())) return null;
  const targetDate = new Date(baseDate.getTime());
  if (Number.isFinite(offsetDays)) {
    targetDate.setDate(targetDate.getDate() + offsetDays);
  }
  const targetWeekday = targetDate.getDay();
  const targetSeries = weekdayBuckets[targetWeekday];
  const targetRecent = targetSeries.slice(-3);
  const weekdayAvg = targetSeries.length
    ? targetSeries.reduce((sum, value) => sum + value, 0) / targetSeries.length
    : smoothed;
  const forecast = targetRecent.length
    ? targetRecent.reduce((sum, value) => sum + value, 0) / targetRecent.length
    : smoothed;

  const overallAvg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const baselineSeries = targetSeries.length >= 2 ? targetSeries : values;
  const baseline = targetSeries.length >= 2 ? weekdayAvg : overallAvg;
  const variance = baselineSeries.reduce((sum, value) => (
    sum + Math.pow(value - baseline, 2)
  ), 0) / baselineSeries.length;
  const std = Math.sqrt(variance);
  const diff = forecast - baseline;
  const threshold = (std || 1) * 0.6;
  let classification;
  if (diff > threshold) classification = "More than usual";
  else if (diff < -threshold) classification = "Quieter than usual";
  else classification = "About the same";
  const trendSymbol = diff > threshold ? "↑" : diff < -threshold ? "↓" : "→";

  const weekdayLabel = WEEKDAY_LONG[targetWeekday] ?? `Day ${targetWeekday + 1}`;
  const descriptor = `${formatHighlightDate(targetDate.toISOString())} · Expect about ${formatHighlightCount(
    Math.round(forecast),
    "message",
  )}. ${targetSeries.length >= 2 ? `Typical ${weekdayLabel}s see` : "Overall average"} ${formatHighlightCount(
    Math.round(baseline),
    "message",
  )}.`;
  const context = targetSeries.length >= 3 ? `Recent ${weekdayLabel}s · ${targetRecent.join(", ")}` : null;

  return {
    type: "engagement",
    label,
    value: `${trendSymbol} ${classification}`,
    descriptor,
    meta: context,
    tooltip: "Forecast compares this weekday’s recent activity against its typical average.",
  };
}
