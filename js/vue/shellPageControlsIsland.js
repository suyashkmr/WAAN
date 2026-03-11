import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./bridgeRegistry.js";
import { syncPrimeDateBridge, syncPrimeDateBridgeValue } from "./primeDateBridge.js";
import { syncPrimeSelectBridge, syncPrimeSelectBridgeValue } from "./primeSelectBridge.js";
import {
  ensureSelectOptions,
  extractSelectOptions,
  renderLegacyPageControlsSeed,
} from "./shellPageControlsUtils.js";

const PAGE_CONTROLS_BRIDGE_KEY = "__waanPageControlsBridge";

function dispatchShellAction(actionId, payload = null, globalScope = globalThis) {
  const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
  if (shellBridge?.dispatchShellAction) {
    shellBridge.dispatchShellAction(actionId, payload);
    return true;
  }
  return Boolean(shellBridge?.dispatchRelayAction?.(actionId, payload));
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
  if (Array.isArray(nextState.chatOptions) && chatSelector) {
    ensureSelectOptions(chatSelector, nextState.chatOptions);
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "chatValue") && chatSelector) {
    chatSelector.value = nextState.chatValue ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(nextState, "chatDisabled") && chatSelector) {
    chatSelector.disabled = Boolean(nextState.chatDisabled);
  }
  if (Array.isArray(nextState.rangeOptions) && rangeSelect) {
    ensureSelectOptions(rangeSelect, nextState.rangeOptions);
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

function bindPageControlListeners(legacyRefs, globalScope) {
  const {
    customApplyButton,
  } = legacyRefs;

  if (customApplyButton && customApplyButton.dataset.vuePageControlBound !== "true") {
    if (customApplyButton.dataset.eventBindingsPageControlBound !== "true") {
      customApplyButton.addEventListener("click", () => {
        dispatchShellAction(
          "page.range.apply-custom",
          {
            start: legacyRefs.customStartInput?.value || "",
            end: legacyRefs.customEndInput?.value || "",
          },
          globalScope,
        );
      });
      customApplyButton.dataset.vuePageControlBound = "true";
    }
  }
}

function syncPrimePageControls(legacyRefs, globalScope = globalThis) {
  const {
    chatSelector,
    rangeSelect,
    customStartInput,
    customEndInput,
  } = legacyRefs;

  let ownsInteractions = true;
  let foundBridgeableControl = false;

  if (chatSelector) {
    foundBridgeableControl = true;
    const bridged = syncPrimeSelectBridge({
      selectEl: chatSelector,
      options: extractSelectOptions(chatSelector),
      value: chatSelector.value,
      disabled: chatSelector.disabled,
      preserveNativeId: true,
      visibleInputId: "chat-selector--primevue",
      attrs: {
        onDblclick: () => {
          if (!chatSelector.value) return;
          dispatchShellAction("page.chat.force-select", { value: chatSelector.value }, globalScope);
        },
        onKeydown: event => {
          if (event?.key !== "Enter" || !chatSelector.value) return;
          event.preventDefault?.();
          dispatchShellAction("page.chat.force-select", { value: chatSelector.value }, globalScope);
        },
      },
      onValueChange: value => {
        dispatchShellAction("page.chat.select", { value }, globalScope);
      },
      globalScope,
    });
    if (bridged) {
      syncPrimeSelectBridgeValue({
        selectEl: chatSelector,
        value: chatSelector.value,
        disabled: chatSelector.disabled,
      });
    } else {
      ownsInteractions = false;
    }
  }

  if (rangeSelect) {
    foundBridgeableControl = true;
    const bridged = syncPrimeSelectBridge({
      selectEl: rangeSelect,
      options: extractSelectOptions(rangeSelect),
      value: rangeSelect.value,
      disabled: rangeSelect.disabled,
      preserveNativeId: true,
      visibleInputId: "global-range--primevue",
      onValueChange: value => {
        dispatchShellAction("page.range.select", { value: value || "all" }, globalScope);
      },
      globalScope,
    });
    if (bridged) {
      syncPrimeSelectBridgeValue({
        selectEl: rangeSelect,
        value: rangeSelect.value,
        disabled: rangeSelect.disabled,
      });
    } else {
      ownsInteractions = false;
    }
  }

  if (customStartInput) {
    foundBridgeableControl = true;
    const bridged = syncPrimeDateBridge({
      inputEl: customStartInput,
      value: customStartInput.value,
      disabled: customStartInput.disabled,
      min: customStartInput.min,
      max: customStartInput.max,
      preserveNativeId: true,
      visibleInputId: "custom-start--primevue",
      onValueChange: value => {
        dispatchShellAction("page.range.set-custom-start", { value }, globalScope);
      },
      globalScope,
    });
    if (bridged) {
      syncPrimeDateBridgeValue({
        inputEl: customStartInput,
        value: customStartInput.value,
        disabled: customStartInput.disabled,
        min: customStartInput.min,
        max: customStartInput.max,
      });
    } else {
      ownsInteractions = false;
    }
  }

  if (customEndInput) {
    foundBridgeableControl = true;
    const bridged = syncPrimeDateBridge({
      inputEl: customEndInput,
      value: customEndInput.value,
      disabled: customEndInput.disabled,
      min: customEndInput.min,
      max: customEndInput.max,
      preserveNativeId: true,
      visibleInputId: "custom-end--primevue",
      onValueChange: value => {
        dispatchShellAction("page.range.set-custom-end", { value }, globalScope);
      },
      globalScope,
    });
    if (bridged) {
      syncPrimeDateBridgeValue({
        inputEl: customEndInput,
        value: customEndInput.value,
        disabled: customEndInput.disabled,
        min: customStartInput?.min ?? customEndInput.min,
        max: customEndInput.max,
      });
    } else {
      ownsInteractions = false;
    }
  }

  return foundBridgeableControl && ownsInteractions;
}

function resolveLegacyPageControlRefs(controlsEl) {
  return {
    chatSelector: controlsEl.querySelector?.("#chat-selector") ?? null,
    rangeSelect: controlsEl.querySelector?.("#global-range") ?? null,
    customControls: controlsEl.querySelector?.("#custom-range-controls") ?? null,
    customStartInput: controlsEl.querySelector?.("#custom-start") ?? null,
    customEndInput: controlsEl.querySelector?.("#custom-end") ?? null,
    customApplyButton: controlsEl.querySelector?.("#apply-custom-range") ?? null,
  };
}

function ensureLegacyPageControlsRendered(controlsEl, globalScope = globalThis) {
  if (!controlsEl) return false;
  const existingRefs = resolveLegacyPageControlRefs(controlsEl);
  if (existingRefs.chatSelector || existingRefs.rangeSelect || existingRefs.customStartInput || existingRefs.customEndInput) {
    return true;
  }
  return renderLegacyPageControlsSeed(controlsEl, globalScope);
}

export function mountPageControlsPrimitive(globalScope = globalThis) {
  const controlsEl = globalScope?.document?.querySelector?.(".page-controls .primary-controls");
  if (!controlsEl) return null;
  const existingBridge = controlsEl[PAGE_CONTROLS_BRIDGE_KEY] ?? null;
  if (controlsEl.dataset.vuePrimitiveMounted === "true") {
    return existingBridge ?? {
      ownsPageControlInteractions: false,
      syncPageControls: () => false,
    };
  }

  const pageControlsBridge = existingBridge ?? {
    ownsPageControlInteractions: false,
    syncPageControls(nextState = {}) {
      const legacyRefs = resolveLegacyPageControlRefs(controlsEl);
      syncLegacyPageControlRefs(legacyRefs, nextState);
      const ownsInteractions = syncPrimePageControls(legacyRefs, globalScope);
      pageControlsBridge.ownsPageControlInteractions = ownsInteractions;
      return ownsInteractions;
    },
  };
  controlsEl[PAGE_CONTROLS_BRIDGE_KEY] = pageControlsBridge;

  ensureLegacyPageControlsRendered(controlsEl, globalScope);
  const legacyRefs = resolveLegacyPageControlRefs(controlsEl);
  const ownsPageControlInteractions = syncPrimePageControls(legacyRefs, globalScope);
  pageControlsBridge.ownsPageControlInteractions = ownsPageControlInteractions;
  if (ownsPageControlInteractions) {
    bindPageControlListeners(legacyRefs, globalScope);
    controlsEl.dataset.vueManaged = "true";
    controlsEl.dataset.vuePrimitiveMounted = "true";
    return pageControlsBridge;
  }

  return pageControlsBridge;
}
