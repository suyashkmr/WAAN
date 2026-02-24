import { describe, it, expect, beforeEach } from "vitest";
import { renderSummaryCards } from "../js/analytics/summary.js";

function buildAnalytics() {
  return {
    total_messages: 120,
    total_entries: 145,
    unique_senders: 6,
    total_system: 9,
    date_range: {
      start: "2026-02-01T10:00:00.000Z",
      end: "2026-02-20T22:00:00.000Z",
    },
    weekly_summary: {
      weekCount: 3,
    },
  };
}

describe("renderSummaryCards", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.removeItem("waan-ui-summary-legacy");
  });

  it("renders summary cards with Shoelace by default", () => {
    const summaryEl = document.createElement("section");
    document.body.appendChild(summaryEl);

    renderSummaryCards({
      analytics: buildAnalytics(),
      label: "Test Chat",
      summaryEl,
    });

    expect(summaryEl.querySelectorAll("sl-card.summary-card--shoelace")).toHaveLength(4);
    expect(summaryEl.querySelectorAll("div.summary-card")).toHaveLength(0);
  });

  it("supports rollback to legacy summary markup", () => {
    localStorage.setItem("waan-ui-summary-legacy", "true");
    const summaryEl = document.createElement("section");
    document.body.appendChild(summaryEl);

    renderSummaryCards({
      analytics: buildAnalytics(),
      label: "Test Chat",
      summaryEl,
    });

    expect(summaryEl.querySelectorAll("div.summary-card")).toHaveLength(4);
    expect(summaryEl.querySelectorAll("sl-card.summary-card--shoelace")).toHaveLength(0);
  });
});
