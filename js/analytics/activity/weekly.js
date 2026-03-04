import { formatNumber, formatFloat } from "../../utils.js";

/**
 * @param {any} entry
 */
function resolveWeeklyDelta(entry) {
  if (entry?.delta === null || entry?.delta === undefined) {
    return {
      className: "weekly-bar-delta flat",
      diff: "—",
      pct: "",
    };
  }
  if (entry.delta > 0) {
    const pct = entry.deltaPercent ? formatFloat(entry.deltaPercent * 100, 1) : null;
    return {
      className: "weekly-bar-delta up",
      diff: `▲ ${formatNumber(entry.delta)}`,
      pct: pct !== null ? `(${pct}%)` : "",
    };
  }
  if (entry.delta < 0) {
    const pct = entry.deltaPercent ? formatFloat(Math.abs(entry.deltaPercent) * 100, 1) : null;
    return {
      className: "weekly-bar-delta down",
      diff: `▼ ${formatNumber(Math.abs(entry.delta))}`,
      pct: pct !== null ? `(${pct}%)` : "",
    };
  }
  return {
    className: "weekly-bar-delta flat",
    diff: "—",
    pct: "",
  };
}

export function renderWeeklySection(weeklyData, summary, options = {}) {
  const { container, cumulativeEl, rollingEl, averageEl, onSelectRange, selectedRange } = options;
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function") {
    throw new Error("Vue runtime is required for weekly activity rendering.");
  }
  const { h, render } = VueRuntime;

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

  if (!Array.isArray(weeklyData) || !weeklyData.length) {
    render(h("p", null, "No data yet."), container);
    return;
  }

  const maxCount = Math.max(...weeklyData.map(item => Number(item?.count || 0))) || 1;

  render(
    h("div", { class: "weekly-chart-wrapper" }, [
      h(
        "div",
        { class: "weekly-bars" },
        weeklyData.map((entry, index) => {
          const isSelected = Boolean(
            selectedRange &&
            selectedRange.start === entry?.startDate &&
            selectedRange.end === entry?.endDate,
          );
          const classes = ["weekly-bar"];
          if (isSelected) classes.push("selected");
          const [weekYear, weekNumber] = String(entry?.week || "").split("-");
          const delta = resolveWeeklyDelta(entry);
          return h("button", {
            key: `${String(entry?.week || "week")}-${index}`,
            type: "button",
            class: classes.join(" "),
            onClick: () => {
              if (typeof onSelectRange !== "function") return;
              if (!entry?.startDate || !entry?.endDate) return;
              onSelectRange({ start: entry.startDate, end: entry.endDate, entry });
            },
          }, [
            h("span", { class: "weekly-bar-value" }, formatNumber(Number(entry?.count || 0))),
            h("div", { class: "weekly-bar-fill-wrap" }, [
              h("div", {
                class: "weekly-bar-fill",
                style: { height: `${(Number(entry?.count || 0) / maxCount) * 100}%` },
              }),
            ]),
            h("span", { class: "weekly-bar-week" }, weekYear && weekNumber
              ? [
                h("span", { class: "week-label-year" }, weekYear),
                h("span", { class: "week-label-number" }, weekNumber),
              ]
              : String(entry?.week ?? "—")),
            h("span", { class: delta.className }, [
              h("span", { class: "delta-diff" }, delta.diff),
              h("span", { class: "delta-pct" }, delta.pct),
            ]),
          ]);
        }),
      ),
    ]),
    container,
  );
}
