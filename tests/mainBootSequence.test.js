import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("main boot sequence", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <main></main>
      <section id="summary"></section>
      <div id="highlight-list"></div>
      <div class="participants-controls">
        <label class="control-group" for="participants-top-count">
          <span>Show Top</span>
          <div id="participants-top-count-anchor" data-native-select-seed="participants-top-count"></div>
        </label>
        <label class="control-group" for="participants-sort">
          <span>Sort</span>
          <div id="participants-sort-anchor" data-native-select-seed="participants-sort"></div>
        </label>
        <label class="control-group" for="participants-timeframe">
          <span>Timeframe</span>
          <div id="participants-timeframe-anchor" data-native-select-seed="participants-timeframe"></div>
        </label>
      </div>
      <div class="participants-quick-filters"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
      <div id="data-status"></div>
      <div id="toast-container"></div>
      <div class="page-controls"><div class="control-row primary-controls" data-vue-page-controls-root="true"></div></div>
      <form id="advanced-search-form" class="search-controls">
        <div class="search-control">
          <label for="search-participant">Participant</label>
          <div id="search-participant-anchor" data-native-select-seed="search-participant"></div>
        </div>
        <button id="reset-search" type="button">Clear filters</button>
        <button id="run-search" type="submit">Search</button>
      </form>
      <input id="saved-view-name" />
      <button id="save-view" type="button"></button>
      <button id="apply-saved-view" type="button"></button>
      <button id="delete-saved-view" type="button"></button>
      <button id="compare-views" type="button"></button>
      <div id="saved-view-list-anchor" data-native-select-seed="saved-view-list"></div>
      <div id="compare-view-a-anchor" data-native-select-seed="compare-view-a"></div>
      <div id="compare-view-b-anchor" data-native-select-seed="compare-view-b"></div>
      <div id="saved-view-gallery"></div>
      <div id="compare-summary"></div>
      <div class="section-nav-inner"></div>
    `;
    globalThis.Vue = {
      reactive: value => value,
      h: (type, props = {}, children = []) => ({ type, props, children }),
      render: (vnode, container) => {
        if (!container) return;
        container.innerHTML = vnode ? "<div>rendered</div>" : "";
      },
      createApp() {
        return {
          use() {
            return this;
          },
          component() {
            return this;
          },
          mount() {},
        };
      },
    };
    globalThis.PrimeVue = { Config: {}, Card: {} };
    globalThis.primevue = globalThis.PrimeVue;
  });

  afterEach(() => {
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;
    delete globalThis.__WAAN_VUE_RUNTIME__;
    vi.restoreAllMocks();
  });

  it("seeds search and saved-view selects before appShell imports", async () => {
    const observed = {};
    vi.doMock("../js/appShell.js", () => {
      observed.searchParticipantTag = document.getElementById("search-participant")?.tagName || null;
      observed.savedViewListTag = document.getElementById("saved-view-list")?.tagName || null;
      observed.compareViewATag = document.getElementById("compare-view-a")?.tagName || null;
      observed.compareViewBTag = document.getElementById("compare-view-b")?.tagName || null;
      observed.participantsTopCountTag = document.getElementById("participants-top-count")?.tagName || null;
      observed.participantsSortTag = document.getElementById("participants-sort")?.tagName || null;
      observed.participantsTimeframeTag = document.getElementById("participants-timeframe")?.tagName || null;
      return {};
    });

    await import("../js/main.js");

    expect(observed.searchParticipantTag).toBe("SELECT");
    expect(observed.savedViewListTag).toBe("SELECT");
    expect(observed.compareViewATag).toBe("SELECT");
    expect(observed.compareViewBTag).toBe("SELECT");
    expect(observed.participantsTopCountTag).toBe("SELECT");
    expect(observed.participantsSortTag).toBe("SELECT");
    expect(observed.participantsTimeframeTag).toBe("SELECT");
  });
});
