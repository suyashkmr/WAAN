import { formatNumber, formatFloat, formatDisplayDate } from "../utils.js";
import { WEEKDAY_SHORT, WEEKDAY_LONG } from "../constants.js";
import { getHourlyState, updateHourlyState, getWeekdayState } from "../state.js";

export function formatHourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function computeTimeOfDayDataset(analytics) {
  const state = getHourlyState();
  const heatmap = state.heatmap;
  const includeWeekdays = state.filters.weekdays;
  const includeWeekends = state.filters.weekends;

  const totals = Array(24).fill(0);
  const weekdayTotals = Array(24).fill(0);
  const weekendTotals = Array(24).fill(0);

  if (Array.isArray(heatmap) && heatmap.length) {
    heatmap.forEach((hours, dayIdx) => {
      const isWeekend = dayIdx === 0 || dayIdx === 6;
      hours.forEach((count, hour) => {
        const value = Number(count) || 0;
        totals[hour] += value;
        if (isWeekend) weekendTotals[hour] += value;
        else weekdayTotals[hour] += value;
      });
    });
  } else if (Array.isArray(analytics?.hourly_distribution)) {
    analytics.hourly_distribution.forEach(entry => {
      const hour = Number(entry.hour);
      const value = Number(entry.count) || 0;
      if (!Number.isFinite(hour)) return;
      totals[hour] = value;
      if (includeWeekdays && !includeWeekends) {
        weekdayTotals[hour] = value;
      } else if (!includeWeekdays && includeWeekends) {
        weekendTotals[hour] = value;
      } else {
        weekdayTotals[hour] = value;
        weekendTotals[hour] = value;
      }
    });
  }

  const points = totals.map((total, hour) => {
    const weekday = weekdayTotals[hour] || 0;
    const weekend = weekendTotals[hour] || 0;
    let active = 0;
    if (includeWeekdays) active += weekday;
    if (includeWeekends) active += weekend;
    if (!includeWeekdays && !includeWeekends) active = total;
    return {
      hour,
      total: active,
      weekday,
      weekend,
    };
  });

  const totalWeekday = includeWeekdays
    ? weekdayTotals.reduce((sum, value) => sum + value, 0)
    : 0;
  const totalWeekend = includeWeekends
    ? weekendTotals.reduce((sum, value) => sum + value, 0)
    : 0;
  const grandTotal = points.reduce((sum, point) => sum + point.total, 0);
  const maxValue = points.reduce((max, point) => Math.max(max, point.total), 0);
  const average = points.length ? grandTotal / points.length : 0;

  points.forEach(point => {
    point.share = grandTotal ? point.total / grandTotal : 0;
    point.weekdayShare = totalWeekday ? point.weekday / totalWeekday : 0;
    point.weekendShare = totalWeekend ? point.weekend / totalWeekend : 0;
  });

  return {
    points,
    total: grandTotal,
    max: maxValue || 1,
    average,
    includeWeekdays,
    includeWeekends,
    brush: { ...state.brush },
    totals: {
      weekday: totalWeekday,
      weekend: totalWeekend,
    },
  };
}

export function renderTimeOfDayPanel(analytics, elements = {}) {
  const dataset = computeTimeOfDayDataset(analytics);
  renderTimeOfDayChart(dataset, elements);
}

function renderTimeOfDayChart(dataset, elements = {}) {
  const {
    container,
    sparklineEl,
    bandsEl,
    calloutsEl,
  } = elements;

  if (!container || !sparklineEl || !bandsEl || !calloutsEl) {
    return;
  }

  sparklineEl.innerHTML = "";
  bandsEl.innerHTML = "";
  calloutsEl.innerHTML = "";

  if (!dataset || !dataset.points.length || !dataset.total) {
    container.classList.add("empty");
    const empty = document.createElement("div");
    empty.className = "timeofday-summary";
    empty.textContent = "No time-of-day data yet.";
    sparklineEl.appendChild(empty);
    return;
  }

  container.classList.remove("empty");

  const points = dataset.points;
  const maxValue = dataset.max || 1;
  const topPoint = points.reduce((top, current) => (current.total > (top?.total ?? -Infinity) ? current : top), null);
  const focusTotal = points
    .filter(point => point.hour >= dataset.brush.start && point.hour <= dataset.brush.end)
    .reduce((sum, point) => sum + point.total, 0);
  const focusShare = dataset.total ? (focusTotal / dataset.total) * 100 : 0;

  const summary = document.createElement("div");
  summary.className = "timeofday-summary";
  if (topPoint) {
    const shareText = topPoint.share ? ` (${formatFloat(topPoint.share * 100, 1)}% of messages)` : "";
    summary.innerHTML = `<strong>Peak hour:</strong> ${formatHourLabel(topPoint.hour)} · ${formatNumber(
      topPoint.total,
    )}${shareText}<br><span>Focus window ${formatHourLabel(dataset.brush.start)} – ${formatHourLabel(
      dataset.brush.end,
    )} covers ${formatFloat(focusShare, 1)}% of messages.</span>`;
  }
  sparklineEl.appendChild(summary);

  const width = sparklineEl.clientWidth || 480;
  const height = 160;
  const margin = { top: 26, right: 18, bottom: 26, left: 18 };
  const chartWidth = Math.max(width - margin.left - margin.right, 1);
  const chartHeight = Math.max(height - margin.top - margin.bottom, 1);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  const defs = document.createElementNS(svgNS, "defs");
  const gradient = document.createElementNS(svgNS, "linearGradient");
  gradient.setAttribute("id", "sparkline-gradient");
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");
  const stopTop = document.createElementNS(svgNS, "stop");
  stopTop.setAttribute("offset", "0%");
  stopTop.setAttribute("stop-color", "rgba(34, 211, 238, 0.35)");
  const stopBottom = document.createElementNS(svgNS, "stop");
  stopBottom.setAttribute("offset", "100%");
  stopBottom.setAttribute("stop-color", "rgba(34, 211, 238, 0)");
  gradient.append(stopTop, stopBottom);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const coords = points.map((point, index) => {
    const x = margin.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    const ratio = point.total / maxValue;
    const y = margin.top + chartHeight * (1 - (Number.isFinite(ratio) ? ratio : 0));
    return { x, y, point };
  });

  if (dataset.brush.start !== 0 || dataset.brush.end !== 23) {
    const focusStartRatio = dataset.brush.start / 23;
    const focusEndRatio = dataset.brush.end / 23;
    const focusX = margin.left + chartWidth * focusStartRatio;
    const focusWidth = chartWidth * Math.max(focusEndRatio - focusStartRatio, 0);
    const focusRect = document.createElementNS(svgNS, "rect");
    focusRect.setAttribute("class", "focus-band");
    focusRect.setAttribute("x", focusX.toFixed(2));
    focusRect.setAttribute("y", margin.top.toFixed(2));
    focusRect.setAttribute("width", Math.max(focusWidth, 0).toFixed(2));
    focusRect.setAttribute("height", chartHeight.toFixed(2));
    svg.appendChild(focusRect);
  }

  const areaPath = [
    `M ${coords[0].x.toFixed(2)} ${(margin.top + chartHeight).toFixed(2)}`,
    ...coords.map(coord => `L ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`),
    `L ${coords[coords.length - 1].x.toFixed(2)} ${(margin.top + chartHeight).toFixed(2)}`,
    "Z",
  ].join(" ");
  const area = document.createElementNS(svgNS, "path");
  area.setAttribute("class", "sparkline-fill");
  area.setAttribute("d", areaPath);
  svg.appendChild(area);

  const linePath = coords
    .map((coord, index) => `${index ? "L" : "M"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");
  const line = document.createElementNS(svgNS, "path");
  line.setAttribute("class", "sparkline-line");
  line.setAttribute("d", linePath);
  svg.appendChild(line);

  if (dataset.includeWeekends && dataset.totals.weekend > 0) {
    const weekendPath = coords
      .map((coord, index) => {
        const weekendValue = points[index].weekend;
        const ratio = weekendValue / maxValue;
        const y = margin.top + chartHeight * (1 - (Number.isFinite(ratio) ? ratio : 0));
        return `${index ? "L" : "M"} ${coord.x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    const weekendLine = document.createElementNS(svgNS, "path");
    weekendLine.setAttribute("class", "weekend-line");
    weekendLine.setAttribute("d", weekendPath);
    svg.appendChild(weekendLine);
  }

  if (dataset.average > 0) {
    const avgRatio = dataset.average / maxValue;
    const avgY = margin.top + chartHeight * (1 - (Number.isFinite(avgRatio) ? avgRatio : 0));
    const baseline = document.createElementNS(svgNS, "line");
    baseline.setAttribute("class", "baseline");
    baseline.setAttribute("x1", margin.left.toFixed(2));
    baseline.setAttribute("x2", (margin.left + chartWidth).toFixed(2));
    baseline.setAttribute("y1", avgY.toFixed(2));
    baseline.setAttribute("y2", avgY.toFixed(2));
    svg.appendChild(baseline);
  }

  const axisGroup = document.createElementNS(svgNS, "g");
  const axisLine = document.createElementNS(svgNS, "line");
  const axisY = margin.top + chartHeight;
  axisLine.setAttribute("class", "axis-line");
  axisLine.setAttribute("x1", margin.left.toFixed(2));
  axisLine.setAttribute("x2", (margin.left + chartWidth).toFixed(2));
  axisLine.setAttribute("y1", axisY.toFixed(2));
  axisLine.setAttribute("y2", axisY.toFixed(2));
  axisGroup.appendChild(axisLine);

  [0, 6, 12, 18, 23].forEach(tick => {
    const x = margin.left + chartWidth * (tick / 23);
    const tickLine = document.createElementNS(svgNS, "line");
    tickLine.setAttribute("class", "axis-tick");
    tickLine.setAttribute("x1", x.toFixed(2));
    tickLine.setAttribute("x2", x.toFixed(2));
    tickLine.setAttribute("y1", axisY.toFixed(2));
    tickLine.setAttribute("y2", (axisY + 6).toFixed(2));
    axisGroup.appendChild(tickLine);

    const tickLabel = document.createElementNS(svgNS, "text");
    tickLabel.setAttribute("class", "axis-label");
    tickLabel.setAttribute("x", x.toFixed(2));
    tickLabel.setAttribute("y", (axisY + 16).toFixed(2));
    tickLabel.setAttribute("text-anchor", "middle");
    tickLabel.textContent = formatHourLabel(tick);
    axisGroup.appendChild(tickLabel);
  });
  svg.appendChild(axisGroup);

  const topHours = [...points]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(point => point.hour);
  coords.forEach(coord => {
    if (!topHours.includes(coord.point.hour)) return;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("class", "sparkline-peak");
    circle.setAttribute("cx", coord.x.toFixed(2));
    circle.setAttribute("cy", coord.y.toFixed(2));
    circle.setAttribute("r", "3.5");
    svg.appendChild(circle);
  });

  sparklineEl.appendChild(svg);

  const createBand = (label, share, className) => {
    const row = document.createElement("div");
    row.className = "timeofday-band";
    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;
    const progress = document.createElement("div");
    progress.className = `timeofday-band-progress ${className}`;
    const value = document.createElement("span");
    value.textContent = `${formatFloat(share * 100, 1)}%`;
    progress.appendChild(value);
    progress.style.setProperty("--band-fill", `${Math.min(100, Math.max(share * 100, 2))}%`);
    row.append(labelSpan, progress);
    bandsEl.appendChild(row);
  };

  const totalWeekday = dataset.totals.weekday || 0;
  const totalWeekend = dataset.totals.weekend || 0;
  const weekdayShare = dataset.includeWeekdays && totalWeekday ? totalWeekday / dataset.total : 0;
  const weekendShare = dataset.includeWeekends && totalWeekend ? totalWeekend / dataset.total : 0;

  createBand("Weekdays", weekdayShare, "weekday");
  createBand("Weekends", weekendShare, "weekend");

  const spans = [];
  const spanWindow = 3;
  for (let start = 0; start <= 24 - spanWindow; start += 1) {
    const end = start + spanWindow - 1;
    const windowPoints = points.filter(point => point.hour >= start && point.hour <= end);
    const count = windowPoints.reduce((sum, point) => sum + point.total, 0);
    const weekendCount = windowPoints.reduce((sum, point) => sum + point.weekend, 0);
    spans.push({
      startHour: start,
      endHour: end,
      count,
      inFocus: start <= dataset.brush.end && end >= dataset.brush.start,
      weekendCount,
    });
  }

  const sortedSpans = spans.sort((a, b) => b.count - a.count);
  const topSpans = sortedSpans.slice(0, 3);
  topSpans.forEach((span, index) => {
    const callout = document.createElement("div");
    callout.className = "timeofday-callout";
    if (span.inFocus) callout.classList.add("focus");
    const spanShare = dataset.total ? (span.count / dataset.total) * 100 : 0;
    const weekendShareValue = dataset.totals.weekend
      ? (span.weekendCount / dataset.totals.weekend) * 100
      : 0;
    const endLabel = span.endHour === 23 ? "00:00" : formatHourLabel(span.endHour + 1);
    callout.innerHTML = `
      <span class="badge">#${index + 1}</span>
      <strong>${formatHourLabel(span.startHour)} – ${endLabel}</strong>
      <span>${formatNumber(span.count)} messages (${formatFloat(spanShare, 1)}% of total)</span>
      ${dataset.includeWeekends ? `<span>Weekend share: ${formatFloat(weekendShareValue, 1)}%</span>` : ""}
      ${span.inFocus ? `<span>Overlaps focus window</span>` : ""}
    `;
    calloutsEl.appendChild(callout);
  });
}

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

export function renderDailySection(dailyCounts, elements = {}) {
  const { container, averageEl } = elements;
  if (!container) return;
  container.classList.add("calendar-chart");
  container.innerHTML = "";

  if (!Array.isArray(dailyCounts) || !dailyCounts.length) {
    container.textContent = "No data yet.";
    if (averageEl) averageEl.textContent = "—";
    return;
  }

  if (averageEl) {
    const totalMessages = dailyCounts.reduce((sum, item) => sum + (item.count || 0), 0);
    const average = dailyCounts.length ? totalMessages / dailyCounts.length : 0;
    averageEl.textContent = average ? `${formatFloat(average, 1)} msgs` : "—";
  }

  const dataMap = new Map(dailyCounts.map(item => [item.date, item.count]));
  const maxCount = Math.max(...dailyCounts.map(item => item.count), 0);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayLabels = WEEKDAY_SHORT;

  const firstDate = new Date(dailyCounts[0].date);
  const lastDate = new Date(dailyCounts[dailyCounts.length - 1].date);
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

  const monthsFragment = document.createDocumentFragment();
  const monthCursor = new Date(startMonth);

  while (monthCursor <= endMonth) {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthContainer = document.createElement("div");
    monthContainer.className = "calendar-month";

    const header = document.createElement("div");
    header.className = "calendar-month-header";
    header.textContent = `${monthNames[month]} ${year}`;
    monthContainer.appendChild(header);

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "calendar-weekdays";
    dayLabels.forEach(label => {
      const span = document.createElement("span");
      span.textContent = label;
      weekdaysRow.appendChild(span);
    });
    monthContainer.appendChild(weekdaysRow);

    const daysGrid = document.createElement("div");
    daysGrid.className = "calendar-days";

    const firstWeekday = new Date(year, month, 1).getDay();
    for (let fillerIdx = 0; fillerIdx < firstWeekday; fillerIdx += 1) {
      const filler = document.createElement("div");
      filler.className = "calendar-day filler";
      daysGrid.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dataMap.has(iso) ? dataMap.get(iso) : null;

      const cell = document.createElement("div");
      cell.className = "calendar-day";

      const numberEl = document.createElement("div");
      numberEl.className = "day-number";
      numberEl.textContent = day;
      cell.appendChild(numberEl);

      const countEl = document.createElement("div");
      countEl.className = "day-count";

      const displayDate = formatDisplayDate(iso);

      if (count === null || count === undefined) {
        cell.classList.add("inactive");
        countEl.textContent = "—";
        cell.title = `${displayDate}: no data`;
      } else {
        const formatted = formatNumber(count);
        countEl.textContent = formatted;
        cell.dataset.date = iso;
        cell.dataset.count = count;
        cell.title = `${displayDate}: ${formatted} message${count === 1 ? "" : "s"}`;

        if (count === 0) {
          cell.classList.add("zero", "level-0");
        } else if (maxCount > 0) {
          const ratio = count / maxCount;
          let level = 1;
          if (ratio >= 0.75) level = 4;
          else if (ratio >= 0.5) level = 3;
          else if (ratio >= 0.25) level = 2;
          cell.classList.add(`level-${level}`);
        }
      }

      cell.appendChild(countEl);
      daysGrid.appendChild(cell);
    }

    const remainder = daysGrid.children.length % 7;
    if (remainder !== 0) {
      for (let fillerIdx = 0; fillerIdx < 7 - remainder; fillerIdx += 1) {
        const filler = document.createElement("div");
        filler.className = "calendar-day filler";
        daysGrid.appendChild(filler);
      }
    }

    monthContainer.appendChild(daysGrid);
    monthsFragment.appendChild(monthContainer);
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  container.appendChild(monthsFragment);

  const legend = document.createElement("div");
  legend.className = "calendar-legend";
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
  container.appendChild(legend);
}

export function renderWeeklySection(weeklyData, summary, options = {}) {
  const { container, cumulativeEl, rollingEl, averageEl, onSelectRange, selectedRange } = options;

  if (cumulativeEl) {
    cumulativeEl.textContent = summary && typeof summary.cumulativeTotal === "number"
      ? formatNumber(summary.cumulativeTotal)
      : "—";
  }
  if (rollingEl) {
    rollingEl.textContent = summary && typeof summary.latestRolling === "number"
      ? `${formatFloat(summary.latestRolling, 1)} msgs`
      : "—";
  }
  if (averageEl) {
    averageEl.textContent = summary && typeof summary.averagePerWeek === "number"
      ? `${formatFloat(summary.averagePerWeek, 1)} msgs/week`
      : "—";
  }

  if (!container) return;
  container.className = "weekly-chart";
  container.innerHTML = "";

  if (!Array.isArray(weeklyData) || !weeklyData.length) {
    container.textContent = "No data yet.";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "weekly-chart-wrapper";
  const bars = document.createElement("div");
  bars.className = "weekly-bars";
  wrapper.appendChild(bars);
  container.appendChild(wrapper);

  const maxCount = Math.max(...weeklyData.map(item => item.count || 0)) || 1;

  weeklyData.forEach(entry => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "weekly-bar";
    if (
      selectedRange &&
      selectedRange.start === entry.startDate &&
      selectedRange.end === entry.endDate
    ) {
      bar.classList.add("selected");
    }

    const valueEl = document.createElement("span");
    valueEl.className = "weekly-bar-value";
    valueEl.textContent = formatNumber(entry.count);
    bar.appendChild(valueEl);

    const fillWrap = document.createElement("div");
    fillWrap.className = "weekly-bar-fill-wrap";
    const fill = document.createElement("div");
    fill.className = "weekly-bar-fill";
    fill.style.height = `${(entry.count / maxCount) * 100}%`;
    fillWrap.appendChild(fill);
    bar.appendChild(fillWrap);

    const weekLabel = document.createElement("span");
    weekLabel.className = "weekly-bar-week";
    const [weekYear, weekNumber] = (entry.week || "").split("-");
    if (weekYear && weekNumber) {
      const yearEl = document.createElement("span");
      yearEl.className = "week-label-year";
      yearEl.textContent = weekYear;
      const numberEl = document.createElement("span");
      numberEl.className = "week-label-number";
      numberEl.textContent = weekNumber;
      weekLabel.append(yearEl, numberEl);
    } else {
      weekLabel.textContent = entry.week ?? "—";
    }
    bar.appendChild(weekLabel);

    const deltaEl = document.createElement("span");
    deltaEl.className = "weekly-bar-delta";
    const deltaDiff = document.createElement("span");
    deltaDiff.className = "delta-diff";
    const deltaPct = document.createElement("span");
    deltaPct.className = "delta-pct";

    if (entry.delta === null || entry.delta === undefined) {
      deltaEl.classList.add("flat");
      deltaDiff.textContent = "—";
      deltaPct.textContent = "";
    } else if (entry.delta > 0) {
      const pct = entry.deltaPercent ? formatFloat(entry.deltaPercent * 100, 1) : null;
      deltaEl.classList.add("up");
      deltaDiff.textContent = `▲ ${formatNumber(entry.delta)}`;
      deltaPct.textContent = pct !== null ? `(${pct}%)` : "";
    } else if (entry.delta < 0) {
      const pct = entry.deltaPercent ? formatFloat(Math.abs(entry.deltaPercent) * 100, 1) : null;
      deltaEl.classList.add("down");
      deltaDiff.textContent = `▼ ${formatNumber(Math.abs(entry.delta))}`;
      deltaPct.textContent = pct !== null ? `(${pct}%)` : "";
    } else {
      deltaEl.classList.add("flat");
      deltaDiff.textContent = "—";
      deltaPct.textContent = "";
    }

    deltaEl.append(deltaDiff, deltaPct);
    bar.appendChild(deltaEl);

    if (typeof onSelectRange === "function") {
      bar.addEventListener("click", () => {
        if (!entry.startDate || !entry.endDate) return;
        onSelectRange({ start: entry.startDate, end: entry.endDate, entry });
      });
    }

    bars.appendChild(bar);
  });
}

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
