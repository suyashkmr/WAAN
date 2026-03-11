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

export function renderLegacyPageControlsSeed(controlsEl) {
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
