import { formatFloat } from "../utils.js";
import { clearContainerForVueRenderOnce } from "../vue/renderMountUtils.js";
import { UI_COPY } from "../uiCopy.js";

export function renderMessageTypesSection({ data, elements = {}, vueRuntime = null } = {}) {
  const { summaryEl, noteEl } = elements;
  if (!summaryEl) return;
  const VueRuntime = vueRuntime;
  if (!VueRuntime || typeof VueRuntime.h !== "function" || typeof VueRuntime.render !== "function") {
    throw new Error("Vue runtime is required for message-types rendering.");
  }
  const { h, render } = VueRuntime;

  const summary = Array.isArray(data?.summary) ? data.summary : [];
  clearContainerForVueRenderOnce(summaryEl);

  if (!summary.length) {
    render(
      h("p", { class: "empty-state" }, UI_COPY.analytics.noMessageTypes),
      summaryEl,
    );
    if (noteEl) noteEl.textContent = "";
    return;
  }

  const shareSnippets = summary
    .map(entry => `${entry.label}: ${formatFloat((entry.share || 0) * 100, 1)}%`)
    .join(" · ");

  render(
    h("p", { class: "message-type-share-summary" }, shareSnippets),
    summaryEl,
  );

  if (noteEl) noteEl.textContent = "";
}
