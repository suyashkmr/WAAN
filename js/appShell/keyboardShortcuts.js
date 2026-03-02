// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ deps: AnyRecord }} params
 */
export function createKeyboardShortcutsController({ deps }) {
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
        applyCompactMode(!(document.body.dataset.compact === "true"));
        showToast(
          document.body.dataset.compact === "true" ? "Compact mode enabled." : "Comfort mode enabled.",
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
    document.addEventListener("keydown", handleKeydown);
  }

  return {
    initKeyboardShortcuts,
  };
}
