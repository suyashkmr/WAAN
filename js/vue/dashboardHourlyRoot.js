import { WEEKDAY_LONG, WEEKDAY_SHORT } from "../constants.js";
import { getHourlyState, updateHourlyState } from "../state.js";
import { formatFloat, formatNumber } from "../utils.js";

const MAX_HEATMAP_LEVEL = 4;

function computeLevel(value, maxValue) {
  if (value <= 0 || maxValue <= 0) return 0;
  const ratio = value / maxValue;
  if (ratio >= 0.75) return MAX_HEATMAP_LEVEL;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

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

function buildFilterNote(state) {
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
  return pieces.length ? pieces.join(" · ") : "";
}

function buildBrushSummary(filteredHeatmap, summary, brush) {
  if (!summary) return "No hourly data for this range.";
  const { start, end } = brush;
  const totalMessages = summary.totalMessages ?? 0;
  let currentTotal = 0;
  filteredHeatmap.forEach(row => {
    for (let hour = start; hour <= end; hour += 1) currentTotal += row[hour] ?? 0;
  });
  const perHourComparison = summary.comparison?.perHour ?? [];
  let previousTotal = 0;
  for (let hour = start; hour <= end; hour += 1) previousTotal += perHourComparison[hour]?.previous ?? 0;
  const diff = previousTotal ? currentTotal - previousTotal : null;
  const diffPercent = previousTotal && diff !== null ? (diff / previousTotal) * 100 : null;
  const share = totalMessages ? (currentTotal / totalMessages) * 100 : null;

  let text = `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00 → ${formatNumber(currentTotal)} msgs`;
  if (share !== null) text += ` (${formatFloat(share, 1)}% of period)`;
  if (diff !== null) {
    const sign = diff > 0 ? "+" : "";
    const pctText = diffPercent !== null ? ` (${sign}${formatFloat(diffPercent, 1)}%)` : "";
    text += ` | vs prior: ${sign}${formatNumber(diff)}${pctText}`;
  }
  return text;
}

function buildAnomalies(summary, distribution) {
  const threshold = summary?.stats?.threshold ?? Infinity;
  if (!distribution?.length || !Number.isFinite(threshold)) return [];
  return distribution
    .filter(item => item.count > threshold)
    .map(item => `${String(item.hour).padStart(2, "0")}:00 (${formatNumber(item.count)} msgs)`);
}

export function renderHourlyFromPayload(payload, stateRef) {
  const data = payload?.data ?? null;
  const options = payload?.options ?? null;
  if (!options || typeof options !== "object") return false;

  const { heatmap, summary, details, distribution } = data || {};
  if (heatmap && summary && details && distribution) {
    updateHourlyState({ heatmap, summary, details, distribution });
  }
  const state = getHourlyState();
  const activeHeatmap = state.heatmap;
  const activeSummary = state.summary;
  const activeDetails = state.details;
  const activeDistribution = state.distribution;

  if (typeof options.renderSummary === "function") {
    options.renderSummary(activeSummary);
  }
  stateRef.filterNote = buildFilterNote(state);
  if (!activeHeatmap || !activeHeatmap.length) {
    stateRef.model = { mode: "empty", message: "No data available." };
    stateRef.brushSummary = "No hourly data for this range.";
    stateRef.anomalyBadges = [];
    stateRef.anomalyMessage = "No hourly surprises detected.";
    return true;
  }

  const filteredHeatmap = computeFilteredHeatmap(state);
  const threshold = activeSummary?.stats?.threshold ?? Infinity;
  const maxCount = Math.max(...filteredHeatmap.flat(), 1);
  const rows = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const dayCells = [];
    for (let day = 0; day < 7; day += 1) {
      const displayCount = filteredHeatmap[day]?.[hour] ?? 0;
      const originalDetail = activeDetails?.[day]?.[hour];
      const baseCount = originalDetail?.count ?? 0;
      const share = originalDetail?.share ?? 0;
      const topSenders = originalDetail?.topSenders ?? [];
      const comparison = activeSummary?.comparison?.perHour?.[hour];
      const diffText = comparison
        ? `\nChange vs prior: ${
          comparison.previous
            ? `${comparison.diff >= 0 ? "+" : ""}${formatNumber(comparison.diff)}${
              comparison.diffPercent !== null ? ` (${formatFloat(comparison.diffPercent * 100, 1)}%)` : ""
            }`
            : "No prior data"
        }`
        : "";
      const topSenderText = topSenders.length
        ? `\nTop senders: ${topSenders.map(item => `${item.sender} (${formatNumber(item.count)})`).join(", ")}`
        : "";
      const anomalyText = baseCount > threshold ? "\n⚠️ Anomaly: above expected range" : "";
      dayCells.push({
        key: `${day}-${hour}`,
        level: computeLevel(displayCount, maxCount),
        anomaly: baseCount > threshold,
        muted: displayCount === 0 && baseCount > 0,
        text: displayCount ? formatNumber(displayCount) : "—",
        title: `${WEEKDAY_LONG[day]} ${String(hour).padStart(2, "0")}:00\nMessages: ${formatNumber(
          baseCount,
        )} (${formatFloat(share * 100, 1)}% of period)${diffText}${topSenderText}${anomalyText}`,
      });
    }
    rows.push({
      hour,
      hourLabel: `${String(hour).padStart(2, "0")}:00`,
      dayCells,
    });
  }

  const anomalyBadges = buildAnomalies(activeSummary, activeDistribution);
  stateRef.model = {
    mode: "ready",
    weekdayHeaders: WEEKDAY_SHORT,
    rows,
  };
  stateRef.brushSummary = buildBrushSummary(filteredHeatmap, activeSummary, state.brush);
  stateRef.anomalyBadges = anomalyBadges;
  stateRef.anomalyMessage = anomalyBadges.length ? "" : "No hourly surprises detected.";
  return true;
}

export function createHourlyRoot(h, state) {
  return {
    name: "WaanHourlyIsland",
    setup() {
      return () => {
        const model = state.model;
        if (!model || model.mode === "empty") {
          return h("p", { class: "search-results-empty" }, model?.message || "No data available.");
        }
        return [
          h("div", { class: "heatmap-grid" }, [
            h("div", { class: "heatmap-cell header corner" }),
            ...model.weekdayHeaders.map(label => h("div", { class: "heatmap-cell header weekday" }, label)),
            ...model.rows.flatMap(row => [
              h("div", { class: "heatmap-cell header hour-label" }, row.hourLabel),
              ...row.dayCells.map(cell =>
                h(
                  "div",
                  {
                    class: [
                      "heatmap-cell",
                      "heat-cell",
                      `level-${cell.level}`,
                      cell.anomaly ? "anomaly" : "",
                      cell.muted ? "muted" : "",
                    ]
                      .filter(Boolean)
                      .join(" "),
                    title: cell.title,
                  },
                  cell.text,
                ),
              ),
            ]),
          ]),
          h("div", { class: "calendar-legend heatmap-legend" }, [
            h("span", {}, "Less"),
            h("div", { class: "legend-cells" }, [
              h("span", { class: "legend-cell level-0" }),
              h("span", { class: "legend-cell level-1" }),
              h("span", { class: "legend-cell level-2" }),
              h("span", { class: "legend-cell level-3" }),
              h("span", { class: "legend-cell level-4" }),
            ]),
            h("span", {}, "More"),
          ]),
        ];
      };
    },
  };
}
