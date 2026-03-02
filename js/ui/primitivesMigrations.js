const defaultDocument = typeof document !== "undefined" ? document : null;

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

function getRelayButtonVariant(button) {
  if (!button) return "default";
  if (button.classList.contains("danger")) return "danger";
  if (button.classList.contains("primary")) return "primary";
  return "default";
}

function migrateButtonIdsToShoelaceProxy({
  documentRef = defaultDocument,
  ids = [],
} = {}) {
  if (!documentRef) return 0;
  let migrated = 0;

  ids.forEach(id => {
    const button = documentRef.getElementById(id);
    if (!button || button.tagName.toLowerCase() !== "button") return;
    if (button.dataset.uiPrimitiveProxy === "true") return;

    const slButton = documentRef.createElement("sl-button");
    copyAttributes(button, slButton, { skip: ["type", "id"] });
    slButton.id = `${id}-sl`;
    slButton.textContent = button.textContent || "";
    slButton.classList.add("ui-button-proxy");

    const variant = getRelayButtonVariant(button);
    if (variant !== "default") slButton.setAttribute("variant", variant);
    if (button.classList.contains("small") || button.classList.contains("tiny")) {
      slButton.setAttribute("size", "small");
      slButton.classList.add("ui-button-proxy-small");
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
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
    button.style.display = "none";

    button.insertAdjacentElement("afterend", slButton);
    migrated += 1;
  });

  return migrated;
}

export function migrateRelayControlsToShoelace({
  documentRef = defaultDocument,
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
  return migrateButtonIdsToShoelaceProxy({
    documentRef,
    ids,
  });
}

export function migrateSearchFilterSavedExportControlsToShoelace({
  documentRef = defaultDocument,
  ids = [
    "download-pdf",
    "download-markdown-report",
    "download-slides-report",
    "apply-custom-range",
    "download-search-results",
    "run-search",
    "reset-search",
    "save-view",
    "apply-saved-view",
    "delete-saved-view",
    "compare-views",
    "download-participants",
    "download-hourly",
    "download-daily",
    "download-weekly",
    "download-weekday",
    "download-timeofday",
    "download-message-types",
    "download-chat-json",
    "download-sentiment",
  ],
} = {}) {
  return migrateButtonIdsToShoelaceProxy({
    documentRef,
    ids,
  });
}

export function migrateRelayStatusBannerToShoelace({
  documentRef = defaultDocument,
} = {}) {
  if (!documentRef) return false;
  const banner = documentRef.getElementById("relay-status-banner");
  if (!banner) return false;
  if (banner.dataset?.vueManaged === "true") {
    return false;
  }
  if (banner.tagName.toLowerCase() === "sl-card") {
    banner.classList.add("relay-status-banner--shoelace");
    return false;
  }
  if (banner.tagName.toLowerCase() !== "section") return false;

  const slCard = documentRef.createElement("sl-card");
  copyAttributes(banner, slCard);
  slCard.classList.add("relay-status-banner--shoelace");

  const syncStatusToProxy = () => {
    const status = banner.getAttribute("data-status");
    if (status === null) slCard.removeAttribute("data-status");
    else slCard.setAttribute("data-status", status);
  };
  syncStatusToProxy();
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-status") {
          syncStatusToProxy();
        }
      }
    });
    observer.observe(banner, {
      attributes: true,
      attributeFilter: ["data-status"],
    });
  }

  while (banner.firstChild) {
    slCard.appendChild(banner.firstChild);
  }
  banner.replaceWith(slCard);
  return true;
}
