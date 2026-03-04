import { afterEach, describe, expect, it, vi } from "vitest";
import { h, render } from "vue";
import { createSearchResultsUiController } from "../js/search/resultsUi.js";
import { mountSearchSavedBridge } from "../js/vue/searchSavedIsland.js";
import { clearVueBridgeRuntime } from "./vueBridgeTestUtils.js";

function buildController({
  searchStateRef,
  handleStateAction = vi.fn(),
}) {
  const resultsSummaryEl = document.createElement("div");
  const resultsListEl = document.createElement("div");
  resultsListEl.id = "search-results-list";
  const insightsEl = document.createElement("div");
  insightsEl.id = "search-insights";
  insightsEl.className = "hidden";
  document.body.append(resultsSummaryEl, resultsListEl, insightsEl);

  const controller = createSearchResultsUiController({
    resultsSummaryEl,
    resultsListEl,
    insightsEl,
    resultLimit: 200,
    getSearchState: () => searchStateRef.current,
    getDatasetFingerprint: () => "fp-vue-search",
    buildSearchRenderCacheKey: payload => JSON.stringify(payload),
    hasSearchFilters: query =>
      Boolean(query?.text || query?.participant || query?.start || query?.end),
    buildResultsSummaryText: ({ total }) => `Total ${total}`,
    handleStateAction,
  });

  return {
    controller,
    resultsSummaryEl,
    resultsListEl,
    insightsEl,
    handleStateAction,
  };
}

describe("search results Vue bridge integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearVueBridgeRuntime();
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders Vue empty state and dispatches clear-filter action from rendered button", () => {
    globalThis.Vue = { h, render };
    mountSearchSavedBridge();
    const searchStateRef = {
      current: {
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [],
        total: 0,
        summary: null,
        lastRun: new Date().toISOString(),
        lastRunHasFilters: true,
      },
    };
    const {
      controller,
      resultsListEl,
      handleStateAction,
    } = buildController({ searchStateRef });

    controller.renderResults();

    const clearButton = resultsListEl.querySelector('[data-panel-action="clear-search-filters"]');
    expect(clearButton).toBeTruthy();
    clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handleStateAction).toHaveBeenCalledWith("clear-search-filters");
  });

  it("renders Vue search results + insights for populated payloads", () => {
    globalThis.Vue = { h, render };
    mountSearchSavedBridge();
    const searchStateRef = {
      current: {
        query: { text: "launch", participant: "", start: "", end: "" },
        results: [
          {
            sender: "Ana",
            timestamp: "2026-03-01T10:00:00.000Z",
            message: "launch plan",
            messageSegments: [
              { text: "launch", highlighted: true },
              { text: " plan", highlighted: false },
            ],
          },
          {
            sender: "Ben",
            timestamp: "2026-03-01T11:00:00.000Z",
            message: "launch update",
          },
        ],
        total: 2,
        summary: {
          total: 2,
          truncated: false,
          hitsPerDay: [{ date: "2026-03-01", count: 2 }],
          topParticipants: [{ sender: "Ana", count: 1 }],
          filters: ["Keyword: launch"],
        },
        lastRun: new Date().toISOString(),
        lastRunHasFilters: true,
      },
    };
    const {
      controller,
      resultsListEl,
      insightsEl,
      resultsSummaryEl,
    } = buildController({ searchStateRef });

    controller.renderResults();

    expect(resultsSummaryEl.textContent).toContain("Total 2");
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(2);
    expect(resultsListEl.querySelector("mark")?.textContent).toBe("launch");
    expect(insightsEl.classList.contains("hidden")).toBe(false);
    expect(insightsEl.textContent).toContain("Top participants");
    expect(insightsEl.textContent).toContain("Keyword: launch");
  });
});
