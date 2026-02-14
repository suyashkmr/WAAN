export function createOnboardingController({
  overlayEl,
  copyEl,
  stepLabelEl,
  nextButtonEl,
  steps = [],
  storageKey = "waan-onboarding-dismissed",
}) {
  let onboardingIndex = 0;
  let onboardingHighlight = null;

  function clearHighlight() {
    if (onboardingHighlight) {
      onboardingHighlight.classList.remove("onboarding-highlight");
      onboardingHighlight = null;
    }
  }

  function finish() {
    clearHighlight();
    overlayEl?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("onboarding-active");
    if (stepLabelEl) stepLabelEl.textContent = "";
    localStorage.setItem(storageKey, "done");
  }

  function highlightTarget(selector) {
    clearHighlight();
    if (!selector) return;
    const target = document.querySelector(selector);
    if (target) {
      onboardingHighlight = target;
      target.classList.add("onboarding-highlight");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function showStep(index) {
    if (!overlayEl || !copyEl) return;
    const step = steps[index];
    if (!step) {
      finish();
      return;
    }
    copyEl.textContent = step.copy;
    if (stepLabelEl) {
      stepLabelEl.textContent = `Step ${index + 1} of ${steps.length}`;
    }
    highlightTarget(step.target);
    if (nextButtonEl) {
      nextButtonEl.textContent = index === steps.length - 1 ? "Done" : "Next";
    }
  }

  function start() {
    if (!overlayEl || localStorage.getItem(storageKey) === "done") return;
    onboardingIndex = 0;
    document.body.classList.add("onboarding-active");
    overlayEl.setAttribute("aria-hidden", "false");
    showStep(onboardingIndex);
  }

  function advance() {
    onboardingIndex += 1;
    if (onboardingIndex >= steps.length) {
      finish();
    } else {
      showStep(onboardingIndex);
    }
  }

  function skip() {
    finish();
  }

  function isOpen() {
    return overlayEl?.getAttribute("aria-hidden") === "false";
  }

  return {
    start,
    advance,
    skip,
    isOpen,
  };
}
