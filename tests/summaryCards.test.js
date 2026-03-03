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

  it("skips DOM fallback rendering when summary bridge is unavailable", () => {
    const summaryEl = document.createElement("section");
    document.body.appendChild(summaryEl);

    renderSummaryCards({
      analytics: buildAnalytics(),
      label: "Test Chat",
      summaryEl,
    });

    expect(summaryEl.querySelectorAll("section.summary-card.summary-card--semantic")).toHaveLength(0);
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
    delete globalThis.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__;
  });

  it("skips participants DOM fallback rendering when dashboard bridge is unavailable", () => {
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

    expect(participantsBody.children.length).toBe(0);
  });

  it("delegates participants row rendering to the Vue dashboard bridge when available", () => {
    const participantsTable = document.createElement("table");
    const participantsBody = document.createElement("tbody");
    const participantsNote = document.createElement("div");
    participantsTable.appendChild(participantsBody);
    document.body.append(participantsTable, participantsNote);
    const captured = [];
    globalThis.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__ = {
      renderParticipantsRows(rows) {
        captured.push(rows);
        return true;
      },
    };

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

    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(1);
    expect(captured[0][0].senderLabel).toBe("Alice");
    expect(participantsBody.children.length).toBe(0);
  });
});
