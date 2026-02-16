import { formatNumber, formatFloat } from "../../utils.js";
import { getHourlyState } from "../../state.js";

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
