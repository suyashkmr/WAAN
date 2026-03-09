import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VUE_BRIDGE_NAMES,
  VUE_RUNTIME_REGISTRY_KEY,
  resolveVueBridge,
} from "../js/vue/bridgeRegistry.js";
import { mountVueAppShellRoot, VUE_APP_SHELL_ROOT_KEY } from "../js/vue/appShellRoot.js";
import { mountPageControlsPrimitive } from "../js/vue/shellPageControlsIsland.js";

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
    createApp: rootComponent => ({
      use() {
        return this;
      },
      component() {
        return this;
      },
      mount(mountEl) {
        if (!mountEl) return;
        const vnode = typeof rootComponent?.render === "function"
          ? rootComponent.render()
          : null;
        mountEl.innerHTML = "";
        if (vnode) {
          mountEl.appendChild(createNode(vnode));
        }
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
      <div class="page-controls"><div class="control-row primary-controls"></div></div>
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
    expect(shellBridge?.ownsPageControlInteractions).toBe(true);

    const onThemeSet = vi.fn();
    const onChatSelect = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "ui.theme.set": onThemeSet,
      "page.chat.select": onChatSelect,
    });
    expect(shellBridge?.dispatchShellAction?.("ui.theme.set", { preference: "dark" })).toBe(true);
    expect(onThemeSet).toHaveBeenCalledWith({ preference: "dark" });
    expect(shellBridge?.syncPageControls?.({
      chatOptions: [{ value: "remote:chat-1", label: "Chat 1" }],
      chatValue: "remote:chat-1",
      chatDisabled: false,
    })).toBe(true);
    expect(shellBridge?.dispatchShellAction?.("page.chat.select", { value: "remote:chat-1" })).toBe(true);
    expect(onChatSelect).toHaveBeenCalledWith({ value: "remote:chat-1" });
    shellBridge?.showStatusMessage?.("Saved", "success", {
      autoHideDelayMs: 9999,
      exitDurationMs: 150,
    });

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

  it("reuses mounted page-controls bridge without recursive sync delegation", () => {
    const firstBridge = mountPageControlsPrimitive(globalThis);
    expect(firstBridge?.syncPageControls?.({
      chatOptions: [{ value: "remote:chat-1", label: "Chat 1" }],
      chatValue: "remote:chat-1",
      chatDisabled: false,
    })).toBe(true);

    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          syncPageControls: vi.fn(() => {
            throw new Error("should not recurse through shell bridge");
          }),
        },
      },
    };

    const secondBridge = mountPageControlsPrimitive(globalThis);
    expect(secondBridge).toBe(firstBridge);
    expect(secondBridge?.syncPageControls?.({ chatValue: "remote:chat-2" })).toBe(true);
  });

  it("keeps legacy page-control refs live for detached-listener flows", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <select id="global-range"><option value="all">All time</option><option value="30">Last 30 days</option></select>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
    `;
    const legacyRangeSelect = document.getElementById("global-range");
    const legacyCustomStart = document.getElementById("custom-start");
    const changeSpy = vi.fn();
    const inputSpy = vi.fn();
    legacyRangeSelect.addEventListener("change", changeSpy);
    legacyCustomStart.addEventListener("input", inputSpy);

    mountPageControlsPrimitive(globalThis);
    const rangeSelect = document.querySelector(".page-controls #global-range");
    rangeSelect.value = "30";
    rangeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(legacyRangeSelect.value).toBe("30");
    expect(changeSpy).toHaveBeenCalledTimes(1);

    const startInput = document.querySelector("#custom-start");
    startInput.value = "2025-01-05";
    startInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(legacyCustomStart.value).toBe("2025-01-05");
    expect(inputSpy).toHaveBeenCalledTimes(1);
  });
});
