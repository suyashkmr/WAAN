// @ts-check

import { initAppShellPrimitives } from "../ui/appShellPrimitives.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
export function createBootstrapController({ elements, deps }) {
  const {
    onboardingSkipButton,
    onboardingNextButton,
  } = elements;

  const {
    initEventHandlers,
    initRelayControls,
    initThemeControls,
    setThemePreference,
    initCompactMode,
    initAccessibilityControls,
    toggleCompactMode,
    cycleReduceMotionPreference,
    toggleHighContrastPreference,
    setDataAvailabilityState,
    onboardingController,
    startRelaySession,
    stopRelaySession,
    buildSectionNav,
    setupSectionNavTracking,
    searchController,
    savedViewsController,
    getDataAvailable,
    refreshChatSelector,
    updateStatus,
    relayServiceName,
    prefersReducedMotion,
  } = deps;

  /**
   * @param {HTMLElement | null} content
   * @param {boolean} expand
   */
  function animateCardSection(content, expand) {
    if (!content) return;
    content.classList.add("collapsible");
    if (prefersReducedMotion()) {
      content.style.display = expand ? "" : "none";
      content.style.maxHeight = "";
      content.style.opacity = "";
      return;
    }

    if (expand) {
      content.style.display = "";
      const height = content.scrollHeight;
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
      requestAnimationFrame(() => {
        content.style.maxHeight = `${height}px`;
        content.style.opacity = "1";
      });
      const onEnd = () => {
        content.style.maxHeight = "";
        content.style.opacity = "";
        content.removeEventListener("transitionend", onEnd);
      };
      content.addEventListener("transitionend", onEnd, { once: true });
      return;
    }

    const height = content.scrollHeight;
    content.style.maxHeight = `${height}px`;
    requestAnimationFrame(() => {
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
    });
    const onEnd = () => {
      content.style.display = "none";
      content.style.maxHeight = "";
      content.style.opacity = "";
      content.removeEventListener("transitionend", onEnd);
    };
    content.addEventListener("transitionend", onEnd, { once: true });
  }

  function initCardToggles() {
    Array.from(document.querySelectorAll(".card-toggle")).forEach(
      /** @param {Element} toggle */ toggle => {
      const toggleEl = /** @type {HTMLElement} */ (toggle);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        const targetId = toggleEl.dataset.target;
        const content = targetId ? document.getElementById(targetId) : null;
        const card = toggle.closest(".card");
        const next = !expanded;
        toggle.setAttribute("aria-expanded", String(next));
        if (content) animateCardSection(content, next);
        if (card) card.classList.toggle("collapsed", !next);
      });
    });
  }

  function initElectronRelayBridge() {
    const electronAPI = /** @type {any} */ (window).electronAPI;
    if (!electronAPI?.onRelayAction) return;
    electronAPI.onRelayAction(/** @param {string} action */ action => {
      if (action === "connect") {
        startRelaySession();
      } else if (action === "disconnect") {
        stopRelaySession();
      }
    });
  }

  function initAppBootstrap() {
    initAppShellPrimitives({ documentRef: document });
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
    const supportsShellActionDispatch =
      typeof shellBridge?.setShellActionHandlers === "function" &&
      typeof shellBridge?.dispatchShellAction === "function";
    if (supportsShellActionDispatch) {
      shellBridge.setShellActionHandlers({
        "ui.compact.toggle": () => {
          if (typeof toggleCompactMode === "function") toggleCompactMode();
        },
        "ui.motion.cycle": () => {
          if (typeof cycleReduceMotionPreference === "function") cycleReduceMotionPreference();
        },
        "ui.contrast.toggle": () => {
          if (typeof toggleHighContrastPreference === "function") toggleHighContrastPreference();
        },
        "ui.theme.set": /** @param {any} payload */ payload => {
          if (typeof setThemePreference === "function") {
            setThemePreference(payload?.preference);
          }
        },
        "onboarding.skip": onboardingController.skip,
        "onboarding.next": onboardingController.advance,
      });
    }

    initEventHandlers();
    initRelayControls();
    initThemeControls({ bindInputListeners: !supportsShellActionDispatch });
    initCompactMode({ bindToggleListener: !supportsShellActionDispatch });
    initAccessibilityControls({ bindToggleListeners: !supportsShellActionDispatch });
    setDataAvailabilityState(false);
    if (!supportsShellActionDispatch) {
      onboardingSkipButton?.addEventListener("click", onboardingController.skip);
      onboardingNextButton?.addEventListener("click", onboardingController.advance);
    }
    setTimeout(() => onboardingController.start(), 500);

    initElectronRelayBridge();
    buildSectionNav();
    setupSectionNavTracking();
    initCardToggles();

    searchController.init();
    savedViewsController.init();
    savedViewsController.setDataAvailability(getDataAvailable());
    refreshChatSelector();
    updateStatus(`Start ${relayServiceName} to mirror chat app chats here.`, "info");
  }

  return {
    initAppBootstrap,
  };
}
