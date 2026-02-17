import { formatNumber, formatFloat } from "../utils.js";
import { escapeHtml, collectExportSummary } from "../exportSummary.js";

export function buildExportDeckMarkup({
  analytics,
  theme,
  datasetLabel,
  filterDetails = [],
  brandName,
  mode = "screen",
  generatedAt = new Date().toLocaleString(),
}) {
  const details = collectExportSummary(analytics);
  const generatedAtText = escapeHtml(generatedAt);
  const rangeLabel = escapeHtml(details.rangeLabel || "Entire history");
  const themeLabel = escapeHtml(theme?.label || "Aurora");
  const title = escapeHtml(datasetLabel || `${brandName} conversation insights`);
  const highlightEntries = details.highlights.slice(0, 6);
  const highlightList = highlightEntries.length
    ? highlightEntries
        .map(
          item =>
            `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}${
              item.descriptor ? ` — ${escapeHtml(item.descriptor)}` : ""
            }</li>`,
        )
        .join("")
    : "<li>Highlights will show once there's enough data.</li>";
  const participantEntries = details.topSenders.slice(0, 6);
  const participantList = participantEntries.length
    ? participantEntries
        .map(
          entry =>
            `<li><strong>${escapeHtml(entry.sender)}</strong>: ${formatNumber(entry.count)} messages${
              entry.share ? ` (${formatFloat(entry.share * 100, 1)}%)` : ""
            }</li>`,
        )
        .join("")
    : "<li>No participant activity recorded.</li>";
  const overviewList = details.overviewItems.length
    ? `<ul>${details.overviewItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escapeHtml("Add a dataset to populate the overview.")}</p>`;
  const paceList = details.paceItems.length
    ? `<ul>${details.paceItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escapeHtml("Need more activity to estimate pace.")}</p>`;
  const systemList = details.systemItems.length
    ? `<ul>${details.systemItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escapeHtml("No system events recorded.")}</p>`;
  const metaEntries = [
    { label: "Date range", value: rangeLabel },
    { label: "Generated", value: generatedAtText },
    { label: "Theme", value: themeLabel },
    ...filterDetails.map(info => ({ label: "Filter", value: escapeHtml(info) })),
  ];
  const metaHtml = metaEntries
    .map(
      entry => `
        <div class="cover-meta-item">
          <span>${escapeHtml(entry.label)}</span>
          <strong>${entry.value}</strong>
        </div>
      `,
    )
    .join("");
  const quickCards = details.quickStats.slice(0, 4);
  const quickCardsHtml = quickCards
    .map(
      (stat, index) => `
        <div class="stat-card" data-stat-index="${index}">
          <span class="stat-label">${escapeHtml(stat.label)}</span>
          <span class="stat-value">${escapeHtml(String(stat.value ?? "—"))}</span>
        </div>
      `,
    )
    .join("");
  const coverClasses = ["slide", "cover-slide"];
  if (mode === "print") {
    coverClasses.push("print-page", "print-break");
  }
  const bodySlideClass = mode === "print" ? "slide print-page" : "slide";
  return `
  <div class="deck" data-mode="${mode}">
    <section class="${coverClasses.join(" ")}">
      <div class="cover-content">
        <p class="cover-tag">${escapeHtml(brandName)} · ${themeLabel} theme</p>
        <h1>${title}</h1>
        <p class="cover-subtitle">${escapeHtml(theme?.tagline || `Insights prepared by ${brandName}.`)}</p>
        <div class="cover-meta">
          ${metaHtml}
        </div>
        <div class="cover-stats">
          ${quickCardsHtml}
        </div>
      </div>
    </section>
    <section class="${bodySlideClass}">
      <div class="slide-header">
        <p class="eyebrow">At a glance</p>
        <h2>Highlights</h2>
      </div>
      <div class="split-layout">
        <div class="panel">
          <h3>Guided highlights</h3>
          <ul class="bullet-list">
            ${highlightList}
          </ul>
        </div>
        <div class="panel stack">
          <div class="callout">
            <h3>Overview</h3>
            ${overviewList}
          </div>
          <div class="callout">
            <h3>Chat pace</h3>
            ${paceList}
          </div>
        </div>
      </div>
    </section>
    <section class="${bodySlideClass}">
      <div class="slide-header">
        <p class="eyebrow">Participation</p>
        <h2>Top voices & activity</h2>
      </div>
      <div class="split-layout">
        <div class="panel">
          <h3>Top voices</h3>
          <ul class="bullet-list">
            ${participantList}
          </ul>
        </div>
        <div class="panel stack">
          <div class="callout">
            <h3>Group activity</h3>
            ${systemList}
          </div>
          <div class="callout note">
            <h3>Next steps</h3>
            <p>Drop this deck into Slides, Keynote, or PowerPoint to add charts, context, and speaker notes.</p>
          </div>
        </div>
      </div>
    </section>
  </div>`;
}
