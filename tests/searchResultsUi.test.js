import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSearchResultsUiController } from "../js/search/resultsUi.js";

function buildResult(index) {
  return {
    sender: `User ${index}`,
    timestamp: `2026-02-24T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
    message: `Message ${index}`,
    messageHtml: `Message <mark>${index}</mark>`,
  };
}

describe("search results ui controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__;
  });

  it("cancels stale batched renders when loading state is shown", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    let state = {
      query: { text: "hello", participant: "", start: "", end: "" },
      results: Array.from({ length: 160 }, (_, index) => buildResult(index + 1)),
      total: 160,
      summary: { total: 160 },
      lastRun: Date.now(),
      lastRunHasFilters: true,
    };

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => state,
      getDatasetFingerprint: () => "fp-1",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: result => {
        const el = document.createElement("div");
        el.className = "search-result";
        el.textContent = result.message;
        return el;
      },
      renderSearchInsights: () => {},
      handleStateAction: () => {},
    });

    controller.renderResults();
    expect(resultsListEl.querySelectorAll(".search-result").length).toBe(40);

    controller.renderLoadingState("Scanning...");
    vi.runAllTimers();

    expect(resultsListEl.querySelector(".panel-state--loading")).toBeTruthy();
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(0);
  });

  it("rerenders after interrupted batched legacy render with same cache key", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    let state = {
      query: { text: "hello", participant: "", start: "", end: "" },
      results: Array.from({ length: 160 }, (_, index) => buildResult(index + 1)),
      total: 160,
      summary: { total: 160 },
      lastRun: Date.now(),
      lastRunHasFilters: true,
    };

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => state,
      getDatasetFingerprint: () => "fp-interrupt",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: result => {
        const el = document.createElement("div");
        el.className = "search-result";
        el.textContent = result.message;
        return el;
      },
      renderSearchInsights: () => {},
      handleStateAction: () => {},
    });

    controller.renderResults();
    expect(resultsListEl.querySelectorAll(".search-result").length).toBe(40);

    controller.renderLoadingState("Scanning...");
    expect(resultsListEl.querySelector(".panel-state--loading")).toBeTruthy();

    controller.renderResults();
    expect(resultsListEl.querySelectorAll(".search-result").length).toBe(40);
  });

  it("clears insights when error state is shown", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    insightsEl.classList.remove("hidden");
    insightsEl.innerHTML = "<div>stale summary</div>";

    const renderSearchInsights = ({ insightsEl: target, summary }) => {
      if (!summary) {
        target.classList.add("hidden");
        target.innerHTML = "";
      }
    };

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "", participant: "", start: "", end: "" },
        results: [],
        total: 0,
        summary: null,
        lastRun: null,
        lastRunHasFilters: false,
      }),
      getDatasetFingerprint: () => "fp-2",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: () => false,
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: () => document.createElement("div"),
      renderSearchInsights,
      handleStateAction: () => {},
    });

    controller.renderErrorState("Search failed");

    expect(insightsEl.classList.contains("hidden")).toBe(true);
    expect(insightsEl.innerHTML).toBe("");
    expect(resultsListEl.querySelector(".panel-state--error")).toBeTruthy();
  });

  it("delegates search panel state rendering to Vue search/saved bridge when available", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    resultsListEl.id = "search-results-list";
    document.body.appendChild(resultsListEl);
    const insightsEl = document.createElement("div");
    let payloadSeen = null;
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      renderSearchPanelState(payload) {
        payloadSeen = payload;
        return true;
      },
    };

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "", participant: "", start: "", end: "" },
        results: [],
        total: 0,
        summary: null,
        lastRun: Date.now(),
        lastRunHasFilters: true,
      }),
      getDatasetFingerprint: () => "fp-3",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: () => true,
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: () => document.createElement("div"),
      renderSearchInsights: () => {},
      handleStateAction: () => {},
    });

    controller.renderResults();

    expect(payloadSeen).toBeTruthy();
    expect(payloadSeen?.tone).toBe("empty");
    expect(resultsListEl.children.length).toBe(0);
  });

  it("does not run fallback insights render in no-results path when bridge handles it", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    const renderSearchPanelState = vi.fn(() => true);
    const renderSearchInsightsBridge = vi.fn(() => true);
    const fallbackRenderInsights = vi.fn();
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      renderSearchPanelState,
      renderSearchInsights: renderSearchInsightsBridge,
    };

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [],
        total: 0,
        summary: null,
        lastRun: Date.now(),
        lastRunHasFilters: true,
      }),
      getDatasetFingerprint: () => "fp-5",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: () => document.createElement("div"),
      renderSearchInsights: fallbackRenderInsights,
      handleStateAction: () => {},
    });

    controller.renderResults();

    expect(renderSearchPanelState).toHaveBeenCalled();
    expect(renderSearchInsightsBridge).toHaveBeenCalledTimes(1);
    expect(fallbackRenderInsights).not.toHaveBeenCalled();
  });

  it("delegates populated search results and insights rendering to Vue bridge when available", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    const renderSearchResults = vi.fn(() => true);
    const renderSearchInsightsBridge = vi.fn(() => true);
    const fallbackRenderInsights = vi.fn();
    const fallbackBuildResultItem = vi.fn(() => document.createElement("div"));
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      renderSearchResults,
      renderSearchInsights: renderSearchInsightsBridge,
    };

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [
          buildResult(1),
          buildResult(2),
        ],
        total: 2,
        summary: {
          total: 2,
          truncated: false,
          hitsPerDay: [{ date: "2026-02-24", count: 2 }],
          topParticipants: [{ sender: "User 1", count: 1 }],
          filters: ["Keyword: hello"],
        },
        lastRun: Date.now(),
        lastRunHasFilters: true,
      }),
      getDatasetFingerprint: () => "fp-4",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: fallbackBuildResultItem,
      renderSearchInsights: fallbackRenderInsights,
      handleStateAction: () => {},
    });

    controller.renderResults();

    expect(renderSearchResults).toHaveBeenCalled();
    expect(renderSearchInsightsBridge).toHaveBeenCalled();
    expect(fallbackBuildResultItem).not.toHaveBeenCalled();
    expect(fallbackRenderInsights).not.toHaveBeenCalled();
  });
});
