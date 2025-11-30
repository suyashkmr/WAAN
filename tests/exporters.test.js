import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createExporters } from "../js/exporters.js";

function buildAnalyticsSample() {
  return {
    top_senders: [
      {
        sender: "Ana",
        count: 5,
        share: 0.5,
        avg_chars: 120,
        avg_words: 30,
        sentiment: { positive: 3, neutral: 1, negative: 1, average: 0.4 },
        top_hour: { hour: 10, count: 3 },
        top_weekday: { dayIndex: 2, count: 4 },
        first_message: "2025-01-01T10:00:00.000Z",
        last_message: "2025-01-02T12:00:00.000Z",
      },
    ],
    sentiments: {},
    message_types: { summary: [] },
  };
}

function buildController({
  analytics = buildAnalyticsSample(),
  participantView = analytics.top_senders,
  searchResults = [],
} = {}) {
  const updateStatus = vi.fn();
  const exporters = createExporters({
    getDatasetAnalytics: () => analytics,
    getDatasetEntries: () => [],
    getDatasetLabel: () => "Demo chat",
    getCurrentRange: () => "all",
    getParticipantView: () => participantView,
    getExportFilterSummary: () => [],
    getSearchState: () => ({ results: searchResults }),
    updateStatus,
    formatNumber: value => Number(value || 0).toString(),
    formatFloat: value => Number(value || 0).toFixed(1),
    formatTimestampDisplay: value => (value ? String(value) : ""),
    computeTimeOfDayDataset: () => ({ points: [] }),
    formatHourLabel: hour => `${hour}:00`,
    describeRange: () => "entire history",
    filterEntriesByRange: entries => entries,
    normalizeRangeValue: value => value,
    generateMarkdownReport: async () => ({ content: "" }),
    generateSlidesHtml: async () => ({ content: "" }),
    getExportThemeConfig: () => ({}),
    getDatasetFingerprint: () => "smoke",
  });
  return { exporters, updateStatus };
}

describe("exporters smoke tests", () => {
  let urlSpy;
  let revokeSpy;

  beforeEach(() => {
    urlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
    revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a CSV for participant exports", () => {
    const { exporters } = buildController();
    exporters.exportParticipants();
    expect(urlSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });

  it("downloads search results when entries exist", () => {
    const { exporters } = buildController({
      searchResults: [
        {
          timestamp: "2025-02-03T05:00:00.000Z",
          sender: "Ben",
          message: "Status update",
        },
      ],
    });
    exporters.exportSearchResults();
    expect(urlSpy).toHaveBeenCalledTimes(1);
  });
});
