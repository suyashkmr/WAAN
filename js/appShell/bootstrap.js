export function createBootstrapController({ elements, deps }) {
  const {
    onboardingSkipButton,
    onboardingNextButton,
  } = elements;

  const {
    initEventHandlers,
    initRelayControls,
    initThemeControls,
    initCompactMode,
    initAccessibilityControls,
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
    Array.from(document.querySelectorAll(".card-toggle")).forEach(toggle => {
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        const targetId = toggle.dataset.target;
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
    if (!window.electronAPI?.onRelayAction) return;
    window.electronAPI.onRelayAction(action => {
      if (action === "connect") {
        startRelaySession();
      } else if (action === "disconnect") {
        stopRelaySession();
      }
    });
  }

  function initAppBootstrap() {
    initEventHandlers();
    initRelayControls();
    initThemeControls();
    initCompactMode();
    initAccessibilityControls();
    setDataAvailabilityState(false);

    onboardingSkipButton?.addEventListener("click", onboardingController.skip);
    onboardingNextButton?.addEventListener("click", onboardingController.advance);
    setTimeout(() => onboardingController.start(), 500);

    initElectronRelayBridge();
    buildSectionNav();
    setupSectionNavTracking();
    initCardToggles();

    searchController.init();
    savedViewsController.init();
    savedViewsController.setDataAvailability(getDataAvailable());
    refreshChatSelector();

    const datasetEmptyOpenRelayButton = document.getElementById("dataset-empty-open-relay");
    datasetEmptyOpenRelayButton?.addEventListener("click", () => {
      document.getElementById("relay-live-card")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      startRelaySession();
    });

    updateStatus(`Start ${relayServiceName} to mirror chat app chats here.`, "info");
  }

  return {
    initAppBootstrap,
  };
}
