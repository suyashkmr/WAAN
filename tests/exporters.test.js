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
    daily_counts: [
      { date: "2025-01-01", count: 5 },
      { date: "2025-01-02", count: 7 },
    ],
    weekly_counts: [
      { week: "2025-W01", count: 12, cumulative: 12 },
      { week: "2025-W02", count: 9, cumulative: 21 },
    ],
    weekday_distribution: [
      { label: "Monday", count: 6, share: 0.4, deviation: 1.2 },
      { label: "Tuesday", count: 9, share: 0.6, deviation: 0.8 },
    ],
    sentiment: {
      daily: [
        { date: "2025-01-01", count: 5, positive: 3, neutral: 1, negative: 1, average: 0.25 },
        { date: "2025-01-02", count: 7, positive: 4, neutral: 2, negative: 1, average: 0.31 },
      ],
    },
    sentiments: {},
    message_types: {
      summary: [
        { label: "Text", count: 8, share: 0.67 },
        { label: "Media", count: 4, share: 0.33 },
      ],
    },
  };
}

function buildController({
  analytics = buildAnalyticsSample(),
  participantView = analytics.top_senders,
  searchResults = [],
  emitExportSuccess = vi.fn(),
  computeTimeOfDayDataset = () => ({
    total: 12,
    includeWeekdays: true,
    includeWeekends: true,
    points: [
      { hour: 9, total: 4, share: 0.33, weekday: 3, weekend: 1 },
      { hour: 18, total: 8, share: 0.67, weekday: 5, weekend: 3 },
    ],
  }),
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
    computeTimeOfDayDataset,
    formatHourLabel: hour => `${hour}:00`,
    describeRange: () => "entire history",
    filterEntriesByRange: entries => entries,
    normalizeRangeValue: value => value,
    generateMarkdownReport: async () => ({ content: "" }),
    generateSlidesHtml: async () => ({ content: "" }),
    getExportThemeConfig: () => ({}),
    getDatasetFingerprint: () => "smoke",
    emitExportSuccess,
  });
  return { exporters, updateStatus, emitExportSuccess };
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

  it.each([
    ["daily", controller => controller.exporters.exportDaily()],
    ["weekly", controller => controller.exporters.exportWeekly()],
    ["weekday", controller => controller.exporters.exportWeekday()],
    ["time-of-day", controller => controller.exporters.exportTimeOfDay()],
    ["message types", controller => controller.exporters.exportMessageTypes()],
    ["sentiment", controller => controller.exporters.exportSentiment()],
  ])("downloads %s CSV when loaded analytics data exists", (_label, runExport) => {
    const controller = buildController();
    runExport(controller);
    expect(urlSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(controller.updateStatus).not.toHaveBeenCalledWith(expect.stringContaining("No "), "warning");
  });

  it("silently no-ops export handlers when no dataset is loaded", async () => {
    const updateStatus = vi.fn();
    const emitExportSuccess = vi.fn();
    const exporters = createExporters({
      getDatasetAnalytics: () => null,
      getDatasetEntries: () => [],
      getDatasetLabel: () => "Demo chat",
      getCurrentRange: () => "all",
      getParticipantView: () => [],
      getExportFilterSummary: () => [],
      getSearchState: () => ({ results: [] }),
      updateStatus,
      formatNumber: value => Number(value || 0).toString(),
      formatFloat: value => Number(value || 0).toFixed(1),
      formatTimestampDisplay: value => (value ? String(value) : ""),
      computeTimeOfDayDataset: () => null,
      formatHourLabel: hour => `${hour}:00`,
      describeRange: () => "entire history",
      filterEntriesByRange: entries => entries,
      normalizeRangeValue: value => value,
      generateMarkdownReport: async () => ({ content: "" }),
      generateSlidesHtml: async () => ({ content: "" }),
      getExportThemeConfig: () => ({ label: "Clean" }),
      getDatasetFingerprint: () => "empty",
      emitExportSuccess,
    });

    exporters.exportParticipants();
    exporters.exportHourly();
    exporters.exportDaily();
    exporters.exportWeekly();
    exporters.exportWeekday();
    exporters.exportTimeOfDay();
    exporters.exportMessageTypes();
    exporters.exportChatJson();
    exporters.exportSentiment();
    exporters.exportMessageSubtype("media");
    await exporters.handleDownloadMarkdownReport();
    await exporters.handleDownloadSlidesReport();

    expect(urlSpy).not.toHaveBeenCalled();
    expect(revokeSpy).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
    expect(emitExportSuccess).not.toHaveBeenCalled();
  });

  it("emits success events for primary report exports", async () => {
    const { exporters, emitExportSuccess } = buildController();

    await exporters.handleDownloadMarkdownReport();
    await exporters.handleDownloadSlidesReport();

    expect(emitExportSuccess).toHaveBeenNthCalledWith(1, "download-markdown-report");
    expect(emitExportSuccess).toHaveBeenNthCalledWith(2, "download-slides-report");
  });
});
