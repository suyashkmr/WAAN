const defaultDocument = typeof document !== "undefined" ? document : null;
const defaultMutationObserver = typeof MutationObserver !== "undefined" ? MutationObserver : null;
const RELAY_LEGACY_MODE_STORAGE_KEY = "waan-ui-relay-legacy";

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

function shouldUseShoelaceRelayControls(storageRef = globalThis?.localStorage) {
  try {
    return storageRef?.getItem(RELAY_LEGACY_MODE_STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

function copyAttributes(fromEl, toEl, { skip = [] } = {}) {
  if (!fromEl || !toEl) return;
  const skipSet = new Set(skip);
  Array.from(fromEl.attributes).forEach(attr => {
    if (skipSet.has(attr.name)) return;
    toEl.setAttribute(attr.name, attr.value);
  });
}

function syncProxyAttributesFromLegacy(legacyButton, proxyButton) {
  if (!legacyButton || !proxyButton) return;
  const mirroredAttrs = [
    "title",
    "aria-label",
    "aria-pressed",
    "aria-expanded",
    "aria-describedby",
    "aria-controls",
  ];
  mirroredAttrs.forEach(attr => {
    const value = legacyButton.getAttribute(attr);
    if (value === null) proxyButton.removeAttribute(attr);
    else proxyButton.setAttribute(attr, value);
  });
}

function attachImmediateProxySyncHooks(legacyButton, syncFromLegacy) {
  if (!legacyButton || typeof syncFromLegacy !== "function") return;
  const nativeSetAttribute = legacyButton.setAttribute.bind(legacyButton);
  const nativeRemoveAttribute = legacyButton.removeAttribute.bind(legacyButton);
  const mirrored = new Set([
    "disabled",
    "title",
    "aria-label",
    "aria-pressed",
    "aria-expanded",
    "aria-describedby",
    "aria-controls",
  ]);

  legacyButton.setAttribute = (name, value) => {
    nativeSetAttribute(name, value);
    if (mirrored.has(String(name))) syncFromLegacy();
  };
  legacyButton.removeAttribute = name => {
    nativeRemoveAttribute(name);
    if (mirrored.has(String(name))) syncFromLegacy();
  };
}

function getRelayButtonVariant(button) {
  if (!button) return "default";
  if (button.classList.contains("danger")) return "danger";
  if (button.classList.contains("primary")) return "primary";
  return "default";
}

export function migrateRelayControlsToShoelace({
  documentRef = defaultDocument,
  storageRef = globalThis?.localStorage,
  ids = [
    "relay-reload-all",
    "relay-clear-storage",
    "relay-start",
    "relay-stop",
    "relay-logout",
    "first-run-open-relay",
    "first-run-primary-action",
  ],
} = {}) {
  if (!documentRef || !shouldUseShoelaceRelayControls(storageRef)) return 0;
  let migrated = 0;

  ids.forEach(id => {
    const button = documentRef.getElementById(id);
    if (!button || button.tagName.toLowerCase() !== "button") return;
    if (button.dataset.uiPrimitiveProxy === "true") return;

    const slButton = documentRef.createElement("sl-button");
    copyAttributes(button, slButton, { skip: ["type", "id"] });
    slButton.id = `${id}-sl`;
    slButton.textContent = button.textContent || "";

    const variant = getRelayButtonVariant(button);
    if (variant !== "default") slButton.setAttribute("variant", variant);
    if (button.classList.contains("small") || button.classList.contains("tiny")) {
      slButton.setAttribute("size", "small");
    }
    slButton.disabled = Boolean(button.disabled);
    slButton.dataset.uiPrimitive = "sl-button";
    slButton.addEventListener("click", event => {
      event.preventDefault();
      if (button.disabled) return;
      button.click();
    });

    const syncFromLegacy = () => {
      slButton.disabled = Boolean(button.disabled);
      if (slButton.textContent !== button.textContent) {
        slButton.textContent = button.textContent || "";
      }
      syncProxyAttributesFromLegacy(button, slButton);
    };
    attachImmediateProxySyncHooks(button, syncFromLegacy);
    syncFromLegacy();

    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => syncFromLegacy());
      observer.observe(button, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
        attributeFilter: [
          "disabled",
          "title",
          "aria-label",
          "aria-pressed",
          "aria-expanded",
          "aria-describedby",
          "aria-controls",
        ],
      });
    }

    button.dataset.uiPrimitiveProxy = "true";
    button.dataset.uiPrimitiveHidden = "true";
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
    button.style.display = "none";

    button.insertAdjacentElement("afterend", slButton);
    migrated += 1;
  });

  return migrated;
}

export function migrateRelayStatusBannerToShoelace({
  documentRef = defaultDocument,
  storageRef = globalThis?.localStorage,
} = {}) {
  if (!documentRef || !shouldUseShoelaceRelayControls(storageRef)) return false;
  // Keep legacy banner node stable because relay controller stores direct element references.
  return false;
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
