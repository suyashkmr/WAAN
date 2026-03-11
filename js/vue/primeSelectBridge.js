import { configurePrimeVueApp } from "./primevueApp.js";
import { renderSelectInput } from "./primevueRenderPrimitives.js";

function createBridgeMountId(inputId) {
  return `${inputId}--mount`;
}

function getVueRuntime(vueRuntime, globalScope) {
  return vueRuntime ?? globalScope?.Vue ?? null;
}

function resolveBridgeState(selectEl) {
  return /** @type {any} */ (selectEl).__waanPrimeSelectBridge ?? null;
}

function storeBridgeState(selectEl, state) {
  /** @type {any} */ (selectEl).__waanPrimeSelectBridge = state;
}

function ensureBridgeMount(selectEl, inputId) {
  const ownerDocument = selectEl?.ownerDocument ?? null;
  if (!ownerDocument) return null;
  const existingMount = ownerDocument.getElementById(createBridgeMountId(inputId));
  if (existingMount) return existingMount;
  const mount = ownerDocument.createElement("div");
  mount.id = createBridgeMountId(inputId);
  mount.className = "prime-select-bridge";
  const wrappingLabel = selectEl.parentElement instanceof HTMLLabelElement ? selectEl.parentElement : null;
  if (wrappingLabel) {
    wrappingLabel.insertBefore(mount, selectEl);
  } else {
    selectEl.insertAdjacentElement("afterend", mount);
  }
  return mount;
}

function detachHiddenSelectFromWrappingLabel(selectEl) {
  if (!(selectEl?.parentElement instanceof HTMLLabelElement)) return;
  const wrappingLabel = selectEl.parentElement;
  wrappingLabel.insertAdjacentElement("afterend", selectEl);
}

function hideNativeSelect(selectEl, inputId, preserveNativeId = false) {
  if (!selectEl) return;
  if (!selectEl.dataset.primevueLegacyId) {
    selectEl.dataset.primevueLegacyId = selectEl.id || inputId;
  }
  if (!preserveNativeId && selectEl.id === inputId) {
    selectEl.id = `${inputId}--native`;
  }
  detachHiddenSelectFromWrappingLabel(selectEl);
  selectEl.classList.add("hidden");
  selectEl.setAttribute("aria-hidden", "true");
  selectEl.tabIndex = -1;
  selectEl.dataset.primevueManaged = "true";
}

function dispatchNativeMirrorEvent(selectEl, type) {
  const EventCtor = selectEl?.ownerDocument?.defaultView?.Event ?? Event;
  if (!selectEl) return;
  selectEl.dataset.primevueMirrorDispatch = "true";
  selectEl.dispatchEvent(new EventCtor(type, { bubbles: true }));
  delete selectEl.dataset.primevueMirrorDispatch;
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

/**
 * @param {{
 *   selectEl: HTMLSelectElement | null | undefined,
 *   options: Array<{ value: string, label: string }>,
 *   value?: string,
 *   disabled?: boolean,
 *   preserveNativeId?: boolean,
 *   visibleInputId?: string,
 *   attrs?: Record<string, any>,
 *   onValueChange?: ((value: string) => void) | null,
 *   mirrorNativeEvents?: boolean,
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
  visibleInputId = "",
  attrs: inputAttrs = {},
  onValueChange = null,
  mirrorNativeEvents = true,
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
    return false;
  }

  selectEl.value = value == null ? "" : String(value);
  selectEl.disabled = Boolean(disabled);

  let bridge = resolveBridgeState(selectEl);
  if (!bridge) {
    const mountEl = ensureBridgeMount(selectEl, inputId);
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
            selectEl.value = state.value;
            onValueChange?.(state.value);
            if (mirrorNativeEvents) {
              dispatchNativeMirrorEvent(selectEl, "input");
              dispatchNativeMirrorEvent(selectEl, "change");
            }
          },
        }, globalScope);
      },
    };
    configurePrimeVueApp(VueRuntime.createApp(Root), globalScope).mount(mountEl);
    hideNativeSelect(selectEl, inputId, preserveNativeId);
    syncVisibleLabelTarget(selectEl, inputId, preserveNativeId, resolvedVisibleInputId);
    bridge = { state, mountEl };
    storeBridgeState(selectEl, bridge);
  }

  bridge.state.options = Array.isArray(options) ? options : [];
  bridge.state.value = value == null ? "" : String(value);
  bridge.state.disabled = Boolean(disabled);
  hideNativeSelect(selectEl, inputId, preserveNativeId);
  syncVisibleLabelTarget(selectEl, inputId, preserveNativeId, resolvedVisibleInputId);
  return true;
}

/**
 * @param {{
 *   selectEl: HTMLSelectElement | null | undefined,
 *   value?: string | null,
 *   disabled?: boolean,
 * }} params
 */
export function syncPrimeSelectBridgeValue({
  selectEl,
  value = "",
  disabled,
}) {
  if (!selectEl) return false;
  const normalizedValue = value == null ? "" : String(value);
  selectEl.value = normalizedValue;
  if (typeof disabled === "boolean") {
    selectEl.disabled = disabled;
  }
  const bridge = resolveBridgeState(selectEl);
  if (!bridge) return false;
  bridge.state.value = selectEl.value;
  if (typeof disabled === "boolean") {
    bridge.state.disabled = Boolean(disabled);
  }
  return true;
}
