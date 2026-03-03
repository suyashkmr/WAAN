import {
  formatNumber,
  formatDateRangeWithTime,
} from "../utils.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
export { renderParticipants } from "./summaryParticipants.js";

export function renderSummaryCards({ analytics, label, summaryEl }) {
  if (!summaryEl || !analytics) return;
  const startTimestamp = analytics.first_timestamp || analytics.date_range.start;
  const endTimestamp = analytics.last_timestamp || analytics.date_range.end;
  const dateRangeValue = startTimestamp && endTimestamp
    ? formatDateRangeWithTime(startTimestamp, endTimestamp)
    : startTimestamp || endTimestamp
      ? formatDateRangeWithTime(startTimestamp, endTimestamp)
      : "—";

  const cards = [
    {
      title: "Total Messages",
      value: formatNumber(analytics.total_messages),
      hint: `${formatNumber(analytics.total_entries)} chat lines including system messages`,
    },
    {
      title: "Active Participants",
      value: formatNumber(analytics.unique_senders),
      hint: label,
    },
    {
      title: "System Events Logged",
      value: formatNumber(analytics.total_system),
      hint: "Joins, adds, leaves, removals, changes",
    },
    {
      title: "Date Range",
      value: dateRangeValue,
      hint:
        analytics.date_range.start && analytics.date_range.end
          ? `${formatNumber(analytics.weekly_summary.weekCount)} weeks of activity`
          : "",
    },
  ];

  const summaryBridge = resolveVueBridge(VUE_BRIDGE_NAMES.summary);
  if (summaryBridge && typeof summaryBridge.render === "function") {
    const handledByVue = summaryBridge.render(cards);
    if (handledByVue) return;
  }
  summaryEl.innerHTML = "";
  cards.forEach(({ title, value, hint }) => {
    const card = document.createElement("section");
    card.className = "summary-card summary-card--semantic";

    const header = document.createElement("h3");
    header.textContent = title;
    card.appendChild(header);

    const valueEl = document.createElement("p");
    valueEl.className = "value";
    valueEl.textContent = value;
    card.appendChild(valueEl);

    if (hint) {
      const hintEl = document.createElement("small");
      hintEl.textContent = hint;
      card.appendChild(hintEl);
    }

    summaryEl.appendChild(card);
  });
}
