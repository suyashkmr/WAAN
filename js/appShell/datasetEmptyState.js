// @ts-check

/**
 * @param {{
 *   calloutEl?: HTMLElement | null,
 *   headingEl?: HTMLElement | null,
 *   copyEl?: HTMLElement | null,
 *   buttons?: Array<(HTMLElement & { disabled?: boolean }) | null | undefined>,
 * }} [params]
 */
export function createDatasetEmptyStateManager({ calloutEl, headingEl, copyEl, buttons = [] } = {}) {
  const defaultHeading = headingEl?.textContent || "";
  const defaultCopy = copyEl?.textContent || "";
  let available = false;
  const workspaceSplitEl = calloutEl?.closest(".workspace-stage-grid");

  /**
   * @param {string} [headingText]
   * @param {string} [copyText]
   */
  const setMessage = (headingText, copyText) => {
    if (headingEl && typeof headingText === "string") headingEl.textContent = headingText;
    if (copyEl && typeof copyText === "string") copyEl.textContent = copyText;
  };

  /**
   * @param {boolean} hasData
   */
  const setAvailability = hasData => {
    available = Boolean(hasData);
    buttons.forEach(button => {
      if (!button) return;
      if ("disabled" in button) button.disabled = !available;
      if (button.tagName === "BUTTON") {
        if (!available) button.setAttribute("title", "Load a chat to enable this action.");
        else button.removeAttribute("title");
      }
    });
    if (calloutEl) {
      calloutEl.classList.toggle("hidden", available);
      calloutEl.toggleAttribute("hidden", available);
      if (available) {
        calloutEl.style.display = "none";
      } else {
        calloutEl.style.removeProperty("display");
      }
    }
    if (workspaceSplitEl) {
      workspaceSplitEl.classList.toggle("workspace-stage-grid--has-secondary", !available);
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
