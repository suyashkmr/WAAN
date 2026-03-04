import { describe, it, expect, afterEach, vi } from "vitest";
import { createSearchResultsUiController } from "../js/search/resultsUi.js";
import { clearVueBridgeRuntime, installSearchSavedVueBridge } from "./vueBridgeTestUtils.js";

function buildResult(index) {
  return {
    sender: `User ${index}`,
    timestamp: `2026-02-24T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
    message: `Message ${index}`,
    messageSegments: [
      { text: "Message ", highlighted: false },
      { text: String(index), highlighted: true },
    ],
  };
}

describe("search results ui controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearVueBridgeRuntime();
  });

  it("does not cache empty state when bridge is unavailable", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    let panelStateCalls = 0;

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
      getDatasetFingerprint: () => "fp-no-bridge",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: () => document.createElement("div"),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderResults();
    expect(resultsListEl.children.length).toBe(0);

    installSearchSavedVueBridge({
      renderSearchPanelState() {
        panelStateCalls += 1;
        return true;
      },
      renderSearchResults: () => true,
      renderSearchInsights: () => true,
    });

    controller.renderResults();
    expect(panelStateCalls).toBe(1);
  });

  it("clears insights when error state is shown via bridge", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    insightsEl.classList.remove("hidden");
    insightsEl.innerHTML = "<div>stale summary</div>";

    const panelStateCalls = vi.fn(() => true);
    const insightsCalls = vi.fn(({ summary }) => {
      if (!summary) {
        insightsEl.classList.add("hidden");
        insightsEl.innerHTML = "";
      }
      return true;
    });

    installSearchSavedVueBridge({
      renderSearchPanelState: panelStateCalls,
      renderSearchResults: () => true,
      renderSearchInsights: insightsCalls,
    });

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
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderErrorState("Search failed");

    expect(insightsCalls).toHaveBeenCalled();
    expect(panelStateCalls).toHaveBeenCalled();
    expect(insightsEl.classList.contains("hidden")).toBe(true);
    expect(insightsEl.innerHTML).toBe("");
  });

  it("delegates search panel state rendering to Vue search/saved bridge when available", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    let payloadSeen = null;
    installSearchSavedVueBridge({
      renderSearchPanelState(payload) {
        payloadSeen = payload;
        return true;
      },
      renderSearchResults: () => true,
      renderSearchInsights: () => true,
    });

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
  });

  it("renders panel state even when insights renderer is unavailable", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    const renderSearchPanelState = vi.fn(() => true);
    const renderSearchInsights = vi.fn(() => false);
    installSearchSavedVueBridge({
      renderSearchPanelState,
      renderSearchResults: () => true,
      renderSearchInsights,
    });

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
        lastRunHasFilters: false,
      }),
      getDatasetFingerprint: () => "fp-panel-state-without-insights",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: () => false,
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: () => document.createElement("div"),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderLoadingState("Scanning…");
    expect(renderSearchInsights).toHaveBeenCalledTimes(1);
    expect(renderSearchPanelState).toHaveBeenCalledTimes(1);
  });

  it("delegates populated search results and insights rendering to Vue bridge", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    const renderSearchResults = vi.fn(() => {
      const item = document.createElement("div");
      item.className = "search-result";
      resultsListEl.appendChild(item);
      return true;
    });
    const renderSearchInsightsBridge = vi.fn(() => true);
    installSearchSavedVueBridge({
      renderSearchPanelState: () => true,
      renderSearchResults,
      renderSearchInsights: renderSearchInsightsBridge,
    });

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [buildResult(1), buildResult(2)],
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
      buildSearchResultItem: vi.fn(() => document.createElement("div")),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderResults();

    expect(renderSearchResults).toHaveBeenCalled();
    expect(renderSearchInsightsBridge).toHaveBeenCalled();
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(1);
  });

  it("does not clear Vue-managed container before populated rerender after loading state", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");
    const state = {
      query: { text: "hello", participant: "", start: "", end: "" },
      results: [],
      total: 0,
      summary: null,
      lastRun: Date.now(),
      lastRunHasFilters: true,
    };
    installSearchSavedVueBridge({
      renderSearchPanelState: () => {
        resultsListEl.dataset.vueOwned = "true";
        resultsListEl.innerHTML = '<div class="panel-state"></div>';
        return true;
      },
      renderSearchResults: () => {
        if (resultsListEl.dataset.vueOwned === "true" && !resultsListEl.querySelector(".panel-state")) {
          throw new Error("Vue container was externally cleared.");
        }
        resultsListEl.innerHTML = '<div class="search-result">rendered</div>';
        return true;
      },
      renderSearchInsights: () => true,
    });

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => state,
      getDatasetFingerprint: () => "fp-vue-container-preserved",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: vi.fn(() => document.createElement("div")),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderLoadingState("Scanning…");
    expect(resultsListEl.querySelector(".panel-state")).toBeTruthy();

    state.results = [buildResult(1)];
    state.total = 1;
    state.summary = {
      total: 1,
      truncated: false,
      hitsPerDay: [{ date: "2026-02-24", count: 1 }],
      topParticipants: [{ sender: "User 1", count: 1 }],
      filters: ["Keyword: hello"],
    };
    state.lastRun = new Date().toISOString();

    controller.renderResults();
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(1);
  });

  it("does not commit cache key when bridge returns handled but renders no rows", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");

    const renderSearchResults = vi
      .fn()
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => {
        const item = document.createElement("div");
        item.className = "search-result";
        resultsListEl.appendChild(item);
        return true;
      });
    const renderSearchInsightsBridge = vi.fn(() => true);

    installSearchSavedVueBridge({
      renderSearchPanelState: () => true,
      renderSearchResults,
      renderSearchInsights: renderSearchInsightsBridge,
    });

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [buildResult(1)],
        total: 1,
        summary: {
          total: 1,
          truncated: false,
          hitsPerDay: [{ date: "2026-02-24", count: 1 }],
          topParticipants: [{ sender: "User 1", count: 1 }],
          filters: ["Keyword: hello"],
        },
        lastRun: Date.now(),
        lastRunHasFilters: true,
      }),
      getDatasetFingerprint: () => "fp-bridge-empty",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: vi.fn(() => document.createElement("div")),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderResults();
    expect(renderSearchResults).toHaveBeenCalledTimes(1);
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(0);

    controller.renderResults();
    expect(renderSearchResults).toHaveBeenCalledTimes(2);
    expect(renderSearchInsightsBridge).toHaveBeenCalledTimes(1);
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(1);
  });

  it("does not render populated results when search bridge is unavailable", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [buildResult(1)],
        total: 1,
        summary: {
          total: 1,
          truncated: false,
          hitsPerDay: [{ date: "2026-02-24", count: 1 }],
          topParticipants: [{ sender: "User 1", count: 1 }],
          filters: ["Keyword: hello"],
        },
        lastRun: Date.now(),
        lastRunHasFilters: true,
      }),
      getDatasetFingerprint: () => "fp-no-bridge-results",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: vi.fn(() => document.createElement("div")),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderResults();
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(0);
  });

  it("ignores partial bridge contracts for populated-result rendering", () => {
    const resultsSummaryEl = document.createElement("div");
    const resultsListEl = document.createElement("div");
    const insightsEl = document.createElement("div");

    installSearchSavedVueBridge({
      renderSearchPanelState: () => true,
      renderSearchInsights: () => true,
      // Missing renderSearchResults on purpose.
    });

    const controller = createSearchResultsUiController({
      resultsSummaryEl,
      resultsListEl,
      insightsEl,
      resultLimit: 200,
      getSearchState: () => ({
        query: { text: "hello", participant: "", start: "", end: "" },
        results: [buildResult(1)],
        total: 1,
        summary: {
          total: 1,
          truncated: false,
          hitsPerDay: [{ date: "2026-02-24", count: 1 }],
          topParticipants: [{ sender: "User 1", count: 1 }],
          filters: ["Keyword: hello"],
        },
        lastRun: Date.now(),
        lastRunHasFilters: true,
      }),
      getDatasetFingerprint: () => "fp-partial-bridge-results",
      buildSearchRenderCacheKey: payload => JSON.stringify(payload),
      hasSearchFilters: query => Boolean(query?.text),
      buildResultsSummaryText: () => "summary",
      buildSearchResultItem: vi.fn(() => document.createElement("div")),
      renderSearchInsights: vi.fn(),
      handleStateAction: () => {},
    });

    controller.renderResults();
    expect(resultsListEl.querySelectorAll(".search-result")).toHaveLength(0);
  });
});
