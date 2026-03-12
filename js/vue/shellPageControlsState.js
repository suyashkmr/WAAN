import { readPrimeDateBridgeValue } from "./primeDateBridge.js";
import { readPrimeSelectBridgeValue } from "./primeSelectBridge.js";
import { extractSelectOptions } from "./shellPageControlsUtils.js";

export function mergePageControlState(existingState = {}, nextState = {}) {
  const mergedState = { ...(existingState || {}) };
  Object.entries(nextState || {}).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(nextState, key)) {
      mergedState[key] = value;
    }
  });
  return mergedState;
}

export function snapshotPageControlState(legacyRefs, existingState = {}) {
  const currentState = existingState || {};
  return {
    chatOptions: legacyRefs?.chatSelector ? extractSelectOptions(legacyRefs.chatSelector) : (currentState.chatOptions ?? []),
    chatValue: legacyRefs?.chatSelector ? readPrimeSelectBridgeValue(legacyRefs.chatSelector) : (currentState.chatValue ?? ""),
    chatDisabled: legacyRefs?.chatSelector ? Boolean(legacyRefs.chatSelector.disabled) : Boolean(currentState.chatDisabled),
    rangeOptions: legacyRefs?.rangeSelect ? extractSelectOptions(legacyRefs.rangeSelect) : (currentState.rangeOptions ?? []),
    rangeValue: legacyRefs?.rangeSelect ? (readPrimeSelectBridgeValue(legacyRefs.rangeSelect) || "all") : (currentState.rangeValue ?? "all"),
    customVisible: legacyRefs?.customControls
      ? !legacyRefs.customControls.classList.contains("hidden")
      : Boolean(currentState.customVisible),
    customStart: legacyRefs?.customStartInput ? readPrimeDateBridgeValue(legacyRefs.customStartInput) : (currentState.customStart ?? ""),
    customEnd: legacyRefs?.customEndInput ? readPrimeDateBridgeValue(legacyRefs.customEndInput) : (currentState.customEnd ?? ""),
    customMin: legacyRefs?.customStartInput?.min ?? legacyRefs?.customEndInput?.min ?? currentState.customMin ?? "",
    customMax: legacyRefs?.customEndInput?.max ?? legacyRefs?.customStartInput?.max ?? currentState.customMax ?? "",
    customDisabled: legacyRefs?.customStartInput
      ? Boolean(legacyRefs.customStartInput.disabled)
      : Boolean(currentState.customDisabled),
  };
}

export function resolveSelectControlState(state, controlKey, selectEl) {
  const optionsKey = `${controlKey}Options`;
  const valueKey = `${controlKey}Value`;
  const disabledKey = `${controlKey}Disabled`;
  return {
    options: Array.isArray(state?.[optionsKey]) ? state[optionsKey] : extractSelectOptions(selectEl),
    value: Object.prototype.hasOwnProperty.call(state || {}, valueKey) ? (state[valueKey] ?? (controlKey === "range" ? "all" : "")) : selectEl.value,
    disabled: Object.prototype.hasOwnProperty.call(state || {}, disabledKey) ? Boolean(state[disabledKey]) : selectEl.disabled,
  };
}

export function resolveDateControlState(state, valueKey, inputEl) {
  return {
    value: Object.prototype.hasOwnProperty.call(state || {}, valueKey) ? (state[valueKey] ?? "") : inputEl.value,
    disabled: Object.prototype.hasOwnProperty.call(state || {}, "customDisabled") ? Boolean(state.customDisabled) : inputEl.disabled,
    min: Object.prototype.hasOwnProperty.call(state || {}, "customMin") ? (state.customMin ?? "") : inputEl.min,
    max: Object.prototype.hasOwnProperty.call(state || {}, "customMax") ? (state.customMax ?? "") : inputEl.max,
  };
}
