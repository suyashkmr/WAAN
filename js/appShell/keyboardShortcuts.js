// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ deps: AnyRecord, documentRef?: Document | null }} params
 */
export function createKeyboardShortcutsController({
  deps,
  documentRef = typeof document !== "undefined" ? document : null,
}) {
  const {
    syncRelayChats,
    isLogDrawerOpen,
    closeLogDrawer,
    openLogDrawer,
    applyCompactMode,
    showToast,
    onboardingController,
  } = deps;

  /**
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    const target = /** @type {Element | null} */ (event.target instanceof Element ? event.target : null);
    const targetTag = target?.tagName;
    const isTypingTarget =
      targetTag === "INPUT"
      || targetTag === "TEXTAREA"
      || Boolean(target instanceof HTMLElement && target.isContentEditable);

    if (event.metaKey || event.ctrlKey) {
      if (isTypingTarget) return;

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        syncRelayChats({ silent: false });
        return;
      }

      if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        if (isLogDrawerOpen()) {
          closeLogDrawer();
        } else {
          openLogDrawer();
        }
        return;
      }

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        const nextCompactEnabled = !(documentRef?.body?.dataset?.compact === "true");
        applyCompactMode(nextCompactEnabled);
        showToast(
          nextCompactEnabled ? "Compact mode enabled." : "Comfort mode enabled.",
          "info",
          { duration: 2500 },
        );
      }
      return;
    }

    if (event.key === "Escape" && isLogDrawerOpen()) {
      closeLogDrawer();
      return;
    }

    if (event.key === "Escape" && onboardingController.isOpen()) {
      event.preventDefault();
      onboardingController.skip();
    }
  }

  function initKeyboardShortcuts() {
    documentRef?.addEventListener("keydown", handleKeydown);
  }

  return {
    initKeyboardShortcuts,
  };
}
