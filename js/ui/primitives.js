const defaultDocument = typeof document !== "undefined" ? document : null;
const defaultMutationObserver = typeof MutationObserver !== "undefined" ? MutationObserver : null;

function setBooleanAttr(el, key, value) {
  if (!el) return;
  if (value) el.setAttribute(key, "");
  else el.removeAttribute(key);
}

export function applyShoelaceRuntimeState({
  root = typeof document !== "undefined" ? document.documentElement : null,
  body = typeof document !== "undefined" ? document.body : null,
} = {}) {
  if (!root) return;
  const scheme = root.dataset.colorScheme === "light" ? "light" : "dark";
  root.classList.toggle("sl-theme-light", scheme === "light");
  root.classList.toggle("sl-theme-dark", scheme === "dark");
  root.dataset.slContrast = body?.dataset?.contrast === "high" ? "high" : "standard";
  root.dataset.slMotion = body?.dataset?.reduceMotion === "true" ? "reduced" : "standard";
}

export function initShoelacePrimitives({
  root = typeof document !== "undefined" ? document.documentElement : null,
  body = typeof document !== "undefined" ? document.body : null,
  MutationObserverImpl = defaultMutationObserver,
} = {}) {
  applyShoelaceRuntimeState({ root, body });
  if (!root || !MutationObserverImpl) return () => {};

  const observer = new MutationObserverImpl(() => applyShoelaceRuntimeState({ root, body }));
  observer.observe(root, { attributes: true, attributeFilter: ["data-color-scheme"] });
  if (body) observer.observe(body, { attributes: true, attributeFilter: ["data-contrast", "data-reduce-motion"] });
  return () => observer.disconnect();
}

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
  const el = documentRef.createElement("sl-button");
  el.textContent = text;
  if (id) el.id = id;
  if (variant && variant !== "default") el.setAttribute("variant", variant);
  if (size && size !== "medium") el.setAttribute("size", size);
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
  const el = documentRef.createElement("sl-input");
  if (id) el.id = id;
  el.type = type;
  if (placeholder) el.placeholder = placeholder;
  if (typeof value === "string") el.value = value;
  setBooleanAttr(el, "clearable", clearable);
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
  const select = documentRef.createElement("sl-select");
  if (id) select.id = id;
  if (placeholder) select.placeholder = placeholder;
  if (value) select.value = value;

  options.forEach(option => {
    const item = documentRef.createElement("sl-option");
    item.value = String(option?.value ?? "");
    item.textContent = String(option?.label ?? option?.value ?? "");
    select.appendChild(item);
  });
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
  const dialog = documentRef.createElement("sl-dialog");
  if (id) dialog.id = id;
  if (label) dialog.label = label;
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
  const tooltip = documentRef.createElement("sl-tooltip");
  tooltip.content = content;
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
  const group = documentRef.createElement("sl-tab-group");
  if (id) group.id = id;
  tabs.forEach((tab, index) => {
    const key = String(tab?.id ?? `tab-${index + 1}`);
    const nav = documentRef.createElement("sl-tab");
    nav.slot = "nav";
    nav.panel = key;
    nav.textContent = String(tab?.label ?? key);
    if (index === 0) nav.setAttribute("active", "");
    group.appendChild(nav);

    const panel = documentRef.createElement("sl-tab-panel");
    panel.name = key;
    panel.textContent = String(tab?.content ?? "");
    group.appendChild(panel);
  });
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
  const card = documentRef.createElement("sl-card");
  if (id) card.id = id;
  if (header) {
    const headerEl = documentRef.createElement("div");
    headerEl.slot = "header";
    headerEl.textContent = header;
    card.appendChild(headerEl);
  }
  if (body) {
    const bodyEl = documentRef.createElement("div");
    bodyEl.textContent = body;
    card.appendChild(bodyEl);
  }
  if (footer) {
    const footerEl = documentRef.createElement("div");
    footerEl.slot = "footer";
    footerEl.textContent = footer;
    card.appendChild(footerEl);
  }
  return card;
}
