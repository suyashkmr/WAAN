// @ts-check

/**
 * @param {{
 *   calloutEl?: HTMLElement | null,
 *   headingEl?: HTMLElement | null,
 *   copyEl?: HTMLElement | null,
 *   buttons?: Array<(HTMLElement & { disabled?: boolean }) | null | undefined>,
 *   documentRef?: Document | null,
 * }} [params]
 */
export function createDatasetEmptyStateManager({
  calloutEl,
  headingEl,
  copyEl,
  buttons = [],
  documentRef = typeof document !== "undefined" ? document : null,
} = {}) {
  const calloutId = calloutEl?.id || "dataset-empty-callout";
  const headingId = headingEl?.id || "dataset-empty-heading";
  const copyId = copyEl?.id || "dataset-empty-copy";
  const buttonIds = buttons.map(button => button?.id).filter(Boolean);

  /**
   * @template {HTMLElement} T
   * @param {T | null | undefined} element
   * @param {string | null | undefined} id
   * @returns {T | null}
   */
  function resolveLiveElement(element, id) {
    if (element && element.isConnected) return element;
    if (!id) return element ?? null;
    const liveElement = /** @type {T | null} */ (documentRef?.getElementById?.(id) ?? null);
    if (liveElement) return liveElement;
    return element ?? null;
  }

  /**
   * @returns {(HTMLElement & { disabled?: boolean })[]}
   */
  function resolveLiveButtons() {
    return buttons.map((button, index) => {
      const id = buttonIds[index] || button?.id || null;
      return resolveLiveElement(button, id);
    }).filter(/** @returns {button is HTMLElement & { disabled?: boolean }} */ button => Boolean(button));
  }

  const defaultHeading = resolveLiveElement(headingEl, headingId)?.textContent || "";
  const defaultCopy = resolveLiveElement(copyEl, copyId)?.textContent || "";
  let available = false;

  /**
   * @param {string} [headingText]
   * @param {string} [copyText]
   */
  const setMessage = (headingText, copyText) => {
    const liveHeadingEl = resolveLiveElement(headingEl, headingId);
    const liveCopyEl = resolveLiveElement(copyEl, copyId);
    if (liveHeadingEl && typeof headingText === "string") liveHeadingEl.textContent = headingText;
    if (liveCopyEl && typeof copyText === "string") liveCopyEl.textContent = copyText;
  };

  /**
   * @param {boolean} hasData
   */
  const setAvailability = hasData => {
    available = Boolean(hasData);
    resolveLiveButtons().forEach(button => {
      if (!button) return;
      if ("disabled" in button) button.disabled = !available;
      if (button.tagName === "BUTTON") {
        if (!available) button.setAttribute("title", "Load a chat to enable this action.");
        else button.removeAttribute("title");
      }
    });
    const liveCalloutEl = resolveLiveElement(calloutEl, calloutId);
    if (liveCalloutEl) {
      liveCalloutEl.classList.toggle("hidden", available);
      liveCalloutEl.toggleAttribute("hidden", available);
      if (available) {
        liveCalloutEl.style.display = "none";
      } else {
        liveCalloutEl.style.removeProperty("display");
      }
    }
    if (!available) {
      setMessage(defaultHeading, defaultCopy);
    }
  };

  return {
    setMessage,
    setAvailability,
    isAvailable: () => available,
  };
}
