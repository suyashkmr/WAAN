import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mountSearchSavedBridge } from "../js/vue/searchSavedIsland.js";
import { registerVueBridge, resolveVueBridge, VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";

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
    };
    registerVueBridge(
      VUE_BRIDGE_NAMES.searchSaved,
      {
        __waanVueSearchBridge: true,
        __runtimeBoundToVue: false,
        renderSearchResults: () => false,
      },
      { globalScope: fakeWindow },
    );

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

  it("keeps a stable Vue root for saved-view gallery rerenders", () => {
    const fakeWindow = {
      document,
      console,
      Vue: {
        h: (type, props = {}, children = []) => ({ type, props, children }),
        render: (vnode, container) => {
          if (!container) return;
          if (!vnode) {
            container.innerHTML = "";
            return;
          }
          const cssClass = typeof vnode?.props?.class === "string" ? vnode.props.class : "";
          if (cssClass.includes("saved-view-gallery-vue-root")) {
            const children = Array.isArray(vnode.children) ? vnode.children : [];
            container.innerHTML = `<div class="saved-view-gallery-vue-root">${children
              .map(
                child =>
                  `<article class="saved-view-card" data-view-id="${String(child?.props?.["data-view-id"] || "")}"></article>`,
              )
              .join("")}</div>`;
            return;
          }
          container.innerHTML = "<div>rendered</div>";
        },
      },
    };

    mountSearchSavedBridge({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    bridge?.renderSavedViewsGallery?.({
      cards: [{ viewId: "view-1", viewName: "View 1", interactive: true }],
      interactive: true,
    });
    expect(document.querySelectorAll(".saved-view-gallery-vue-root").length).toBe(1);
    expect(document.querySelectorAll("#saved-view-gallery .saved-view-card").length).toBe(1);

    bridge?.renderSavedViewsGallery?.({
      cards: [
        { viewId: "view-1", viewName: "View 1", interactive: true },
        { viewId: "view-2", viewName: "View 2", interactive: true },
      ],
      interactive: true,
    });
    expect(document.querySelectorAll(".saved-view-gallery-vue-root").length).toBe(1);
    expect(document.querySelectorAll("#saved-view-gallery .saved-view-card").length).toBe(2);
  });

  it("uses PrimeVue DataView for saved-view gallery when runtime component is available", () => {
    const PrimeDataView = { name: "PrimeDataViewStub" };
    const fakeWindow = {
      document,
      console,
      PrimeVue: { DataView: PrimeDataView },
      Vue: {
        h: (type, props = {}, children = []) => ({ type, props, children }),
        render: (vnode, container) => {
          if (!container) return;
          if (!vnode) {
            container.innerHTML = "";
            return;
          }
          const cssClass = typeof vnode?.props?.class === "string" ? vnode.props.class : "";
          if (!cssClass.includes("saved-view-gallery-vue-root")) {
            container.innerHTML = "<div>rendered</div>";
            return;
          }
          const children = Array.isArray(vnode.children) ? vnode.children : [];
          const dataViewNode = children.find(child => child?.type === PrimeDataView) || null;
          if (!dataViewNode) {
            container.innerHTML = '<div class="saved-view-gallery-vue-root"></div>';
            return;
          }
          const slot = dataViewNode.children?.list;
          const listNodes = typeof slot === "function"
            ? slot({ items: dataViewNode.props?.value || [] })
            : [];
          container.innerHTML = `<div class="saved-view-gallery-vue-root" data-ui-runtime="${String(dataViewNode.props?.["data-ui-runtime"] || "")}">${listNodes
            .map(
              child =>
                `<article class="saved-view-card" data-view-id="${String(child?.props?.["data-view-id"] || "")}"></article>`,
            )
            .join("")}</div>`;
        },
      },
    };

    mountSearchSavedBridge({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    bridge?.renderSavedViewsGallery?.({
      cards: [{ viewId: "view-1", viewName: "View 1", interactive: true }],
      interactive: true,
    });

    const root = document.querySelector(".saved-view-gallery-vue-root");
    expect(root?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(document.querySelectorAll("#saved-view-gallery .saved-view-card").length).toBe(1);
  });

  it("uses PrimeVue DataView for search results when runtime component is available", () => {
    const PrimeDataView = { name: "PrimeDataViewStub" };
    const fakeWindow = {
      document,
      console,
      PrimeVue: { DataView: PrimeDataView },
      Vue: {
        h: (type, props = {}, children = []) => ({ type, props, children }),
        render: (vnode, container) => {
          if (!container) return;
          if (!vnode) {
            container.innerHTML = "";
            return;
          }
          const cssClass = typeof vnode?.props?.class === "string" ? vnode.props.class : "";
          if (!cssClass.includes("search-results-vue-list")) {
            container.innerHTML = "<div>rendered</div>";
            return;
          }
          const children = Array.isArray(vnode.children) ? vnode.children : [];
          const dataViewNode = children.find(child => child?.type === PrimeDataView) || null;
          if (!dataViewNode) {
            container.innerHTML = '<div class="search-results-vue-list"></div>';
            return;
          }
          const slot = dataViewNode.children?.list;
          const listNodes = typeof slot === "function"
            ? slot({ items: dataViewNode.props?.value || [] })
            : [];
          container.innerHTML = `<div class="search-results-vue-list" data-ui-runtime="${String(dataViewNode.props?.["data-ui-runtime"] || "")}">${listNodes
            .map(() => '<div class="search-result"></div>')
            .join("")}</div>`;
        },
      },
    };

    mountSearchSavedBridge({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    bridge?.renderSearchResults?.({
      results: [{ sender: "A", timestamp: "2026-03-05T00:00:00.000Z", message: "hello" }],
      total: 1,
    });

    const root = document.querySelector("#search-results-list .search-results-vue-list");
    expect(root?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(document.querySelectorAll("#search-results-list .search-result").length).toBe(1);
  });
});
