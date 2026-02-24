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
});
