import {
  formatNumber,
  formatFloat,
  formatDisplayDate,
  sanitizeText,
} from "../utils.js";

function renderSentimentTrend({ dailyData, dailyChartEl, trendNoteEl, formatSentimentScore, totalCount, averageScore }) {
  if (!dailyChartEl) return;
  dailyChartEl.innerHTML = "";
  dailyChartEl.className = "sentiment-calendar-container";

  if (!dailyData?.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No scored messages to show.";
    dailyChartEl.appendChild(empty);
    if (trendNoteEl) trendNoteEl.textContent = "No scored messages for this range.";
    return;
  }

  if (trendNoteEl) {
    const start = dailyData[0].date;
    const end = dailyData[dailyData.length - 1].date;
    const averageText = formatSentimentScore(averageScore ?? 0, 2);
    trendNoteEl.textContent = `${formatDisplayDate(start)} → ${formatDisplayDate(end)} · Avg ${averageText} across ${formatNumber(totalCount)} messages`;
  }

  const dailyMap = new Map();
  dailyData.forEach(item => dailyMap.set(item.date, item));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDate = new Date(dailyData[0].date);
  firstDate.setHours(0, 0, 0, 0);
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  lastDate.setHours(0, 0, 0, 0);

  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

  const calendar = document.createElement("div");
  calendar.className = "sentiment-calendar";

  const getMoodClass = value => {
    if (value >= 0.4) return "mood-strong-positive";
    if (value >= 0.15) return "mood-positive";
    if (value <= -0.4) return "mood-strong-negative";
    if (value <= -0.15) return "mood-negative";
    return "mood-neutral";
  };

  for (let cursor = new Date(startMonth); cursor <= endMonth; cursor.setMonth(cursor.getMonth() + 1)) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthCard = document.createElement("div");
    monthCard.className = "sentiment-calendar-month";

    const header = document.createElement("div");
    header.className = "sentiment-calendar-month-header";
    const label = document.createElement("span");
    label.textContent = `${monthNames[month]} ${year}`;
    const avgSpan = document.createElement("span");
    avgSpan.className = "sentiment-month-average";

    let weightedSum = 0;
    let totalMessages = 0;

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "sentiment-calendar-weekdays";
    weekdayLabels.forEach(labelText => {
      const span = document.createElement("span");
      span.textContent = labelText;
      weekdaysRow.appendChild(span);
    });

    const grid = document.createElement("div");
    grid.className = "sentiment-calendar-days";

    const firstWeekday = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstWeekday; i += 1) {
      const filler = document.createElement("div");
      filler.className = "sentiment-calendar-day filler";
      grid.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = dailyMap.get(iso);
      const cell = document.createElement("div");
      cell.className = "sentiment-calendar-day";
      const numberEl = document.createElement("span");
      numberEl.className = "sentiment-day-number";
      numberEl.textContent = day;
      cell.appendChild(numberEl);

      if (entry && Number.isFinite(entry.average)) {
        const moodClass = getMoodClass(entry.average);
        cell.classList.add(moodClass);
        const tooltip = `${formatDisplayDate(iso)} · ${formatSentimentScore(entry.average, 2)} · ${formatNumber(entry.count)} msgs`;
        cell.title = tooltip;
        weightedSum += entry.average * (entry.count || 0);
        totalMessages += entry.count || 0;
      } else {
        cell.classList.add("sentiment-day-empty");
        cell.title = `${formatDisplayDate(iso)} · No scored messages`;
      }

      grid.appendChild(cell);
    }

    const remainder = grid.children.length % 7;
    if (remainder) {
      for (let i = remainder; i < 7; i += 1) {
        const filler = document.createElement("div");
        filler.className = "sentiment-calendar-day filler";
        grid.appendChild(filler);
      }
    }

    const monthAverage = totalMessages ? weightedSum / totalMessages : null;
    if (monthAverage !== null) {
      avgSpan.textContent = formatSentimentScore(monthAverage, 2);
      avgSpan.classList.add(getMoodClass(monthAverage));
    } else {
      avgSpan.textContent = "—";
    }

    header.append(label, avgSpan);
    monthCard.append(header, weekdaysRow, grid);
    calendar.appendChild(monthCard);
  }

  dailyChartEl.appendChild(calendar);

  const legend = document.createElement("div");
  legend.className = "sentiment-calendar-legend";
  legend.innerHTML = `
    <span><span class="legend-swatch legend-swatch-positive"></span>Positive (≥ +0.15)</span>
    <span><span class="legend-swatch legend-swatch-neutral"></span>Neutral (−0.15 to +0.15)</span>
    <span><span class="legend-swatch legend-swatch-negative"></span>Negative (≤ −0.15)</span>
    <span><span class="legend-swatch legend-swatch-empty"></span>No scored messages</span>
  `;
  dailyChartEl.appendChild(legend);

  const calendarNote = document.createElement("p");
  calendarNote.className = "sentiment-calendar-note";
  calendarNote.textContent = "Colour scale shows daily mood score (weighted by messages). Hatched tiles = no scored messages.";
  dailyChartEl.appendChild(calendarNote);
}

function buildSentimentList(listEl, entries, tone, formatSentimentScore) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state inline";
    empty.textContent = tone === "positive"
      ? "No clearly positive members."
      : "No clearly negative members.";
    listEl.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const li = document.createElement("li");
    const positiveShare = entry.count ? (entry.positive || 0) / entry.count : 0;
    const negativeShare = entry.count ? (entry.negative || 0) / entry.count : 0;
    const shareText = tone === "positive"
      ? `${formatFloat(positiveShare * 100, 0)}% positive`
      : `${formatFloat(negativeShare * 100, 0)}% negative`;
    const scoreText = formatSentimentScore(entry.average, 2);
    const volumeText = `${formatNumber(entry.count)} msgs · ${shareText}`;

    li.innerHTML = `
      <span class="sentiment-name">${sanitizeText(entry.sender)}</span>
      <span class="sentiment-score ${sanitizeText(tone)}">${sanitizeText(scoreText)}</span>
      <span class="sentiment-volume">${sanitizeText(volumeText)}</span>
    `;
    listEl.appendChild(li);
  });
}

function renderSentimentParticipants({ participants, positiveListEl, negativeListEl, formatSentimentScore }) {
  if (!positiveListEl || !negativeListEl) return;
  const valid = Array.isArray(participants)
    ? participants.filter(entry => Number.isFinite(entry.average) && entry.count >= 3)
    : [];

  const positives = valid
    .filter(entry => entry.average > 0)
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  const negatives = valid
    .filter(entry => entry.average < 0)
    .sort((a, b) => a.average - b.average)
    .slice(0, 5);

  buildSentimentList(positiveListEl, positives, "positive", formatSentimentScore);
  buildSentimentList(negativeListEl, negatives, "negative", formatSentimentScore);
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
    summaryEl.innerHTML = `
      <p class="empty-state">No sentiment data for this range.</p>
    `;
  } else {
    summaryEl.innerHTML = summaryData
      .map(item => {
        const shareValue = typeof item.share === "number"
          ? `${formatFloat((item.share || 0) * 100, 1)}%`
          : item.hint ?? "";
        return `
          <div class="sentiment-tile ${sanitizeText(item.key)}">
            <span class="sentiment-label">${sanitizeText(item.label)}</span>
            <span class="sentiment-value">${sanitizeText(
              typeof item.value === "string" ? item.value : formatNumber(item.value),
            )}</span>
            <span class="sentiment-share">${sanitizeText(shareValue)}</span>
          </div>
        `;
      })
      .join("");
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
