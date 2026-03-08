import { sanitizeText, formatNumber, formatDisplayDate } from "../utils.js";
import { clearContainerForVueRenderOnce } from "../vue/renderMountUtils.js";

export function renderPollsSection({ data, elements = {}, vueRuntime = null } = {}) {
  const { listEl, totalsEl, creatorsEl, noteEl } = elements;
  if (!listEl) return;
  const canRenderWithVue = Boolean(
    vueRuntime &&
    typeof vueRuntime.h === "function" &&
    typeof vueRuntime.render === "function" &&
    vueRuntime.Fragment,
  );

  const total = Number.isFinite(data?.total) && data.total > 0 ? data.total : 0;
  const creators = Number.isFinite(data?.unique_creators) && data.unique_creators > 0
    ? data.unique_creators
    : 0;

  if (totalsEl) totalsEl.textContent = formatNumber(total);
  if (creatorsEl) creatorsEl.textContent = formatNumber(creators);

  const entries = Array.isArray(data?.entries) ? data.entries.slice(0, 5) : [];
  clearContainerForVueRenderOnce(listEl);

  if (!entries.length) {
    if (canRenderWithVue) {
      const { h, render } = vueRuntime;
      render(h("li", { class: "empty-state" }, "No polls captured yet."), listEl);
    } else {
      throw new Error("Vue runtime is required for polls rendering.");
    }
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

  if (canRenderWithVue) {
    const { h, render, Fragment } = vueRuntime;
    render(
      h(
        Fragment,
        null,
        entries.map((entry, index) => {
          const title = entry.title || "Poll";
          const sender = entry.sender || "Unknown";
          const timeLabel = formatTimestamp(entry);
          const metaParts = [sender ? `By ${sender}` : null, timeLabel || null].filter(Boolean);
          const options = Array.isArray(entry.options) ? entry.options.slice(0, 6) : [];
          return h("li", { class: "poll-item", key: `${entry.id || entry.timestamp || index}` }, [
            h("div", { class: "poll-item-title" }, title),
            h("div", { class: "poll-item-meta" }, metaParts.join(" · ")),
            options.length
              ? h(
                  "div",
                  { class: "poll-item-options" },
                  options.map((option, optionIndex) => h("span", { key: `${optionIndex}-${option}` }, option)),
                )
              : null,
          ]);
        }),
      ),
      listEl,
    );
  } else {
    throw new Error("Vue runtime is required for polls rendering.");
  }

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
