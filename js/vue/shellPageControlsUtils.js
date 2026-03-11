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
