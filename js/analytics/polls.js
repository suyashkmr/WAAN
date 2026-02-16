import { sanitizeText, formatNumber, formatDisplayDate } from "../utils.js";

export function renderPollsSection({ data, elements = {} } = {}) {
  const { listEl, totalsEl, creatorsEl, noteEl } = elements;
  if (!listEl) return;

  const total = Number.isFinite(data?.total) && data.total > 0 ? data.total : 0;
  const creators = Number.isFinite(data?.unique_creators) && data.unique_creators > 0
    ? data.unique_creators
    : 0;

  if (totalsEl) totalsEl.textContent = formatNumber(total);
  if (creatorsEl) creatorsEl.textContent = formatNumber(creators);

  const entries = Array.isArray(data?.entries) ? data.entries.slice(0, 5) : [];

  if (!entries.length) {
    listEl.innerHTML = '<li class="empty-state">No polls captured yet.</li>';
    if (noteEl) {
      noteEl.textContent = "Load a chat that includes poll messages to surface them here.";
    }
    return;
  }

  const formatTimestamp = entry => {
    if (entry.timestamp) return formatDisplayDate(entry.timestamp);
    if (entry.timestamp_text) return entry.timestamp_text;
    return "";
  };

  listEl.innerHTML = entries
    .map(entry => {
      const title = sanitizeText(entry.title || "Poll");
      const sender = entry.sender || "Unknown";
      const timeLabel = formatTimestamp(entry);
      const metaParts = [sender ? `By ${sender}` : null, timeLabel || null].filter(Boolean);
      const options = Array.isArray(entry.options) ? entry.options.slice(0, 6) : [];
      const optionsMarkup = options.length
        ? `<div class="poll-item-options">${options
            .map(option => `<span>${sanitizeText(option)}</span>`)
            .join("")}</div>`
        : "";
      return `
        <li class="poll-item">
          <div class="poll-item-title">${title}</div>
          <div class="poll-item-meta">${metaParts.map(text => sanitizeText(text)).join(" · ")}</div>
          ${optionsMarkup}
        </li>
      `;
    })
    .join("");

  if (noteEl) {
    const topCreator = Array.isArray(data?.top_creators) ? data.top_creators[0] : null;
    const noteParts = [`${formatNumber(total)} polls recorded`];
    if (topCreator) {
      noteParts.push(
        `Most polls: ${sanitizeText(topCreator.sender || "Unknown")} (${formatNumber(topCreator.count || 0)})`,
      );
    } else if (creators) {
      noteParts.push(`${formatNumber(creators)} people created polls`);
    }
    noteEl.textContent = noteParts.join(" · ");
  }
}
