import {
  initShoelacePrimitives,
} from "./primitives.js";
import {
  migrateRelayControlsToShoelace,
  migrateRelayStatusBannerToShoelace,
  migrateSearchFilterSavedExportControlsToShoelace,
} from "./primitivesMigrations.js";
import { migrateSearchSavedViewFieldsToShoelace } from "./primitivesFieldMigrations.js";

function containsShoelaceElement(root) {
  if (!root) return false;
  if (root.tagName && String(root.tagName).toLowerCase().startsWith("sl-")) return true;
  if (typeof root.querySelectorAll !== "function") return false;
  const elements = root.querySelectorAll("*");
  for (let index = 0; index < elements.length; index += 1) {
    if (String(elements[index].tagName || "").toLowerCase().startsWith("sl-")) return true;
  }
  return false;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initShoelacePrimitives();

  let runtimeRequested = false;
  const loadRuntime = async () => {
    if (runtimeRequested) return;
    runtimeRequested = true;
    try {
      await import("../../vendor/shoelace/shoelace-autoloader.js");
    } catch (error) {
      runtimeRequested = false;
      console.warn("Shoelace runtime unavailable; continuing without custom element runtime.", error);
    }
  };

  if (containsShoelaceElement(document.documentElement)) {
    void loadRuntime();
  } else if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (containsShoelaceElement(node)) {
            observer.disconnect();
            void loadRuntime();
            return;
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  const waitForDefinition = (tagName, timeoutMs = 5000) =>
    new Promise(resolve => {
      if (customElements.get(tagName)) {
        resolve(true);
        return;
      }
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        resolve(false);
      }, timeoutMs);
      customElements
        .whenDefined(tagName)
        .then(() => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve(true);
        })
        .catch(() => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve(false);
        });
    });

  void (async () => {
    await loadRuntime();
    const cardReady = await waitForDefinition("sl-card");
    if (cardReady) {
      migrateRelayStatusBannerToShoelace();
    }
    const buttonsReady = await waitForDefinition("sl-button");
    if (buttonsReady) {
      migrateRelayControlsToShoelace();
      migrateSearchFilterSavedExportControlsToShoelace();
    }
    const fieldsReady = (await waitForDefinition("sl-input")) && (await waitForDefinition("sl-select"));
    if (fieldsReady) {
      migrateSearchSavedViewFieldsToShoelace();
    }
  })();
}
