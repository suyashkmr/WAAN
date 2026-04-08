import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveVueBridge, VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";

function createVueRuntimeStub() {
  /** @type {any} */
  const runtime = {
    reactive: value => value,
    h: (type, props, children) => ({ type, props: props || {}, children }),
    render: (vnode, container) => {
      if (!container) return;
      if (!vnode) {
        container.innerHTML = "";
        return;
      }
      const html = vnode?.props?.innerHTML;
      container.innerHTML = typeof html === "string" ? html : "";
    },
  };
  runtime.createApp = component => ({
    use: () => runtime.createApp(component),
    component: () => runtime.createApp(component),
    mount: mountEl => {
      if (!mountEl) return;
      if (component?.template) {
        mountEl.innerHTML = component.template;
      }
    },
  });
  return runtime;
}

describe("vue bridge islands integration", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <section id="summary"></section>
      <div id="highlights-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="data-status"></div>
      <div id="toast-container"></div>
      <div id="search-results-list"></div>
      <div id="search-insights"></div>
      <div id="saved-view-gallery"></div>
      <div id="compare-summary"></div>
    `;
    const vueRuntime = createVueRuntimeStub();
    window.Vue = vueRuntime;
    globalThis.Vue = vueRuntime;
    window.PrimeVue = { Config: {}, Card: {} };
    window.primevue = window.PrimeVue;
  });

  afterEach(() => {
    delete window.Vue;
    delete window.PrimeVue;
    delete window.primevue;
    delete globalThis.Vue;
    delete window[VUE_RUNTIME_REGISTRY_KEY];
  });

  it("mounts all Vue island bridges with callable contracts", async () => {
    await import("../js/vue/summaryIsland.js");
    await import("../js/vue/dashboardPanelsIsland.js");
    await import("../js/vue/shellPrimitivesIsland.js");
    await import("../js/vue/searchSavedIsland.js");

    const summaryBridge = resolveVueBridge(VUE_BRIDGE_NAMES.summary, { globalScope: window });
    const dashboardBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: window });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: window });
    const searchSavedBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: window });
    expect(summaryBridge).toBeTruthy();
    expect(dashboardBridge).toBeTruthy();
    expect(shellBridge).toBeTruthy();
    expect(searchSavedBridge).toBeTruthy();
    expect(window[VUE_RUNTIME_REGISTRY_KEY]?.bridges?.summary).toBe(summaryBridge);
    expect(window[VUE_RUNTIME_REGISTRY_KEY]?.bridges?.dashboardPanels).toBe(dashboardBridge);
    expect(window[VUE_RUNTIME_REGISTRY_KEY]?.bridges?.shell).toBe(shellBridge);
    expect(window[VUE_RUNTIME_REGISTRY_KEY]?.bridges?.searchSaved).toBe(searchSavedBridge);
    expect(window.__WAAN_VUE_SUMMARY_BRIDGE__).toBeUndefined();
    expect(window.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__).toBeUndefined();
    expect(window.__WAAN_VUE_SHELL_BRIDGE__).toBeUndefined();
    expect(window.__WAAN_VUE_SEARCH_SAVED_BRIDGE__).toBeUndefined();

    expect(summaryBridge?.render([])).toBe(true);
    expect(dashboardBridge?.renderHighlights([])).toBe(true);
    expect(shellBridge?.showToast).toEqual(expect.any(Function));
    expect(
      searchSavedBridge?.renderSearchPanelState({
        tone: "loading",
        title: "Loading",
        message: "Searching…",
      }),
    ).toBe(true);
  }, 15_000);

  it("mounts dashboard panels bridge when markup uses #highlight-list", async () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
    `;

    await import("../js/vue/dashboardPanelsIsland.js");

    const dashboardBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: window });
    expect(dashboardBridge).toBeTruthy();
    expect(dashboardBridge?.renderParticipantsRows([])).toBe(true);
  });
});
