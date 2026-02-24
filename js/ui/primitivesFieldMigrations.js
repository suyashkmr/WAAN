const defaultDocument = typeof document !== "undefined" ? document : null;
const CONTROLS_LEGACY_MODE_STORAGE_KEY = "waan-ui-controls-legacy";

function shouldUseShoelaceByStorageKey(storageKey, storageRef = globalThis?.localStorage) {
  try {
    return storageRef?.getItem(storageKey) !== "true";
  } catch {
    return true;
  }
}

function syncCommonA11yAttrs(source, target) {
  const attrs = ["title", "aria-label", "aria-describedby", "aria-controls"];
  attrs.forEach(attr => {
    const value = source.getAttribute(attr);
    if (value === null) target.removeAttribute(attr);
    else target.setAttribute(attr, value);
  });
}

function hideLegacyField(field) {
  field.dataset.uiPrimitiveProxy = "true";
  field.dataset.uiPrimitiveHidden = "true";
  field.setAttribute("aria-hidden", "true");
  field.tabIndex = -1;
  field.style.display = "none";
}

function rebindFieldLabels({ documentRef, legacyId, proxyId }) {
  if (!documentRef || !legacyId || !proxyId) return;
  const labels = documentRef.querySelectorAll(`label[for="${legacyId}"]`);
  labels.forEach(label => {
    label.dataset.uiPrimitiveLegacyFor = legacyId;
    label.setAttribute("for", proxyId);
  });
}

function installPropertySyncHook(element, propertyName, syncFromLegacy) {
  const proto = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(proto, propertyName);
  if (!descriptor || typeof descriptor.set !== "function") return;
  Object.defineProperty(element, propertyName, {
    configurable: true,
    enumerable: descriptor.enumerable ?? true,
    get() {
      return descriptor.get ? descriptor.get.call(this) : undefined;
    },
    set(value) {
      descriptor.set.call(this, value);
      syncFromLegacy();
    },
  });
}

function attachImmediateFieldAttrSyncHooks(legacyField, syncFromLegacy) {
  if (!legacyField || typeof syncFromLegacy !== "function") return;
  const mirrored = new Set([
    "value",
    "disabled",
    "title",
    "aria-label",
    "aria-describedby",
    "aria-controls",
    "min",
    "max",
    "step",
  ]);
  const nativeSetAttribute = legacyField.setAttribute.bind(legacyField);
  const nativeRemoveAttribute = legacyField.removeAttribute.bind(legacyField);
  legacyField.setAttribute = (name, value) => {
    nativeSetAttribute(name, value);
    if (mirrored.has(String(name))) syncFromLegacy();
  };
  legacyField.removeAttribute = name => {
    nativeRemoveAttribute(name);
    if (mirrored.has(String(name))) syncFromLegacy();
  };
}

function attachInputProxy({
  documentRef,
  legacyInput,
}) {
  const proxy = documentRef.createElement("sl-input");
  proxy.id = `${legacyInput.id}-sl`;
  proxy.dataset.uiPrimitive = "sl-input";
  proxy.type = legacyInput.type || "text";
  proxy.placeholder = legacyInput.placeholder || "";

  const syncFromLegacy = () => {
    proxy.value = legacyInput.value || "";
    proxy.disabled = Boolean(legacyInput.disabled);
    proxy.min = legacyInput.min || "";
    proxy.max = legacyInput.max || "";
    proxy.step = legacyInput.step || "";
    syncCommonA11yAttrs(legacyInput, proxy);
  };
  syncFromLegacy();

  installPropertySyncHook(legacyInput, "value", syncFromLegacy);
  installPropertySyncHook(legacyInput, "min", syncFromLegacy);
  installPropertySyncHook(legacyInput, "max", syncFromLegacy);
  installPropertySyncHook(legacyInput, "step", syncFromLegacy);
  attachImmediateFieldAttrSyncHooks(legacyInput, syncFromLegacy);
  legacyInput.addEventListener("input", syncFromLegacy);
  legacyInput.addEventListener("change", syncFromLegacy);

  proxy.addEventListener("sl-input", () => {
    legacyInput.value = proxy.value || "";
    legacyInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  proxy.addEventListener("sl-change", () => {
    legacyInput.value = proxy.value || "";
    legacyInput.dispatchEvent(new Event("change", { bubbles: true }));
  });

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(syncFromLegacy);
    observer.observe(legacyInput, {
      attributes: true,
      attributeFilter: [
        "disabled",
        "title",
        "aria-label",
        "aria-describedby",
        "aria-controls",
        "value",
        "min",
        "max",
        "step",
      ],
    });
  }

  hideLegacyField(legacyInput);
  legacyInput.insertAdjacentElement("afterend", proxy);
  rebindFieldLabels({
    documentRef,
    legacyId: legacyInput.id,
    proxyId: proxy.id,
  });
  return proxy;
}

function buildProxyOptions({ documentRef, select, proxy }) {
  const selectedValue = select.value;
  proxy.innerHTML = "";
  Array.from(select.options || []).forEach(option => {
    const proxyOption = documentRef.createElement("sl-option");
    proxyOption.value = option.value;
    proxyOption.textContent = option.textContent || "";
    proxy.appendChild(proxyOption);
  });
  proxy.value = selectedValue || "";
}

function attachSelectProxy({
  documentRef,
  legacySelect,
}) {
  const proxy = documentRef.createElement("sl-select");
  proxy.id = `${legacySelect.id}-sl`;
  proxy.dataset.uiPrimitive = "sl-select";

  const syncFromLegacy = () => {
    buildProxyOptions({ documentRef, select: legacySelect, proxy });
    proxy.disabled = Boolean(legacySelect.disabled);
    syncCommonA11yAttrs(legacySelect, proxy);
  };
  syncFromLegacy();

  installPropertySyncHook(legacySelect, "value", syncFromLegacy);
  installPropertySyncHook(legacySelect, "selectedIndex", syncFromLegacy);
  attachImmediateFieldAttrSyncHooks(legacySelect, syncFromLegacy);
  legacySelect.addEventListener("change", syncFromLegacy);

  proxy.addEventListener("sl-change", () => {
    legacySelect.value = proxy.value || "";
    legacySelect.dispatchEvent(new Event("change", { bubbles: true }));
  });

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(syncFromLegacy);
    observer.observe(legacySelect, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["disabled", "title", "aria-label", "aria-describedby", "aria-controls", "value"],
    });
  }

  hideLegacyField(legacySelect);
  legacySelect.insertAdjacentElement("afterend", proxy);
  rebindFieldLabels({
    documentRef,
    legacyId: legacySelect.id,
    proxyId: proxy.id,
  });
  return proxy;
}

export function migrateSearchSavedViewFieldsToShoelace({
  documentRef = defaultDocument,
  storageRef = globalThis?.localStorage,
  inputIds = ["search-keyword", "search-start", "search-end", "saved-view-name"],
  selectIds = ["search-participant", "saved-view-list", "compare-view-a", "compare-view-b"],
} = {}) {
  if (!documentRef || !shouldUseShoelaceByStorageKey(CONTROLS_LEGACY_MODE_STORAGE_KEY, storageRef)) return 0;
  let migrated = 0;

  inputIds.forEach(id => {
    const legacyInput = documentRef.getElementById(id);
    if (!legacyInput || legacyInput.tagName.toLowerCase() !== "input") return;
    if (legacyInput.dataset.uiPrimitiveProxy === "true") return;
    attachInputProxy({ documentRef, legacyInput });
    migrated += 1;
  });

  selectIds.forEach(id => {
    const legacySelect = documentRef.getElementById(id);
    if (!legacySelect || legacySelect.tagName.toLowerCase() !== "select") return;
    if (legacySelect.dataset.uiPrimitiveProxy === "true") return;
    attachSelectProxy({ documentRef, legacySelect });
    migrated += 1;
  });

  return migrated;
}
