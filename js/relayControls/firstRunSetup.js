// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   firstRunSetup?: HTMLElement | null,
 *   firstRunSetupSteps?: Array<HTMLElement> | null,
 *   firstRunPrimaryActionButton?: HTMLButtonElement | null,
 *   relayStartButton?: HTMLButtonElement | null,
 *   getControlsLocked?: (() => boolean) | null,
 *   getDataAvailable?: (() => boolean) | null,
 * }} [params]
 */
export function createFirstRunSetupController({
  firstRunSetup,
  firstRunSetupSteps,
  firstRunPrimaryActionButton,
  relayStartButton,
  getControlsLocked,
  getDataAvailable,
} = {}) {
  /**
   * @param {Element | null | undefined} target
   */
  function scrollToElement(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: "auto", block: "center" });
  }

  /**
   * @param {{ status?: AnyRecord | null, hasData?: boolean }} [params]
   */
  function updateFirstRunSetup({ status, hasData = false } = {}) {
    if (!firstRunSetup || !firstRunSetupSteps?.length) return;
    if (hasData) {
      firstRunSetup.setAttribute("hidden", "");
      return;
    }
    firstRunSetup.removeAttribute("hidden");

    const state = status?.status || "offline";
    const chatCount = Number(status?.chatCount ?? 0);

    firstRunSetupSteps.forEach(/** @param {HTMLElement} step */ step => {
      const stepId = step.dataset.setupStep;
      let value = "pending";
      if (stepId === "connect") {
        value = state === "offline" || state === "error" ? "active" : "complete";
      } else if (stepId === "link") {
        if (state === "offline" || state === "error") value = "pending";
        else if (state === "waiting_qr" || state === "starting") value = "active";
        else value = "complete";
      } else if (stepId === "load") {
        if (hasData) value = "complete";
        else if (state === "running" && chatCount > 0) value = "active";
        else value = "pending";
      }
      step.dataset.state = value;
    });

    if (firstRunPrimaryActionButton) {
      firstRunPrimaryActionButton.dataset.action = "connect";
      firstRunPrimaryActionButton.disabled = Boolean(getControlsLocked?.());
      if (state === "running" && chatCount > 0) {
        firstRunPrimaryActionButton.textContent = "Choose Loaded Chat";
        firstRunPrimaryActionButton.dataset.action = "select-chat";
      } else if (state === "starting") {
        firstRunPrimaryActionButton.textContent = "Starting Relay…";
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "waiting_qr") {
        firstRunPrimaryActionButton.textContent = "Waiting for QR Scan";
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "running") {
        firstRunPrimaryActionButton.textContent = "Syncing Chats…";
        firstRunPrimaryActionButton.disabled = true;
      } else {
        firstRunPrimaryActionButton.textContent = "Connect Relay";
      }
    }
  }

  function handleFirstRunOpenRelay() {
    const relayCard = document.getElementById("relay-live-card");
    scrollToElement(relayCard);
  }

  function handleFirstRunPrimaryAction() {
    const action = firstRunPrimaryActionButton?.dataset.action || "connect";
    if (action === "select-chat") {
      const selector = document.getElementById("chat-selector");
      scrollToElement(selector);
      selector?.focus();
      return;
    }
    if (relayStartButton && !relayStartButton.disabled) {
      relayStartButton.click();
    }
  }

  /**
   * @param {AnyRecord | null | undefined} status
   */
  function refreshForCurrentData(status) {
    updateFirstRunSetup({ status, hasData: Boolean(getDataAvailable?.()) });
  }

  return {
    updateFirstRunSetup,
    refreshForCurrentData,
    handleFirstRunOpenRelay,
    handleFirstRunPrimaryAction,
  };
}
