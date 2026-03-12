// @ts-check

import { createEventBindingsController } from "./eventBindings.js";
import { createBootstrapController } from "./bootstrap.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @typedef {{ elements: AnyRecord, handlers: AnyRecord, deps: AnyRecord }} RuntimeEventBindingsConfig
 * @typedef {{ elements: AnyRecord, deps: AnyRecord }} RuntimeBootstrapConfig
 */

/**
 * @param {{
 *   status: AnyRecord,
  *   keyboardShortcuts: AnyRecord,
 *   eventBindings: RuntimeEventBindingsConfig,
 *   bootstrap: RuntimeBootstrapConfig,
 * }} params
 */
export function setupAppBootstrap({
  status,
  keyboardShortcuts,
  eventBindings,
  bootstrap,
}) {
  const {
    setStatusCallback,
    statusEl,
    showStatusMessage,
    showToast,
  } = status;

  setStatusCallback((/** @type {string} */ message, /** @type {string} */ tone) => {
    if (!statusEl) return;
    showStatusMessage(message, tone);
    if (tone === "success" || tone === "warning" || tone === "error") {
      showToast(message, tone);
    }
  });

  keyboardShortcuts.initKeyboardShortcuts();

  const eventBindingsController = createEventBindingsController(eventBindings);
  const { initEventHandlers } = eventBindingsController;

  const bootstrapController = createBootstrapController({
    elements: bootstrap.elements,
    deps: {
      ...bootstrap.deps,
      initEventHandlers,
    },
  });
  const { initAppBootstrap } = bootstrapController;
  let bootstrapInitialised = false;

  function runBootstrapOnce() {
    if (bootstrapInitialised) return;
    bootstrapInitialised = true;
    initAppBootstrap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runBootstrapOnce, { once: true });
  } else {
    runBootstrapOnce();
  }

  return {
    initEventHandlers,
    initAppBootstrap,
  };
}
