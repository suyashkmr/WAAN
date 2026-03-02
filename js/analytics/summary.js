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

  const summaryBridge = globalThis.__WAAN_VUE_SUMMARY_BRIDGE__;
  if (summaryBridge && typeof summaryBridge.render === "function") {
    const handledByVue = summaryBridge.render(cards);
    if (handledByVue) return;
  }
  summaryEl.innerHTML = "";
  cards.forEach(({ title, value, hint }) => {
    const card = document.createElement("section");
    card.className = "summary-card summary-card--semantic";

    const header = document.createElement("h3");
    header.textContent = title;
    card.appendChild(header);

    const valueEl = document.createElement("p");
    valueEl.className = "value";
    valueEl.textContent = value;
    card.appendChild(valueEl);

    if (hint) {
      const hintEl = document.createElement("small");
      hintEl.textContent = hint;
      card.appendChild(hintEl);
    }

    summaryEl.appendChild(card);
  });
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
  /** @type {(typeof globalThis) & { __WAAN_VUE_DASHBOARD_PANELS_BRIDGE__?: { renderParticipantsRows?: (rows: unknown) => boolean, renderParticipantsEmpty?: (message: unknown) => boolean } }} */
  const globalScope = globalThis;
  const dashboardPanelsBridge = globalScope.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__ ?? null;
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
    if (!participantsVirtualizer && dashboardPanelsBridge?.renderParticipantsEmpty) {
      const handledByVue = dashboardPanelsBridge.renderParticipantsEmpty(message);
      if (handledByVue) return;
    }
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

  const buildRowData = (entry, index) => {
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
      detailHtml: buildParticipantDetail(entry),
    };
  };

  const buildRows = (entry, index) => {
    const rowData = buildRowData(entry, index);
    const row = document.createElement("tr");
    row.className = "participant-row";
    row.dataset.rowId = rowData.rowId;
    row.innerHTML = `
      <td data-label="Rank">${rowData.rank}</td>
      <td data-label="Participant">
        <button type="button" class="participant-toggle" aria-expanded="false" aria-controls="${rowData.detailId}">
          <span class="toggle-icon">▸</span>
          <span class="participant-name">${sanitizeText(rowData.senderLabel)}</span>
        </button>
      </td>
      <td data-label="Messages">${rowData.messageCount}</td>
      <td data-label="Share">
        <div class="participant-share">
          <div class="share-bar">
            <span class="share-fill" style="width: ${rowData.shareWidth}%"></span>
          </div>
          <span class="share-value">${rowData.shareValue}</span>
        </div>
      </td>
      <td data-label="Avg Words">${rowData.avgWordsDisplay}</td>
    `;
    const toggle = row.querySelector(".participant-toggle");
    if (toggle) {
      toggle.setAttribute("aria-label", `Show details for ${rowData.senderLabel}`);
    }
    const participantNameEl = row.querySelector(".participant-name");
    if (participantNameEl) participantNameEl.setAttribute("title", rowData.senderLabel);
    const shareCell = row.querySelector('td[data-label="Share"]');
    if (shareCell) {
      shareCell.setAttribute("title", rowData.shareTitle);
    }
    const avgWordsCell = row.querySelector('td[data-label="Avg Words"]');
    if (avgWordsCell) {
      avgWordsCell.setAttribute("title", rowData.avgWordsTitle);
    }
    const detailRow = document.createElement("tr");
    detailRow.className = "participant-detail-row hidden";
    detailRow.id = rowData.detailId;
    detailRow.dataset.rowId = rowData.rowId;
    detailRow.innerHTML = `
      <td colspan="5">
        ${rowData.detailHtml}
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
    if (dashboardPanelsBridge?.renderParticipantsRows) {
      const rowPayload = visible.map((entry, index) => buildRowData(entry, index));
      const handledByVue = dashboardPanelsBridge.renderParticipantsRows(rowPayload);
      if (handledByVue) {
        updateParticipantPresetStates(participantFilters, participantPresetButtons);
        if (typeof setParticipantView === "function") setParticipantView(visible);
        return;
      }
    }
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
