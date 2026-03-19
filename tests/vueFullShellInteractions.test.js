import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VUE_BRIDGE_NAMES,
  VUE_RUNTIME_REGISTRY_KEY,
  resolveVueBridge,
} from "../js/vue/bridgeRegistry.js";
import { mountVueAppShellRoot } from "../js/vue/appShellRoot.js";
import { mountPageControlsPrimitive } from "../js/vue/shellPageControlsIsland.js";
import { readPrimeDateBridgeValueById } from "../js/vue/primeDateBridge.js";
import { readPrimeSelectBridgeValue, readPrimeSelectBridgeValueById } from "../js/vue/primeSelectBridge.js";
import { createAppDomRefs } from "../js/appShell/domRefs.js";
import {
  createVueRuntimeStub,
  installTestUiGlobals,
  resetTestUiGlobals,
  seedFullShellDom,
} from "./uiTestHarness.js";

describe("vue full-shell interactions", () => {
  beforeEach(() => {
    seedFullShellDom();
    installTestUiGlobals({
      vueRuntime: createVueRuntimeStub(),
      primeVue: {
        Config: {},
        Card: {},
        Button: { name: "PrimeButtonStub" },
        Select: { name: "PrimeSelectStub" },
        DatePicker: { name: "PrimeDatePickerStub" },
      },
    });
    resetTestUiGlobals({
      clearBridgeRuntime: false,
      clearDomRefsCaptured: true,
      clearVueRuntime: false,
      clearPrimeVueRuntime: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetTestUiGlobals({
      clearAppShellRoot: true,
      clearDomRefsCaptured: true,
    });
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

  it("falls back to relay handlers for toolbar actions that are relay-owned", () => {
    const rootState = mountVueAppShellRoot({ globalScope: globalThis });
    expect(rootState?.mounted).toBe(true);

    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const onLogDrawerOpen = vi.fn();
    shellBridge?.setRelayActionHandlers?.({
      "relay.logDrawerOpen": onLogDrawerOpen,
    });

    expect(shellBridge?.dispatchShellAction?.("relay.logDrawerOpen")).toBe(true);
    expect(onLogDrawerOpen).toHaveBeenCalledTimes(1);
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

  it("keeps bridge-owned page-control state live for sync flows", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <select id="global-range"><option value="all">All time</option><option value="30">Last 30 days</option></select>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
    `;
    mountVueAppShellRoot({ globalScope: globalThis });
    const bridge = mountPageControlsPrimitive(globalThis);
    bridge?.syncPageControls?.({
      rangeValue: "30",
      customVisible: true,
      customStart: "2025-01-05",
    });

    expect(bridge?.readPageControlState?.()).toMatchObject({
      rangeValue: "30",
      customStart: "2025-01-05",
    });
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

    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(document.getElementById("global-range--primevue")).toBeTruthy();
    expect(document.getElementById("custom-start--primevue")).toBeTruthy();
    expect(document.getElementById("custom-end--primevue")).toBeTruthy();
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(document.getElementById("custom-start")).toBeNull();
    expect(document.getElementById("custom-end")).toBeNull();
  });

  it("detaches bridged page controls immediately once PrimeVue owns the page-control surface", () => {
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
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    const firstBridge = mountPageControlsPrimitive(globalThis);
    expect(firstBridge?.ownsPageControlInteractions).toBe(true);
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(document.getElementById("custom-start")).toBeNull();
    expect(document.getElementById("custom-end")).toBeNull();

    const refs = createAppDomRefs({
      documentRef: document,
      windowRef: window,
      storageRef: globalThis.localStorage,
      vueRuntime: globalThis.Vue,
    });
    expect(refs.chatSelector).toBeNull();
    expect(refs.rangeSelect).toBeNull();
    expect(refs.customStartInput).toBeNull();
    expect(refs.customEndInput).toBeNull();

    mountPageControlsPrimitive(globalThis);
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(document.getElementById("custom-start")).toBeNull();
    expect(document.getElementById("custom-end")).toBeNull();
  });

  it("detaches empty-container seeded page controls immediately after the PrimeVue bridge mounts", () => {
    const controlsEl = document.querySelector(".page-controls .primary-controls");
    controlsEl.innerHTML = "";
    delete document.documentElement.dataset.waanDomRefsCaptured;

    const firstBridge = mountPageControlsPrimitive(globalThis);
    expect(firstBridge?.ownsPageControlInteractions).toBe(true);
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(document.getElementById("custom-start")).toBeNull();
    expect(document.getElementById("custom-end")).toBeNull();
    expect(document.documentElement.dataset.waanDomRefsCaptured).toBeUndefined();

    const refs = createAppDomRefs({
      documentRef: document,
      windowRef: window,
      storageRef: globalThis.localStorage,
      vueRuntime: globalThis.Vue,
    });
    expect(refs.chatSelector).toBeNull();
    expect(refs.rangeSelect).toBeNull();
    expect(refs.customStartInput).toBeNull();
    expect(refs.customEndInput).toBeNull();
    expect(document.documentElement.dataset.waanDomRefsCaptured).toBeUndefined();

    mountPageControlsPrimitive(globalThis);
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(document.getElementById("custom-start")).toBeNull();
    expect(document.getElementById("custom-end")).toBeNull();
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

  it("does not install detached native focus delegates for page-control bridges", () => {
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

    const legacyChatSelect = /** @type {HTMLSelectElement} */ (document.getElementById("chat-selector"));
    const legacyRangeSelect = /** @type {HTMLSelectElement} */ (document.getElementById("global-range"));

    mountPageControlsPrimitive(globalThis);
    createAppDomRefs({
      documentRef: document,
      windowRef: window,
      storageRef: globalThis.localStorage,
      vueRuntime: globalThis.Vue,
    });
    mountPageControlsPrimitive(globalThis);

    expect(legacyChatSelect.dataset.primevueDelegateInstalled).toBeUndefined();
    expect(legacyRangeSelect.dataset.primevueDelegateInstalled).toBeUndefined();
    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(document.getElementById("global-range--primevue")).toBeTruthy();
  });

  it("prefers visible page-control targets for bridge-owned focus actions", () => {
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

    const bridge = mountPageControlsPrimitive(globalThis);
    const legacyChatSelect = bridge?.legacyRefs?.chatSelector;
    const visibleChatSelect = /** @type {HTMLElement} */ (document.getElementById("chat-selector--primevue"));
    const visibleFocusSpy = vi.spyOn(visibleChatSelect, "focus").mockImplementation(() => {});
    legacyChatSelect.focus = vi.fn(() => {
      throw new Error("should use visible target");
    });

    expect(bridge?.focusPageControl?.("chat")).toBe(true);
    expect(visibleFocusSpy).toHaveBeenCalledTimes(1);
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
    createAppDomRefs({
      documentRef: document,
      windowRef: window,
      storageRef: globalThis.localStorage,
      vueRuntime: globalThis.Vue,
    });
    mountPageControlsPrimitive(globalThis);

    const chatLabel = document.querySelector("label.dataset-control");
    const rangeLabel = document.querySelector("label.period-control");
    expect(chatLabel?.querySelector(".prime-select-bridge")).toBeTruthy();
    expect(rangeLabel?.querySelector(".prime-select-bridge")).toBeTruthy();
    expect(chatLabel?.children[1]?.classList.contains("prime-select-bridge")).toBe(true);
    expect(rangeLabel?.children[1]?.classList.contains("prime-select-bridge")).toBe(true);
    expect(chatLabel?.querySelector("#chat-selector")).toBeNull();
    expect(rangeLabel?.querySelector("#global-range")).toBeNull();
    expect(chatLabel?.nextElementSibling?.id).not.toBe("chat-selector");
    expect(rangeLabel?.nextElementSibling?.id).not.toBe("global-range");
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
      Button: { name: "PrimeButtonStub" },
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
      Button: { name: "PrimeButtonStub" },
      Select: { name: "PrimeSelectStub" },
      DatePicker: { name: "PrimeDatePickerStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    const upgradedBridge = mountPageControlsPrimitive(globalThis);
    expect(upgradedBridge?.ownsPageControlInteractions).toBe(true);
    expect(shellBridge?.ownsPageControlInteractions).toBe(true);
  });

  it("does not reseed page controls on a second shell mount after a partial PrimeVue bridge", () => {
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
    globalThis.PrimeVue = {
      Config: {},
      Button: { name: "PrimeButtonStub" },
      Select: { name: "PrimeSelectStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    const controlsEl = document.querySelector(".page-controls .primary-controls");
    const originalMarkup = controlsEl.innerHTML;
    const firstBridge = mountPageControlsPrimitive(globalThis);

    expect(firstBridge?.ownsPageControlInteractions).toBe(false);
    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(document.getElementById("global-range--primevue")).toBeTruthy();
    expect(firstBridge?.legacyRefs?.chatSelector).toBeTruthy();
    expect(firstBridge?.legacyRefs?.rangeSelect).toBeTruthy();
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();

    const secondBridge = mountPageControlsPrimitive(globalThis);

    expect(secondBridge).toBe(firstBridge);
    expect(document.querySelectorAll("#chat-selector--primevue")).toHaveLength(1);
    expect(document.querySelectorAll("#global-range--primevue")).toHaveLength(1);
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(controlsEl.innerHTML).not.toBe(originalMarkup);
  });

  it("reuses registered page-control bridges across retry mounts after a partial bridge", () => {
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
    globalThis.PrimeVue = {
      Config: {},
      Button: { name: "PrimeButtonStub" },
      Select: { name: "PrimeSelectStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    const firstBridge = mountPageControlsPrimitive(globalThis);
    const firstChatRef = firstBridge?.legacyRefs?.chatSelector;
    const firstRangeRef = firstBridge?.legacyRefs?.rangeSelect;

    expect(firstBridge?.ownsPageControlInteractions).toBe(false);
    expect(firstChatRef).toBeTruthy();
    expect(firstRangeRef).toBeTruthy();

    globalThis.PrimeVue = {
      Config: {},
      Button: { name: "PrimeButtonStub" },
      Select: { name: "PrimeSelectStub" },
      DatePicker: { name: "PrimeDatePickerStub" },
    };
    globalThis.primevue = globalThis.PrimeVue;

    const secondBridge = mountPageControlsPrimitive(globalThis);
    const pageState = secondBridge?.readPageControlState?.();

    expect(secondBridge?.legacyRefs?.chatSelector).toBeNull();
    expect(secondBridge?.legacyRefs?.rangeSelect).toBeNull();
    expect(secondBridge?.ownsPageControlInteractions).toBe(true);
    expect(pageState).toMatchObject({
      chatValue: "",
      rangeValue: "all",
      customStart: "",
      customEnd: "",
    });

    expect(secondBridge?.syncPageControls?.({
      chatValue: "remote:chat-1",
      rangeValue: "180",
    })).toBe(true);

    expect(firstChatRef?.dataset.primevueManaged).not.toBe("detached");
    expect(firstRangeRef?.dataset.primevueManaged).not.toBe("detached");
    expect(firstChatRef?.__waanPrimeSelectBridge).toBeUndefined();
    expect(firstRangeRef?.__waanPrimeSelectBridge).toBeUndefined();
    expect(readPrimeSelectBridgeValue(firstChatRef)).toBe("remote:chat-1");
    expect(readPrimeSelectBridgeValue(firstRangeRef)).toBe("180");
    expect(readPrimeSelectBridgeValueById(document, "chat-selector--primevue")).toBe("remote:chat-1");
    expect(readPrimeSelectBridgeValueById(document, "global-range--primevue")).toBe("180");
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
      Button: { name: "PrimeButtonStub" },
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

  it("does not mirror native change events for the bridged chat selector", () => {
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
        </select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" />
        <input id="custom-end" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    mountVueAppShellRoot({ globalScope: globalThis });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const onChatSelect = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "page.chat.select": onChatSelect,
    });

    const bridge = mountPageControlsPrimitive(globalThis);
    const legacyChatSelect = bridge?.legacyRefs?.chatSelector;
    const legacyChangeSpy = vi.fn();
    legacyChatSelect?.addEventListener("change", legacyChangeSpy);

    const visibleChatSelect = document.getElementById("chat-selector--primevue");
    visibleChatSelect.selectedIndex = 1;
    visibleChatSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(legacyChangeSpy).not.toHaveBeenCalled();
    expect(onChatSelect).toHaveBeenCalledWith({ value: "remote:chat-1" });
  });

  it("dispatches custom date draft actions through the visible PrimeVue date controls", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="custom">Custom range</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    mountVueAppShellRoot({ globalScope: globalThis });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const onSetCustomStart = vi.fn();
    const onSetCustomEnd = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "page.range.set-custom-start": onSetCustomStart,
      "page.range.set-custom-end": onSetCustomEnd,
    });

    mountPageControlsPrimitive(globalThis);

    const visibleStartInput = document.getElementById("custom-start--primevue");
    const visibleEndInput = document.getElementById("custom-end--primevue");
    expect(visibleStartInput).toBeTruthy();
    expect(visibleEndInput).toBeTruthy();

    visibleStartInput.value = "2025-01-05";
    visibleStartInput.dispatchEvent(new Event("change", { bubbles: true }));
    visibleEndInput.value = "2025-01-07";
    visibleEndInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onSetCustomStart).toHaveBeenCalledWith({ value: "2025-01-05" });
    expect(onSetCustomEnd).toHaveBeenCalledWith({ value: "2025-01-07" });
  });

  it("reads custom apply payload from bridged date state instead of detached native inputs", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="custom">Custom range</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    mountVueAppShellRoot({ globalScope: globalThis });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: globalThis });
    const onApplyCustomRange = vi.fn();
    shellBridge?.setShellActionHandlers?.({
      "page.range.apply-custom": onApplyCustomRange,
    });

    const bridge = mountPageControlsPrimitive(globalThis);
    const visibleStartInput = document.getElementById("custom-start--primevue");
    const visibleEndInput = document.getElementById("custom-end--primevue");
    expect(visibleStartInput).toBeTruthy();
    expect(visibleEndInput).toBeTruthy();

    visibleStartInput.value = "2025-02-05";
    visibleStartInput.dispatchEvent(new Event("change", { bubbles: true }));
    visibleEndInput.value = "2025-02-07";
    visibleEndInput.dispatchEvent(new Event("change", { bubbles: true }));
    expect(bridge?.legacyRefs?.customStartInput).toBeNull();
    expect(bridge?.legacyRefs?.customEndInput).toBeNull();

    const visibleApplyButton = document.getElementById("apply-custom-range--primevue");
    expect(visibleApplyButton?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(document.getElementById("apply-custom-range")).toBeNull();
    visibleApplyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onApplyCustomRange).toHaveBeenCalledWith({
      start: "2025-02-05",
      end: "2025-02-07",
    });
  });

  it("reads bridge-owned page-control state without re-reading detached native refs", () => {
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
          <option value="custom">Custom range</option>
        </select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    const bridge = mountPageControlsPrimitive(globalThis);
    bridge?.syncPageControls?.({
      chatValue: "remote:chat-1",
      rangeValue: "custom",
      customStart: "2025-02-05",
      customEnd: "2025-02-07",
    });
    expect(bridge?.legacyRefs?.chatSelector).toBeNull();
    expect(bridge?.legacyRefs?.rangeSelect).toBeNull();
    expect(bridge?.legacyRefs?.customStartInput).toBeNull();
    expect(bridge?.legacyRefs?.customEndInput).toBeNull();

    expect(bridge?.readPageControlState?.()).toMatchObject({
      chatValue: "remote:chat-1",
      rangeValue: "custom",
      customStart: "2025-02-05",
      customEnd: "2025-02-07",
    });
  });

  it("keeps bridge-owned page-control sync working after detached refs drop out", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector">
          <option value="">No chats loaded yet</option>
          <option value="remote:chat-1">Chat 1</option>
          <option value="remote:chat-2">Chat 2</option>
        </select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range">
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    const bridge = mountPageControlsPrimitive(globalThis);
    expect(bridge?.syncPageControls?.({
      chatValue: "remote:chat-1",
      rangeValue: "custom",
      customStart: "2025-02-05",
      customEnd: "2025-02-07",
    })).toBe(true);

    bridge.legacyRefs.chatSelector = null;
    bridge.legacyRefs.rangeSelect = null;
    bridge.legacyRefs.customStartInput = null;
    bridge.legacyRefs.customEndInput = null;

    expect(bridge?.syncPageControls?.({
      chatValue: "remote:chat-2",
      rangeValue: "all",
      customStart: "2025-03-01",
      customEnd: "2025-03-03",
    })).toBe(true);
    expect(bridge?.readPageControlState?.()).toMatchObject({
      chatValue: "remote:chat-2",
      rangeValue: "all",
      customStart: "2025-03-01",
      customEnd: "2025-03-03",
    });
    expect(readPrimeDateBridgeValueById(document, "custom-start--primevue")).toBe("2025-03-01");
    expect(readPrimeDateBridgeValueById(document, "custom-end--primevue")).toBe("2025-03-03");
  });

  it("keeps the bridged custom apply button disabled state in sync after ownership flips on", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="custom">Custom range</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    const bridge = mountPageControlsPrimitive(globalThis);
    const visibleApplyButton = /** @type {HTMLButtonElement} */ (document.getElementById("apply-custom-range--primevue"));
    expect(visibleApplyButton).toBeTruthy();

    expect(bridge?.syncPageControls?.({ customDisabled: true })).toBe(true);
    expect(visibleApplyButton.disabled).toBe(true);

    expect(bridge?.syncPageControls?.({ customDisabled: false })).toBe(true);
    expect(visibleApplyButton.disabled).toBe(false);
  });

  it("marks the bridged custom apply mount as initialized so repeated syncs do not remount it", () => {
    document.querySelector(".page-controls .primary-controls").innerHTML = `
      <label class="control dataset-control">
        <span>Loaded chats</span>
        <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      </label>
      <label class="control period-control">
        <span>Time range</span>
        <select id="global-range"><option value="custom">Custom range</option></select>
      </label>
      <div id="custom-range-controls">
        <input id="custom-start" value="2025-01-01" />
        <input id="custom-end" value="2025-01-02" />
      </div>
      <button id="apply-custom-range" type="button">Apply</button>
    `;

    const baseRuntime = globalThis.Vue;
    const createAppMountSpy = vi.fn();
    globalThis.Vue = {
      ...baseRuntime,
      createApp(rootComponent) {
        const app = baseRuntime.createApp(rootComponent);
        return {
          ...app,
          mount(mountEl) {
            if (mountEl?.id === "apply-custom-range--mount") {
              createAppMountSpy();
            }
            const result = app.mount(mountEl);
            delete mountEl.dataset.vueAppMounted;
            return result;
          },
        };
      },
    };

    const bridge = mountPageControlsPrimitive(globalThis);
    expect(bridge?.ownsPageControlInteractions).toBe(true);
    expect(createAppMountSpy).toHaveBeenCalledTimes(1);
    expect(document.getElementById("apply-custom-range--mount")?.dataset.vueAppMounted).toBe("true");

    expect(bridge?.syncPageControls?.({ customDisabled: true })).toBe(true);
    expect(bridge?.syncPageControls?.({ customDisabled: false })).toBe(true);
    expect(createAppMountSpy).toHaveBeenCalledTimes(1);
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
    const legacyChatSelect = firstBridge?.legacyRefs?.chatSelector;
    const legacyRangeSelect = firstBridge?.legacyRefs?.rangeSelect;
    expect(legacyChatSelect).toBeNull();
    expect(legacyRangeSelect).toBeNull();
    expect(readPrimeSelectBridgeValueById(document, "chat-selector--primevue")).toBe("remote:chat-1");
  });

  it("does not reseed native page controls when a bridged container re-enters without the mounted flag", () => {
    const controlsEl = document.querySelector(".page-controls .primary-controls");
    controlsEl.innerHTML = "";

    const bridge = mountPageControlsPrimitive(globalThis);
    expect(bridge?.ownsPageControlInteractions).toBe(true);
    expect(document.getElementById("chat-selector--primevue")).toBeTruthy();
    expect(document.getElementById("global-range--primevue")).toBeTruthy();
    expect(document.getElementById("custom-start--primevue")).toBeTruthy();
    expect(document.getElementById("custom-end--primevue")).toBeTruthy();
    expect(document.getElementById("apply-custom-range--primevue")).toBeTruthy();

    delete controlsEl.dataset.vuePrimitiveMounted;

    const rerenderedBridge = mountPageControlsPrimitive(globalThis);

    expect(rerenderedBridge).toBe(bridge);
    expect(document.querySelectorAll("#chat-selector--primevue")).toHaveLength(1);
    expect(document.querySelectorAll("#global-range--primevue")).toHaveLength(1);
    expect(document.querySelectorAll("#custom-start--primevue")).toHaveLength(1);
    expect(document.querySelectorAll("#custom-end--primevue")).toHaveLength(1);
    expect(document.querySelectorAll("#apply-custom-range--primevue")).toHaveLength(1);
    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.getElementById("global-range")).toBeNull();
    expect(document.getElementById("custom-start")).toBeNull();
    expect(document.getElementById("custom-end")).toBeNull();
    expect(document.getElementById("apply-custom-range")).toBeNull();
  });
});
