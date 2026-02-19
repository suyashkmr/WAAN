import {
  formatNumber,
  formatFloat,
  formatDisplayDate,
  sanitizeText,
} from "../utils.js";
import { WEEKDAY_LONG } from "../constants.js";

function formatSentimentScore(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const formatted = formatFloat(abs, digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatFloat(0, digits);
}

export function buildParticipantDetail(entry) {
  const startLabel = entry.first_message ? sanitizeText(formatDisplayDate(entry.first_message)) : null;
  const endLabel = entry.last_message ? sanitizeText(formatDisplayDate(entry.last_message)) : null;
  let rangeText = "—";
  if (startLabel && endLabel) rangeText = `${startLabel} → ${endLabel}`;
  else if (startLabel) rangeText = startLabel;
  else if (endLabel) rangeText = endLabel;

  const shareText = Number.isFinite(entry.share) ? `${formatFloat(entry.share * 100, 1)}%` : "—";
  const avgWords = Number.isFinite(entry.avg_words) ? `${formatFloat(entry.avg_words, 1)} words` : "—";
  const avgChars = Number.isFinite(entry.avg_chars) ? `${formatFloat(entry.avg_chars, 1)} chars` : "—";

  const sentiment = entry.sentiment || {};
  const sentimentParts = [];
  if (Number.isFinite(sentiment.average)) {
    sentimentParts.push(formatSentimentScore(sentiment.average, 2));
    if (entry.count) {
      const positiveShare = sentiment.positive ? formatFloat((sentiment.positive / entry.count) * 100, 0) : null;
      const negativeShare = sentiment.negative ? formatFloat((sentiment.negative / entry.count) * 100, 0) : null;
      if (positiveShare !== null) sentimentParts.push(`${positiveShare}% positive`);
      if (negativeShare !== null) sentimentParts.push(`${negativeShare}% negative`);
    }
  }
  const sentimentSummary = sentimentParts.length ? sentimentParts.join(" · ") : "—";

  const topHourText = entry.top_hour
    ? `${String(entry.top_hour.hour).padStart(2, "0")}:00 (${formatNumber(entry.top_hour.count)} msgs)`
    : "No hourly data yet";
  const weekdayName = entry.top_weekday
    ? WEEKDAY_LONG[entry.top_weekday.dayIndex] ?? `Day ${entry.top_weekday.dayIndex + 1}`
    : null;
  const topWeekdayText = weekdayName
    ? `${weekdayName} (${formatNumber(entry.top_weekday.count)} msgs)`
    : "No weekday data yet";

  return `
    <div class="participant-detail">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Active range</span>
          <span class="detail-value">${rangeText}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Share of messages</span>
          <span class="detail-value">${shareText}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Average length</span>
          <span class="detail-value">${avgWords} · ${avgChars}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Sentiment</span>
          <span class="detail-value">${sentimentSummary}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Peak hour</span>
          <span class="detail-value">${sanitizeText(topHourText)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Peak weekday</span>
          <span class="detail-value">${sanitizeText(topWeekdayText)}</span>
        </div>
      </div>
    </div>
  `;
}
