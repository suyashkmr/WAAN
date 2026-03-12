import { configurePrimeVueApp } from "./primevueApp.js";
import { renderDateInput } from "./primevueRenderPrimitives.js";

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

function resolveBridgeStateForElement(inputEl, visibleInputId = "") {
  const ownerDocument = inputEl?.ownerDocument ?? null;
  const inputId = inputEl?.dataset?.primevueInputId || "";
  return resolveRegisteredBridge(ownerDocument, visibleInputId || `${inputId}--primevue`)
    ?? resolveRegisteredBridge(ownerDocument, inputId)
    ?? null;
}

export function readPrimeDateBridgeValue(inputEl) {
  if (!inputEl) return "";
  const bridge = resolveBridgeStateForElement(inputEl);
  if (bridge?.state) {
    return bridge.state.value == null ? "" : String(bridge.state.value);
  }
  return inputEl.value ?? "";
}

export function readPrimeDateBridgeValueById(ownerDocument, bridgeId) {
  const bridge = resolveRegisteredBridge(ownerDocument, bridgeId);
  if (!bridge?.state) return "";
  return bridge.state.value == null ? "" : String(bridge.state.value);
}

function resolveBridgeRegistry(ownerDocument) {
  if (!ownerDocument) return null;
  /** @type {Map<string, any>} */
  const registry = /** @type {any} */ (ownerDocument).__waanPrimeDateBridgeRegistry
    ?? new Map();
  /** @type {any} */ (ownerDocument).__waanPrimeDateBridgeRegistry = registry;
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

function canSyncDetachedDateValue(inputEl, keepDetachedNativeValueSynced = true) {
  if (keepDetachedNativeValueSynced) return true;
  return Boolean(inputEl?.isConnected && !inputEl?.classList?.contains("hidden"));
}

function ensureBridgeMount(inputEl, inputId) {
  const ownerDocument = inputEl?.ownerDocument ?? null;
  if (!ownerDocument) return null;
  const existingMount = ownerDocument.getElementById(createBridgeMountId(inputId));
  if (existingMount) return existingMount;
  const mount = ownerDocument.createElement("div");
  mount.id = createBridgeMountId(inputId);
  mount.className = "prime-date-bridge";
  inputEl.insertAdjacentElement("afterend", mount);
  return mount;
}

function hideNativeInput(inputEl, inputId, preserveNativeId = false, detachPreservedNative = false) {
  if (!inputEl) return;
  if (!inputEl.dataset.primevueInputId) {
    inputEl.dataset.primevueInputId = inputId;
  }
  if (!preserveNativeId && inputEl.id === inputId) {
    inputEl.id = `${inputId}--native`;
  }
  if (preserveNativeId && detachPreservedNative && inputEl.parentNode) {
    inputEl.remove();
    return;
  }
  inputEl.classList.add("hidden");
  inputEl.setAttribute("aria-hidden", "true");
  inputEl.tabIndex = -1;
}

/**
 * @param {{
 *   inputEl: HTMLInputElement | null | undefined,
 *   value?: string,
 *   disabled?: boolean,
 *   min?: string,
 *   max?: string,
 *   preserveNativeId?: boolean,
 *   detachPreservedNative?: boolean,
 *   keepDetachedNativeValueSynced?: boolean,
 *   visibleInputId?: string,
 *   onValueChange?: ((value: string) => void) | null,
 *   vueRuntime?: any,
 *   globalScope?: any,
 * }} params
 * @returns {boolean}
 */
export function syncPrimeDateBridge({
  inputEl,
  value = "",
  disabled = false,
  min = "",
  max = "",
  preserveNativeId = false,
  detachPreservedNative = false,
  keepDetachedNativeValueSynced = true,
  visibleInputId = "",
  onValueChange = null,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  if (!inputEl) return false;
  const VueRuntime = getVueRuntime(vueRuntime, globalScope);
  const inputId = inputEl.dataset.primevueInputId || inputEl.id || `prime-date-${Math.random().toString(36).slice(2)}`;
  const resolvedVisibleInputId = visibleInputId || (preserveNativeId ? `${inputId}--primevue` : inputId);
  inputEl.dataset.primevueInputId = inputId;
  const hasPrimeVue = Boolean(
    (globalScope?.PrimeVue || globalScope?.primevue)?.DatePicker ||
    (globalScope?.PrimeVue || globalScope?.primevue)?.Calendar,
  );
  if (!VueRuntime || typeof VueRuntime.createApp !== "function" || typeof VueRuntime.h !== "function" || !hasPrimeVue) {
    if (!allowNativeBridgeFallback(globalScope)) {
      throw new Error("syncPrimeDateBridge requires Vue runtime and PrimeVue DatePicker/Calendar");
    }
    return false;
  }

  if (canSyncDetachedDateValue(inputEl, keepDetachedNativeValueSynced)) {
    inputEl.value = value == null ? "" : String(value);
    inputEl.disabled = Boolean(disabled);
    inputEl.min = min == null ? "" : String(min);
    inputEl.max = max == null ? "" : String(max);
  }

  let bridge = resolveBridgeStateForElement(inputEl, resolvedVisibleInputId);
  if (!bridge) {
    const mountEl = ensureBridgeMount(inputEl, inputId);
    if (!mountEl) return false;
    const state = VueRuntime.reactive
      ? VueRuntime.reactive({
        value: value == null ? "" : String(value),
        disabled: Boolean(disabled),
        min: min == null ? "" : String(min),
        max: max == null ? "" : String(max),
      })
      : {
        value: value == null ? "" : String(value),
        disabled: Boolean(disabled),
        min: min == null ? "" : String(min),
        max: max == null ? "" : String(max),
      };
    const Root = {
      name: "PrimeDateBridgeField",
      render() {
        return renderDateInput(VueRuntime.h, {
          id: inputId,
          value: state.value,
          disabled: state.disabled,
          visibleInputId: resolvedVisibleInputId,
          attrs: {
            min: state.min,
            max: state.max,
          },
          onChange: event => {
            const nextValue = event?.target?.value ?? "";
            state.value = String(nextValue ?? "");
            if (canSyncDetachedDateValue(inputEl, keepDetachedNativeValueSynced)) {
              inputEl.value = state.value;
            }
            onValueChange?.(state.value);
          },
        }, globalScope);
      },
    };
    configurePrimeVueApp(VueRuntime.createApp(Root), globalScope).mount(mountEl);
    hideNativeInput(inputEl, inputId, preserveNativeId, detachPreservedNative);
    bridge = { state, mountEl };
    registerBridgeState(inputEl.ownerDocument, inputId, bridge);
    registerBridgeState(inputEl.ownerDocument, resolvedVisibleInputId, bridge);
  }

  bridge.state.value = value == null ? "" : String(value);
  bridge.state.disabled = Boolean(disabled);
  bridge.state.min = min == null ? "" : String(min);
  bridge.state.max = max == null ? "" : String(max);
  hideNativeInput(inputEl, inputId, preserveNativeId, detachPreservedNative);
  return true;
}

export function syncPrimeDateBridgeById({
  ownerDocument,
  bridgeId,
  value = "",
  disabled,
  min,
  max,
}) {
  const bridge = resolveRegisteredBridge(ownerDocument, bridgeId);
  if (!bridge) return false;
  bridge.state.value = value == null ? "" : String(value);
  if (typeof disabled === "boolean") bridge.state.disabled = Boolean(disabled);
  if (typeof min === "string") bridge.state.min = min;
  if (typeof max === "string") bridge.state.max = max;
  return true;
}
