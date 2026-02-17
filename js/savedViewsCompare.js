export function renderSavedViewsComparison({
  compareSummaryEl,
  allViews,
  selection,
  primaryId,
  secondaryId,
  getSavedViewById,
  ensureViewSnapshot,
  formatSavedViewRange,
  formatTopHourLabel,
  formatNumber,
  formatFloat,
  sanitizeText,
}) {
  if (!compareSummaryEl) return;
  if (allViews.length < 2) {
    compareSummaryEl.classList.add("empty");
    compareSummaryEl.textContent = allViews.length
      ? "Save one more view to enable comparisons."
      : "Save a view to start building comparisons.";
    return;
  }

  const primaryView = getSavedViewById(primaryId ?? selection.primary);
  const secondaryView = getSavedViewById(secondaryId ?? selection.secondary);

  if (!primaryView || !secondaryView) {
    compareSummaryEl.classList.add("empty");
    compareSummaryEl.innerHTML = "<p>Pick two saved views to compare their activity side-by-side.</p>";
    return;
  }

  const primarySnapshot = ensureViewSnapshot(primaryView);
  const secondarySnapshot = ensureViewSnapshot(secondaryView);

  if (!primarySnapshot || !secondarySnapshot) {
    compareSummaryEl.classList.add("empty");
    compareSummaryEl.innerHTML = "<p>Unable to compute comparison for these views. Try re-saving them.</p>";
    return;
  }

  compareSummaryEl.classList.remove("empty");
  const metrics = [
    { key: "range", label: "Date Range", get: (snapshot, view) => formatSavedViewRange(view), diff: false },
    { key: "totalMessages", label: "Messages", get: snapshot => snapshot.totalMessages, diff: true, digits: 0 },
    { key: "uniqueSenders", label: "Participants", get: snapshot => snapshot.uniqueSenders, diff: true, digits: 0 },
    { key: "averageWords", label: "Avg words per message", get: snapshot => snapshot.averageWords, diff: true, digits: 1 },
    { key: "averageChars", label: "Avg characters per message", get: snapshot => snapshot.averageChars, diff: true, digits: 1 },
    { key: "weeklyAverage", label: "Avg per week", get: snapshot => snapshot.weeklyAverage, diff: true, digits: 1 },
    { key: "dailyAverage", label: "Avg per day", get: snapshot => snapshot.dailyAverage, diff: true, digits: 1 },
    {
      key: "topSender",
      label: "Top Sender",
      get: snapshot =>
        snapshot.topSender
          ? `${snapshot.topSender.sender} (${formatNumber(snapshot.topSender.count)} msgs)`
          : null,
      diff: false,
    },
    {
      key: "topHour",
      label: "Top Hour",
      get: snapshot =>
        snapshot.topHour
          ? `${formatTopHourLabel(snapshot)} (${formatNumber(snapshot.topHour.count)} msgs)`
          : null,
      diff: false,
    },
  ];

  const buildColumn = (heading, view, snapshot) => {
    const items = metrics
      .map(metric => {
        const value = metric.get(snapshot, view);
        const display =
          value === null || value === undefined
            ? "—"
            : typeof value === "number" && !Number.isNaN(value)
              ? metric.digits && metric.digits > 0
                ? formatFloat(value, metric.digits)
                : formatNumber(value)
              : sanitizeText(String(value));
        return `
            <li>
              <span class="compare-label">${sanitizeText(metric.label)}</span>
              <span class="compare-value">${display}</span>
            </li>
          `;
      })
      .join("");
    return `
        <div class="compare-column">
          <h3>${sanitizeText(heading)} · ${sanitizeText(view.name)}</h3>
          <ul class="compare-metrics">
            ${items}
          </ul>
        </div>
      `;
  };

  const buildDiffColumn = () => {
    const rows = metrics
      .filter(metric => metric.diff)
      .map(metric => {
        const valueA = metric.get(primarySnapshot);
        const valueB = metric.get(secondarySnapshot);
        if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
          return `
              <li>
                <span class="compare-label">${sanitizeText(metric.label)}</span>
                <span class="compare-value">—</span>
              </li>
            `;
        }
        const diff = valueB - valueA;
        const digits = metric.digits ?? 0;
        const formatted =
          Math.abs(diff) < 0.0001
            ? "0"
            : digits && digits > 0
              ? formatFloat(diff, digits)
              : formatNumber(diff);
        const prefix = diff > 0 && !formatted.startsWith("+") ? "+" : "";
        const className = diff > 0
          ? "compare-value compare-diff positive"
          : diff < 0
            ? "compare-value compare-diff negative"
            : "compare-value";
        return `
            <li>
              <span class="compare-label">${sanitizeText(metric.label)}</span>
              <span class="${className}">${sanitizeText(`${prefix}${formatted}`)}</span>
            </li>
          `;
      })
      .join("");
    return `
        <div class="compare-column">
          <h3>Difference (B - A)</h3>
          <ul class="compare-metrics">
            ${rows}
          </ul>
        </div>
      `;
  };

  compareSummaryEl.innerHTML = `
      <div class="compare-summary-grid">
        ${buildColumn("View A", primaryView, primarySnapshot)}
        ${buildColumn("View B", secondaryView, secondarySnapshot)}
        ${buildDiffColumn()}
      </div>
    `;
}
