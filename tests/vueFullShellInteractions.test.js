import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VUE_BRIDGE_NAMES,
  VUE_RUNTIME_REGISTRY_KEY,
  resolveVueBridge,
} from "../js/vue/bridgeRegistry.js";
import { mountVueAppShellRoot, VUE_APP_SHELL_ROOT_KEY } from "../js/vue/appShellRoot.js";
import { mountPageControlsPrimitive } from "../js/vue/shellPageControlsIsland.js";

function createVueRuntimeStub() {
  function normalizeDateValue(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return value == null ? "" : String(value);
  }
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
      if (type && typeof type === "object") {
        const props = vnode?.props || {};
        if (props.inputId && props.optionLabel && props.optionValue) {
          const el = document.createElement("select");
          el.id = String(props.inputId);
          el.className = "p-select";
          (props.options || []).forEach(option => {
            const optionEl = document.createElement("option");
            optionEl.value = String(option?.[props.optionValue] ?? "");
            optionEl.textContent = String(option?.[props.optionLabel] ?? "");
            el.appendChild(optionEl);
          });
          el.value = String(props.modelValue ?? "");
          el.disabled = Boolean(props.disabled);
          el.addEventListener("change", event => {
            props["onUpdate:modelValue"]?.(event.target.value);
          });
          return el;
        }
        if (props.inputId) {
          const el = document.createElement("input");
          el.id = String(props.inputId);
          el.type = "date";
          el.className = "p-datepicker";
          el.value = normalizeDateValue(props.modelValue);
          el.disabled = Boolean(props.disabled);
          el.min = normalizeDateValue(props.minDate);
          el.max = normalizeDateValue(props.maxDate);
          el.addEventListener("change", event => {
            props["onUpdate:modelValue"]?.(event.target.value);
          });
          return el;
        }
      }
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
    globalThis.PrimeVue = {
      Config: {},
      Card: {},
      Select: { name: "PrimeSelectStub" },
      DatePicker: { name: "PrimeDatePickerStub" },
    };
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

    const startInput = document.querySelector("#custom-start--primevue");
    startInput.value = "2025-01-05";
    startInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(legacyCustomStart.value).toBe("2025-01-05");
    expect(inputSpy).toHaveBeenCalledTimes(1);
  });

  it("preserves native page-control ids when PrimeVue runtime is available", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      <select id="global-range"><option value="all">All time</option><option value="30">Last 30 days</option></select>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    mountPageControlsPrimitive(globalThis);

    expect(document.getElementById("chat-selector")?.tagName).toBe("SELECT");
    expect(document.getElementById("global-range")?.tagName).toBe("SELECT");
    expect(document.getElementById("custom-start")?.tagName).toBe("INPUT");
    expect(document.getElementById("custom-end")?.tagName).toBe("INPUT");
    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(document.getElementById("global-range--primevue")).toBeTruthy();
    expect(document.getElementById("custom-start--primevue")).toBeTruthy();
    expect(document.getElementById("custom-end--primevue")).toBeTruthy();
    expect(document.getElementById("chat-selector")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("global-range")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("custom-start")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("custom-end")?.classList.contains("hidden")).toBe(true);
  });

  it("preserves visible chat force-select interactions in PrimeVue bridge mode", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <select id="chat-selector"><option value="remote:chat-1">Chat 1</option></select>
      <select id="global-range"><option value="all">All time</option></select>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    mountVueAppShellRoot({ globalScope: globalThis });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const onForceSelect = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "page.chat.force-select": onForceSelect,
    });

    const visibleChatSelect = document.getElementById("chat-selector--primevue");
    expect(visibleChatSelect).toBeTruthy();

    visibleChatSelect?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    visibleChatSelect?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onForceSelect).toHaveBeenCalledTimes(2);
    expect(onForceSelect).toHaveBeenNthCalledWith(1, { value: "remote:chat-1" });
    expect(onForceSelect).toHaveBeenNthCalledWith(2, { value: "remote:chat-1" });
  });

  it("mounts bridged page selects ahead of hidden native selects inside wrapping labels", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="remote:chat-1">Chat 1</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="all">All time</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    mountPageControlsPrimitive(globalThis);

    const chatLabel = document.querySelector("label.dataset-control");
    const rangeLabel = document.querySelector("label.period-control");
    expect(chatLabel?.querySelector(".prime-select-bridge")).toBeTruthy();
    expect(rangeLabel?.querySelector(".prime-select-bridge")).toBeTruthy();
    expect(chatLabel?.children[1]?.classList.contains("prime-select-bridge")).toBe(true);
    expect(rangeLabel?.children[1]?.classList.contains("prime-select-bridge")).toBe(true);
    expect(chatLabel?.querySelector("#chat-selector")).toBeNull();
    expect(rangeLabel?.querySelector("#global-range")).toBeNull();
    expect(chatLabel?.nextElementSibling?.id).toBe("chat-selector");
    expect(rangeLabel?.nextElementSibling?.id).toBe("global-range");
    expect(chatLabel?.nextElementSibling?.classList.contains("hidden")).toBe(true);
    expect(rangeLabel?.nextElementSibling?.classList.contains("hidden")).toBe(true);
  });

  it("keeps page controls on native fallback ownership when PrimeVue is unavailable", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      <select id="global-range"><option value="all">All time</option><option value="30">Last 30 days</option></select>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;

    const bridge = mountPageControlsPrimitive(globalThis);

    expect(bridge?.ownsPageControlInteractions).toBe(false);
    expect(document.getElementById("chat-selector--primevue")).toBeNull();
    expect(document.getElementById("global-range--primevue")).toBeNull();
    expect(document.getElementById("custom-start--primevue")).toBeNull();
    expect(document.getElementById("custom-end--primevue")).toBeNull();
    expect(document.getElementById("chat-selector")?.classList.contains("hidden")).toBe(false);
    expect(document.querySelector(".page-controls .primary-controls")?.dataset.vuePrimitiveMounted).not.toBe("true");
  });

  it("retries page-control bridge mount after an early no-PrimeVue fallback", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="remote:chat-1">Chat 1</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="all">All time</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;

    const firstBridge = mountPageControlsPrimitive(globalThis);
    expect(firstBridge?.ownsPageControlInteractions).toBe(false);
    expect(document.getElementById("chat-selector--primevue")).toBeNull();

    globalThis.PrimeVue = {
      Config: {},
      Select: { name: "PrimeSelectStub" },
      DatePicker: { name: "PrimeDatePickerStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    const secondBridge = mountPageControlsPrimitive(globalThis);
    expect(secondBridge?.ownsPageControlInteractions).toBe(true);
    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(document.querySelector(".page-controls .primary-controls")?.dataset.vuePrimitiveMounted).toBe("true");
  });

  it("updates the shell bridge ownership after a retry upgrades page controls", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="remote:chat-1">Chat 1</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="all">All time</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;

    mountVueAppShellRoot({ globalScope: globalThis });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    expect(shellBridge?.ownsPageControlInteractions).toBe(false);

    globalThis.PrimeVue = {
      Config: {},
      Select: { name: "PrimeSelectStub" },
      DatePicker: { name: "PrimeDatePickerStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    const upgradedBridge = mountPageControlsPrimitive(globalThis);
    expect(upgradedBridge?.ownsPageControlInteractions).toBe(true);
    expect(shellBridge?.ownsPageControlInteractions).toBe(true);
  });

  it("dispatches chat and range actions through the visible PrimeVue controls after a retry upgrade", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector">
          <option value="">No chats loaded yet</option>
          <option value="remote:chat-1">Chat 1</option>
        </select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range">
          <option value="all">All time</option>
          <option value="180">Last 180 days</option>
        </select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;

    mountVueAppShellRoot({ globalScope: globalThis });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const onChatSelect = vi.fn();
    const onRangeSelect = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "page.chat.select": onChatSelect,
      "page.range.select": onRangeSelect,
    });

    const firstBridge = mountPageControlsPrimitive(globalThis);
    expect(firstBridge?.ownsPageControlInteractions).toBe(false);

    globalThis.PrimeVue = {
      Config: {},
      Select: { name: "PrimeSelectStub" },
      DatePicker: { name: "PrimeDatePickerStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    mountPageControlsPrimitive(globalThis);

    const visibleChatSelect = document.getElementById("chat-selector--primevue");
    const visibleRangeSelect = document.getElementById("global-range--primevue");
    expect(visibleChatSelect).toBeTruthy();
    expect(visibleRangeSelect).toBeTruthy();

    visibleChatSelect.selectedIndex = 1;
    expect(visibleChatSelect.value).toBe("remote:chat-1");
    visibleChatSelect.dispatchEvent(new Event("change", { bubbles: true }));
    visibleRangeSelect.selectedIndex = 1;
    expect(visibleRangeSelect.value).toBe("180");
    visibleRangeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onChatSelect).toHaveBeenCalledWith({ value: "remote:chat-1" });
    expect(onRangeSelect).toHaveBeenCalledWith({ value: "180" });
  });

  it("renders and upgrades empty page-control containers without losing the retry path", () => {
    const controlsEl = document.querySelector(".page-controls .primary-controls");
    controlsEl.innerHTML = "";

    const firstBridge = mountPageControlsPrimitive(globalThis);
    expect(firstBridge?.ownsPageControlInteractions).toBe(true);
    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(controlsEl?.dataset.vuePrimitiveMounted).toBe("true");
    expect(firstBridge?.syncPageControls?.({
      chatOptions: [{ value: "remote:chat-1", label: "Chat 1" }],
      chatValue: "remote:chat-1",
      chatDisabled: false,
    })).toBe(true);
    expect(document.getElementById("chat-selector")?.value).toBe("remote:chat-1");
    const rangeOptions = Array.from(document.getElementById("global-range")?.options || []).map(option => option.value);
    expect(rangeOptions).toEqual(["all", "30", "90", "180", "365", "custom"]);
  });
});
