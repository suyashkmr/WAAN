import { createEventBindingsController } from "./eventBindings.js";
import { createBootstrapController } from "./bootstrap.js";

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

  setStatusCallback((message, tone) => {
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

  document.addEventListener("DOMContentLoaded", () => {
    initAppBootstrap();
  });

  return {
    initEventHandlers,
    initAppBootstrap,
  };
}
