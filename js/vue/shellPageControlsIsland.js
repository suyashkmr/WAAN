import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./bridgeRegistry.js";
import { configurePrimeVueApp } from "./primevueApp.js";
import { createShellPageControlsRoot } from "./shellPageControlsView.js";

const PAGE_CONTROLS_BRIDGE_KEY = "__waanPageControlsBridge";

function dispatchLegacyEvent(element, type) {
  if (!element) return;
  const view = element.ownerDocument?.defaultView ?? globalThis;
  const EventCtor = view?.Event ?? Event;
  element.dispatchEvent(new EventCtor(type, { bubbles: true }));
}

function syncLegacyPageControlRefs(legacyRefs, nextState = {}) {
  const {
    chatSelector,
    rangeSelect,
    customControls,
    customStartInput,
    customEndInput,
    customApplyButton,
  } = legacyRefs;
  if (Object.prototype.hasOwnProperty.call(nextState, "chatValue") && chatSelector) {
    chatSelector.value = nextState.chatValue ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "chatDisabled") && chatSelector) {
    chatSelector.disabled = Boolean(nextState.chatDisabled);
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "rangeValue") && rangeSelect) {
    rangeSelect.value = nextState.rangeValue ?? "all";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customVisible")) {
    const visible = Boolean(nextState.customVisible);
    customControls?.classList?.toggle("hidden", !visible);
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customStart") && customStartInput) {
    customStartInput.value = nextState.customStart ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customEnd") && customEndInput) {
    customEndInput.value = nextState.customEnd ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customMin")) {
    if (customStartInput) customStartInput.min = nextState.customMin ?? "";
    if (customEndInput) customEndInput.min = nextState.customMin ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customMax")) {
    if (customStartInput) customStartInput.max = nextState.customMax ?? "";
    if (customEndInput) customEndInput.max = nextState.customMax ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customDisabled")) {
    const disabled = Boolean(nextState.customDisabled);
    if (customStartInput) customStartInput.disabled = disabled;
    if (customEndInput) customEndInput.disabled = disabled;
    if (customApplyButton) customApplyButton.disabled = disabled;
  }
}

export function mountPageControlsPrimitive(globalScope = globalThis) {
  const VueRuntime = globalScope?.Vue;
  const controlsEl = globalScope?.document?.querySelector?.(".page-controls .primary-controls");
  if (!VueRuntime || !controlsEl) return null;
  if (controlsEl.dataset.vuePrimitiveMounted === "true") {
    return controlsEl[PAGE_CONTROLS_BRIDGE_KEY] ?? {
      ownsPageControlInteractions: true,
      syncPageControls: () => false,
    };
  }
  const { createApp, h, reactive } = VueRuntime;
  const legacyRefs = {
    chatSelector: controlsEl.querySelector?.("#chat-selector") ?? null,
    rangeSelect: controlsEl.querySelector?.("#global-range") ?? null,
    customControls: controlsEl.querySelector?.("#custom-range-controls") ?? null,
    customStartInput: controlsEl.querySelector?.("#custom-start") ?? null,
    customEndInput: controlsEl.querySelector?.("#custom-end") ?? null,
    customApplyButton: controlsEl.querySelector?.("#apply-custom-range") ?? null,
  };
  const pageControlsState = reactive({
    chatOptions: [{ value: "", label: "No chats loaded yet" }],
    chatValue: "",
    chatDisabled: true,
    rangeOptions: [
      { value: "all", label: "All time" },
      { value: "30", label: "Last 30 days" },
      { value: "90", label: "Last 90 days" },
      { value: "180", label: "Last 180 days" },
      { value: "365", label: "Last 365 days" },
      { value: "custom", label: "Custom range" },
    ],
    rangeValue: "all",
    customVisible: false,
    customStart: "",
    customEnd: "",
    customDisabled: true,
    customMin: "",
    customMax: "",
  });
  controlsEl.textContent = "";
  controlsEl.dataset.vueManaged = "true";
  const PageControlsRoot = createShellPageControlsRoot(
    h,
    pageControlsState,
    (actionId, payload = null) => {
      if (actionId === "page.chat.select") {
        syncLegacyPageControlRefs(legacyRefs, { chatValue: payload?.value ?? "" });
        dispatchLegacyEvent(legacyRefs.chatSelector, "change");
      } else if (actionId === "page.range.select") {
        syncLegacyPageControlRefs(legacyRefs, { rangeValue: payload?.value ?? "all" });
        dispatchLegacyEvent(legacyRefs.rangeSelect, "change");
      } else if (actionId === "page.range.set-custom-start") {
        syncLegacyPageControlRefs(legacyRefs, { customStart: payload?.value ?? "" });
        dispatchLegacyEvent(legacyRefs.customStartInput, "input");
        dispatchLegacyEvent(legacyRefs.customStartInput, "change");
        return;
      } else if (actionId === "page.range.set-custom-end") {
        syncLegacyPageControlRefs(legacyRefs, { customEnd: payload?.value ?? "" });
        dispatchLegacyEvent(legacyRefs.customEndInput, "input");
        dispatchLegacyEvent(legacyRefs.customEndInput, "change");
        return;
      }
      const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
      if (shellBridge?.dispatchShellAction) {
        shellBridge.dispatchShellAction(actionId, payload);
        return;
      }
      shellBridge?.dispatchRelayAction?.(actionId, payload);
    },
    globalScope,
  );
  configurePrimeVueApp(createApp(PageControlsRoot), globalScope).mount(controlsEl);
  controlsEl.dataset.vuePrimitiveMounted = "true";
  const pageControlsBridge = {
    ownsPageControlInteractions: true,
    syncPageControls(nextState = {}) {
      syncLegacyPageControlRefs(legacyRefs, nextState);
      Object.assign(pageControlsState, nextState);
      return true;
    },
  };
  controlsEl[PAGE_CONTROLS_BRIDGE_KEY] = pageControlsBridge;
  return pageControlsBridge;
}
