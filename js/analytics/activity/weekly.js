import { formatNumber, formatFloat } from "../../utils.js";
import { clearContainerForVueRenderOnce } from "../../vue/renderMountUtils.js";
import { renderActionButton } from "../../vue/primevueRenderPrimitives.js";
import { UI_COPY } from "../../uiCopy.js";

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

export function renderWeeklySection(weeklyData, summary, options = {}, vueRuntime = null) {
  const { container, cumulativeEl, rollingEl, averageEl, onSelectRange, selectedRange } = options;
  if (!vueRuntime || typeof vueRuntime.h !== "function" || typeof vueRuntime.render !== "function") {
    throw new Error("Vue runtime is required for weekly activity rendering.");
  }
  const { h, render } = vueRuntime;

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
  const frameEl = /** @type {HTMLElement | null} */ (container.closest?.(".analysis-evidence-frame"));
  if (frameEl) {
    frameEl.style.overflowX = "auto";
    frameEl.style.overflowY = "hidden";
    frameEl.style.alignItems = "stretch";
    frameEl.style.justifyContent = "flex-start";
  }
  container.classList.add("weekly-chart");
  container.style.width = "100%";
  container.style.maxWidth = "100%";
  container.style.alignSelf = "stretch";
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";
  clearContainerForVueRenderOnce(container);

  if (!Array.isArray(weeklyData) || !weeklyData.length) {
    render(h("p", null, UI_COPY.analytics.noData), container);
    return;
  }

  const maxCount = Math.max(...weeklyData.map(item => Number(item?.count || 0))) || 1;
  const barWidthPx = 72;
  const barGapPx = 12;
  const trackMinWidthPx = Math.max(weeklyData.length * barWidthPx + (weeklyData.length - 1) * barGapPx, 320);

  render(
    h("div", { class: "weekly-chart-wrapper" }, [
      h(
        "div",
        {
          class: "weekly-bars",
          style: { minWidth: `${trackMinWidthPx}px` },
        },
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
          return renderActionButton(h, {
            type: "button",
            className: classes.join(" "),
            attrs: {
              key: `${String(entry?.week || "week")}-${index}`,
            },
            onClick: () => {
              if (typeof onSelectRange !== "function") return;
              if (!entry?.startDate || !entry?.endDate) return;
              onSelectRange({ start: entry.startDate, end: entry.endDate, entry });
            },
            children: [
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
            ],
          });
        }),
      ),
    ]),
    container,
  );
}
