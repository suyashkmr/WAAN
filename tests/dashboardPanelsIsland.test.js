import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { mountDashboardPanelsIsland } from "../js/vue/dashboardPanelsIsland.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";

describe("dashboard panels island", () => {
  afterEach(() => {
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
    document.body.innerHTML = "";
  });

  it("renders highlights via PrimeVue DataView when runtime component is available", async () => {
    document.body.innerHTML = '<div id="highlight-list" class="highlight-grid"></div>';
    let capturedDataKey = "";
    let capturedPt = null;
    const PrimeDataView = {
      name: "PrimeDataViewStub",
      props: ["value", "dataKey", "pt"],
      setup(props, context) {
        capturedDataKey = String(props?.dataKey || "");
        capturedPt = props?.pt ?? null;
        return () =>
          h(
            "div",
            {
              class: "highlights-dataview-prime",
              "data-ui-runtime": String(context?.attrs?.["data-ui-runtime"] || ""),
            },
            context?.slots?.list?.({ items: props.value || [] }) || [],
          );
      },
    };
    const fakeWindow = {
      document,
      console,
      PrimeVue: { DataView: PrimeDataView },
      Vue: await import("vue"),
    };
    fakeWindow.primevue = fakeWindow.PrimeVue;

    mountDashboardPanelsIsland({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    bridge?.renderHighlights?.([
      {
        type: "activity",
        theme: "growth",
        label: "Busiest day",
        value: "42 messages",
        descriptor: "03-03-2026",
      },
    ]);
    await fakeWindow.Vue.nextTick();

    const dataViewRoot = document.querySelector("#highlight-list .highlights-dataview-prime");
    expect(dataViewRoot).toBeTruthy();
    expect(capturedDataKey).toBe("key");
    expect(capturedPt?.root?.class).toBe("highlight-grid-dataview-root");
    expect(capturedPt?.content?.class).toBe("highlight-grid-dataview-content");
    expect(capturedPt?.list?.class).toBe("highlight-grid-dataview-list");
    expect(document.querySelectorAll("#highlight-list .highlight-card")).toHaveLength(1);
  });

  it("renders weekday filter note through Vue and clears static placeholder content", async () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
      <div id="weekday-filter-note">Stale placeholder</div>
    `;

    const fakeWindow = {
      document,
      console,
      PrimeVue: { Select: { name: "PrimeSelectStub" } },
      Vue: await import("vue"),
    };
    fakeWindow.primevue = fakeWindow.PrimeVue;

    mountDashboardPanelsIsland({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    const handled = bridge?.renderWeekdayChart({
      container: document.getElementById("weekday-chart"),
      filterNoteEl: document.getElementById("weekday-filter-note"),
    });
    await fakeWindow.Vue.nextTick();

    expect(handled).toBe(true);
    expect(document.getElementById("weekday-filter-note")?.textContent).not.toContain("Stale placeholder");
  });

  it("renders participant controls through the dashboard bridge and dispatches participant actions", async () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <div class="participants-controls">
        <label class="control-group" for="participants-top-count">
          <span>Show Top</span>
          <select id="participants-top-count"><option value="25" selected>25</option></select>
        </label>
        <label class="control-group" for="participants-sort">
          <span>Sort</span>
          <select id="participants-sort"><option value="most" selected>Most active</option></select>
        </label>
        <label class="control-group" for="participants-timeframe">
          <span>Timeframe</span>
          <select id="participants-timeframe"><option value="all" selected>All time</option></select>
        </label>
      </div>
      <div class="participants-quick-filters">
        <span>Quick filters:</span>
        <button type="button" data-participants-preset="top-week">Top 5 this week</button>
      </div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
    `;

    const fakeWindow = {
      document,
      console,
      Vue: await import("vue"),
    };

    mountDashboardPanelsIsland({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    const topCountHandler = vi.fn();
    bridge?.setPanelActionHandlers?.({
      "participants:set-top-count": (_actionId, payload) => topCountHandler(payload),
    });
    bridge?.syncParticipantControls?.({ topCount: 10, sortMode: "quiet", timeframe: "week" });
    await fakeWindow.Vue.nextTick();

    expect(document.getElementById("participants-top-count")?.tagName).toBe("SELECT");
    expect(document.getElementById("participants-sort")?.tagName).toBe("SELECT");
    expect(document.getElementById("participants-timeframe")?.tagName).toBe("SELECT");
    const topCountSelect = document.getElementById("participants-top-count");
    expect(topCountSelect?.value).toBe("10");
    expect(document.querySelectorAll("#participants-top-count")).toHaveLength(1);
    expect(document.querySelector('label[for="participants-top-count"]')).toBeTruthy();
    topCountSelect?.dispatchEvent(new Event("change"));
    await fakeWindow.Vue.nextTick();

    expect(topCountHandler).toHaveBeenCalledWith({ value: "10" });
    expect(document.querySelector('[data-participants-preset="quiet"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("bridges participant selects through PrimeVue while preserving native dashboard refs", async () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <div class="participants-controls">
        <label class="control-group" for="participants-top-count">
          <span>Show Top</span>
          <select id="participants-top-count"><option value="25" selected>25</option><option value="10">10</option></select>
        </label>
        <label class="control-group" for="participants-sort">
          <span>Sort</span>
          <select id="participants-sort"><option value="most" selected>Most active</option></select>
        </label>
        <label class="control-group" for="participants-timeframe">
          <span>Timeframe</span>
          <select id="participants-timeframe"><option value="all" selected>All time</option></select>
        </label>
      </div>
      <div class="participants-quick-filters"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
    `;

    const PrimeSelect = {
      name: "PrimeSelectStub",
      inheritAttrs: false,
      props: ["inputId", "modelValue"],
      setup(props, { attrs }) {
        return () =>
          h(
            "button",
            {
              id: props.inputId,
              class: "p-select",
              onClick: () => attrs["onUpdate:modelValue"]?.("10"),
            },
            String(props.modelValue || ""),
          );
      },
    };

    const fakeWindow = {
      document,
      console,
      PrimeVue: { Select: PrimeSelect },
      Vue: await import("vue"),
    };
    fakeWindow.primevue = fakeWindow.PrimeVue;

    mountDashboardPanelsIsland({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: fakeWindow });
    const topCountHandler = vi.fn();
    bridge?.setPanelActionHandlers?.({
      "participants:set-top-count": (_actionId, payload) => topCountHandler(payload),
    });
    bridge?.syncParticipantControls?.({ topCount: 25, sortMode: "most", timeframe: "all" });
    await fakeWindow.Vue.nextTick();

    const nativeSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById("participants-top-count"));
    expect(nativeSelect?.tagName).toBe("SELECT");
    expect(nativeSelect?.classList.contains("hidden")).toBe(true);
    expect(document.querySelectorAll("#participants-top-count")).toHaveLength(1);
    expect(document.querySelector('label[for="participants-top-count--primevue"]')).toBeTruthy();
    const visibleSelect = /** @type {HTMLButtonElement | null} */ (document.getElementById("participants-top-count--primevue"));
    expect(visibleSelect).toBeTruthy();

    visibleSelect?.click();
    await fakeWindow.Vue.nextTick();

    expect(nativeSelect?.value).toBe("10");
    expect(topCountHandler).toHaveBeenCalledWith({ value: "10" });
  });

  it("renders hourly, weekday, and time-of-day controls through the dashboard bridge and dispatches actions", async () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div class="hourly-controls">
        <label class="segmented-option"><input type="checkbox" id="filter-weekdays" checked><span>Weekdays</span></label>
        <label class="segmented-option"><input type="checkbox" id="filter-weekends" checked><span>Weekends</span></label>
        <label class="segmented-option"><input type="checkbox" id="filter-working" checked><span>Working</span></label>
        <label class="segmented-option"><input type="checkbox" id="filter-offhours" checked><span>Off hours</span></label>
        <input type="range" id="hourly-brush-start" min="0" max="23" value="0">
        <input type="range" id="hourly-brush-end" min="0" max="23" value="23">
        <span id="hourly-brush-start-label">00:00</span>
        <span id="hourly-brush-end-label">23:00</span>
      </div>
      <div class="weekday-controls">
        <label class="segmented-option"><input type="checkbox" id="weekday-toggle-weekdays" checked><span>Weekdays</span></label>
        <label class="segmented-option"><input type="checkbox" id="weekday-toggle-weekends" checked><span>Weekends</span></label>
        <label class="segmented-option"><input type="checkbox" id="weekday-toggle-working" checked><span>Work hours</span></label>
        <label class="segmented-option"><input type="checkbox" id="weekday-toggle-offhours" checked><span>Off hours</span></label>
        <input type="range" id="weekday-hour-start" min="0" max="23" value="0">
        <input type="range" id="weekday-hour-end" min="0" max="23" value="23">
        <span id="weekday-hour-start-label">00:00</span>
        <span id="weekday-hour-end-label">23:00</span>
      </div>
      <div id="weekday-chart"></div>
      <div class="timeofday-controls">
        <label class="segmented-option"><input type="checkbox" id="timeofday-toggle-weekdays" checked><span>Weekdays</span></label>
        <label class="segmented-option"><input type="checkbox" id="timeofday-toggle-weekends" checked><span>Weekends</span></label>
        <input type="range" id="timeofday-hour-start" min="0" max="23" value="0">
        <input type="range" id="timeofday-hour-end" min="0" max="23" value="23">
        <span id="timeofday-hour-start-label">00:00</span>
        <span id="timeofday-hour-end-label">23:00</span>
      </div>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
    `;

    const fakeWindow = {
      document,
      console,
      Vue: await import("vue"),
    };

    mountDashboardPanelsIsland({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: fakeWindow });
    expect(bridge?.ownsActivityFilterInteractions).toBe(true);

    const hourlyBrushHandler = vi.fn();
    const weekdayBrushHandler = vi.fn();
    const timeOfDayFilterHandler = vi.fn();
    bridge?.setPanelActionHandlers?.({
      "hourly:set-brush": (_actionId, payload) => hourlyBrushHandler(payload),
      "weekday:set-brush": (_actionId, payload) => weekdayBrushHandler(payload),
      "timeofday:set-day-filter": (_actionId, payload) => timeOfDayFilterHandler(payload),
    });
    bridge?.syncHourlyControls?.({
      filters: { weekdays: false, weekends: true, working: false, offhours: true },
      brush: { start: 4, end: 15 },
      labels: { start: "04:00", end: "15:00" },
    });
    bridge?.syncWeekdayControls?.({
      filters: { weekdays: true, weekends: false, working: true, offhours: false },
      brush: { start: 6, end: 18 },
      labels: { start: "06:00", end: "18:00" },
    });
    bridge?.syncTimeOfDayControls?.({
      filters: { weekdays: false, weekends: true },
      brush: { start: 8, end: 20 },
      labels: { start: "08:00", end: "20:00" },
    });
    await fakeWindow.Vue.nextTick();

    expect(document.getElementById("hourly-brush-start")?.value).toBe("4");
    expect(document.getElementById("weekday-hour-start")?.value).toBe("6");
    expect(document.getElementById("timeofday-toggle-weekdays")?.checked).toBe(false);

    const hourlyEndInput = document.getElementById("hourly-brush-end");
    if (hourlyEndInput) {
      hourlyEndInput.value = "14";
      hourlyEndInput.dispatchEvent(new Event("input"));
    }
    const weekdayEndInput = document.getElementById("weekday-hour-end");
    if (weekdayEndInput) {
      weekdayEndInput.value = "16";
      weekdayEndInput.dispatchEvent(new Event("input"));
    }
    document.getElementById("timeofday-toggle-weekdays")?.dispatchEvent(new Event("change"));
    await fakeWindow.Vue.nextTick();

    expect(hourlyBrushHandler).toHaveBeenCalledWith({ start: 4, end: 14 });
    expect(weekdayBrushHandler).toHaveBeenCalledWith({ start: 6, end: 16 });
    expect(timeOfDayFilterHandler).toHaveBeenCalledWith({ filterKey: "weekdays", checked: false });
  });
});
