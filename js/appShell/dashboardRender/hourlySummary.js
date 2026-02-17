import { WEEKDAY_SHORT } from "../../constants.js";

export function buildHourlyTopHourSummary(summary, { formatNumber, formatFloat }) {
  if (!summary || !summary.topHour) {
    return "-";
  }

  const { dayIndex, hour, count } = summary.topHour;
  const weekday = WEEKDAY_SHORT[dayIndex] ?? `Day ${dayIndex + 1}`;
  const timeLabel = `${weekday} ${String(hour).padStart(2, "0")}:00`;
  const share = summary.totalMessages ? (count / summary.totalMessages) * 100 : null;
  const shareText = share !== null ? ` (${formatFloat(share, 1)}%)` : "";

  return `${timeLabel} · ${formatNumber(count)} msgs${shareText}`;
}
