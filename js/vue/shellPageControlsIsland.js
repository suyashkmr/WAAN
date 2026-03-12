import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./bridgeRegistry.js";
import { configurePrimeVueApp } from "./primevueApp.js";
import { syncPrimeDateBridge } from "./primeDateBridge.js";
import { syncPrimeSelectBridge } from "./primeSelectBridge.js";
import { renderActionButton } from "./primevueRenderPrimitives.js";
import { emitPageControlDraftSignal } from "./pageControlDraftSignal.js";
import { readRegisteredPageControlBridgeValue, syncBridgeOwnedPageControls, syncRegisteredPageControlBridge } from "./shellPageControlsBridgeSync.js";
import { ensureLegacyPageControlsRendered, ensureSelectOptions, mergeLegacyPageControlRefs, resolveLegacyPageControlRefs, resolvePageControlTarget } from "./shellPageControlsUtils.js";
import { mergePageControlState, resolveDateControlState, resolveSelectControlState, snapshotPageControlState } from "./shellPageControlsState.js";
const PAGE_CONTROLS_BRIDGE_KEY = "__waanPageControlsBridge";
const CUSTOM_APPLY_BUTTON_BRIDGE_ID = "apply-custom-range--primevue";
function dispatchShellAction(actionId, payload = null, globalScope = globalThis) {
  const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
  return shellBridge?.dispatchShellAction
    ? (shellBridge.dispatchShellAction(actionId, payload), true)
    : Boolean(shellBridge?.dispatchRelayAction?.(actionId, payload));
}
function syncLegacyPageControlRefs(legacyRefs, nextState = {}) {
  const { chatSelector, rangeSelect, customControls, customStartInput, customEndInput, customApplyButton } = legacyRefs;
  if (Array.isArray(nextState.chatOptions) && chatSelector?.isConnected) {
    ensureSelectOptions(chatSelector, nextState.chatOptions);
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "chatValue") && chatSelector?.isConnected) {
    chatSelector.value = nextState.chatValue ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "chatDisabled") && chatSelector?.isConnected) {
    chatSelector.disabled = Boolean(nextState.chatDisabled);
  }
  if (Array.isArray(nextState.rangeOptions) && rangeSelect?.isConnected) {
    ensureSelectOptions(rangeSelect, nextState.rangeOptions);
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "rangeValue") && rangeSelect?.isConnected) {
    rangeSelect.value = nextState.rangeValue ?? "all";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customVisible")) {
    const visible = Boolean(nextState.customVisible);
    customControls?.classList?.toggle("hidden", !visible);
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customStart") && customStartInput?.isConnected) {
    customStartInput.value = nextState.customStart ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customEnd") && customEndInput?.isConnected) {
    customEndInput.value = nextState.customEnd ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customMin")) {
    if (customStartInput?.isConnected) customStartInput.min = nextState.customMin ?? "";
    if (customEndInput?.isConnected) customEndInput.min = nextState.customMin ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customMax")) {
    if (customStartInput?.isConnected) customStartInput.max = nextState.customMax ?? "";
    if (customEndInput?.isConnected) customEndInput.max = nextState.customMax ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "customDisabled")) {
    const disabled = Boolean(nextState.customDisabled);
    if (customStartInput?.isConnected) customStartInput.disabled = disabled;
    if (customEndInput?.isConnected) customEndInput.disabled = disabled;
    if (customApplyButton?.isConnected) customApplyButton.disabled = disabled;
  }
}
function syncPrimeCustomApplyButton(legacyRefs, pageControlsBridge, globalScope = globalThis) {
  const customApplyButton = legacyRefs?.customApplyButton ?? null;
  const VueRuntime = globalScope?.Vue ?? null;
  const PrimeButton = globalScope?.PrimeVue?.Button || globalScope?.primevue?.Button || null;
  if (!VueRuntime || typeof VueRuntime.createApp !== "function" || typeof VueRuntime.h !== "function" || !PrimeButton) {
    return false;
  }
  const ownerDocument = customApplyButton?.ownerDocument ?? legacyRefs?.customControls?.ownerDocument ?? globalScope?.document ?? null;
  if (!ownerDocument) return false;
  let mountEl = ownerDocument.getElementById("apply-custom-range--mount");
  if (!mountEl) {
    const mountContainer = customApplyButton?.parentElement
      ?? legacyRefs?.customControls?.querySelector?.(".custom-range-inputs")
      ?? legacyRefs?.customControls
      ?? null;
    if (!mountContainer) return false;
    mountEl = ownerDocument.createElement("div");
    mountEl.id = "apply-custom-range--mount";
    mountEl.className = "prime-button-bridge";
    if (customApplyButton?.parentElement) {
      customApplyButton.insertAdjacentElement("beforebegin", mountEl);
    } else {
      mountContainer.appendChild(mountEl);
    }
  }
  if (mountEl.dataset.vueAppMounted !== "true") {
    const Root = {
      name: "PageControlsApplyButtonBridge",
      render() {
        return renderActionButton(VueRuntime.h, {
          id: CUSTOM_APPLY_BUTTON_BRIDGE_ID,
          type: "button",
          className: "ghost-button small",
          text: "Apply",
          disabled: Boolean(pageControlsBridge.state?.customDisabled),
          onClick: () => {
            const pageControlState = pageControlsBridge.readPageControlState();
            dispatchShellAction(
              "page.range.apply-custom",
              {
                start: pageControlState?.customStart || "",
                end: pageControlState?.customEnd || "",
              },
              globalScope,
            );
          },
        }, globalScope);
      },
    };
    configurePrimeVueApp(VueRuntime.createApp(Root), globalScope).mount(mountEl);
    mountEl.dataset.vueAppMounted = "true";
  }
  const visibleButton = ownerDocument.getElementById(CUSTOM_APPLY_BUTTON_BRIDGE_ID);
  if (visibleButton instanceof HTMLButtonElement) {
    visibleButton.disabled = Boolean(pageControlsBridge.state?.customDisabled);
  }
  if (customApplyButton?.isConnected) {
    customApplyButton.remove();
  }
  return true;
}
function syncPrimePageControls(legacyRefs, pageControlsBridge, globalScope = globalThis) {
  const { chatSelector, rangeSelect, customStartInput, customEndInput } = legacyRefs;
  const ownerDocument = globalScope?.document ?? chatSelector?.ownerDocument ?? rangeSelect?.ownerDocument ?? customStartInput?.ownerDocument ?? customEndInput?.ownerDocument ?? null;
  if (pageControlsBridge.ownsPageControlInteractions) {
    const bridgedControls = syncBridgeOwnedPageControls(ownerDocument, pageControlsBridge.state);
    const bridgedApplyButton = syncPrimeCustomApplyButton(legacyRefs, pageControlsBridge, globalScope);
    return Boolean(bridgedControls || bridgedApplyButton);
  }
  const state = pageControlsBridge.state ?? {};
  let ownsInteractions = true;
  let foundBridgeableControl = false;
  if (chatSelector) {
    foundBridgeableControl = true;
    const chatState = resolveSelectControlState(state, "chat", chatSelector);
    const bridged = syncPrimeSelectBridge({
      selectEl: chatSelector,
      options: chatState.options,
      value: chatState.value,
      disabled: chatState.disabled,
      preserveNativeId: true,
      detachPreservedNative: true,
      keepDetachedNativeValueSynced: false,
      visibleInputId: "chat-selector--primevue",
      attrs: {
        onDblclick: () => {
          const value = readRegisteredPageControlBridgeValue(ownerDocument, "chat");
          if (!value) return;
          dispatchShellAction("page.chat.force-select", { value }, globalScope);
        },
        onKeydown: event => {
          const value = readRegisteredPageControlBridgeValue(ownerDocument, "chat");
          if (event?.key !== "Enter" || !value) return;
          event.preventDefault?.();
          dispatchShellAction("page.chat.force-select", { value }, globalScope);
        },
      },
      onValueChange: value => {
        pageControlsBridge.state = mergePageControlState(pageControlsBridge.state, { chatValue: value });
        dispatchShellAction("page.chat.select", { value }, globalScope);
      },
      globalScope,
    });
    if (!bridged) {
      ownsInteractions = false;
    }
  } else if (syncRegisteredPageControlBridge(ownerDocument, "chat", state)) {
    foundBridgeableControl = true;
  }
  if (rangeSelect) {
    foundBridgeableControl = true;
    const rangeState = resolveSelectControlState(state, "range", rangeSelect);
    const bridged = syncPrimeSelectBridge({
      selectEl: rangeSelect,
      options: rangeState.options,
      value: rangeState.value,
      disabled: rangeState.disabled,
      preserveNativeId: true,
      detachPreservedNative: true,
      keepDetachedNativeValueSynced: false,
      visibleInputId: "global-range--primevue",
      onValueChange: value => {
        pageControlsBridge.state = mergePageControlState(pageControlsBridge.state, { rangeValue: value || "all" });
        emitPageControlDraftSignal(globalScope, { type: "range-select", value: value || "all" });
        dispatchShellAction("page.range.select", { value: value || "all" }, globalScope);
      },
      globalScope,
    });
    if (!bridged) {
      ownsInteractions = false;
    }
  } else if (syncRegisteredPageControlBridge(ownerDocument, "range", state)) {
    foundBridgeableControl = true;
  }
  if (customStartInput) {
    foundBridgeableControl = true;
    const customStartState = resolveDateControlState(state, "customStart", customStartInput);
    const bridged = syncPrimeDateBridge({
      inputEl: customStartInput,
      value: customStartState.value,
      disabled: customStartState.disabled,
      min: customStartState.min,
      max: customStartState.max,
      preserveNativeId: true,
      detachPreservedNative: true,
      keepDetachedNativeValueSynced: false,
      visibleInputId: "custom-start--primevue",
      onValueChange: value => {
        pageControlsBridge.state = mergePageControlState(pageControlsBridge.state, { customStart: value });
        emitPageControlDraftSignal(globalScope, { type: "custom-start", value });
        dispatchShellAction("page.range.set-custom-start", { value }, globalScope);
      },
      globalScope,
    });
    if (!bridged) {
      ownsInteractions = false;
    }
  } else if (syncRegisteredPageControlBridge(ownerDocument, "customStart", state)) {
    foundBridgeableControl = true;
  }
  if (customEndInput) {
    foundBridgeableControl = true;
    const customEndState = resolveDateControlState(state, "customEnd", customEndInput);
    const bridged = syncPrimeDateBridge({
      inputEl: customEndInput,
      value: customEndState.value,
      disabled: customEndState.disabled,
      min: customEndState.min,
      max: customEndState.max,
      preserveNativeId: true,
      detachPreservedNative: true,
      keepDetachedNativeValueSynced: false,
      visibleInputId: "custom-end--primevue",
      onValueChange: value => {
        pageControlsBridge.state = mergePageControlState(pageControlsBridge.state, { customEnd: value });
        emitPageControlDraftSignal(globalScope, { type: "custom-end", value });
        dispatchShellAction("page.range.set-custom-end", { value }, globalScope);
      },
      globalScope,
    });
    if (!bridged) {
      ownsInteractions = false;
    }
  } else if (syncRegisteredPageControlBridge(ownerDocument, "customEnd", state)) {
    foundBridgeableControl = true;
  }
  const bridgedApplyButton = syncPrimeCustomApplyButton(legacyRefs, pageControlsBridge, globalScope);
  if (bridgedApplyButton) {
    foundBridgeableControl = true;
  } else if (legacyRefs?.customApplyButton) {
    ownsInteractions = false;
  }

  return foundBridgeableControl && ownsInteractions;
}
export function mountPageControlsPrimitive(globalScope = globalThis) {
  const controlsEl = globalScope?.document?.querySelector?.(".page-controls .primary-controls");
  if (!controlsEl) return null;
  const existingBridge = controlsEl[PAGE_CONTROLS_BRIDGE_KEY] ?? null;
  if (controlsEl.dataset.vuePrimitiveMounted === "true") {
    if (existingBridge) {
      const legacyRefs = mergeLegacyPageControlRefs(
        existingBridge.legacyRefs,
        resolveLegacyPageControlRefs(controlsEl),
      );
      existingBridge.legacyRefs = legacyRefs;
      existingBridge.state = snapshotPageControlState(legacyRefs, existingBridge.state);
      existingBridge.ownsPageControlInteractions = syncPrimePageControls(legacyRefs, existingBridge, globalScope);
      return existingBridge;
    }
    return { ownsPageControlInteractions: false, syncPageControls: () => false };
  }
  const pageControlsBridge = existingBridge ?? {
    ownsPageControlInteractions: false,
    legacyRefs: null,
    state: null,
    readPageControlState() {
      if (!pageControlsBridge.state || !pageControlsBridge.ownsPageControlInteractions) {
        const legacyRefs = mergeLegacyPageControlRefs(
          pageControlsBridge.legacyRefs,
          resolveLegacyPageControlRefs(controlsEl),
        );
        pageControlsBridge.legacyRefs = legacyRefs;
        pageControlsBridge.state = snapshotPageControlState(legacyRefs, pageControlsBridge.state);
      }
      return { chatValue: pageControlsBridge.state?.chatValue ?? "", rangeValue: pageControlsBridge.state?.rangeValue ?? "all", customStart: pageControlsBridge.state?.customStart ?? "", customEnd: pageControlsBridge.state?.customEnd ?? "" };
    },
    syncPageControls(nextState = {}) {
      const legacyRefs = mergeLegacyPageControlRefs(
        pageControlsBridge.legacyRefs,
        resolveLegacyPageControlRefs(controlsEl),
      );
      pageControlsBridge.legacyRefs = legacyRefs;
      pageControlsBridge.state = mergePageControlState(pageControlsBridge.state, nextState);
      syncLegacyPageControlRefs(legacyRefs, nextState);
      const ownsInteractions = syncPrimePageControls(legacyRefs, pageControlsBridge, globalScope);
      pageControlsBridge.ownsPageControlInteractions = ownsInteractions;
      if (!ownsInteractions) {
        pageControlsBridge.state = snapshotPageControlState(legacyRefs, pageControlsBridge.state);
      }
      return ownsInteractions;
    },
    focusPageControl(controlKey) {
      const legacyRefs = mergeLegacyPageControlRefs(
        pageControlsBridge.legacyRefs,
        resolveLegacyPageControlRefs(controlsEl),
      );
      pageControlsBridge.legacyRefs = legacyRefs;
      const target = resolvePageControlTarget(
        legacyRefs,
        controlsEl.ownerDocument,
        controlKey,
        pageControlsBridge.ownsPageControlInteractions,
      );
      if (!target?.focus) return false;
      target.focus();
      return true;
    },
    scrollPageControl(controlKey) {
      const legacyRefs = mergeLegacyPageControlRefs(
        pageControlsBridge.legacyRefs,
        resolveLegacyPageControlRefs(controlsEl),
      );
      pageControlsBridge.legacyRefs = legacyRefs;
      const target = resolvePageControlTarget(
        legacyRefs,
        controlsEl.ownerDocument,
        controlKey,
        pageControlsBridge.ownsPageControlInteractions,
      );
      if (!target?.scrollIntoView) return false;
      target.scrollIntoView({ behavior: "auto", block: "center" });
      return true;
    },
  };
  controlsEl[PAGE_CONTROLS_BRIDGE_KEY] = pageControlsBridge;
  ensureLegacyPageControlsRendered(controlsEl, existingBridge);
  const legacyRefs = mergeLegacyPageControlRefs(pageControlsBridge.legacyRefs, resolveLegacyPageControlRefs(controlsEl));
  pageControlsBridge.legacyRefs = legacyRefs;
  pageControlsBridge.state = snapshotPageControlState(legacyRefs, pageControlsBridge.state);
  const ownsPageControlInteractions = syncPrimePageControls(legacyRefs, pageControlsBridge, globalScope);
  pageControlsBridge.ownsPageControlInteractions = ownsPageControlInteractions;
  if (ownsPageControlInteractions) {
    controlsEl.dataset.vueManaged = "true";
    controlsEl.dataset.vuePrimitiveMounted = "true";
    return pageControlsBridge;
  }
  return pageControlsBridge;
}
