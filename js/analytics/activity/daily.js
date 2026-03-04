import { formatNumber, formatFloat, formatDisplayDate } from "../../utils.js";
import { WEEKDAY_SHORT } from "../../constants.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * @param {Array<{date?: string, count?: number}>} dailyCounts
 */
function createDailyCalendarModel(dailyCounts) {
  if (!Array.isArray(dailyCounts) || !dailyCounts.length) return null;
  const dataMap = new Map(dailyCounts.map(item => [String(item?.date || ""), Number(item?.count || 0)]));
  const maxCount = Math.max(...dailyCounts.map(item => Number(item?.count || 0)), 0);
  const firstDate = new Date(String(dailyCounts[0]?.date || ""));
  const lastDate = new Date(String(dailyCounts[dailyCounts.length - 1]?.date || ""));
  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) return null;

  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  const months = [];
  const monthCursor = new Date(startMonth);

  while (monthCursor <= endMonth) {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];

    for (let fillerIdx = 0; fillerIdx < firstWeekday; fillerIdx += 1) {
      cells.push({ filler: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dataMap.has(iso) ? dataMap.get(iso) : null;
      const displayDate = formatDisplayDate(iso);
      /** @type {string[]} */
      const classes = ["calendar-day"];
      let countText = "—";
      let title = `${displayDate}: no data`;
      if (count !== null && count !== undefined) {
        const normalizedCount = Number(count || 0);
        countText = formatNumber(normalizedCount);
        title = `${displayDate}: ${countText} message${normalizedCount === 1 ? "" : "s"}`;
        if (normalizedCount === 0) {
          classes.push("zero", "level-0");
        } else if (maxCount > 0) {
          const ratio = normalizedCount / maxCount;
          let level = 1;
          if (ratio >= 0.75) level = 4;
          else if (ratio >= 0.5) level = 3;
          else if (ratio >= 0.25) level = 2;
          classes.push(`level-${level}`);
        }
      } else {
        classes.push("inactive");
      }
      cells.push({
        filler: false,
        day,
        iso,
        count,
        countText,
        classes,
        title,
      });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let fillerIdx = 0; fillerIdx < 7 - remainder; fillerIdx += 1) {
        cells.push({ filler: true });
      }
    }

    months.push({
      id: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[month]} ${year}`,
      cells,
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  return { months };
}

export function renderDailySection(dailyCounts, elements = {}) {
  const { container, averageEl } = elements;
  if (!container) return;
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function" || !VueRuntime.Fragment) {
    throw new Error("Vue runtime is required for daily activity rendering.");
  }
  const { h, render, Fragment } = VueRuntime;
  container.classList.add("calendar-chart");

  if (!Array.isArray(dailyCounts) || !dailyCounts.length) {
    render(h("p", null, "No data yet."), container);
    if (averageEl) averageEl.textContent = "—";
    return;
  }

  if (averageEl) {
    const totalMessages = dailyCounts.reduce((sum, item) => sum + Number(item?.count || 0), 0);
    const average = dailyCounts.length ? totalMessages / dailyCounts.length : 0;
    averageEl.textContent = average ? `${formatFloat(average, 1)} msgs` : "—";
  }

  const model = createDailyCalendarModel(dailyCounts);
  if (!model) {
    render(h("p", null, "No data yet."), container);
    return;
  }

  render(
    h(
      Fragment,
      null,
      [
        ...model.months.map(month =>
          h("div", { class: "calendar-month", key: month.id }, [
            h("div", { class: "calendar-month-header" }, month.label),
            h(
              "div",
              { class: "calendar-weekdays" },
              WEEKDAY_SHORT.map(label => h("span", { key: `weekday-${month.id}-${label}` }, label)),
            ),
            h(
              "div",
              { class: "calendar-days" },
              month.cells.map((cell, index) => {
                if (cell.filler) {
                  return h("div", { class: "calendar-day filler", key: `${month.id}-filler-${index}` });
                }
                return h("div", {
                  class: cell.classes.join(" "),
                  key: `${month.id}-${cell.day}`,
                  title: cell.title,
                  "data-date": cell.count === null || cell.count === undefined ? undefined : cell.iso,
                  "data-count": cell.count === null || cell.count === undefined ? undefined : String(cell.count),
                }, [
                  h("div", { class: "day-number" }, String(cell.day)),
                  h("div", { class: "day-count" }, cell.countText),
                ]);
              }),
            ),
          ]),
        ),
        h("div", { class: "calendar-legend" }, [
          h("span", null, "Less"),
          h("div", { class: "legend-cells" }, [
            h("span", { class: "legend-cell level-0" }),
            h("span", { class: "legend-cell level-1" }),
            h("span", { class: "legend-cell level-2" }),
            h("span", { class: "legend-cell level-3" }),
            h("span", { class: "legend-cell level-4" }),
          ]),
          h("span", null, "More"),
        ]),
      ],
    ),
    container,
  );
}
