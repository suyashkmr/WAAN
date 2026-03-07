import { formatNumber, formatFloat, formatDisplayDate } from "../utils.js";
import { buildParticipantDetailModel } from "./participantDetail.js";

function computeParticipantTimeframeStats(entries, timeframe, analytics) {
  if (timeframe !== "week") return null;
  if (!entries.length) {
    return { counts: new Map(), total: 0, label: "Last 7 days", rangeLabel: null };
  }

  let endDate = analytics?.date_range?.end ? new Date(analytics.date_range.end) : new Date();
  if (Number.isNaN(endDate.getTime())) endDate = new Date();
  const end = new Date(endDate.getTime());
  const start = new Date(endDate.getTime());
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  start.setDate(start.getDate() - 6);
  const cutoffMs = start.getTime();

  const counts = new Map();
  let total = 0;
  entries.forEach(entry => {
    if (entry.type && entry.type !== "message") return;
    const ts = entry.timestamp ? new Date(entry.timestamp) : null;
    if (!ts || ts.getTime() < cutoffMs) return;
    const sender = entry.sender || "Unknown";
    counts.set(sender, (counts.get(sender) || 0) + 1);
    total += 1;
  });

  return {
    counts,
    total,
    label: "Last 7 days",
    rangeLabel: `${formatDisplayDate(start.toISOString())} → ${formatDisplayDate(end.toISOString())}`,
  };
}

function buildParticipantLeaderboard(analytics, entries, participantFilters) {
  const baseList = (analytics.top_senders || []).map((entry, index) => ({
    ...entry,
    id: entry.id || `participant-${index}`,
  }));

  let scopeLabel = "All time";
  let scopeRange = null;
  let workingList = baseList.map(entry => ({ ...entry }));

  if (participantFilters.timeframe !== "all") {
    const stats = computeParticipantTimeframeStats(entries, participantFilters.timeframe, analytics);
    scopeLabel = stats?.label || scopeLabel;
    scopeRange = stats?.rangeLabel || scopeRange;
    if (stats?.counts && stats.total > 0) {
      workingList = workingList
        .map(entry => {
          const overrideCount = stats.counts.get(entry.sender) || 0;
          if (!overrideCount) return null;
          return {
            ...entry,
            count: overrideCount,
            share: stats.total ? overrideCount / stats.total : 0,
          };
        })
        .filter(Boolean);
    } else {
      workingList = [];
    }
  }

  const comparator =
    participantFilters.sortMode === "quiet"
      ? (a, b) => (a.count === b.count ? a.sender.localeCompare(b.sender) : a.count - b.count)
      : (a, b) => (b.count === a.count ? a.sender.localeCompare(b.sender) : b.count - a.count);

  workingList.sort(comparator);
  return { list: workingList, scopeLabel, scopeRange };
}

function updateParticipantPresetStates(participantFilters, participantPresetButtons) {
  if (!participantPresetButtons?.length) return;
  participantPresetButtons.forEach(button => {
    const preset = button.dataset.participantsPreset;
    let active = false;
    if (preset === "top-week") {
      active =
        participantFilters.timeframe === "week" &&
        participantFilters.sortMode === "most" &&
        participantFilters.topCount === 5;
    } else if (preset === "quiet") {
      active =
        participantFilters.timeframe === "all" &&
        participantFilters.sortMode === "quiet" &&
        participantFilters.topCount === 5;
    }
    button.setAttribute("aria-pressed", String(active));
  });
}

function buildParticipantRowData(entry, index) {
  const rowId = String(entry.id || `participant-${index}`);
  const detailId = `${rowId}-detail`;
  const senderLabel = String(entry.sender || "Unknown");
  const shareWidth = Number.isFinite(entry.share) ? Math.min(Math.max(entry.share * 100, 0), 100) : 0;
  const shareValue = Number.isFinite(entry.share) ? `${formatFloat(entry.share * 100, 1)}%` : "—";
  const avgWords = Number.isFinite(entry.avg_words) ? formatFloat(entry.avg_words, 1) : null;
  return {
    rowId,
    detailId,
    rank: index + 1,
    senderLabel,
    messageCount: formatNumber(entry.count),
    shareWidth,
    shareValue,
    shareTitle: `Share of messages in selected scope: ${shareValue}`,
    avgWordsDisplay: avgWords !== null ? avgWords : "—",
    avgWordsTitle:
      avgWords !== null ? `Average words per message: ${avgWords}` : "Average words per message: unavailable",
    detailItems: buildParticipantDetailModel(entry),
  };
}

export function renderParticipants({
  analytics,
  entries = [],
  participantFilters,
  participantsBody,
  participantsNote,
  participantPresetButtons,
  setParticipantView,
  participantsVirtualizer,
  resolveDashboardPanelsBridgeFn = () => null,
}) {
  void participantsVirtualizer;
  if (!participantsBody || !analytics) return;
  /** @type {{ renderParticipantsRows?: (rows: unknown) => boolean, renderParticipantsEmpty?: (message: unknown) => boolean } | null} */
  const dashboardPanelsBridge = resolveDashboardPanelsBridgeFn();
  if (!dashboardPanelsBridge) return;
  if (typeof setParticipantView === "function") {
    setParticipantView([]);
  }
  if (participantsNote) {
    participantsNote.textContent =
      "See who speaks the most, and filter to spotlight the quietest members or recent activity.";
  }

  const handleEmptyState = message => {
    dashboardPanelsBridge?.renderParticipantsEmpty?.(message);
  };

  if (!analytics.top_senders?.length) {
    handleEmptyState("Run the relay and load a chat to see participant details.");
    updateParticipantPresetStates(participantFilters, participantPresetButtons);
    return;
  }

  const { list: workingList, scopeLabel, scopeRange } = buildParticipantLeaderboard(
    analytics,
    entries,
    participantFilters,
  );
  const limit = participantFilters.topCount;
  const visible = limit > 0 ? workingList.slice(0, limit) : workingList;

  if (!visible.length) {
    handleEmptyState("No participants match the current filters.");
    if (participantsNote) {
      participantsNote.textContent = "Adjust the filters to list participants for this view.";
    }
    updateParticipantPresetStates(participantFilters, participantPresetButtons);
    if (typeof setParticipantView === "function") setParticipantView([]);
    return;
  }

  if (participantsNote) {
    const baseCount = workingList.length || analytics.top_senders.length;
    const showingCount = visible.length;
    const limitedView = participantFilters.topCount > 0 && baseCount > participantFilters.topCount;
    const baseText = limitedView
      ? `Showing top ${formatNumber(showingCount)} of ${formatNumber(baseCount)} participants`
      : `Showing all ${formatNumber(baseCount)} participants`;
    const descriptor = participantFilters.sortMode === "quiet" ? "Quietest participants" : "Most active participants";
    const scopeText = scopeLabel || (participantFilters.timeframe === "week" ? "Last 7 days" : "All time");
    const parts = [`${descriptor} · ${scopeText}`, baseText];
    if (scopeRange) parts.splice(1, 0, scopeRange);
    participantsNote.textContent = `${parts.join(" — ")}.`;
  }

  const rowPayload = visible.map((entry, index) => buildParticipantRowData(entry, index));
  dashboardPanelsBridge?.renderParticipantsRows?.(rowPayload);

  updateParticipantPresetStates(participantFilters, participantPresetButtons);
  if (typeof setParticipantView === "function") {
    setParticipantView(visible);
  }
}
