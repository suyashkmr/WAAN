import {
  buildWeekdayFilterNote,
  computeWeekdayFilteredData,
} from "../analytics/activity/weekday.js";
import { UI_COPY } from "../uiCopy.js";
import { formatFloat, formatNumber } from "../utils.js";

function buildCellLevel(value, maxValue) {
  if (value <= 0 || maxValue <= 0) return 0;
  const ratio = value / maxValue;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export function createWeekdayModel(state) {
  const distribution = Array.isArray(state?.distribution) ? state.distribution : [];
  if (!distribution.length) {
    return { mode: "empty", message: UI_COPY.analytics.noData, filterNote: buildWeekdayFilterNote(state) };
  }

  const { entries, total, std } = computeWeekdayFilteredData(state);
  if (!total) {
    return { mode: "empty", message: "No data for these filters.", filterNote: buildWeekdayFilterNote(state) };
  }

  const maxCount = Math.max(...entries.map(entry => entry.filteredCount), 1);
  const maxPeriodCount = Math.max(...entries.flatMap(entry => entry.filteredPeriods.map(period => period.count)), 1);
  const items = entries.map(entry => {
    const diffPercent = entry.filteredDeltaPercent ? entry.filteredDeltaPercent * 100 : 0;
    const diffText = entry.filteredDeltaPercent
      ? `${diffPercent >= 0 ? "+" : ""}${formatFloat(diffPercent, 1)}% vs average`
      : "About average";
    const topSenderText = entry.topSenders.length
      ? entry.topSenders
        .map(sender => `${sender.sender} (${formatNumber(sender.count)} · ${formatFloat(sender.share * 100, 1)}%)`)
        .join(", ")
      : "No sender info";
    const title = `${entry.label}\nMessages: ${formatNumber(entry.filteredCount)} (${formatFloat(
      entry.filteredShare * 100,
      1,
    )}% of filtered view)\n${diffText}\nTop senders: ${topSenderText}`;
    const badgeText = std && Math.abs(entry.filteredStdScore) >= 1
      ? (entry.filteredDeltaPercent
        ? `${entry.filteredStdScore >= 0 ? "+" : "−"}${formatFloat(Math.abs(entry.filteredDeltaPercent) * 100, 1)}% vs average`
        : (entry.filteredStdScore >= 0 ? "Above average" : "Below average"))
      : "";
    return {
      key: entry.dayIndex,
      label: entry.label,
      countText: formatNumber(entry.filteredCount),
      shareText: `${formatFloat(entry.filteredShare * 100, 1)}%`,
      barHeight: `${(entry.filteredCount / maxCount) * 100}%`,
      above: Boolean(std && entry.filteredStdScore >= 1),
      below: Boolean(std && entry.filteredStdScore <= -1),
      badgeText,
      positiveBadge: entry.filteredStdScore >= 0,
      title,
      periods: entry.filteredPeriods.map(period => ({
        label: period.label,
        value: period.count ? formatNumber(period.count) : "—",
        title: `${entry.label} ${period.label}: ${formatNumber(period.count)} messages`,
        level: buildCellLevel(period.count, maxPeriodCount),
      })),
    };
  });

  return {
    mode: "ready",
    filterNote: buildWeekdayFilterNote(state),
    items,
  };
}

export function createWeekdayRoot(h, state) {
  return {
    name: "WaanWeekdayIsland",
    setup() {
      return () => {
        const model = state.model;
        if (!model || model.mode === "empty") {
          return h("p", { class: "search-results-empty" }, model?.message || UI_COPY.analytics.noData);
        }

        return [
          h(
            "div",
            { class: "weekday-bar-grid" },
            model.items.map(item =>
              h("div", { class: "weekday-item", key: item.key }, [
                h("div", { class: "weekday-bar-container" }, [
                  h(
                    "div",
                    {
                      class: ["weekday-bar-fill", item.above ? "above" : "", item.below ? "below" : ""]
                        .filter(Boolean)
                        .join(" "),
                      style: { height: item.barHeight },
                      title: item.title,
                    },
                    [],
                  ),
                ]),
                h("div", { class: "weekday-meta" }, [
                  h("span", { class: "weekday-label" }, item.label),
                  h("span", { class: "weekday-count" }, item.countText),
                  h("span", { class: "weekday-share" }, item.shareText),
                  item.badgeText
                    ? h("span", { class: `weekday-badge ${item.positiveBadge ? "positive" : "negative"}` }, item.badgeText)
                    : null,
                ]),
              ]),
            ),
          ),
          h("div", { class: "weekday-heatmap-mobile" }, [
            h("div", { class: "weekday-heatmap-row header" }, [
              h("span", { class: "heatmap-cell corner" }),
              h("span", { class: "heatmap-cell" }, "AM"),
              h("span", { class: "heatmap-cell" }, "PM"),
            ]),
            ...model.items.map(item =>
              h("div", { class: "weekday-heatmap-row", key: `${item.key}-mobile` }, [
                h("span", { class: "heatmap-cell label" }, item.label),
                ...item.periods.map(period =>
                  h(
                    "span",
                    {
                      class: `heatmap-cell heat level-${period.level}`,
                      title: period.title,
                    },
                    period.value,
                  ),
                ),
              ]),
            ),
          ]),
        ];
      };
    },
  };
}
