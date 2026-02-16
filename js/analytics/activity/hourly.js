import { formatNumber, formatFloat } from "../../utils.js";
import { WEEKDAY_SHORT, WEEKDAY_LONG } from "../../constants.js";
import { getHourlyState, updateHourlyState } from "../../state.js";

const MAX_HEATMAP_LEVEL = 4;

function computeFilteredHeatmap(state) {
  const includeWeekdays = state.filters.weekdays;
  const includeWeekends = state.filters.weekends;
  const includeWorking = state.filters.working;
  const includeOffhours = state.filters.offhours;

  return state.heatmap.map((row, dayIdx) =>
    row.map((count, hour) => {
      const isWeekday = dayIdx >= 1 && dayIdx <= 5;
      const dayAllowed = (isWeekday && includeWeekdays) || (!isWeekday && includeWeekends);
      const isWorkingHour = hour >= 9 && hour <= 17;
      const hourAllowed = (isWorkingHour && includeWorking) || (!isWorkingHour && includeOffhours);
      return dayAllowed && hourAllowed ? count : 0;
    }),
  );
}

function updateHourlyFilterNote(filterNoteEl, state) {
  if (!filterNoteEl) return;
  const { weekdays, weekends, working, offhours } = state.filters;
  const { start, end } = state.brush;
  const pieces = [];
  if (!weekdays || !weekends) {
    if (weekdays && !weekends) pieces.push("Weekdays only");
    else if (!weekdays && weekends) pieces.push("Weekends only");
  }
  if (!working || !offhours) {
    if (working && !offhours) pieces.push("Working hours");
    else if (!working && offhours) pieces.push("Off hours");
  }
  if (!(start === 0 && end === 23)) {
    pieces.push(`${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`);
  }
  filterNoteEl.textContent = pieces.length ? pieces.join(" · ") : "";
}

function updateHourlyBrushSummary(filteredHeatmap, brushSummaryEl, summary, brush) {
  if (!brushSummaryEl || !summary) return;
  const { start, end } = brush;
  const totalMessages = summary.totalMessages ?? 0;
  let currentTotal = 0;
  filteredHeatmap.forEach(row => {
    for (let hour = start; hour <= end; hour += 1) {
      currentTotal += row[hour] ?? 0;
    }
  });
  const perHourComparison = summary.comparison?.perHour ?? [];
  let previousTotal = 0;
  for (let hour = start; hour <= end; hour += 1) {
    previousTotal += perHourComparison[hour]?.previous ?? 0;
  }
  const diff = previousTotal ? currentTotal - previousTotal : null;
  const diffPercent = previousTotal && diff !== null ? (diff / previousTotal) * 100 : null;
  const share = totalMessages ? (currentTotal / totalMessages) * 100 : null;

  let text = `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00 → ${formatNumber(
    currentTotal,
  )} msgs`;
  if (share !== null) text += ` (${formatFloat(share, 1)}% of period)`;
  if (diff !== null) {
    const sign = diff > 0 ? "+" : "";
    const pctText = diffPercent !== null ? ` (${sign}${formatFloat(diffPercent, 1)}%)` : "";
    text += ` | vs prior: ${sign}${formatNumber(diff)}${pctText}`;
  }
  brushSummaryEl.textContent = text;
}

function updateHourlyAnomalies(anomaliesEl, summary, distribution) {
  if (!anomaliesEl) return;
  anomaliesEl.innerHTML = "";
  const threshold = summary?.stats?.threshold ?? Infinity;
  if (!distribution?.length || !Number.isFinite(threshold)) {
    anomaliesEl.textContent = "No hourly surprises detected.";
    return;
  }
  const anomalies = distribution.filter(item => item.count > threshold);
  if (!anomalies.length) {
    anomaliesEl.textContent = "No hourly surprises detected.";
    return;
  }
  anomalies.forEach(item => {
    const badge = document.createElement("span");
    badge.className = "badge";
    const label = `${String(item.hour).padStart(2, "0")}:00`;
    badge.textContent = `${label} (${formatNumber(item.count)} msgs)`;
    anomaliesEl.appendChild(badge);
  });
}

function renderHourlySummaryTiles(renderSummary, summary) {
  if (typeof renderSummary === "function") {
    renderSummary(summary);
  }
}

export function renderHourlyHeatmapSection(data, options = {}) {
  const { chartEl, filterNoteEl, brushSummaryEl, anomaliesEl, renderSummary } = options;
  if (!chartEl) return;
  const { heatmap, summary, details, distribution } = data || {};
  if (heatmap && summary && details && distribution) {
    updateHourlyState({ heatmap, summary, details, distribution });
  }
  const state = getHourlyState();
  const {
    heatmap: activeHeatmap,
    summary: activeSummary,
    details: activeDetails,
    distribution: activeDistribution,
  } = state;

  renderHourlySummaryTiles(renderSummary, activeSummary);

  chartEl.className = "hourly-heatmap";
  chartEl.innerHTML = "";

  if (!activeHeatmap || !activeHeatmap.length) {
    chartEl.textContent = "No data available.";
    updateHourlyFilterNote(filterNoteEl, state);
    if (brushSummaryEl) brushSummaryEl.textContent = "No hourly data for this range.";
    updateHourlyAnomalies(anomaliesEl, activeSummary, activeDistribution || distribution);
    return;
  }

  const filteredHeatmap = computeFilteredHeatmap(state);
  const stats = activeSummary?.stats;
  const threshold = stats?.threshold ?? Infinity;
  const maxCount = Math.max(...filteredHeatmap.flat(), 1);

  const grid = document.createElement("div");
  grid.className = "heatmap-grid";

  const corner = document.createElement("div");
  corner.className = "heatmap-cell header corner";
  grid.appendChild(corner);

  WEEKDAY_SHORT.forEach(label => {
    const cell = document.createElement("div");
    cell.className = "heatmap-cell header weekday";
    cell.textContent = label;
    grid.appendChild(cell);
  });

  for (let hour = 0; hour < 24; hour += 1) {
    const hourLabel = `${String(hour).padStart(2, "0")}:00`;
    const labelCell = document.createElement("div");
    labelCell.className = "heatmap-cell header hour-label";
    labelCell.textContent = hourLabel;
    grid.appendChild(labelCell);

    for (let day = 0; day < 7; day += 1) {
      const displayCount = filteredHeatmap[day]?.[hour] ?? 0;
      const originalDetail = activeDetails?.[day]?.[hour];
      const baseCount = originalDetail?.count ?? 0;
      const cell = document.createElement("div");
      cell.className = "heatmap-cell heat-cell";

      let level = 0;
      if (displayCount > 0 && maxCount > 0) {
        const ratio = displayCount / maxCount;
        if (ratio >= 0.75) level = MAX_HEATMAP_LEVEL;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;
      }
      cell.classList.add(`level-${level}`);
      if (baseCount > threshold) cell.classList.add("anomaly");
      if (displayCount === 0 && baseCount > 0) cell.classList.add("muted");

      cell.textContent = displayCount ? formatNumber(displayCount) : "—";

      const share = originalDetail?.share ?? 0;
      const topSenders = originalDetail?.topSenders ?? [];
      const comparison = activeSummary?.comparison?.perHour?.[hour];
      const diffText = comparison
        ? `\nChange vs prior: ${
            comparison.previous
              ? `${comparison.diff >= 0 ? "+" : ""}${formatNumber(comparison.diff)}${
                  comparison.diffPercent !== null
                    ? ` (${formatFloat(comparison.diffPercent * 100, 1)}%)`
                    : ""
                }`
              : "No prior data"
          }`
        : "";
      const topSenderText = topSenders.length
        ? `\nTop senders: ${topSenders
            .map(item => `${item.sender} (${formatNumber(item.count)})`)
            .join(", ")}`
        : "";
      const anomalyText = baseCount > threshold ? "\n⚠️ Anomaly: above expected range" : "";

      cell.title = `${WEEKDAY_LONG[day]} ${hourLabel}\nMessages: ${formatNumber(
        baseCount,
      )} (${formatFloat(share * 100, 1)}% of period)${diffText}${topSenderText}${anomalyText}`;

      grid.appendChild(cell);
    }
  }

  chartEl.appendChild(grid);

  const legend = document.createElement("div");
  legend.className = "calendar-legend heatmap-legend";
  legend.innerHTML = `
    <span>Less</span>
    <div class="legend-cells">
      <span class="legend-cell level-0"></span>
      <span class="legend-cell level-1"></span>
      <span class="legend-cell level-2"></span>
      <span class="legend-cell level-3"></span>
      <span class="legend-cell level-4"></span>
    </div>
    <span>More</span>
  `;
  chartEl.appendChild(legend);

  updateHourlyFilterNote(filterNoteEl, state);
  updateHourlyBrushSummary(filteredHeatmap, brushSummaryEl, activeSummary, state.brush);
  updateHourlyAnomalies(anomaliesEl, activeSummary, activeDistribution);
}
