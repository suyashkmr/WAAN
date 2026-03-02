import { describe, it, expect, beforeEach } from "vitest";
import { renderSummaryCards, renderParticipants } from "../js/analytics/summary.js";

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
    delete globalThis.__WAAN_VUE_SUMMARY_BRIDGE__;
  });

  it("renders semantic summary card sections by default", () => {
    const summaryEl = document.createElement("section");
    document.body.appendChild(summaryEl);

    renderSummaryCards({
      analytics: buildAnalytics(),
      label: "Test Chat",
      summaryEl,
    });

    expect(summaryEl.querySelectorAll("section.summary-card.summary-card--semantic")).toHaveLength(4);
  });

  it("delegates summary card rendering to the Vue bridge when available", () => {
    const summaryEl = document.createElement("section");
    document.body.appendChild(summaryEl);
    const captured = [];
    globalThis.__WAAN_VUE_SUMMARY_BRIDGE__ = {
      render(cards) {
        captured.push(cards);
        return true;
      },
    };

    renderSummaryCards({
      analytics: buildAnalytics(),
      label: "Test Chat",
      summaryEl,
    });

    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(4);
    expect(summaryEl.querySelectorAll("section.summary-card.summary-card--semantic")).toHaveLength(0);
  });
});

describe("renderParticipants", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds contextual metric hints and accessible toggle labels", () => {
    const participantsTable = document.createElement("table");
    const participantsBody = document.createElement("tbody");
    const participantsNote = document.createElement("div");
    participantsTable.appendChild(participantsBody);
    document.body.append(participantsTable, participantsNote);

    renderParticipants({
      analytics: {
        top_senders: [
          {
            id: "alice-id",
            sender: "Alice",
            count: 42,
            share: 0.35,
            avg_words: 12.5,
            avg_chars: 54.1,
          },
        ],
      },
      entries: [],
      participantFilters: {
        topCount: 25,
        sortMode: "most",
        timeframe: "all",
      },
      participantsBody,
      participantsNote,
      participantPresetButtons: [],
      setParticipantView: () => {},
    });

    const toggle = participantsBody.querySelector(".participant-toggle");
    expect(toggle?.getAttribute("aria-label")).toBe("Show details for Alice");
    expect(participantsBody.querySelector(".participant-name")?.getAttribute("title")).toBe("Alice");
    expect(participantsBody.querySelector('td[data-label="Share"]')?.getAttribute("title")).toContain("35.0%");
    expect(participantsBody.querySelector('td[data-label="Avg Words"]')?.getAttribute("title")).toContain("12.5");
  });
});
