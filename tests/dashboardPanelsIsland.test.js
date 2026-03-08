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
    expect(capturedPt?.root?.style).toContain("display: contents");
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
      Vue: await import("vue"),
    };

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

    const topCountSelect = document.getElementById("participants-top-count");
    expect(topCountSelect?.value).toBe("10");
    topCountSelect?.dispatchEvent(new Event("change"));
    await fakeWindow.Vue.nextTick();

    expect(topCountHandler).toHaveBeenCalledWith({ value: "10" });
    expect(document.querySelector('[data-participants-preset="quiet"]')?.getAttribute("aria-pressed")).toBe("false");
  });
});
