import { formatNumber, formatFloat, formatDisplayDate } from "../../utils.js";
import { WEEKDAY_SHORT } from "../../constants.js";

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

