import {
  formatNumber,
  formatFloat,
  formatTimestampDisplay,
  sanitizeText,
} from "./utils.js";
import { WEEKDAY_SHORT } from "./constants.js";

export function formatSavedViewTopHour(snapshot) {
  if (!snapshot?.topHour) {
    return "No hourly data yet";
  }
  const weekday = WEEKDAY_SHORT?.[snapshot.topHour.dayIndex]
    ?? `Day ${snapshot.topHour.dayIndex + 1}`;
  return `${weekday} ${String(snapshot.topHour.hour).padStart(2, "0")}:00`;
}

function formatRelativeTime(isoValue) {
  if (!isoValue) return "";
  const when = new Date(isoValue);
  const timestamp = when.getTime();
  if (Number.isNaN(timestamp)) return "";
  const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) return "Used just now";
  if (deltaSeconds < 3600) return `Used ${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `Used ${Math.floor(deltaSeconds / 3600)}h ago`;
  return `Used ${Math.floor(deltaSeconds / 86400)}d ago`;
}

export function buildSavedViewCard(view, activeContext = {}, deps = {}) {
  const { ensureViewSnapshot, formatSavedViewRange, dataAvailableGetter } = deps;
  if (!view) return "";
  const snapshot = ensureViewSnapshot(view);
  const viewId = String(view?.id ?? "");
  const viewName = view?.name || "Untitled view";
  const rangeLabel = view.rangeLabel || formatSavedViewRange(view);
  const createdAtLabel = view.createdAt ? `Saved ${formatTimestampDisplay(view.createdAt)}` : "";
  const recencyHint = formatRelativeTime(view.lastAppliedAt);
  const totalMessages = snapshot ? formatNumber(snapshot.totalMessages ?? 0) : "—";
  const participants = snapshot ? formatNumber(snapshot.uniqueSenders ?? 0) : "—";
  const avgPerDay = snapshot && Number.isFinite(snapshot.dailyAverage)
    ? `${formatFloat(snapshot.dailyAverage, 1)} / day`
    : "Not enough data";
  const topSender = snapshot?.topSender || null;
  const sharePercent =
    topSender && typeof topSender.share === "number"
      ? Math.round(topSender.share * 100)
      : null;
  const topSenderShare =
    topSender && sharePercent !== null ? `${sharePercent}% of messages` : "Share updates soon";
  const peakHour = formatSavedViewTopHour(snapshot);
  const peakHourCount =
    snapshot?.topHour && Number.isFinite(snapshot.topHour.count)
      ? `${formatNumber(snapshot.topHour.count)} msgs`
      : "Waiting for hourly data";
  const barWidth = sharePercent !== null ? Math.min(100, Math.max(0, sharePercent)) : 8;
  const interactive = dataAvailableGetter();
  const isActive = activeContext.activeViewId === viewId;
  const isDirty = isActive && activeContext.activeViewDirty;
  const cardClasses = [
    "saved-view-card",
    interactive ? "" : "disabled",
    isActive ? "is-active" : "",
    isDirty ? "is-dirty" : "",
  ].filter(Boolean).join(" ");
  const accessibility = interactive
    ? `role="button" tabindex="0" aria-label="Apply saved view ${sanitizeText(viewName)}"`
    : "role=\"button\" aria-disabled=\"true\" tabindex=\"-1\"";
  return `
    <article class="${cardClasses}" data-view-id="${sanitizeText(viewId)}" data-active="${String(isActive)}" data-dirty="${String(isDirty)}" ${accessibility}>
      <header class="saved-view-card-header">
        <div>
          <p class="saved-view-card-title">${sanitizeText(viewName)}</p>
          <p class="saved-view-card-range">${sanitizeText(rangeLabel)}</p>
        </div>
        <div class="saved-view-card-meta">
          ${isActive ? '<span class="saved-view-chip saved-view-chip-active">Active</span>' : ""}
          ${isDirty ? '<span class="saved-view-chip saved-view-chip-dirty">Unsaved changes</span>' : ""}
          ${recencyHint ? `<span class="saved-view-card-used">${sanitizeText(recencyHint)}</span>` : ""}
          ${createdAtLabel ? `<span class="saved-view-card-created">${sanitizeText(createdAtLabel)}</span>` : ""}
        </div>
      </header>
      <div class="saved-view-card-metrics">
        <div class="saved-view-stat">
          <span class="stat-label">Messages</span>
          <span class="stat-value">${totalMessages}</span>
        </div>
        <div class="saved-view-stat">
          <span class="stat-label">Participants</span>
          <span class="stat-value">${participants}</span>
        </div>
        <div class="saved-view-stat">
          <span class="stat-label">Avg pace</span>
          <span class="stat-value">${sanitizeText(avgPerDay)}</span>
        </div>
      </div>
      <div class="saved-view-card-foot">
        <div class="saved-view-detail">
          <span class="detail-label">Top voice</span>
          <span class="detail-value">${topSender ? sanitizeText(topSender.sender) : "—"}</span>
          <span class="detail-meta">${sanitizeText(topSenderShare)}</span>
        </div>
        <div class="saved-view-detail">
          <span class="detail-label">Peak hour</span>
          <span class="detail-value">${sanitizeText(peakHour)}</span>
          <span class="detail-meta">${sanitizeText(peakHourCount)}</span>
        </div>
      </div>
      <div class="saved-view-share-bar${sharePercent === null ? " is-empty" : ""}">
        <span style="width:${barWidth}%;"></span>
      </div>
    </article>
  `;
}

export function buildSavedViewCardModel(view, activeContext = {}, deps = {}) {
  const { ensureViewSnapshot, formatSavedViewRange, dataAvailableGetter } = deps;
  if (!view) return null;
  const snapshot = ensureViewSnapshot(view);
  const viewId = String(view?.id ?? "");
  const viewName = view?.name || "Untitled view";
  const rangeLabel = view.rangeLabel || formatSavedViewRange(view);
  const createdAtLabel = view.createdAt ? `Saved ${formatTimestampDisplay(view.createdAt)}` : "";
  const recencyHint = formatRelativeTime(view.lastAppliedAt);
  const totalMessages = snapshot ? formatNumber(snapshot.totalMessages ?? 0) : "—";
  const participants = snapshot ? formatNumber(snapshot.uniqueSenders ?? 0) : "—";
  const avgPerDay = snapshot && Number.isFinite(snapshot.dailyAverage)
    ? `${formatFloat(snapshot.dailyAverage, 1)} / day`
    : "Not enough data";
  const topSender = snapshot?.topSender || null;
  const sharePercent =
    topSender && typeof topSender.share === "number"
      ? Math.round(topSender.share * 100)
      : null;
  const topSenderShare =
    topSender && sharePercent !== null ? `${sharePercent}% of messages` : "Share updates soon";
  const peakHour = formatSavedViewTopHour(snapshot);
  const peakHourCount =
    snapshot?.topHour && Number.isFinite(snapshot.topHour.count)
      ? `${formatNumber(snapshot.topHour.count)} msgs`
      : "Waiting for hourly data";
  const barWidth = sharePercent !== null ? Math.min(100, Math.max(0, sharePercent)) : 8;
  const interactive = dataAvailableGetter();
  const isActive = activeContext.activeViewId === viewId;
  const isDirty = isActive && activeContext.activeViewDirty;

  return {
    viewId,
    viewName,
    rangeLabel,
    recencyHint,
    createdAtLabel,
    totalMessages,
    participants,
    avgPerDay,
    topSenderName: topSender ? String(topSender.sender || "—") : "—",
    topSenderShare,
    peakHour,
    peakHourCount,
    barWidth,
    shareEmpty: sharePercent === null,
    interactive,
    isActive,
    isDirty,
  };
}
