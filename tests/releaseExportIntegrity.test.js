import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createExporters } from "../js/exporters.js";
import { buildPdfDocumentHtml } from "../js/exportShared.js";

function createExportController(overrides = {}) {
  const updateStatus = vi.fn();
  const entries = overrides.entries ?? [
    { timestamp: "2026-03-01T00:00:00.000Z", sender: "Ana", message: "hello" },
    { timestamp: "2026-03-02T00:00:00.000Z", sender: "Ben", message: "world" },
  ];
  const analytics = overrides.analytics ?? {
    total_messages: 2,
    top_senders: [
      {
        sender: "Ana",
        count: 1,
        share: 0.5,
        avg_chars: 5,
        avg_words: 1,
        sentiment: { positive: 1, neutral: 0, negative: 0, average: 0.5 },
      },
    ],
  };

  const exporters = createExporters({
    getDatasetAnalytics: () => analytics,
    getDatasetEntries: () => entries,
    getDatasetLabel: () => "Demo chat",
    getCurrentRange: () => (overrides.currentRange ?? "all"),
    getParticipantView: () => analytics.top_senders,
    getExportFilterSummary: () => ["Range: entire history"],
    getSearchState: () => ({ results: [] }),
    updateStatus,
    formatNumber: value => String(Number(value || 0)),
    formatFloat: value => Number(value || 0).toFixed(2),
    formatTimestampDisplay: value => String(value),
    computeTimeOfDayDataset: () => ({ points: [], total: 0 }),
    formatHourLabel: hour => `${hour}:00`,
    describeRange: () => "entire history",
    filterEntriesByRange: (source, range) => {
      if (range && range.type === "custom") return source.slice(0, 1);
      return source;
    },
    normalizeRangeValue: value => value,
    generateMarkdownReport: async () => ({ content: "" }),
    generateSlidesHtml: async () => ({ content: "" }),
    getExportThemeConfig: () => ({ id: "dark", label: "Night" }),
    getDatasetFingerprint: () => "dataset-fingerprint",
  });

  return { exporters, updateStatus };
}

describe("release reliability: export integrity", () => {
  const createdBlobs = [];

  beforeEach(() => {
    createdBlobs.length = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(blob => {
      createdBlobs.push(blob);
      return `blob:${createdBlobs.length}`;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports participant CSV with expected headers and data rows", async () => {
    const { exporters } = createExportController();

    exporters.exportParticipants();

    expect(createdBlobs.length).toBe(1);
    const csv = await createdBlobs[0].text();
    expect(csv).toContain('"Rank","Participant","Messages"');
    expect(csv).toContain('"Note","Range: entire history"');
    expect(csv).toContain('"1","Ana","1"');
  });

  it("exports chat JSON honoring current range filtering", async () => {
    const { exporters, updateStatus } = createExportController({
      currentRange: { type: "custom", start: "2026-03-01", end: "2026-03-01" },
    });

    exporters.exportChatJson();

    expect(createdBlobs.length).toBe(1);
    const payload = JSON.parse(await createdBlobs[0].text());
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(1);
    expect(payload[0].sender).toBe("Ana");
    expect(updateStatus).toHaveBeenCalledWith(
      "Saved 1 entries from Demo chat (entire history).",
      "success",
    );
  });

  it("stamps PDF export metadata for print theme identity", () => {
    const html = buildPdfDocumentHtml({
      analytics: { total_messages: 2 },
      theme: { id: "dark", label: "Night", canvas: "#020617", text: "#e2e8f0" },
      datasetLabel: "Demo chat",
      filterDetails: ["Range: entire history"],
      brandName: "WAAN",
    });

    expect(html).toContain('data-export-mode="print"');
    expect(html).toContain('data-export-theme="dark"');
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
    expect(html).toContain("Demo chat");
  });
});
