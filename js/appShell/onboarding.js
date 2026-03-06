// @ts-check

/**
 * @typedef {{ copy: string, target?: string | null }} OnboardingStep
 */

/**
 * @param {{
 *   overlayEl: HTMLElement | null | undefined,
 *   copyEl: HTMLElement | null | undefined,
 *   stepLabelEl: HTMLElement | null | undefined,
 *   nextButtonEl: HTMLButtonElement | null | undefined,
 *   steps?: OnboardingStep[],
 *   storageKey?: string,
 *   documentRef?: Document | null | undefined,
 *   storageRef?: Pick<Storage, "getItem" | "setItem"> | null | undefined,
 * }} params
 */
export function createOnboardingController({
  overlayEl,
  copyEl,
  stepLabelEl,
  nextButtonEl,
  steps = [],
  storageKey = "waan-onboarding-dismissed",
  documentRef = typeof document !== "undefined" ? document : null,
  storageRef = globalThis.localStorage ?? null,
}) {
  let onboardingIndex = 0;
  /** @type {Element | null} */
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
    documentRef?.body?.classList.remove("onboarding-active");
    if (stepLabelEl) stepLabelEl.textContent = "";
    storageRef?.setItem(storageKey, "done");
  }

  /**
   * @param {string | null | undefined} selector
   */
  function highlightTarget(selector) {
    clearHighlight();
    if (!selector) return;
    const target = documentRef?.querySelector(selector);
    if (target) {
      onboardingHighlight = target;
      target.classList.add("onboarding-highlight");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /**
   * @param {number} index
   */
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
    if (!overlayEl || storageRef?.getItem(storageKey) === "done") return;
    onboardingIndex = 0;
    documentRef?.body?.classList.add("onboarding-active");
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
