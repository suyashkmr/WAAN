import { formatNumber, formatFloat, formatDisplayDate } from "../utils.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * @param {number} value
 */
function getMoodClass(value) {
  if (value >= 0.4) return "mood-strong-positive";
  if (value >= 0.15) return "mood-positive";
  if (value <= -0.4) return "mood-strong-negative";
  if (value <= -0.15) return "mood-negative";
  return "mood-neutral";
}

/**
 * @param {Array<{date?: string, count?: number, average?: number}>} dailyData
 * @param {(value: number, precision?: number) => string} formatSentimentScore
 */
function createSentimentCalendarModel(dailyData, formatSentimentScore) {
  if (!Array.isArray(dailyData) || !dailyData.length) return null;
  const dailyMap = new Map(dailyData.map(item => [String(item?.date || ""), item]));
  const firstDate = new Date(String(dailyData[0]?.date || ""));
  const lastDate = new Date(String(dailyData[dailyData.length - 1]?.date || ""));
  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) return null;
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  const months = [];
  for (let cursor = new Date(startMonth); cursor <= endMonth; cursor.setMonth(cursor.getMonth() + 1)) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];
    let weightedSum = 0;
    let totalMessages = 0;

    for (let i = 0; i < firstWeekday; i += 1) cells.push({ filler: true });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = dailyMap.get(iso);
      /** @type {string[]} */
      const classes = ["sentiment-calendar-day"];
      let title = `${formatDisplayDate(iso)} · No scored messages`;
      if (entry && Number.isFinite(entry.average)) {
        classes.push(getMoodClass(entry.average));
        title = `${formatDisplayDate(iso)} · ${formatSentimentScore(entry.average, 2)} · ${formatNumber(entry.count)} msgs`;
        weightedSum += entry.average * (entry.count || 0);
        totalMessages += entry.count || 0;
      } else {
        classes.push("sentiment-day-empty");
      }
      cells.push({
        filler: false,
        day,
        classes,
        title,
      });
    }

    const remainder = cells.length % 7;
    if (remainder) for (let i = remainder; i < 7; i += 1) cells.push({ filler: true });
    const monthAverage = totalMessages ? weightedSum / totalMessages : null;
    months.push({
      id: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[month]} ${year}`,
      avgText: monthAverage !== null ? formatSentimentScore(monthAverage, 2) : "—",
      avgClass: monthAverage !== null ? getMoodClass(monthAverage) : "",
      cells,
    });
  }
  return { months };
}

/**
 * @param {{dailyData: any[], dailyChartEl?: HTMLElement | null, trendNoteEl?: HTMLElement | null, formatSentimentScore: (value: number, precision?: number) => string, totalCount: number, averageScore: number}} params
 */
function renderSentimentTrend({
  dailyData,
  dailyChartEl,
  trendNoteEl,
  formatSentimentScore,
  totalCount,
  averageScore,
}) {
  if (!dailyChartEl) return;
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function") {
    throw new Error("Vue runtime is required for sentiment trend rendering.");
  }
  const { h, render } = VueRuntime;
  dailyChartEl.className = "sentiment-calendar-container";
  if (!dailyData?.length) {
    render(h("p", { class: "empty-state" }, "No scored messages to show."), dailyChartEl);
    if (trendNoteEl) trendNoteEl.textContent = "No scored messages for this range.";
    return;
  }
  if (trendNoteEl) {
    const start = dailyData[0].date;
    const end = dailyData[dailyData.length - 1].date;
    const averageText = formatSentimentScore(averageScore ?? 0, 2);
    trendNoteEl.textContent = `${formatDisplayDate(start)} → ${formatDisplayDate(end)} · Avg ${averageText} across ${formatNumber(totalCount)} messages`;
  }
  const model = createSentimentCalendarModel(dailyData, formatSentimentScore);
  if (!model) {
    render(h("p", { class: "empty-state" }, "No scored messages to show."), dailyChartEl);
    return;
  }
  render(
    h("div", { class: "sentiment-calendar-vue-root" }, [
      h(
        "div",
        { class: "sentiment-calendar" },
        model.months.map(month =>
          h("div", { class: "sentiment-calendar-month", key: month.id }, [
            h("div", { class: "sentiment-calendar-month-header" }, [
              h("span", null, month.label),
              h("span", { class: ["sentiment-month-average", month.avgClass] }, month.avgText),
            ]),
            h(
              "div",
              { class: "sentiment-calendar-weekdays" },
              WEEKDAY_LABELS.map(label => h("span", { key: `${month.id}-${label}` }, label)),
            ),
            h(
              "div",
              { class: "sentiment-calendar-days" },
              month.cells.map((cell, index) => {
                if (cell.filler) {
                  return h("div", { class: "sentiment-calendar-day filler", key: `${month.id}-filler-${index}` });
                }
                return h("div", { class: cell.classes.join(" "), key: `${month.id}-day-${cell.day}`, title: cell.title }, [
                  h("span", { class: "sentiment-day-number" }, String(cell.day)),
                ]);
              }),
            ),
          ]),
        ),
      ),
      h("div", { class: "sentiment-calendar-legend" }, [
        h("span", null, [
          h("span", { class: "legend-swatch legend-swatch-positive" }),
          "Positive (>= +0.15)",
        ]),
        h("span", null, [
          h("span", { class: "legend-swatch legend-swatch-neutral" }),
          "Neutral (-0.15 to +0.15)",
        ]),
        h("span", null, [
          h("span", { class: "legend-swatch legend-swatch-negative" }),
          "Negative (<= -0.15)",
        ]),
        h("span", null, [
          h("span", { class: "legend-swatch legend-swatch-empty" }),
          "No scored messages",
        ]),
      ]),
      h(
        "p",
        { class: "sentiment-calendar-note" },
        "Colour scale shows daily mood score (weighted by messages). Hatched tiles = no scored messages.",
      ),
    ]),
    dailyChartEl,
  );
}

/**
 * @param {HTMLElement | null | undefined} listEl
 * @param {any[]} entries
 * @param {"positive"|"negative"} tone
 * @param {(value: number, precision?: number) => string} formatSentimentScore
 */
function buildSentimentList(listEl, entries, tone, formatSentimentScore) {
  if (!listEl) return;
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function" || !VueRuntime.Fragment) {
    throw new Error("Vue runtime is required for sentiment participant rendering.");
  }
  const { h, render, Fragment } = VueRuntime;
  if (!entries.length) {
    render(
      h(
        "li",
        { class: "empty-state inline" },
        tone === "positive" ? "No clearly positive members." : "No clearly negative members.",
      ),
      listEl,
    );
    return;
  }
  render(
    h(
      Fragment,
      null,
      entries.map((entry, index) => {
        const positiveShare = entry.count ? (entry.positive || 0) / entry.count : 0;
        const negativeShare = entry.count ? (entry.negative || 0) / entry.count : 0;
        const shareText = tone === "positive"
          ? `${formatFloat(positiveShare * 100, 0)}% positive`
          : `${formatFloat(negativeShare * 100, 0)}% negative`;
        const scoreText = formatSentimentScore(entry.average, 2);
        const volumeText = `${formatNumber(entry.count)} msgs · ${shareText}`;
        return h("li", { key: `${entry.sender || "sender"}-${index}` }, [
          h("span", { class: "sentiment-name" }, String(entry.sender || "")),
          h("span", { class: ["sentiment-score", tone] }, scoreText),
          h("span", { class: "sentiment-volume" }, volumeText),
        ]);
      }),
    ),
    listEl,
  );
}

/**
 * @param {{participants: any[], positiveListEl?: HTMLElement | null, negativeListEl?: HTMLElement | null, formatSentimentScore: (value: number, precision?: number) => string}} params
 */
function renderSentimentParticipants({ participants, positiveListEl, negativeListEl, formatSentimentScore }) {
  if (!positiveListEl || !negativeListEl) return;
  const valid = Array.isArray(participants) ? participants.filter(entry => Number.isFinite(entry.average) && entry.count >= 3) : [];
  const positives = valid.filter(entry => entry.average > 0).sort((a, b) => b.average - a.average).slice(0, 5);
  const negatives = valid.filter(entry => entry.average < 0).sort((a, b) => a.average - b.average).slice(0, 5);
  buildSentimentList(positiveListEl, positives, "positive", formatSentimentScore);
  buildSentimentList(negativeListEl, negatives, "negative", formatSentimentScore);
}

function resolvePrimeDataView(globalScope = globalThis) {
  const primary = globalScope?.PrimeVue?.DataView;
  if (typeof primary === "function" || (primary && typeof primary === "object")) return primary;
  const secondary = globalScope?.primevue?.DataView;
  if (typeof secondary === "function" || (secondary && typeof secondary === "object")) return secondary;
  return null;
}

export function renderSentimentSection({ sentiment, elements, helpers }) {
  const {
    summaryEl,
    trendNoteEl,
    dailyChartEl,
    positiveListEl,
    negativeListEl,
  } = elements || {};
  const formatSentimentScore = helpers?.formatSentimentScore;
  if (!summaryEl || typeof formatSentimentScore !== "function") return;
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function") {
    throw new Error("Vue runtime is required for sentiment rendering.");
  }
  const { h, render } = VueRuntime;
  const PrimeDataView = resolvePrimeDataView(globalThis);
  const usePrimeDataView = Boolean(PrimeDataView);
  const totals = sentiment?.totals || {};
  const totalCount = (totals.positive || 0) + (totals.neutral || 0) + (totals.negative || 0);
  const summaryData = totalCount
    ? [
      {
        key: "positive",
        label: "Positive",
        value: totals.positive || 0,
        share: totalCount ? (totals.positive || 0) / totalCount : 0,
      },
      {
        key: "neutral",
        label: "Neutral",
        value: totals.neutral || 0,
        share: totalCount ? (totals.neutral || 0) / totalCount : 0,
      },
      {
        key: "negative",
        label: "Negative",
        value: totals.negative || 0,
        share: totalCount ? (totals.negative || 0) / totalCount : 0,
      },
      {
        key: "average",
        label: "Average",
        value: formatSentimentScore(sentiment?.average ?? 0, 2),
        hint: `${formatNumber(totalCount)} msgs`,
      },
    ]
    : [];

  if (!summaryData.length) {
    render(h("p", { class: "empty-state" }, "No sentiment data for this range."), summaryEl);
  } else {
    const renderSummaryTile = item => {
      const shareValue = typeof item.share === "number" ? `${formatFloat((item.share || 0) * 100, 1)}%` : item.hint ?? "";
      const displayValue = typeof item.value === "string" ? item.value : formatNumber(item.value);
      return h("div", { class: ["sentiment-tile", item.key], key: item.key }, [
        h("span", { class: "sentiment-label" }, item.label),
        h("span", { class: "sentiment-value" }, displayValue),
        h("span", { class: "sentiment-share" }, shareValue),
      ]);
    };
    render(
      usePrimeDataView
        ? h(PrimeDataView, {
            value: summaryData,
            dataKey: "key",
            unstyled: true,
            "data-ui-runtime": "primevue",
          }, {
            list: slotProps => {
              const items = Array.isArray(slotProps?.items) ? slotProps.items : summaryData;
              return items.map(renderSummaryTile);
            },
          })
        : h(
            VueRuntime.Fragment,
            null,
            summaryData.map(renderSummaryTile),
          ),
      summaryEl,
    );
  }
  const activeDays = (sentiment?.daily || []).filter(item => (item?.count || 0) > 0);
  renderSentimentTrend({
    dailyData: activeDays,
    dailyChartEl,
    trendNoteEl,
    formatSentimentScore,
    totalCount,
    averageScore: sentiment?.average ?? 0,
  });
  renderSentimentParticipants({
    participants: sentiment?.participants || [],
    positiveListEl,
    negativeListEl,
    formatSentimentScore,
  });
}
