import { formatNumber, formatFloat } from "../../utils.js";

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

