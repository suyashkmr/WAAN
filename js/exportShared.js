import { formatNumber, formatFloat } from "./utils.js";
import { BRAND_NAME } from "./config.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function collectExportSummary(analytics) {
  const highlights = (analytics.highlights || []).map(item => ({
    label: item.label || "Highlight",
    value: item.value || "",
    descriptor: item.descriptor || "",
  }));
  const topSenders = (analytics.top_senders || []).slice(0, 10);
  const systemSummary = analytics.system_summary || {};
  const weeklySummary = analytics.weekly_summary || {};
  const range = analytics.date_range || {};
  const rangeLabel =
    range.start && range.end ? `${range.start} → ${range.end}` : null;
  const overviewItems = [
    `Messages in total: ${formatNumber(analytics.total_messages ?? 0)}`,
    `People who spoke: ${formatNumber(analytics.unique_senders ?? 0)}`,
    `System notices: ${formatNumber(systemSummary.count || 0)}`,
    rangeLabel ? `Covers: ${rangeLabel}` : null,
  ].filter(Boolean);
  const paceItems = [
    `Average per day: ${formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1)} messages`,
    `Average per week: ${formatFloat(weeklySummary.averagePerWeek ?? 0, 1)} messages`,
    analytics.hourly_summary?.topHour
      ? `Busiest hour: ${formatTopHourLabel(analytics.hourly_summary.topHour)}`
      : null,
  ].filter(Boolean);
  const systemItems = [
    `People joined: ${formatNumber(systemSummary.joins || 0)}`,
    `Join requests: ${formatNumber(systemSummary.join_requests || 0)}`,
    `Added by admins: ${formatNumber(systemSummary.added || 0)}`,
    `Left on their own: ${formatNumber(systemSummary.left || 0)}`,
    `Removed by admins: ${formatNumber(systemSummary.removed || 0)}`,
    `Settings changes: ${formatNumber(systemSummary.changed || 0)}`,
  ];
  const quickStats = [
    { label: "Messages", value: formatNumber(analytics.total_messages ?? 0) },
    { label: "Participants", value: formatNumber(analytics.unique_senders ?? 0) },
    { label: "Avg/day", value: formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1) },
    {
      label: "Top sender",
      value: topSenders.length
        ? `${topSenders[0].sender} (${formatNumber(topSenders[0].count)} msgs)`
        : "Not enough data",
    },
  ];
  return {
    highlights,
    topSenders,
    systemSummary,
    weeklySummary,
    overviewItems,
    paceItems,
    systemItems,
    quickStats,
    rangeLabel,
  };
}

export function buildMarkdownReport({
  analytics,
  theme,
  datasetLabel,
  filterDetails = [],
  brandName = BRAND_NAME,
}) {
  const nowIso = new Date().toISOString();
  const title = datasetLabel || `${brandName} Chat`;
  const details = collectExportSummary(analytics);
  const highlights = details.highlights;
  const topSenders = details.topSenders;
  const messageTypeSummary = analytics.message_types?.summary || [];
  const systemSummary = details.systemSummary;
  const weeklySummary = details.weeklySummary;

  const lines = [];
  lines.push(`# ${title} – Conversation summary`);
  lines.push(`_${theme?.tagline || `Insights prepared by ${brandName}.`}_`);
  lines.push(`*Created ${nowIso} · Styled with the ${theme?.label || "Aurora"} theme*`);
  if (details.rangeLabel) {
    lines.push("");
    lines.push(`> **Date range:** ${details.rangeLabel}`);
  }
  if (filterDetails.length) {
    lines.push(`> **Filters:** ${filterDetails.join(" · ")}`);
  }
  lines.push(`> **Report style:** ${theme?.label || "Default"}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Quick glance");
  if (details.overviewItems.length) {
    details.overviewItems.forEach(item => lines.push(`- ${item}`));
  } else {
    lines.push("- Load a dataset to populate this section.");
  }
  lines.push("");
  lines.push("## Highlights");
  if (highlights.length) {
    highlights.forEach(item => lines.push(`- **${item.label}:** ${item.value} ${item.descriptor || ""}`));
  } else {
    lines.push("- Highlights will appear once enough activity is available.");
  }
  lines.push("");
  lines.push("## Top participants");
  if (topSenders.length) {
    topSenders.slice(0, 10).forEach((entry, idx) => {
      lines.push(
        `${idx + 1}. **${entry.sender}** — ${formatNumber(entry.count)} messages${
          entry.share ? ` (${formatFloat(entry.share * 100, 1)}%)` : ""
        }`,
      );
    });
  } else {
    lines.push("- No participants fit the current filters.");
  }
  lines.push("");
  lines.push("## Message types");
  if (messageTypeSummary.length) {
    messageTypeSummary.forEach(entry => {
      lines.push(
        `- ${entry.group}: ${entry.type} — ${formatNumber(entry.count)} (${formatFloat(
          (entry.share || 0) * 100,
          1,
        )}%)`,
      );
    });
  } else {
    lines.push("- Provide message type data to populate this section.");
  }
  lines.push("");
  lines.push("## System events");
  systemSummary &&
    lines.push(
      [
        `Joins: ${formatNumber(systemSummary.joins || 0)}`,
        `Added: ${formatNumber(systemSummary.added || 0)}`,
        `Left: ${formatNumber(systemSummary.left || 0)}`,
        `Removed: ${formatNumber(systemSummary.removed || 0)}`,
        `Changed: ${formatNumber(systemSummary.changed || 0)}`,
      ].join(" · "),
    );
  lines.push("");
  lines.push("## Weekly recap");
  if (weeklySummary.latestDeltaPercent !== null && weeklySummary.latestDeltaPercent !== undefined) {
    const percent = formatFloat(Math.abs(weeklySummary.latestDeltaPercent) * 100, 1);
    const direction = weeklySummary.latestDeltaPercent > 0 ? "increase" : "decrease";
    lines.push(`- Activity shows a ${direction} of ${percent}% compared to the previous week.`);
  } else {
    lines.push("- Weekly data will appear once you're synced.");
  }
  lines.push("");
  lines.push(`_Generated by ${brandName}_`);
  return lines.join("\n");
}

function buildExportDeckCss(theme, { mode = "screen" } = {}) {
  const accent = theme?.accent || "#4c6ef5";
  const accentSoft = theme?.accentSoft || "rgba(76, 110, 245, 0.2)";
  const surface = theme?.surface || "#ffffff";
  const canvas = theme?.canvas || "#f5f7fb";
  const text = theme?.text || "#0f172a";
  const muted = theme?.muted || "#475569";
  const border = theme?.border || "rgba(15, 23, 42, 0.1)";
  const coverGradient = theme?.coverGradient || `linear-gradient(135deg, ${accent}, ${accent})`;
  const coverPattern = theme?.coverPattern || "none";
  const coverText = theme?.coverText || "#f8fafc";
  const badge = theme?.badge || accentSoft;
  const shadow = theme?.cardShadow || "0 25px 60px rgba(15, 23, 42, 0.25)";
  const deckPadding = mode === "print" ? "1in 0.75in" : "3rem 2rem";
  const slideWidth = mode === "screen" ? "960px" : "100%";
  const slidePadding = mode === "print" ? "1.75rem 2rem" : "2.75rem 3rem";
  const deckGap = mode === "print" ? "1.3rem" : "3rem";
  const fontSize = mode === "print" ? "14px" : "16px";
  const colorScheme = theme?.dark ? "dark" : "light";
  return `
    :root {
      color-scheme: ${colorScheme};
      --deck-bg: ${canvas};
      --deck-surface: ${surface};
      --deck-text: ${text};
      --deck-muted: ${muted};
      --deck-border: ${border};
      --deck-accent: ${accent};
      --deck-accent-soft: ${accentSoft};
      --deck-cover-gradient: ${coverGradient};
      --deck-cover-pattern: ${coverPattern};
      --deck-cover-text: ${coverText};
      --deck-badge: ${badge};
      --deck-shadow: ${shadow};
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--deck-bg);
      color: var(--deck-text);
      font-size: ${fontSize};
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .deck {
      display: flex;
      flex-direction: column;
      gap: ${deckGap};
      padding: ${deckPadding};
      align-items: ${mode === "print" ? "stretch" : "center"};
    }
    .slide {
      width: ${slideWidth};
      max-width: 100%;
      background: var(--deck-surface);
      border-radius: 28px;
      border: 1px solid var(--deck-border);
      padding: ${slidePadding};
      box-shadow: ${mode === "print" ? "none" : "var(--deck-shadow)"};
      position: relative;
      overflow: hidden;
    }
    .cover-slide {
      background-image: var(--deck-cover-gradient);
      color: var(--deck-cover-text);
      border: none;
      box-shadow: ${mode === "print" ? "none" : "0 35px 80px rgba(0, 0, 0, 0.35)"};
    }
    .cover-slide::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: var(--deck-cover-pattern);
      opacity: 0.7;
      pointer-events: none;
    }
    .cover-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .cover-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      background: var(--deck-badge);
      color: var(--deck-text);
      font-weight: 600;
      width: fit-content;
    }
    .cover-subtitle {
      font-size: 1.15rem;
      margin: 0;
      color: inherit;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .cover-meta-item span {
      display: block;
      font-size: 0.85rem;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cover-meta-item strong {
      display: block;
      font-size: 1.05rem;
      margin-top: 0.3rem;
    }
    .cover-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      padding: 1rem 1.2rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, ${theme?.dark ? "0.08" : "0.15"});
      border: 1px solid rgba(255, 255, 255, 0.35);
      backdrop-filter: blur(4px);
    }
    .stat-label {
      display: block;
      font-size: 0.85rem;
      opacity: 0.85;
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 600;
      margin-top: 0.2rem;
    }
    .slide-header {
      margin-bottom: 1.5rem;
    }
    .eyebrow {
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      color: var(--deck-accent);
      margin: 0 0 0.25rem 0;
    }
    h1, h2, h3 {
      margin: 0;
      line-height: 1.2;
    }
    h1 {
      font-size: 2.8rem;
    }
    h2 {
      font-size: 2rem;
    }
    h3 {
      font-size: 1.2rem;
      margin-bottom: 0.6rem;
    }
    .split-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .panel.stack .callout {
      flex: 1;
    }
    .bullet-list {
      margin: 0;
      padding-left: 1.2rem;
    }
    .bullet-list li {
      margin-bottom: 0.6rem;
      line-height: 1.4;
    }
    .callout {
      border-radius: 20px;
      border: 1px solid var(--deck-border);
      padding: 1rem 1.2rem;
      background: color-mix(in srgb, var(--deck-surface) 85%, var(--deck-accent-soft));
    }
    .callout.note {
      background: color-mix(in srgb, var(--deck-surface) 70%, var(--deck-accent-soft));
    }
    .callout p {
      margin: 0;
      color: var(--deck-muted);
    }
    .empty {
      margin: 0;
      color: var(--deck-muted);
      font-style: italic;
    }
    .print-page {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 1rem;
    }
    .print-break {
      page-break-after: always;
      break-after: page;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ${mode === "print" ? `
    @page {
      size: A4;
      margin: 0.5in;
    }
    body {
      background: #fff;
    }` : ""}
  `;
}

function buildExportDeckMarkup({
  analytics,
  theme,
  datasetLabel,
  filterDetails = [],
  brandName = BRAND_NAME,
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

export function buildSlidesHtml({
  analytics,
  theme,
  datasetLabel,
  filterDetails,
  brandName,
}) {
  const styles = buildExportDeckCss(theme, { mode: "screen" });
  const deckMarkup = buildExportDeckMarkup({
    analytics,
    theme,
    datasetLabel,
    filterDetails,
    brandName,
    mode: "screen",
  });
  const title = escapeHtml(`${datasetLabel || "ChatScope conversation report"}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} – Slides</title>
  <style>${styles}</style>
</head>
<body>
${deckMarkup}
</body>
</html>`;
}

export function buildPdfDocumentHtml({
  analytics,
  theme,
  datasetLabel,
  filterDetails,
  brandName,
}) {
  const title = escapeHtml(`${datasetLabel || "ChatScope conversation"} – PDF`);
  const styles = buildExportDeckCss(theme, { mode: "print" });
  const deckMarkup = buildExportDeckMarkup({
    analytics,
    theme,
    datasetLabel,
    filterDetails,
    brandName,
    mode: "print",
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
${deckMarkup}
</body>
</html>`;
}
function formatTopHourLabel(topHour) {
  if (!topHour) return "";
  const weekdayLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayLabel =
    typeof topHour.dayIndex === "number" && weekdayLong[topHour.dayIndex]
      ? weekdayLong[topHour.dayIndex]
      : "Day";
  const hourLabel = String(topHour.hour ?? 0).padStart(2, "0");
  return `${dayLabel} ${hourLabel}:00`;
}
