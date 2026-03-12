import { configurePrimeVueApp } from "./primevueApp.js";
import { renderDateInput } from "./primevueRenderPrimitives.js";

function createBridgeMountId(inputId) {
  return `${inputId}--mount`;
}

function getVueRuntime(vueRuntime, globalScope) {
  return vueRuntime ?? globalScope?.Vue ?? null;
}

function resolveBridgeState(inputEl) {
  return /** @type {any} */ (inputEl).__waanPrimeDateBridge ?? null;
}

export function readPrimeDateBridgeValue(inputEl) {
  if (!inputEl) return "";
  const bridge = resolveBridgeState(inputEl);
  if (bridge?.state) {
    return bridge.state.value == null ? "" : String(bridge.state.value);
  }
  return inputEl.value ?? "";
}

function storeBridgeState(inputEl, state) {
  /** @type {any} */ (inputEl).__waanPrimeDateBridge = state;
}

function resolveVisibleDateTarget(inputEl, visibleInputId = "") {
  const ownerDocument = inputEl?.ownerDocument ?? null;
  if (!ownerDocument) return null;
  if (visibleInputId) {
    const explicitTarget = ownerDocument.getElementById(visibleInputId);
    if (explicitTarget instanceof HTMLElement) return explicitTarget;
  }
  const bridge = resolveBridgeState(inputEl);
  const mountEl = bridge?.mountEl ?? null;
  if (!(mountEl instanceof HTMLElement)) return null;
  return mountEl.querySelector(".p-datepicker, .p-calendar, input, button, [tabindex]") instanceof HTMLElement
    ? /** @type {HTMLElement} */ (mountEl.querySelector(".p-datepicker, .p-calendar, input, button, [tabindex]"))
    : mountEl;
}

function installDetachedDateDelegates(inputEl, visibleInputId = "") {
  if (!inputEl || inputEl.dataset.primevueManaged !== "detached") return;
  if (inputEl.dataset.primevueDelegateInstalled === "true") return;
  const nativeFocus = inputEl.focus.bind(inputEl);
  const nativeScrollIntoView = inputEl.scrollIntoView.bind(inputEl);
  inputEl.focus = function focus(options) {
    const visibleTarget = resolveVisibleDateTarget(inputEl, visibleInputId);
    if (visibleTarget && visibleTarget !== inputEl) {
      visibleTarget.focus?.(options);
      return;
    }
    nativeFocus(options);
  };
  inputEl.scrollIntoView = function scrollIntoView(arg) {
    const visibleTarget = resolveVisibleDateTarget(inputEl, visibleInputId);
    if (visibleTarget && visibleTarget !== inputEl) {
      visibleTarget.scrollIntoView?.(arg);
      return;
    }
    nativeScrollIntoView(arg);
  };
  inputEl.dataset.primevueDelegateInstalled = "true";
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
    inputEl.dataset.primevueManaged = "detached";
    return;
  }
  inputEl.classList.add("hidden");
  inputEl.setAttribute("aria-hidden", "true");
  inputEl.tabIndex = -1;
  inputEl.dataset.primevueManaged = "true";
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
    return false;
  }

  inputEl.value = value == null ? "" : String(value);
  inputEl.disabled = Boolean(disabled);
  inputEl.min = min == null ? "" : String(min);
  inputEl.max = max == null ? "" : String(max);

  let bridge = resolveBridgeState(inputEl);
  if (!bridge) {
    const mountEl = ensureBridgeMount(inputEl, inputId);
    if (!mountEl) return false;
    const state = VueRuntime.reactive
      ? VueRuntime.reactive({
        value: inputEl.value,
        disabled: Boolean(disabled),
        min: inputEl.min,
        max: inputEl.max,
      })
      : {
        value: inputEl.value,
        disabled: Boolean(disabled),
        min: inputEl.min,
        max: inputEl.max,
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
            inputEl.value = state.value;
            onValueChange?.(state.value);
          },
        }, globalScope);
      },
    };
    configurePrimeVueApp(VueRuntime.createApp(Root), globalScope).mount(mountEl);
    hideNativeInput(inputEl, inputId, preserveNativeId, detachPreservedNative);
    installDetachedDateDelegates(inputEl, resolvedVisibleInputId);
    bridge = { state, mountEl };
    storeBridgeState(inputEl, bridge);
  }

  bridge.state.value = inputEl.value;
  bridge.state.disabled = Boolean(disabled);
  bridge.state.min = inputEl.min;
  bridge.state.max = inputEl.max;
  hideNativeInput(inputEl, inputId, preserveNativeId, detachPreservedNative);
  installDetachedDateDelegates(inputEl, resolvedVisibleInputId);
  return true;
}

/**
 * @param {{
 *   inputEl: HTMLInputElement | null | undefined,
 *   value?: string | null,
 *   disabled?: boolean,
 *   min?: string | null,
 *   max?: string | null,
 * }} params
 */
export function syncPrimeDateBridgeValue({
  inputEl,
  value = "",
  disabled,
  min,
  max,
}) {
  if (!inputEl) return false;
  inputEl.value = value == null ? "" : String(value);
  if (typeof disabled === "boolean") inputEl.disabled = disabled;
  if (typeof min === "string") inputEl.min = min;
  if (typeof max === "string") inputEl.max = max;
  const bridge = resolveBridgeState(inputEl);
  if (!bridge) return false;
  bridge.state.value = inputEl.value;
  if (typeof disabled === "boolean") bridge.state.disabled = Boolean(disabled);
  if (typeof min === "string") bridge.state.min = min;
  if (typeof max === "string") bridge.state.max = max;
  return true;
}
