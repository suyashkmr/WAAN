import { describe, it, expect, beforeEach, vi } from "vitest";
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
import { clearVueBridgeRuntime, installDashboardPanelsVueBridge } from "./vueBridgeTestUtils.js";

describe("dashboardRender modules", () => {
  beforeEach(() => {
    clearVueBridgeRuntime();
  });

  function buildParticipantSelect(optionValues = []) {
    const select = document.createElement("select");
    optionValues.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    return select;
  }

  it("highlightsStats skips DOM fallback rendering when dashboard bridge is unavailable", () => {
    const highlightList = document.createElement("div");
    const controller = createHighlightsStatsController({
      elements: { highlightList },
      deps: {
        formatNumber: value => String(value ?? ""),
        formatFloat: (value, digits = 1) => Number(value || 0).toFixed(digits),
      },
    });

    controller.renderHighlights([]);
    expect(highlightList.children.length).toBe(0);
  });

  it("highlightsStats delegates to Vue dashboard panels bridge when available", () => {
    const highlightList = document.createElement("div");
    let captured = null;
    installDashboardPanelsVueBridge({
      renderHighlights(payload) {
        captured = payload;
        return true;
      },
    });
    const controller = createHighlightsStatsController({
      elements: { highlightList },
      deps: {
        formatNumber: value => String(value ?? ""),
        formatFloat: (value, digits = 1) => Number(value || 0).toFixed(digits),
      },
    });

    const highlights = [{ type: "velocity", label: "Message pace", value: "120/day" }];
    controller.renderHighlights(highlights);

    expect(captured).toEqual(highlights);
    expect(highlightList.children.length).toBe(0);
    clearVueBridgeRuntime();
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
    const participantsTopSelect = buildParticipantSelect(["0", "5", "10", "25"]);
    const participantsSortSelect = buildParticipantSelect(["most", "quiet"]);
    const participantsTimeframeSelect = buildParticipantSelect(["all", "week"]);
    participantsTopSelect.value = "0";
    participantsSortSelect.value = "most";
    participantsTimeframeSelect.value = "all";

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
    expect(participantsTopSelect.value).toBe("5");
    expect(participantsSortSelect.value).toBe("most");
    expect(participantsTimeframeSelect.value).toBe("week");

    applyParticipantPreset(filters, "quiet", {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
    });
    expect(filters.topCount).toBe(5);
    expect(filters.sortMode).toBe("quiet");
    expect(filters.timeframe).toBe("all");
    expect(participantsTopSelect.value).toBe("5");
    expect(participantsSortSelect.value).toBe("quiet");
    expect(participantsTimeframeSelect.value).toBe("all");
  });

  it("participant presets prefer bridge sync when available", () => {
    const filters = { topCount: 0, sortMode: "most", timeframe: "all" };
    const participantsTopSelect = buildParticipantSelect(["0", "5", "10", "25"]);
    const participantsSortSelect = buildParticipantSelect(["most", "quiet"]);
    const participantsTimeframeSelect = buildParticipantSelect(["all", "week"]);
    participantsTopSelect.value = "0";
    participantsSortSelect.value = "most";
    participantsTimeframeSelect.value = "all";
    const syncParticipantControls = vi.fn(() => true);

    applyParticipantPreset(filters, "top-week", {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
      syncParticipantControls,
    });

    expect(syncParticipantControls).toHaveBeenCalledWith({
      topCount: 5,
      sortMode: "most",
      timeframe: "week",
    });
    expect(participantsTopSelect.value).toBe("0");
    expect(participantsSortSelect.value).toBe("most");
    expect(participantsTimeframeSelect.value).toBe("all");
  });

  it("toggleParticipantRow expands and collapses detail rows", () => {
    const participantsBody = document.createElement("tbody");

    const row = document.createElement("tr");
    row.dataset.rowId = "row-1";

    const toggleCell = document.createElement("td");
    const toggle = document.createElement("button");
    toggle.className = "participant-toggle";
    toggle.setAttribute("aria-expanded", "false");
    const name = document.createElement("span");
    name.className = "participant-name";
    name.textContent = "Alice";
    const icon = document.createElement("span");
    icon.className = "toggle-icon";
    icon.textContent = "▸";
    toggle.appendChild(name);
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
    toggleParticipantRow(expandEvent);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Hide details for Alice");
    expect(icon.textContent).toBe("▾");
    expect(row.classList.contains("expanded")).toBe(true);
    expect(detailRow.classList.contains("hidden")).toBe(false);

    const collapseEvent = {
      target: toggle,
      preventDefault: () => {},
    };
    toggleParticipantRow(collapseEvent);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Show details for Alice");
    expect(icon.textContent).toBe("▸");
    expect(row.classList.contains("expanded")).toBe(false);
    expect(detailRow.classList.contains("hidden")).toBe(true);
  });
});
