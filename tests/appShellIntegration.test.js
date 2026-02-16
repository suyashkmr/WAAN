import { describe, it, expect, vi } from "vitest";
import { getTimestamp } from "../js/analytics.js";
import { toISODate } from "../js/utils.js";
import { createRangeFiltersController } from "../js/appShell/rangeFilters.js";
import { createDatasetLifecycleController } from "../js/appShell/datasetLifecycle.js";

describe("appShell integration", () => {
  it("loads dataset, renders, and recomputes analytics on range change", async () => {
    const rangeSelect = document.createElement("select");
    ["all", "1", "custom"].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      rangeSelect.appendChild(option);
    });

    let datasetEntries = [];
    let datasetLabel = "";
    let datasetAnalytics = null;
    let currentRange = "all";
    let customRange = null;
    let activeChatId = null;
    let activeRequest = 0;
    const analyticsCache = new Map();

    const renderDashboard = vi.fn();
    const updateStatus = vi.fn();
    const computeAnalyticsWithWorker = vi.fn(async entries => ({
      total_messages: entries.length,
      date_range: {
        start: entries[0]?.timestamp ?? null,
        end: entries[entries.length - 1]?.timestamp ?? null,
      },
    }));

    const rangeController = createRangeFiltersController({
      elements: {
        rangeSelect,
        customControls: null,
        customStartInput: null,
        customEndInput: null,
        customApplyButton: null,
        searchStartInput: null,
        searchEndInput: null,
      },
      deps: {
        getDatasetEntries: () => datasetEntries,
        getDatasetLabel: () => datasetLabel,
        setCurrentRange: value => {
          currentRange = value;
        },
        setCustomRange: value => {
          customRange = value;
        },
        getCustomRange: () => customRange,
        getCachedAnalytics: key => analyticsCache.get(key) ?? null,
        setCachedAnalytics: (key, value) => analyticsCache.set(key, value),
        setDatasetAnalytics: value => {
          datasetAnalytics = value;
        },
        renderDashboard,
        computeAnalyticsWithWorker,
        updateStatus,
        formatNumber: value => String(value),
        formatDisplayDate: value => String(value ?? ""),
        getTimestamp,
        toISODate,
        onRangeApplied: vi.fn(),
        nextAnalyticsRequestToken: () => {
          activeRequest += 1;
          return activeRequest;
        },
        isAnalyticsRequestCurrent: token => token === activeRequest,
      },
    });

    const datasetLifecycle = createDatasetLifecycleController({
      elements: { rangeSelect },
      deps: {
        setDatasetEntries: entries => {
          datasetEntries = entries;
        },
        setDatasetFingerprint: vi.fn(),
        setDatasetParticipantDirectory: vi.fn(),
        clearAnalyticsCache: () => analyticsCache.clear(),
        setDatasetLabel: label => {
          datasetLabel = label;
        },
        setCurrentRange: value => {
          currentRange = value;
        },
        setCustomRange: value => {
          customRange = value;
        },
        resetHourlyFilters: vi.fn(),
        resetWeekdayFilters: vi.fn(),
        computeDatasetFingerprint: vi.fn(() => "fp-int"),
        saveChatDataset: vi.fn(() => ({ id: "chat-int" })),
        setCachedAnalytics: (key, value) => analyticsCache.set(key, value),
        setDatasetAnalytics: value => {
          datasetAnalytics = value;
        },
        setActiveChatId: value => {
          activeChatId = value;
        },
        computeAnalyticsWithWorker,
        renderDashboard,
        updateCustomRangeBounds: vi.fn(),
        encodeChatSelectorValue: (source, id) => `${source}:${id}`,
        refreshChatSelector: vi.fn(async () => {}),
        updateStatus,
        setDashboardLoadingState: vi.fn(),
        formatNumber: value => String(value),
        nextAnalyticsRequestToken: () => {
          activeRequest += 1;
          return activeRequest;
        },
        isAnalyticsRequestCurrent: token => token === activeRequest,
        resetSavedViewsForNewDataset: vi.fn(),
        resetSearchState: vi.fn(),
        populateSearchParticipants: vi.fn(),
      },
    });

    const entries = [
      {
        sender: "Ana",
        sender_id: "ana",
        message: "early",
        timestamp: "2025-01-01T10:00:00Z",
        type: "message",
      },
      {
        sender: "Ana",
        sender_id: "ana",
        message: "late",
        timestamp: "2025-01-02T10:00:00Z",
        type: "message",
      },
    ];

    await datasetLifecycle.applyEntriesToApp(entries, "Integration chat", {
      entriesNormalized: true,
      analyticsOverride: {
        total_messages: 2,
        date_range: { start: "2025-01-01", end: "2025-01-02" },
      },
    });

    expect(renderDashboard).toHaveBeenCalledWith(expect.objectContaining({ total_messages: 2 }));
    expect(activeChatId).toBe("local:chat-int");
    expect(currentRange).toBe("all");

    rangeSelect.value = "1";
    await rangeController.handleRangeChange();

    expect(currentRange).toBe("1");
    expect(computeAnalyticsWithWorker).toHaveBeenCalledTimes(1);
    expect(computeAnalyticsWithWorker).toHaveBeenCalledWith([
      expect.objectContaining({ message: "late" }),
    ]);
    expect(datasetAnalytics).toEqual(expect.objectContaining({ total_messages: 1 }));
    expect(renderDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ total_messages: 1 }));
    expect(updateStatus).toHaveBeenCalledWith(
      expect.stringContaining("Showing 1 messages"),
      "info",
    );
  });
});
