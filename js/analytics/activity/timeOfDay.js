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
