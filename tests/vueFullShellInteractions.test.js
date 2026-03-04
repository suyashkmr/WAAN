import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VUE_BRIDGE_NAMES,
  VUE_RUNTIME_REGISTRY_KEY,
  resolveVueBridge,
} from "../js/vue/bridgeRegistry.js";
import { mountVueAppShellRoot, VUE_APP_SHELL_ROOT_KEY } from "../js/vue/appShellRoot.js";

function createVueRuntimeStub() {
  /**
   * @param {any} vnode
   * @returns {Node}
   */
  function createNode(vnode) {
    if (vnode == null || vnode === false) return document.createComment("");
    if (Array.isArray(vnode)) {
      const fragment = document.createDocumentFragment();
      vnode.forEach(child => {
        fragment.appendChild(createNode(child));
      });
      return fragment;
    }
    if (typeof vnode === "string" || typeof vnode === "number") {
      return document.createTextNode(String(vnode));
    }
    const type = vnode?.type;
    if (typeof type !== "string") {
      return document.createComment("unsupported-vnode");
    }
    const el = document.createElement(type);
    const props = vnode?.props || {};
    Object.entries(props).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === "class") {
        if (Array.isArray(value)) {
          el.className = value.filter(Boolean).join(" ");
        } else {
          el.className = String(value);
        }
        return;
      }
      if (key === "style" && typeof value === "object") {
        Object.entries(value).forEach(([styleKey, styleValue]) => {
          if (styleValue == null) return;
          el.style.setProperty(String(styleKey), String(styleValue));
        });
        return;
      }
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value);
        return;
      }
      el.setAttribute(key, String(value));
    });
    const children = vnode?.children;
    if (Array.isArray(children)) {
      children.forEach(child => {
        el.appendChild(createNode(child));
      });
    } else if (children != null && typeof children !== "object") {
      el.textContent = String(children);
    }
    return el;
  }

  return {
    reactive: value => value,
    h: (type, props = {}, children = []) => ({ type, props, children }),
    render: (vnode, container) => {
      if (!container) return;
      container.innerHTML = "";
      if (!vnode) return;
      container.appendChild(createNode(vnode));
    },
    createApp: () => ({
      use() {
        return this;
      },
      component() {
        return this;
      },
      mount(mountEl) {
        if (!mountEl) return;
        mountEl.dataset.vueAppMounted = "true";
      },
    }),
  };
}

describe("vue full-shell interactions", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="summary"></section>
      <div id="highlights-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="data-status"></div>
      <div id="toast-container"></div>
      <form id="advanced-search-form"><div class="search-actions"></div></form>
      <div id="search-results-list"></div>
      <div id="search-insights"></div>
      <div id="saved-view-gallery"></div>
      <div id="compare-summary"></div>
    `;
    const runtime = createVueRuntimeStub();
    globalThis.Vue = runtime;
    globalThis.PrimeVue = { Config: {}, Card: {} };
    globalThis.primevue = globalThis.PrimeVue;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
    delete globalThis[VUE_APP_SHELL_ROOT_KEY];
  });

  it("mounts root and dispatches shell + search panel actions through registered bridges", () => {
    const rootState = mountVueAppShellRoot({ globalScope: globalThis });
    expect(rootState?.mounted).toBe(true);

    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const searchBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: globalThis });
    expect(shellBridge).toBeTruthy();
    expect(searchBridge).toBeTruthy();

    const onThemeSet = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "ui.theme.set": onThemeSet,
    });
    expect(shellBridge?.dispatchShellAction?.("ui.theme.set", { preference: "dark" })).toBe(true);
    expect(onThemeSet).toHaveBeenCalledWith({ preference: "dark" });

    const onClearFilters = vi.fn();
    searchBridge?.setPanelActionHandlers?.({
      "search:clear-search-filters": onClearFilters,
    });
    const rendered = searchBridge?.renderSearchPanelState?.({
      tone: "empty",
      title: "Search",
      message: "Try a keyword",
      actions: [{ id: "clear-search-filters", label: "Clear filters" }],
    });
    expect(rendered).toBe(true);
    const button = document.querySelector('#search-results-list [data-panel-action="clear-search-filters"]');
    expect(button).toBeTruthy();
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClearFilters).toHaveBeenCalledWith("search:clear-search-filters", null);
  });
});
