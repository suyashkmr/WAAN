import { describe, it, expect } from "vitest";
import {
  createHighlightsStatsController,
} from "../js/appShell/dashboardRender/highlightsStats.js";
import {
  applyParticipantTopChange,
  applyParticipantSortChange,
  applyParticipantTimeframeChange,
  applyParticipantPreset,
  toggleParticipantRow,
} from "../js/appShell/dashboardRender/participantsPanel.js";

describe("dashboardRender modules", () => {
  it("highlightsStats renders empty and populated highlights", () => {
    const highlightList = document.createElement("div");
    const controller = createHighlightsStatsController({
      elements: { highlightList },
      deps: {
        sanitizeText: value => String(value || "").replace(/[^\w-]+/g, ""),
        formatNumber: value => String(value ?? ""),
        formatFloat: (value, digits = 1) => Number(value || 0).toFixed(digits),
      },
    });

    controller.renderHighlights([]);
    expect(highlightList.textContent).toContain("Highlights will show up after the chat loads.");

    controller.renderHighlights([
      {
        type: "velocity",
        label: "Message pace",
        tooltip: "How fast messages are coming in",
        headline: "Fast period",
        value: "120/day",
        descriptor: "Compared to baseline",
        items: [
          { label: "Morning", value: "40" },
          { label: "Evening", value: "80" },
        ],
        theme: "warm",
        meta: "Dataset ending Jan 8",
      },
    ]);

    const cards = highlightList.querySelectorAll(".highlight-card");
    expect(cards.length).toBe(1);
    expect(cards[0].dataset.accent).toBe("warm");
    expect(cards[0].textContent).toContain("Message pace");
    expect(cards[0].textContent).toContain("Fast period");
    expect(cards[0].textContent).toContain("120/day");
    expect(cards[0].textContent).toContain("Morning");
    expect(cards[0].textContent).toContain("Dataset ending Jan 8");
  });

  it("highlightsStats formats sentiment and statistics", () => {
    const ids = [
      "media-count",
      "link-count",
      "poll-count",
      "join-events",
      "added-events",
      "left-events",
      "removed-events",
      "changed-events",
      "other-system-events",
      "join-requests",
      "avg-chars",
      "avg-words",
    ];
    ids.forEach(id => {
      const node = document.createElement("span");
      node.id = id;
      document.body.appendChild(node);
    });

    const controller = createHighlightsStatsController({
      elements: { highlightList: document.createElement("div") },
      deps: {
        sanitizeText: value => String(value),
        formatNumber: value => String(value),
        formatFloat: (value, digits = 1) => Number(value || 0).toFixed(digits),
      },
    });

    expect(controller.formatSentimentScore(1.234, 2)).toBe("+1.23");
    expect(controller.formatSentimentScore(-1.234, 2)).toBe("-1.23");
    expect(controller.formatSentimentScore(NaN, 2)).toBe("-");

    controller.renderStatistics({
      media_count: 4,
      link_count: 5,
      poll_count: 6,
      join_events: 7,
      added_events: 8,
      left_events: 9,
      removed_events: 10,
      changed_events: 11,
      other_system_events: 12,
      system_summary: { join_requests: 13 },
      averages: { characters: 22.2, words: 4.4 },
    });

    expect(document.getElementById("media-count")?.textContent).toBe("4");
    expect(document.getElementById("join-requests")?.textContent).toBe("13");
    expect(document.getElementById("avg-chars")?.textContent).toBe("22.2");
    expect(document.getElementById("avg-words")?.textContent).toBe("4.4");
  });

  it("participant helpers update filters and presets", () => {
    const filters = { topCount: 0, sortMode: "most", timeframe: "all" };
    const participantsTopSelect = document.createElement("select");
    const participantsSortSelect = document.createElement("select");
    const participantsTimeframeSelect = document.createElement("select");

    applyParticipantTopChange(filters, "25");
    applyParticipantSortChange(filters, "quiet");
    applyParticipantTimeframeChange(filters, "week");

    expect(filters.topCount).toBe(25);
    expect(filters.sortMode).toBe("quiet");
    expect(filters.timeframe).toBe("week");

    applyParticipantPreset(filters, "top-week", {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
    });
    expect(filters.topCount).toBe(5);
    expect(filters.sortMode).toBe("most");
    expect(filters.timeframe).toBe("week");

    applyParticipantPreset(filters, "quiet", {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
    });
    expect(filters.topCount).toBe(5);
    expect(filters.sortMode).toBe("quiet");
    expect(filters.timeframe).toBe("all");
  });

  it("toggleParticipantRow expands and collapses detail rows", () => {
    const participantsBody = document.createElement("tbody");

    const row = document.createElement("tr");
    row.dataset.rowId = "row-1";

    const toggleCell = document.createElement("td");
    const toggle = document.createElement("button");
    toggle.className = "participant-toggle";
    toggle.setAttribute("aria-expanded", "false");
    const icon = document.createElement("span");
    icon.className = "toggle-icon";
    icon.textContent = "▸";
    toggle.appendChild(icon);
    toggleCell.appendChild(toggle);
    row.appendChild(toggleCell);

    const detailRow = document.createElement("tr");
    detailRow.className = "participant-detail-row hidden";
    detailRow.dataset.rowId = "row-1";

    participantsBody.append(row, detailRow);

    const expandEvent = {
      target: toggle,
      preventDefault: () => {},
    };
    toggleParticipantRow(expandEvent, participantsBody);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(icon.textContent).toBe("▾");
    expect(row.classList.contains("expanded")).toBe(true);
    expect(detailRow.classList.contains("hidden")).toBe(false);

    const collapseEvent = {
      target: toggle,
      preventDefault: () => {},
    };
    toggleParticipantRow(collapseEvent, participantsBody);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(icon.textContent).toBe("▸");
    expect(row.classList.contains("expanded")).toBe(false);
    expect(detailRow.classList.contains("hidden")).toBe(true);
  });
});
