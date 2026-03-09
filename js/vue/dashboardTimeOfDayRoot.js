import {
  computeTimeOfDayDataset,
  formatHourLabel,
} from "../analytics/activity/timeOfDay.js";
import { formatFloat, formatNumber } from "../utils.js";

export function createTimeOfDayModel(analytics, chartWidth = 480) {
  const dataset = computeTimeOfDayDataset(analytics);
  if (!dataset?.points?.length || !dataset.total) return { empty: true };

  const points = dataset.points;
  const maxValue = dataset.max || 1;
  const width = Math.max(Number(chartWidth) || 0, 280);
  const height = 160;
  const margin = { top: 26, right: 18, bottom: 26, left: 18 };
  const innerWidth = Math.max(width - margin.left - margin.right, 1);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 1);
  const axisY = margin.top + innerHeight;

  const coords = points.map((point, index) => {
    const x = margin.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
    const y = margin.top + innerHeight * (1 - point.total / maxValue);
    return { x, y, point };
  });
  const areaPath = [
    `M ${coords[0].x.toFixed(2)} ${(margin.top + innerHeight).toFixed(2)}`,
    ...coords.map(coord => `L ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`),
    `L ${coords[coords.length - 1].x.toFixed(2)} ${(margin.top + innerHeight).toFixed(2)}`,
    "Z",
  ].join(" ");
  const linePath = coords
    .map((coord, index) => `${index ? "L" : "M"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");
  const weekendPath = dataset.includeWeekends && dataset.totals.weekend > 0
    ? coords.map((coord, index) => {
      const y = margin.top + innerHeight * (1 - points[index].weekend / maxValue);
      return `${index ? "L" : "M"} ${coord.x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ")
    : "";
  const averageY = dataset.average > 0
    ? (margin.top + innerHeight * (1 - dataset.average / maxValue)).toFixed(2)
    : null;

  const topPoint = points.reduce((top, current) => (current.total > (top?.total ?? -Infinity) ? current : top), null);
  const focusTotal = points
    .filter(point => point.hour >= dataset.brush.start && point.hour <= dataset.brush.end)
    .reduce((sum, point) => sum + point.total, 0);
  const focusShare = dataset.total ? (focusTotal / dataset.total) * 100 : 0;
  const summary = topPoint
    ? {
      peakLabel: formatHourLabel(topPoint.hour),
      peakCount: formatNumber(topPoint.total),
      peakShareText: topPoint.share ? ` (${formatFloat(topPoint.share * 100, 1)}% of messages)` : "",
      focusText: `Focus window ${formatHourLabel(dataset.brush.start)} – ${formatHourLabel(dataset.brush.end)} covers ${formatFloat(focusShare, 1)}% of messages.`,
    }
    : null;

  let focusRect = null;
  if (dataset.brush.start !== 0 || dataset.brush.end !== 23) {
    const focusX = margin.left + innerWidth * (dataset.brush.start / 23);
    const focusWidth = innerWidth * Math.max((dataset.brush.end - dataset.brush.start) / 23, 0);
    focusRect = {
      x: focusX.toFixed(2),
      y: margin.top.toFixed(2),
      width: focusWidth.toFixed(2),
      height: innerHeight.toFixed(2),
    };
  }

  const topHours = [...points].sort((a, b) => b.total - a.total).slice(0, 3).map(point => point.hour);
  const peakPoints = coords
    .filter(coord => topHours.includes(coord.point.hour))
    .map(coord => ({ x: coord.x.toFixed(2), y: coord.y.toFixed(2) }));

  const weekdayShare = dataset.includeWeekdays && dataset.totals.weekday ? dataset.totals.weekday / dataset.total : 0;
  const weekendShare = dataset.includeWeekends && dataset.totals.weekend ? dataset.totals.weekend / dataset.total : 0;
  const bands = [
    { label: "Weekdays", share: weekdayShare, className: "weekday" },
    { label: "Weekends", share: weekendShare, className: "weekend" },
  ].map(band => ({ ...band, fillPercent: Math.min(100, Math.max(band.share * 100, 2)) }));

  const callouts = Array.from({ length: 22 }, (_, startHour) => {
    const endHour = startHour + 2;
    const spanPoints = points.filter(point => point.hour >= startHour && point.hour <= endHour);
    const count = spanPoints.reduce((sum, point) => sum + point.total, 0);
    const weekendCount = spanPoints.reduce((sum, point) => sum + point.weekend, 0);
    const spanShare = dataset.total ? (count / dataset.total) * 100 : 0;
    const weekendShareValue = dataset.totals.weekend ? (weekendCount / dataset.totals.weekend) * 100 : 0;
    const endLabel = endHour === 23 ? "00:00" : formatHourLabel(endHour + 1);
    return {
      startHour,
      count,
      rank: 0,
      label: `${formatHourLabel(startHour)} – ${endLabel}`,
      countText: `${formatNumber(count)} messages (${formatFloat(spanShare, 1)}% of total)`,
      weekendText: dataset.includeWeekends ? `Weekend share: ${formatFloat(weekendShareValue, 1)}%` : "",
      inFocus: startHour <= dataset.brush.end && endHour >= dataset.brush.start,
    };
  })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((callout, index) => ({ ...callout, rank: index + 1 }));

  return {
    empty: false,
    summary,
    svg: {
      width,
      height,
      leftX: margin.left.toFixed(2),
      rightX: (margin.left + innerWidth).toFixed(2),
      axisYText: axisY.toFixed(2),
      axisYEndText: (axisY + 6).toFixed(2),
      axisTicks: [0, 6, 12, 18, 23].map(hour => ({
        x: (margin.left + innerWidth * (hour / 23)).toFixed(2),
        y: (axisY + 16).toFixed(2),
        label: formatHourLabel(hour),
      })),
      focusRect,
      areaPath,
      linePath,
      weekendPath,
      averageY,
      peakPoints,
    },
    bands,
    callouts,
  };
}

export function createTimeOfDayRoot(h, state) {
  return {
    name: "WaanTimeOfDayIsland",
    setup() {
      return () => {
        const model = state.model;
        const isEmpty = !model || model.empty;
        return [
          h("div", { class: "timeofday-sparkline", id: "timeofday-sparkline" }, isEmpty
            ? [h("div", { class: "timeofday-summary" }, "No time-of-day data yet.")]
            : [
              model.summary
                ? h("div", { class: "timeofday-summary" }, [
                  h("strong", {}, "Peak hour:"),
                  ` ${model.summary.peakLabel} · ${model.summary.peakCount}${model.summary.peakShareText}`,
                  h("br"),
                  h("span", {}, model.summary.focusText),
                ])
                : null,
              h("svg", { viewBox: `0 0 ${model.svg.width} ${model.svg.height}`, preserveAspectRatio: "none" }, [
                h("defs", {}, [h("linearGradient", { id: "sparkline-gradient", x1: "0", y1: "0", x2: "0", y2: "1" }, [
                  h("stop", { offset: "0%", "stop-color": "var(--chart-gradient-top)" }),
                  h("stop", { offset: "100%", "stop-color": "var(--chart-gradient-bottom)" }),
                ])]),
                model.svg.focusRect ? h("rect", { class: "focus-band", ...model.svg.focusRect }) : null,
                h("path", { class: "sparkline-fill", d: model.svg.areaPath }),
                h("path", { class: "sparkline-line", d: model.svg.linePath }),
                model.svg.weekendPath ? h("path", { class: "weekend-line", d: model.svg.weekendPath }) : null,
                model.svg.averageY ? h("line", { class: "baseline", x1: model.svg.leftX, x2: model.svg.rightX, y1: model.svg.averageY, y2: model.svg.averageY }) : null,
                h("g", {}, [
                  h("line", { class: "axis-line", x1: model.svg.leftX, x2: model.svg.rightX, y1: model.svg.axisYText, y2: model.svg.axisYText }),
                  ...model.svg.axisTicks.flatMap(tick => [
                    h("line", { class: "axis-tick", x1: tick.x, x2: tick.x, y1: model.svg.axisYText, y2: model.svg.axisYEndText }),
                    h("text", { class: "axis-label", x: tick.x, y: tick.y, "text-anchor": "middle" }, tick.label),
                  ]),
                ]),
                ...model.svg.peakPoints.map(point => h("circle", { class: "sparkline-peak", cx: point.x, cy: point.y, r: "3.5" })),
              ]),
            ]),
          h("div", { class: "timeofday-band-grid", id: "timeofday-bands" }, isEmpty
            ? []
            : model.bands.map(band => h("div", { class: "timeofday-band" }, [
              h("span", {}, band.label),
              h("div", { class: `timeofday-band-progress ${band.className}`, style: { "--band-fill": `${band.fillPercent}%` } }, [
                h("span", {}, `${formatFloat(band.share * 100, 1)}%`),
              ]),
            ]))),
          h("div", { class: "timeofday-callouts", id: "timeofday-callouts" }, isEmpty
            ? []
            : model.callouts.map(callout => h("div", { class: ["timeofday-callout", callout.inFocus ? "focus" : ""].filter(Boolean).join(" ") }, [
              h("span", { class: "badge" }, `#${callout.rank}`),
              h("strong", {}, callout.label),
              h("span", {}, callout.countText),
              callout.weekendText ? h("span", {}, callout.weekendText) : null,
              callout.inFocus ? h("span", {}, "Overlaps focus window") : null,
            ]))),
        ];
      };
    },
  };
}
