import { formatNumber, formatFloat } from "../../utils.js";
import { getWeekdayState } from "../../state.js";

export function renderWeekdaySection(elements = {}) {
  const { container, filterNoteEl } = elements;
  if (!container) return;
  container.innerHTML = "";
  const state = getWeekdayState();
  const distribution = Array.isArray(state.distribution) ? state.distribution : [];
  if (!distribution.length) {
    container.textContent = "No data yet.";
    updateWeekdayFilterNote(filterNoteEl, state);
    return;
  }

  const { entries, total, std } = computeWeekdayFilteredData(state);
  if (!total) {
    container.textContent = "No data for these filters.";
    updateWeekdayFilterNote(filterNoteEl, state);
    return;
  }

  const maxCount = Math.max(...entries.map(entry => entry.filteredCount), 1);
  const barGrid = document.createElement("div");
  barGrid.className = "weekday-bar-grid";

  entries.forEach(entry => {
    const item = document.createElement("div");
    item.className = "weekday-item";

    const barContainer = document.createElement("div");
    barContainer.className = "weekday-bar-container";

    const barFill = document.createElement("div");
    barFill.className = "weekday-bar-fill";
    if (std && entry.filteredStdScore >= 1) barFill.classList.add("above");
    else if (std && entry.filteredStdScore <= -1) barFill.classList.add("below");
    barFill.style.height = `${(entry.filteredCount / maxCount) * 100}%`;

    const diffPercent = entry.filteredDeltaPercent ? entry.filteredDeltaPercent * 100 : 0;
    const diffText = entry.filteredDeltaPercent
      ? `${diffPercent >= 0 ? "+" : ""}${formatFloat(diffPercent, 1)}% vs average`
      : "About average";
    const topSenderText = entry.topSenders.length
      ? entry.topSenders
          .map(sender => `${sender.sender} (${formatNumber(sender.count)} · ${formatFloat(sender.share * 100, 1)}%)`)
          .join(", ")
      : "No sender info";
    barFill.title = `${entry.label}\nMessages: ${formatNumber(entry.filteredCount)} (${formatFloat(
      entry.filteredShare * 100,
      1,
    )}% of filtered view)\n${diffText}\nTop senders: ${topSenderText}`;

    barContainer.appendChild(barFill);

    const meta = document.createElement("div");
    meta.className = "weekday-meta";

    const label = document.createElement("span");
    label.className = "weekday-label";
    label.textContent = entry.label;

    const count = document.createElement("span");
    count.className = "weekday-count";
    count.textContent = formatNumber(entry.filteredCount);

    const share = document.createElement("span");
    share.className = "weekday-share";
    share.textContent = `${formatFloat(entry.filteredShare * 100, 1)}%`;

    meta.append(label, count, share);

    if (std && Math.abs(entry.filteredStdScore) >= 1) {
      const badge = document.createElement("span");
      badge.className = `weekday-badge ${entry.filteredStdScore >= 0 ? "positive" : "negative"}`;
      if (entry.filteredDeltaPercent) {
        const pct = Math.abs(entry.filteredDeltaPercent) * 100;
        badge.textContent = `${entry.filteredStdScore >= 0 ? "+" : "−"}${formatFloat(pct, 1)}% vs average`;
      } else {
        badge.textContent = entry.filteredStdScore >= 0 ? "Above average" : "Below average";
      }
      meta.appendChild(badge);
    }

    item.append(barContainer, meta);
    barGrid.appendChild(item);
  });

  const fragment = document.createDocumentFragment();
  fragment.appendChild(barGrid);
  fragment.appendChild(buildWeekdayHeatmapMobile(entries));
  container.appendChild(fragment);
  updateWeekdayFilterNote(filterNoteEl, state);
}

function computeWeekdayFilteredData(state) {
  const distribution = state.distribution || [];
  const { filters, brush } = state;
  const includeWeekdays = filters.weekdays;
  const includeWeekends = filters.weekends;
  const includeWorking = filters.working;
  const includeOffhours = filters.offhours;
  const startHour = brush.start;
  const endHour = brush.end;

  const filteredEntries = distribution.map(entry => {
    const isWeekday = entry.dayIndex >= 1 && entry.dayIndex <= 5;
    const defaultPeriods = entry.periods || [
      { label: "AM", count: 0 },
      { label: "PM", count: 0 },
    ];
    if ((isWeekday && !includeWeekdays) || (!isWeekday && !includeWeekends)) {
      return {
        ...entry,
        filteredCount: 0,
        filteredShare: 0,
        filteredStdScore: 0,
        filteredDeltaPercent: 0,
        filteredHourly: Array(24).fill(0),
        filteredPeriods: defaultPeriods.map(period => ({ ...period, count: 0 })),
      };
    }

    const filteredHourly = (entry.hourly || Array(24).fill(0)).map((value, hour) => {
      const inBrush = hour >= startHour && hour <= endHour;
      const isWorkingHour = hour >= 9 && hour <= 17;
      const hourAllowed = inBrush && ((isWorkingHour && includeWorking) || (!isWorkingHour && includeOffhours));
      return hourAllowed ? value : 0;
    });

    const filteredCount = filteredHourly.reduce((sum, value) => sum + value, 0);
    const filteredPeriods = [
      {
        label: "AM",
        count: filteredHourly.slice(0, 12).reduce((sum, value) => sum + value, 0),
      },
      {
        label: "PM",
        count: filteredHourly.slice(12).reduce((sum, value) => sum + value, 0),
      },
    ];

    return {
      ...entry,
      filteredCount,
      filteredHourly,
      filteredPeriods,
    };
  });

  const totalFiltered = filteredEntries.reduce((sum, entry) => sum + entry.filteredCount, 0);
  filteredEntries.forEach(entry => {
    entry.filteredShare = totalFiltered ? entry.filteredCount / totalFiltered : 0;
  });

  const counts = filteredEntries.map(entry => entry.filteredCount);
  const mean = counts.length ? counts.reduce((sum, value) => sum + value, 0) / counts.length : 0;
  const variance = counts.length
    ? counts.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / counts.length
    : 0;
  const std = Math.sqrt(variance);

  filteredEntries.forEach(entry => {
    entry.filteredStdScore = std ? (entry.filteredCount - mean) / std : 0;
    entry.filteredDeltaPercent = mean ? (entry.filteredCount - mean) / mean : 0;
  });

  return {
    entries: filteredEntries,
    total: totalFiltered,
    mean,
    std,
  };
}

function buildWeekdayHeatmapMobile(entries) {
  const heatmap = document.createElement("div");
  heatmap.className = "weekday-heatmap-mobile";
  if (!entries.length) return heatmap;

  const header = document.createElement("div");
  header.className = "weekday-heatmap-row header";
  header.innerHTML = `
    <span class="heatmap-cell corner"></span>
    <span class="heatmap-cell">AM</span>
    <span class="heatmap-cell">PM</span>
  `;
  heatmap.appendChild(header);

  const maxValue =
    Math.max(
      ...entries.flatMap(entry => entry.filteredPeriods.map(period => period.count)),
      0,
    ) || 1;

  entries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "weekday-heatmap-row";

    const labelCell = document.createElement("span");
    labelCell.className = "heatmap-cell label";
    labelCell.textContent = entry.label;
    row.appendChild(labelCell);

    entry.filteredPeriods.forEach(period => {
      const cell = document.createElement("span");
      cell.className = "heatmap-cell heat";
      const ratio = period.count / maxValue;
      let level = 0;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.5) level = 3;
      else if (ratio >= 0.25) level = 2;
      else if (ratio > 0) level = 1;
      cell.classList.add(`level-${level}`);
      cell.textContent = period.count ? formatNumber(period.count) : "—";
      cell.title = `${entry.label} ${period.label}: ${formatNumber(period.count)} messages`;
      row.appendChild(cell);
    });

    heatmap.appendChild(row);
  });

  return heatmap;
}

function updateWeekdayFilterNote(filterNoteEl, state) {
  if (!filterNoteEl) return;
  const { filters, brush } = state;
  const pieces = [];
  if (!filters.weekdays || !filters.weekends) {
    if (filters.weekdays && !filters.weekends) pieces.push("Weekdays only");
    else if (!filters.weekdays && filters.weekends) pieces.push("Weekends only");
  }
  if (!filters.working || !filters.offhours) {
    if (filters.working && !filters.offhours) pieces.push("Working hours");
    else if (!filters.working && filters.offhours) pieces.push("Off hours");
  }
  if (!(brush.start === 0 && brush.end === 23)) {
    pieces.push(`${String(brush.start).padStart(2, "0")}:00–${String(brush.end).padStart(2, "0")}:00`);
  }
  filterNoteEl.textContent = pieces.length ? pieces.join(" · ") : "";
}
