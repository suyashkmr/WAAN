export function ensureSelectOptions(selectEl, options = []) {
  if (!selectEl) return;
  const normalizedOptions = Array.isArray(options) ? options : [];
  const existingSignature = Array.from(selectEl.options).map(option => `${option.value}:${option.textContent || ""}`).join("|");
  const nextSignature = normalizedOptions.map(option => `${option.value}:${option.label}`).join("|");
  if (existingSignature === nextSignature) return;
  selectEl.textContent = "";
  normalizedOptions.forEach(option => {
    const optionEl = selectEl.ownerDocument.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    selectEl.appendChild(optionEl);
  });
}

export function extractSelectOptions(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.options).map(option => ({
    value: option.value,
    label: option.textContent || option.label || option.value,
  }));
}

const DEFAULT_PAGE_RANGE_OPTIONS = Object.freeze([
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last 365 days" },
  { value: "custom", label: "Custom range" },
]);

function createLabeledControl(ownerDocument, labelClassName, labelText, inputId) {
  const labelEl = ownerDocument.createElement("label");
  labelEl.className = labelClassName;
  labelEl.htmlFor = inputId;
  const textEl = ownerDocument.createElement("span");
  textEl.textContent = labelText;
  labelEl.appendChild(textEl);
  return labelEl;
}

function renderLegacyPageControlsSeed(controlsEl) {
  const ownerDocument = controlsEl?.ownerDocument ?? null;
  if (!controlsEl || !ownerDocument) return false;
  controlsEl.textContent = "";

  const chatLabel = createLabeledControl(ownerDocument, "control dataset-control", "Loaded chats", "chat-selector");
  const chatSelect = ownerDocument.createElement("select");
  chatSelect.id = "chat-selector";
  chatSelect.disabled = true;
  ensureSelectOptions(chatSelect, [{ value: "", label: "No chats loaded yet" }]);
  chatLabel.appendChild(chatSelect);

  const customControls = ownerDocument.createElement("div");
  customControls.className = "control custom-range hidden";
  customControls.id = "custom-range-controls";
  const customTitle = ownerDocument.createElement("span");
  customTitle.textContent = "Custom dates";
  customControls.appendChild(customTitle);
  const customInputs = ownerDocument.createElement("div");
  customInputs.className = "custom-range-inputs";
  const customStartInput = ownerDocument.createElement("input");
  customStartInput.type = "date";
  customStartInput.id = "custom-start";
  const separator = ownerDocument.createElement("span");
  separator.className = "range-separator";
  separator.textContent = "to";
  const customEndInput = ownerDocument.createElement("input");
  customEndInput.type = "date";
  customEndInput.id = "custom-end";
  const applyButton = ownerDocument.createElement("button");
  applyButton.type = "button";
  applyButton.className = "ghost-button small";
  applyButton.id = "apply-custom-range";
  applyButton.textContent = "Apply";
  customInputs.append(customStartInput, separator, customEndInput, applyButton);
  customControls.appendChild(customInputs);

  const rangeLabel = createLabeledControl(ownerDocument, "control period-control", "Time range", "global-range");
  const rangeSelect = ownerDocument.createElement("select");
  rangeSelect.id = "global-range";
  ensureSelectOptions(rangeSelect, DEFAULT_PAGE_RANGE_OPTIONS);
  rangeSelect.value = "all";
  rangeLabel.appendChild(rangeSelect);

  controlsEl.append(chatLabel, customControls, rangeLabel);
  controlsEl.dataset.vueManaged = "page-controls";
  return true;
}

export function resolveLegacyPageControlRefs(controlsEl) {
  return {
    chatSelector: controlsEl.querySelector?.("#chat-selector") ?? null,
    rangeSelect: controlsEl.querySelector?.("#global-range") ?? null,
    customControls: controlsEl.querySelector?.("#custom-range-controls") ?? null,
    customStartInput: controlsEl.querySelector?.("#custom-start") ?? null,
    customEndInput: controlsEl.querySelector?.("#custom-end") ?? null,
    customApplyButton: controlsEl.querySelector?.("#apply-custom-range") ?? null,
  };
}

export function mergeLegacyPageControlRefs(existingRefs, resolvedRefs) {
  return {
    chatSelector: resolvedRefs.chatSelector ?? (existingRefs?.chatSelector?.isConnected ? existingRefs.chatSelector : null),
    rangeSelect: resolvedRefs.rangeSelect ?? (existingRefs?.rangeSelect?.isConnected ? existingRefs.rangeSelect : null),
    customControls: resolvedRefs.customControls ?? existingRefs?.customControls ?? null,
    customStartInput: resolvedRefs.customStartInput ?? (existingRefs?.customStartInput?.isConnected ? existingRefs.customStartInput : null),
    customEndInput: resolvedRefs.customEndInput ?? (existingRefs?.customEndInput?.isConnected ? existingRefs.customEndInput : null),
    customApplyButton: resolvedRefs.customApplyButton ?? (existingRefs?.customApplyButton?.isConnected ? existingRefs.customApplyButton : null),
  };
}

export function resolvePageControlTarget(legacyRefs, ownerDocument, controlKey, preferVisible = false) {
  const visibleControlId = (
    controlKey === "chat" ? "chat-selector" :
    controlKey === "range" ? "global-range" :
    controlKey === "custom-start" ? "custom-start" :
    controlKey === "custom-end" ? "custom-end" :
    null
  );
  if (!visibleControlId) return null;
  const visibleTarget = resolveVisiblePageControlTarget(visibleControlId, ownerDocument);
  if (preferVisible && visibleTarget) return visibleTarget;
  if (controlKey === "chat") return legacyRefs?.chatSelector ?? visibleTarget;
  if (controlKey === "range") return legacyRefs?.rangeSelect ?? visibleTarget;
  if (controlKey === "custom-start") return legacyRefs?.customStartInput ?? visibleTarget;
  return legacyRefs?.customEndInput ?? visibleTarget;
}

export function ensureLegacyPageControlsRendered(controlsEl, existingBridge = null) {
  if (!controlsEl) return false;
  if (hasPreservedLegacyRefs(existingBridge?.legacyRefs)) return true;
  const existingRefs = resolveLegacyPageControlRefs(controlsEl);
  if (existingRefs.chatSelector || existingRefs.rangeSelect || existingRefs.customStartInput || existingRefs.customEndInput) {
    return true;
  }
  if (hasVisiblePageControlTargets(controlsEl.ownerDocument)) {
    return true;
  }
  return renderLegacyPageControlsSeed(controlsEl);
}

function resolveVisiblePageControlTarget(controlId, ownerDocument) {
  if (!ownerDocument || !controlId) return null;
  return ownerDocument.getElementById(`${controlId}--primevue`)
    ?? ownerDocument.getElementById(`${controlId}--mount`)
    ?? null;
}

function hasPreservedLegacyRefs(legacyRefs) {
  if (!legacyRefs) return false;
  return Boolean(
    legacyRefs.chatSelector?.isConnected ||
    legacyRefs.rangeSelect?.isConnected ||
    legacyRefs.customStartInput?.isConnected ||
    legacyRefs.customEndInput?.isConnected,
  );
}

function hasVisiblePageControlTargets(ownerDocument) {
  if (!ownerDocument) return false;
  return Boolean(
    resolveVisiblePageControlTarget("chat-selector", ownerDocument) ||
    resolveVisiblePageControlTarget("global-range", ownerDocument) ||
    resolveVisiblePageControlTarget("custom-start", ownerDocument) ||
    resolveVisiblePageControlTarget("custom-end", ownerDocument) ||
    ownerDocument.getElementById("apply-custom-range--primevue") ||
    ownerDocument.getElementById("apply-custom-range--mount")
  );
}
