// @ts-check

import { UI_COPY } from "../uiCopy.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   firstRunSetup?: HTMLElement | null,
 *   firstRunSetupSteps?: Array<HTMLElement> | null,
 *   firstRunPrimaryActionButton?: HTMLButtonElement | null,
 *   relayBannerEl?: HTMLElement | null,
 *   chatSelector?: HTMLElement | null,
 *   relayStartButton?: HTMLButtonElement | null,
 *   getControlsLocked?: (() => boolean) | null,
 *   getDataAvailable?: (() => boolean) | null,
 *   getRemoteChatsLastFetchedAt?: (() => number) | null,
 *   focusChatSelector?: (() => boolean) | null,
 *   scrollChatSelector?: (() => boolean) | null,
 * }} [params]
 */
export function createFirstRunSetupController({
  firstRunSetup,
  firstRunSetupSteps,
  firstRunPrimaryActionButton,
  relayBannerEl,
  chatSelector,
  relayStartButton,
  getControlsLocked,
  getDataAvailable,
  getRemoteChatsLastFetchedAt = null,
  focusChatSelector = null,
  scrollChatSelector = null,
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
    const syncingChats = Boolean(status?.syncingChats);
    const hasCompletedRemoteChatFetch = Boolean(getRemoteChatsLastFetchedAt?.());

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
        if (hasData || (state === "running" && !syncingChats && chatCount <= 0 && hasCompletedRemoteChatFetch)) value = "complete";
        else if (state === "running" && (syncingChats || chatCount > 0)) value = "active";
        else value = "pending";
      }
      step.dataset.state = value;
    });

    if (firstRunPrimaryActionButton) {
      firstRunPrimaryActionButton.dataset.action = "connect";
      firstRunPrimaryActionButton.disabled = Boolean(getControlsLocked?.());
      if (state === "running" && chatCount > 0) {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.chooseChat;
        firstRunPrimaryActionButton.dataset.action = "select-chat";
      } else if (state === "starting") {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.starting;
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "waiting_qr") {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.waitingPhone;
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "running" && syncingChats) {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.loadingChats;
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "running" && hasCompletedRemoteChatFetch) {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.noChats;
        firstRunPrimaryActionButton.disabled = true;
      } else if (state === "running") {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.loadingChats;
        firstRunPrimaryActionButton.disabled = true;
      } else {
        firstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.startRelay;
        firstRunPrimaryActionButton.disabled = Boolean(getControlsLocked?.());
      }
    }
  }

  function handleFirstRunOpenRelay() {
    scrollToElement(relayBannerEl);
  }

  function handleFirstRunPrimaryAction() {
    const action = firstRunPrimaryActionButton?.dataset.action || "connect";
    if (action === "select-chat") {
      const handledScroll = Boolean(scrollChatSelector?.());
      if (!handledScroll) {
        scrollToElement(chatSelector);
      }
      const handledFocus = Boolean(focusChatSelector?.());
      if (!handledFocus) {
        chatSelector?.focus();
      }
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
