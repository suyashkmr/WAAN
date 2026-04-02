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
 *   documentRef?: Document | null,
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
  documentRef = typeof document !== "undefined" ? document : null,
} = {}) {
  const firstRunSetupId = firstRunSetup?.id || "first-run-setup";
  const firstRunPrimaryActionButtonId = firstRunPrimaryActionButton?.id || "first-run-primary-action";
  const relayBannerElId = relayBannerEl?.id || "relay-status-banner";
  const chatSelectorId = chatSelector?.id || "chat-selector";
  const relayStartButtonId = relayStartButton?.id || "relay-start";
  const firstRunStepSelector = '[data-setup-step]';

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
   * @returns {HTMLElement[]}
   */
  function resolveLiveSetupSteps() {
    const knownSteps = Array.from(firstRunSetupSteps ?? []).filter(
      /** @returns {step is HTMLElement} */ step => step instanceof HTMLElement,
    );
    const connectedSteps = knownSteps.filter(
      /** @returns {step is HTMLElement} */ step => step instanceof HTMLElement && step.isConnected,
    );
    if (connectedSteps.length) return connectedSteps;
    const liveSteps = Array.from(documentRef?.querySelectorAll?.(firstRunStepSelector) ?? []).filter(
      /** @returns {step is HTMLElement} */ step => step instanceof HTMLElement,
    );
    if (liveSteps.length) return liveSteps;
    return knownSteps;
  }

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
    const liveFirstRunSetup = resolveLiveElement(firstRunSetup, firstRunSetupId);
    const liveFirstRunSetupSteps = resolveLiveSetupSteps();
    const liveFirstRunPrimaryActionButton = resolveLiveElement(
      firstRunPrimaryActionButton,
      firstRunPrimaryActionButtonId,
    );
    if (!liveFirstRunSetup || !liveFirstRunSetupSteps.length) return;
    if (hasData) {
      liveFirstRunSetup.setAttribute("hidden", "");
      return;
    }
    liveFirstRunSetup.removeAttribute("hidden");

    const state = status?.status || "offline";
    const chatCount = Number(status?.chatCount ?? 0);
    const syncingChats = Boolean(status?.syncingChats);
    const hasCompletedRemoteChatFetch = Boolean(getRemoteChatsLastFetchedAt?.());

    liveFirstRunSetupSteps.forEach(/** @param {HTMLElement} step */ step => {
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

    if (liveFirstRunPrimaryActionButton) {
      liveFirstRunPrimaryActionButton.dataset.action = "connect";
      liveFirstRunPrimaryActionButton.disabled = Boolean(getControlsLocked?.());
      if (state === "running" && chatCount > 0) {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.chooseChat;
        liveFirstRunPrimaryActionButton.dataset.action = "select-chat";
      } else if (state === "starting") {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.starting;
        liveFirstRunPrimaryActionButton.disabled = true;
      } else if (state === "waiting_qr") {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.waitingPhone;
        liveFirstRunPrimaryActionButton.disabled = true;
      } else if (state === "running" && syncingChats) {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.loadingChats;
        liveFirstRunPrimaryActionButton.disabled = true;
      } else if (state === "running" && hasCompletedRemoteChatFetch) {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.noChats;
        liveFirstRunPrimaryActionButton.disabled = true;
      } else if (state === "running") {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.loadingChats;
        liveFirstRunPrimaryActionButton.disabled = true;
      } else {
        liveFirstRunPrimaryActionButton.textContent = UI_COPY.relay.firstRun.startRelay;
        liveFirstRunPrimaryActionButton.disabled = Boolean(getControlsLocked?.());
      }
    }
  }

  function handleFirstRunOpenRelay() {
    const liveRelayBannerEl = resolveLiveElement(relayBannerEl, relayBannerElId);
    scrollToElement(liveRelayBannerEl);
  }

  function handleFirstRunPrimaryAction() {
    const liveFirstRunPrimaryActionButton = resolveLiveElement(
      firstRunPrimaryActionButton,
      firstRunPrimaryActionButtonId,
    );
    const liveChatSelector = resolveLiveElement(chatSelector, chatSelectorId);
    const liveRelayStartButton = resolveLiveElement(relayStartButton, relayStartButtonId);
    const action = liveFirstRunPrimaryActionButton?.dataset.action || "connect";
    if (action === "select-chat") {
      const handledScroll = Boolean(scrollChatSelector?.());
      if (!handledScroll) {
        scrollToElement(liveChatSelector);
      }
      const handledFocus = Boolean(focusChatSelector?.());
      if (!handledFocus) {
        liveChatSelector?.focus();
      }
      return;
    }
    if (liveRelayStartButton && !liveRelayStartButton.disabled) {
      liveRelayStartButton.click();
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
