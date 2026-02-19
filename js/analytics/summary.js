import {
  formatNumber,
  formatFloat,
  formatDisplayDate,
  formatDateRangeWithTime,
  sanitizeText,
} from "../utils.js";
import { buildParticipantDetail } from "./participantDetail.js";

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

export function renderSummaryCards({ analytics, label, summaryEl }) {
  if (!summaryEl || !analytics) return;
  const startTimestamp = analytics.first_timestamp || analytics.date_range.start;
  const endTimestamp = analytics.last_timestamp || analytics.date_range.end;
  const dateRangeValue = startTimestamp && endTimestamp
    ? formatDateRangeWithTime(startTimestamp, endTimestamp)
    : startTimestamp || endTimestamp
      ? formatDateRangeWithTime(startTimestamp, endTimestamp)
      : "—";

  const cards = [
    {
      title: "Total Messages",
      value: formatNumber(analytics.total_messages),
      hint: `${formatNumber(analytics.total_entries)} chat lines including system messages`,
    },
    {
      title: "Active Participants",
      value: formatNumber(analytics.unique_senders),
      hint: label,
    },
    {
      title: "System Events Logged",
      value: formatNumber(analytics.total_system),
      hint: "Joins, adds, leaves, removals, changes",
    },
    {
      title: "Date Range",
      value: dateRangeValue,
      hint:
        analytics.date_range.start && analytics.date_range.end
          ? `${formatNumber(analytics.weekly_summary.weekCount)} weeks of activity`
          : "",
    },
  ];

  summaryEl.innerHTML = cards
    .map(({ title, value, hint }) => `
      <div class="summary-card">
        <h3>${sanitizeText(title)}</h3>
        <p class="value">${sanitizeText(value)}</p>
        ${hint ? `<small>${sanitizeText(hint)}</small>` : ""}
      </div>
    `)
    .join("");
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
}) {
  if (!participantsBody || !analytics) return;
  if (!participantsVirtualizer) {
    participantsBody.innerHTML = "";
  }
  if (typeof setParticipantView === "function") {
    setParticipantView([]);
  }
  if (participantsNote) {
    participantsNote.textContent =
      "See who speaks the most, and filter to spotlight the quietest members or recent activity.";
  }

  const handleEmptyState = message => {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="5" class="empty-state">${message}</td>
    `;
    if (participantsVirtualizer) {
      participantsVirtualizer.setEmptyRenderer(() => emptyRow.cloneNode(true));
      participantsVirtualizer.setItems([]);
    } else {
      participantsBody.appendChild(emptyRow);
    }
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

  const buildRows = (entry, index) => {
    const rowId = entry.id || `participant-${index}`;
    const detailId = `${rowId}-detail`;
    const row = document.createElement("tr");
    row.className = "participant-row";
    row.dataset.rowId = rowId;
    const shareWidth = Number.isFinite(entry.share) ? Math.min(Math.max(entry.share * 100, 0), 100) : 0;
    const shareValue = Number.isFinite(entry.share) ? `${formatFloat(entry.share * 100, 1)}%` : "—";
    const avgWords = Number.isFinite(entry.avg_words) ? formatFloat(entry.avg_words, 1) : null;

    row.innerHTML = `
      <td data-label="Rank">${index + 1}</td>
      <td data-label="Participant">
        <button type="button" class="participant-toggle" aria-expanded="false" aria-controls="${detailId}">
          <span class="toggle-icon">▸</span>
          <span class="participant-name">${sanitizeText(entry.sender || "Unknown")}</span>
        </button>
      </td>
      <td data-label="Messages">${formatNumber(entry.count)}</td>
      <td data-label="Share">
        <div class="participant-share">
          <div class="share-bar">
            <span class="share-fill" style="width: ${shareWidth}%"></span>
          </div>
          <span class="share-value">${shareValue}</span>
        </div>
      </td>
      <td data-label="Avg Words">${avgWords !== null ? avgWords : "—"}</td>
    `;
    const detailRow = document.createElement("tr");
    detailRow.className = "participant-detail-row hidden";
    detailRow.id = detailId;
    detailRow.dataset.rowId = rowId;
    detailRow.innerHTML = `
      <td colspan="5">
        ${buildParticipantDetail(entry)}
      </td>
    `;
    return [row, detailRow];
  };

  if (participantsVirtualizer) {
    participantsVirtualizer.setEmptyRenderer(() => {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `
        <td colspan="5" class="empty-state">No participants match the current filters.</td>
      `;
      return emptyRow;
    });
    participantsVirtualizer.setItems(visible, (entry, index) => buildRows(entry, index));
  } else {
    visible.forEach((entry, index) => {
      const nodes = buildRows(entry, index);
      nodes.forEach(node => participantsBody.appendChild(node));
    });
  }

  updateParticipantPresetStates(participantFilters, participantPresetButtons);
  if (typeof setParticipantView === "function") {
    setParticipantView(visible);
  }
}
