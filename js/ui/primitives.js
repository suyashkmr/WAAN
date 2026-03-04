import { applyUiRuntimeState } from "./runtimeStateSync.js";

// Legacy compatibility primitive builders retained for isolated test/tooling usage.
// Production runtime paths are isolated to Vue-owned surfaces.
const defaultDocument = typeof document !== "undefined" ? document : null;

function setBooleanAttr(el, key, value) {
  if (!el) return;
  if (value) el.setAttribute(key, "");
  else el.removeAttribute(key);
}

export { applyUiRuntimeState };

export function createUiButton(
  {
    text = "",
    variant = "default",
    size = "medium",
    pill = false,
    disabled = false,
    outline = false,
    id = "",
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef) return null;
  const el = documentRef.createElement("button");
  el.type = "button";
  el.classList.add("ui-button");
  el.textContent = text;
  if (id) el.id = id;
  if (variant && variant !== "default") el.dataset.variant = variant;
  if (size && size !== "medium") el.dataset.size = size;
  setBooleanAttr(el, "pill", pill);
  setBooleanAttr(el, "disabled", disabled);
  setBooleanAttr(el, "outline", outline);
  return el;
}

export function createUiInput(
  {
    type = "text",
    placeholder = "",
    value = "",
    clearable = false,
    id = "",
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef) return null;
  const el = documentRef.createElement("input");
  el.classList.add("ui-input");
  if (id) el.id = id;
  el.type = type;
  if (placeholder) el.placeholder = placeholder;
  if (typeof value === "string") el.value = value;
  if (clearable) {
    el.dataset.clearable = "true";
  }
  return el;
}

export function createUiSelect(
  {
    id = "",
    value = "",
    options = [],
    placeholder = "",
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef) return null;
  const select = documentRef.createElement("select");
  select.classList.add("ui-select");
  if (id) select.id = id;
  if (placeholder) {
    const placeholderOption = documentRef.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.hidden = true;
    select.appendChild(placeholderOption);
  }

  options.forEach(option => {
    const item = documentRef.createElement("option");
    item.value = String(option?.value ?? "");
    item.textContent = String(option?.label ?? option?.value ?? "");
    select.appendChild(item);
  });
  if (value) select.value = value;
  return select;
}

export function createUiDialog(
  {
    label = "",
    body = "",
    id = "",
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef) return null;
  const dialog = documentRef.createElement("div");
  dialog.classList.add("ui-dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  if (id) dialog.id = id;
  if (label) dialog.setAttribute("aria-label", label);
  if (body) dialog.textContent = body;
  return dialog;
}

export function createUiTooltip(
  {
    content = "",
    target = null,
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef || !target) return null;
  const tooltip = documentRef.createElement("span");
  tooltip.classList.add("ui-tooltip");
  tooltip.setAttribute("role", "tooltip");
  if (content) tooltip.setAttribute("data-content", content);
  tooltip.appendChild(target);
  return tooltip;
}

export function createUiTabs(
  {
    id = "",
    tabs = [],
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef) return null;
  const group = documentRef.createElement("div");
  group.classList.add("ui-tabs");
  if (id) group.id = id;
  const tabNav = documentRef.createElement("div");
  tabNav.classList.add("ui-tabs-nav");
  const panels = documentRef.createElement("div");
  panels.classList.add("ui-tabs-panels");
  tabs.forEach((tab, index) => {
    const key = String(tab?.id ?? `tab-${index + 1}`);
    const nav = documentRef.createElement("button");
    nav.type = "button";
    nav.classList.add("ui-tab");
    nav.dataset.panel = key;
    nav.textContent = String(tab?.label ?? key);
    if (index === 0) nav.setAttribute("aria-selected", "true");
    tabNav.appendChild(nav);

    const panel = documentRef.createElement("section");
    panel.classList.add("ui-tab-panel");
    panel.dataset.name = key;
    panel.textContent = String(tab?.content ?? "");
    panels.appendChild(panel);
  });
  group.appendChild(tabNav);
  group.appendChild(panels);
  return group;
}

export function createUiCard(
  {
    id = "",
    header = "",
    body = "",
    footer = "",
  } = {},
  { documentRef = defaultDocument } = {},
) {
  if (!documentRef) return null;
  const card = documentRef.createElement("section");
  card.classList.add("ui-card");
  if (id) card.id = id;
  if (header) {
    const headerEl = documentRef.createElement("header");
    headerEl.classList.add("ui-card-header");
    headerEl.textContent = header;
    card.appendChild(headerEl);
  }
  if (body) {
    const bodyEl = documentRef.createElement("div");
    bodyEl.classList.add("ui-card-body");
    bodyEl.textContent = body;
    card.appendChild(bodyEl);
  }
  if (footer) {
    const footerEl = documentRef.createElement("footer");
    footerEl.classList.add("ui-card-footer");
    footerEl.textContent = footer;
    card.appendChild(footerEl);
  }
  return card;
}
