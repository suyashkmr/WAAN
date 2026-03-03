import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mountSearchSavedBridge } from "../js/vue/searchSavedIsland.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";

function createVueRuntimeStub() {
  return {
    h: (type, props = {}, children = []) => ({ type, props, children }),
    render: (vnode, container) => {
      if (!container) return;
      if (!vnode) {
        container.innerHTML = "";
        return;
      }
      const cssClass = typeof vnode?.props?.class === "string" ? vnode.props.class : "";
      if (cssClass.includes("search-results-vue-list")) {
        container.innerHTML = '<div class="search-result">rendered</div>';
        return;
      }
      container.innerHTML = "<div>rendered</div>";
    },
  };
}

describe("search saved island bridge mounting", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <div id="search-results-list"></div>
      <div id="search-insights" class="hidden"></div>
      <div id="saved-view-gallery"></div>
      <div id="compare-summary"></div>
    `;
  });

  afterEach(() => {
    delete globalThis.__WAAN_VUE_RUNTIME__;
    delete globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__;
  });

  it("does not register bridge before Vue runtime is available", () => {
    const fakeWindow = {
      document,
      console,
    };

    mountSearchSavedBridge({ globalScope: fakeWindow });

    expect(resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow })).toBeNull();
  });

  it("replaces stale unbound bridge once Vue runtime becomes available", () => {
    const fakeWindow = {
      document,
      console,
      __WAAN_VUE_SEARCH_SAVED_BRIDGE__: {
        __waanVueSearchBridge: true,
        __runtimeBoundToVue: false,
        renderSearchResults: () => false,
      },
    };

    mountSearchSavedBridge({ globalScope: fakeWindow });
    const beforeVueBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow });
    expect(beforeVueBridge?.__runtimeBoundToVue).toBe(false);

    fakeWindow.Vue = createVueRuntimeStub();
    mountSearchSavedBridge({ globalScope: fakeWindow });

    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow });
    expect(bridge?.__runtimeBoundToVue).toBe(true);
    expect(bridge?.renderSearchResults?.({ results: [{ sender: "u", timestamp: "", message: "m" }], total: 1 })).toBe(true);
  });

  it("mounts bridge in render-only Vue runtime even when search actions container exists", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <form id="advanced-search-form">
          <div class="search-actions"></div>
        </form>
      `,
    );
    const fakeWindow = {
      document,
      console,
      Vue: createVueRuntimeStub(),
    };

    expect(() => mountSearchSavedBridge({ globalScope: fakeWindow })).not.toThrow();

    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();
    expect(bridge?.__runtimeBoundToVue).toBe(true);
  });
});
