import { formatFloat } from "../utils.js";

export function renderMessageTypesSection({ data, elements = {} } = {}) {
  const { summaryEl, noteEl } = elements;
  if (!summaryEl) return;

  const summary = Array.isArray(data?.summary) ? data.summary : [];
  summaryEl.innerHTML = "";

  if (!summary.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No message categories for this range.";
    summaryEl.appendChild(empty);
    if (noteEl) noteEl.textContent = "";
    return;
  }

  const shareSnippets = summary
    .map(entry => `${entry.label}: ${formatFloat((entry.share || 0) * 100, 1)}%`)
    .join(" · ");

  const summaryText = document.createElement("p");
  summaryText.className = "message-type-share-summary";
  summaryText.textContent = `Share by type → ${shareSnippets}.`;
  summaryEl.appendChild(summaryText);

  if (noteEl) noteEl.textContent = "";
}
