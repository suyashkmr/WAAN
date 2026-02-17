import { formatNumber, formatFloat } from "./utils.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTopHourLabel(topHour) {
  if (!topHour) return "";
  const weekdayLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayLabel =
    typeof topHour.dayIndex === "number" && weekdayLong[topHour.dayIndex]
      ? weekdayLong[topHour.dayIndex]
      : "Day";
  const hourLabel = String(topHour.hour ?? 0).padStart(2, "0");
  return `${dayLabel} ${hourLabel}:00`;
}

export function collectExportSummary(analytics) {
  const highlights = (analytics.highlights || []).map(item => ({
    label: item.label || "Highlight",
    value: item.value || "",
    descriptor: item.descriptor || "",
  }));
  const topSenders = (analytics.top_senders || []).slice(0, 10);
  const systemSummary = analytics.system_summary || {};
  const weeklySummary = analytics.weekly_summary || {};
  const range = analytics.date_range || {};
  const rangeLabel =
    range.start && range.end ? `${range.start} → ${range.end}` : null;
  const overviewItems = [
    `Messages in total: ${formatNumber(analytics.total_messages ?? 0)}`,
    `People who spoke: ${formatNumber(analytics.unique_senders ?? 0)}`,
    `System notices: ${formatNumber(systemSummary.count || 0)}`,
    rangeLabel ? `Covers: ${rangeLabel}` : null,
  ].filter(Boolean);
  const paceItems = [
    `Average per day: ${formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1)} messages`,
    `Average per week: ${formatFloat(weeklySummary.averagePerWeek ?? 0, 1)} messages`,
    analytics.hourly_summary?.topHour
      ? `Busiest hour: ${formatTopHourLabel(analytics.hourly_summary.topHour)}`
      : null,
  ].filter(Boolean);
  const systemItems = [
    `People joined: ${formatNumber(systemSummary.joins || 0)}`,
    `Join requests: ${formatNumber(systemSummary.join_requests || 0)}`,
    `Added by admins: ${formatNumber(systemSummary.added || 0)}`,
    `Left on their own: ${formatNumber(systemSummary.left || 0)}`,
    `Removed by admins: ${formatNumber(systemSummary.removed || 0)}`,
    `Settings changes: ${formatNumber(systemSummary.changed || 0)}`,
  ];
  const quickStats = [
    { label: "Messages", value: formatNumber(analytics.total_messages ?? 0) },
    { label: "Participants", value: formatNumber(analytics.unique_senders ?? 0) },
    { label: "Avg/day", value: formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1) },
    {
      label: "Top sender",
      value: topSenders.length
        ? `${topSenders[0].sender} (${formatNumber(topSenders[0].count)} msgs)`
        : "Not enough data",
    },
  ];
  return {
    highlights,
    topSenders,
    systemSummary,
    weeklySummary,
    overviewItems,
    paceItems,
    systemItems,
    quickStats,
    rangeLabel,
  };
}
