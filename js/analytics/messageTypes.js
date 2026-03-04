import { formatFloat } from "../utils.js";

export function renderMessageTypesSection({ data, elements = {} } = {}) {
  const { summaryEl, noteEl } = elements;
  if (!summaryEl) return;
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function") {
    throw new Error("Vue runtime is required for message-types rendering.");
  }
  const { h, render } = VueRuntime;

  const summary = Array.isArray(data?.summary) ? data.summary : [];

  if (!summary.length) {
    render(
      h("p", { class: "empty-state" }, "No message categories for this range."),
      summaryEl,
    );
    if (noteEl) noteEl.textContent = "";
    return;
  }

  const shareSnippets = summary
    .map(entry => `${entry.label}: ${formatFloat((entry.share || 0) * 100, 1)}%`)
    .join(" · ");

  render(
    h("p", { class: "message-type-share-summary" }, `Share by type → ${shareSnippets}.`),
    summaryEl,
  );

  if (noteEl) noteEl.textContent = "";
}
