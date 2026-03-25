import { configurePrimeVueApp } from "./primevueApp.js";
import { renderSelectInput } from "./primevueRenderPrimitives.js";

function createBridgeMountId(inputId) {
  return `${inputId}--mount`;
}

function getVueRuntime(vueRuntime, globalScope) {
  return vueRuntime ?? globalScope?.Vue ?? null;
}

function allowNativeBridgeFallback(globalScope = globalThis) {
  const disableFallback = globalScope?.__WAAN_DISABLE_NATIVE_BRIDGE_FALLBACKS__ === true
    || globalThis?.__WAAN_DISABLE_NATIVE_BRIDGE_FALLBACKS__ === true;
  if (disableFallback) return false;
  const allowFallback = globalScope?.__WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__ === true
    || globalThis?.__WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__ === true;
  if (allowFallback) return true;
  return Boolean(globalScope?.process?.env?.VITEST || globalThis?.process?.env?.VITEST);
}

function resolveBridgeStateForElement(selectEl, visibleInputId = "") {
  const ownerDocument = selectEl?.ownerDocument ?? null;
  const inputId = selectEl?.dataset?.primevueInputId || selectEl?.dataset?.primevueLegacyId || "";
  return resolveRegisteredBridge(ownerDocument, visibleInputId || `${inputId}--primevue`)
    ?? resolveRegisteredBridge(ownerDocument, inputId)
    ?? null;
}

export function readPrimeSelectBridgeValue(selectEl) {
  if (!selectEl) return "";
  const bridge = resolveBridgeStateForElement(selectEl);
  if (bridge?.state) {
    return bridge.state.value == null ? "" : String(bridge.state.value);
  }
  return selectEl.value ?? "";
}

export function readPrimeSelectBridgeValueById(ownerDocument, bridgeId) {
  const bridge = resolveRegisteredBridge(ownerDocument, bridgeId);
  if (!bridge?.state) return "";
  return bridge.state.value == null ? "" : String(bridge.state.value);
}

function resolveBridgeRegistry(ownerDocument) {
  if (!ownerDocument) return null;
  /** @type {Map<string, any>} */
  const registry = /** @type {any} */ (ownerDocument).__waanPrimeSelectBridgeRegistry
    ?? new Map();
  /** @type {any} */ (ownerDocument).__waanPrimeSelectBridgeRegistry = registry;
  return registry;
}

function registerBridgeState(ownerDocument, bridgeId, bridge) {
  if (!bridgeId) return;
  resolveBridgeRegistry(ownerDocument)?.set(bridgeId, bridge);
}

function resolveRegisteredBridge(ownerDocument, bridgeId) {
  if (!bridgeId) return null;
  const registry = resolveBridgeRegistry(ownerDocument);
  const bridge = registry?.get(bridgeId) ?? null;
  if (!bridge) return null;
  const mountEl = bridge?.mountEl ?? null;
  if (mountEl instanceof HTMLElement && !mountEl.isConnected) {
    registry?.delete(bridgeId);
    return null;
  }
  return bridge;
}

function ensureBridgeMount(selectEl, inputId, preserveNativeId = false) {
  const ownerDocument = selectEl?.ownerDocument ?? null;
  if (!ownerDocument) return null;
  const existingMount = ownerDocument.getElementById(createBridgeMountId(inputId));
  if (existingMount) return existingMount;
  const mount = ownerDocument.createElement("div");
  mount.id = createBridgeMountId(inputId);
  mount.className = "prime-select-bridge";
  mount.dataset.bridgeReady = "false";
  if (preserveNativeId) {
    const wrappingLabel = selectEl.parentElement instanceof HTMLLabelElement ? selectEl.parentElement : null;
    if (wrappingLabel) {
      wrappingLabel.insertBefore(mount, selectEl);
    } else {
      selectEl.insertAdjacentElement("afterend", mount);
    }
  } else {
    if (selectEl.parentNode) {
      selectEl.replaceWith(mount);
    } else if (ownerDocument.body) {
      ownerDocument.body.appendChild(mount);
    } else {
      return null;
    }
  }
  return mount;
}

function detachHiddenSelectFromWrappingLabel(selectEl) {
  if (!(selectEl?.parentElement instanceof HTMLLabelElement)) return;
  const wrappingLabel = selectEl.parentElement;
  wrappingLabel.insertAdjacentElement("afterend", selectEl);
}

function hideNativeSelect(selectEl, inputId, preserveNativeId = false, detachPreservedNative = false) {
  if (!selectEl) return;
  if (!selectEl.dataset.primevueLegacyId) {
    selectEl.dataset.primevueLegacyId = selectEl.id || inputId;
  }
  if (!preserveNativeId && !selectEl.isConnected) {
    return;
  }
  if (!preserveNativeId && selectEl.id === inputId) {
    selectEl.id = `${inputId}--native`;
  }
  detachHiddenSelectFromWrappingLabel(selectEl);
  if (preserveNativeId && detachPreservedNative && selectEl.parentNode) {
    selectEl.remove();
    return;
  }
  selectEl.classList.add("hidden");
  selectEl.setAttribute("aria-hidden", "true");
  selectEl.tabIndex = -1;
}

function syncVisibleLabelTarget(selectEl, inputId, preserveNativeId = false, visibleInputId = "") {
  if (!preserveNativeId || !selectEl?.ownerDocument || !inputId) return;
  const nextFor = visibleInputId || `${inputId}--primevue`;
  const labels = selectEl.ownerDocument.querySelectorAll(`label[for="${inputId}"]`);
  labels.forEach(label => {
    if (!(label instanceof HTMLLabelElement)) return;
    if (!label.dataset.primevueLegacyFor) {
      label.dataset.primevueLegacyFor = inputId;
    }
    label.htmlFor = nextFor;
  });
}

function canSyncDetachedSelectValue(selectEl, keepDetachedNativeValueSynced = true) {
  if (keepDetachedNativeValueSynced) return true;
  return Boolean(selectEl?.isConnected && !selectEl?.classList?.contains("hidden"));
}

/**
 * @param {{
 *   selectEl: HTMLSelectElement | null | undefined,
 *   options: Array<{ value: string, label: string }>,
 *   value?: string,
 *   disabled?: boolean,
 *   preserveNativeId?: boolean,
 *   detachPreservedNative?: boolean,
 *   keepDetachedNativeValueSynced?: boolean,
 *   visibleInputId?: string,
 *   attrs?: Record<string, any>,
 *   onValueChange?: ((value: string) => void) | null,
 *   vueRuntime?: any,
 *   globalScope?: any,
 * }} params
 * @returns {boolean}
 */
export function syncPrimeSelectBridge({
  selectEl,
  options,
  value = "",
  disabled = false,
  preserveNativeId = false,
  detachPreservedNative = false,
  keepDetachedNativeValueSynced = true,
  visibleInputId = "",
  attrs: inputAttrs = {},
  onValueChange = null,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  if (!selectEl) return false;
  const VueRuntime = getVueRuntime(vueRuntime, globalScope);
  const inputId = selectEl.dataset.primevueInputId || selectEl.id || `prime-select-${Math.random().toString(36).slice(2)}`;
  const resolvedVisibleInputId = visibleInputId || (preserveNativeId ? `${inputId}--primevue` : inputId);
  selectEl.dataset.primevueInputId = inputId;
  const hasPrimeVue = Boolean(
    (globalScope?.PrimeVue || globalScope?.primevue)?.Select ||
    (globalScope?.PrimeVue || globalScope?.primevue)?.Dropdown,
  );
  if (!VueRuntime || typeof VueRuntime.createApp !== "function" || typeof VueRuntime.h !== "function" || !hasPrimeVue) {
    if (!allowNativeBridgeFallback(globalScope)) {
      throw new Error("syncPrimeSelectBridge requires Vue runtime and PrimeVue Select/Dropdown");
    }
    return false;
  }

  if (canSyncDetachedSelectValue(selectEl, keepDetachedNativeValueSynced)) {
    selectEl.value = value == null ? "" : String(value);
    selectEl.disabled = Boolean(disabled);
  }

  let bridge = resolveBridgeStateForElement(selectEl, resolvedVisibleInputId);
  if (!bridge) {
    const mountEl = ensureBridgeMount(selectEl, inputId, preserveNativeId);
    if (!mountEl) return false;
    const state = VueRuntime.reactive
      ? VueRuntime.reactive({
        options: Array.isArray(options) ? options : [],
        value: value == null ? "" : String(value),
        disabled: Boolean(disabled),
      })
      : {
        options: Array.isArray(options) ? options : [],
        value: value == null ? "" : String(value),
        disabled: Boolean(disabled),
      };
    const Root = {
      name: "PrimeSelectBridgeField",
      render() {
        const wrapperAttrs = {
          class: "prime-select-bridge-field",
          ...(preserveNativeId ? { "data-bridge-visible-input-id": resolvedVisibleInputId } : {}),
        };
        return renderSelectInput(VueRuntime.h, {
          id: inputId,
          attrs: {
            ...inputAttrs,
            ...wrapperAttrs,
          },
          value: state.value,
          options: state.options,
          disabled: state.disabled,
          visibleInputId: resolvedVisibleInputId,
          onChange: event => {
            const nextValue = event?.target?.value ?? "";
            state.value = String(nextValue ?? "");
            if (canSyncDetachedSelectValue(selectEl, keepDetachedNativeValueSynced)) {
              selectEl.value = state.value;
            }
            onValueChange?.(state.value);
          },
        }, globalScope);
      },
    };
    configurePrimeVueApp(VueRuntime.createApp(Root), globalScope).mount(mountEl);
    hideNativeSelect(selectEl, inputId, preserveNativeId, detachPreservedNative);
    syncVisibleLabelTarget(selectEl, inputId, preserveNativeId, resolvedVisibleInputId);
    mountEl.dataset.bridgeReady = "true";
    mountEl.dataset.bridgeInputId = inputId;
    bridge = { state, mountEl };
    registerBridgeState(selectEl.ownerDocument, inputId, bridge);
    registerBridgeState(selectEl.ownerDocument, resolvedVisibleInputId, bridge);
  }

  bridge.state.options = Array.isArray(options) ? options : [];
  bridge.state.value = value == null ? "" : String(value);
  bridge.state.disabled = Boolean(disabled);
  hideNativeSelect(selectEl, inputId, preserveNativeId, detachPreservedNative);
  syncVisibleLabelTarget(selectEl, inputId, preserveNativeId, resolvedVisibleInputId);
  if (bridge?.mountEl) {
    bridge.mountEl.dataset.bridgeReady = "true";
    bridge.mountEl.dataset.bridgeInputId = inputId;
  }
  return true;
}

export function syncPrimeSelectBridgeById({
  ownerDocument,
  bridgeId,
  options,
  value = "",
  disabled,
}) {
  const bridge = resolveRegisteredBridge(ownerDocument, bridgeId);
  if (!bridge) return false;
  if (Array.isArray(options)) bridge.state.options = options;
  bridge.state.value = value == null ? "" : String(value);
  if (typeof disabled === "boolean") bridge.state.disabled = Boolean(disabled);
  return true;
}
