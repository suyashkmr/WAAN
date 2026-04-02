// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
import { mountDashboardPanelsIsland } from "../vue/dashboardPanelsIsland.js";
import { createDelegatedExportFallbackHandler } from "./delegatedExportFallback.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   elements: AnyRecord,
 *   handlers: AnyRecord,
 *   deps: AnyRecord,
 *   globalScope?: any,
 * }} params
 */
export function createEventBindingsController({
  elements,
  handlers,
  deps,
  globalScope = globalThis,
}) {
  const {
    chatSelector,
    rangeSelect,
    customApplyButton,
    customStartInput,
    customEndInput,
    downloadParticipantsButton,
    downloadHourlyButton,
    downloadDailyButton,
    downloadWeeklyButton,
    downloadWeekdayButton,
    downloadTimeOfDayButton,
    downloadMessageTypesButton,
    downloadChatJsonButton,
    downloadSentimentButton,
    statDownloadButtons,
    downloadSearchButton,
    downloadMarkdownButton,
    downloadSlidesButton,
    downloadPdfButton,
  } = elements;

  const {
    handleChatSelectionChange,
    handleRangeChange,
    exportParticipants,
    exportHourly,
    exportDaily,
    exportWeekly,
    exportWeekday,
    exportTimeOfDay,
    exportMessageTypes,
    exportChatJson,
    exportSentiment,
    exportMessageSubtype,
    handleDownloadMarkdownReport,
    handleDownloadSlidesReport,
    exportSearchResults,
    handleDownloadPdfReport,
  } = handlers;

  const { updateStatus, applyCustomRange } = deps;
  let delegatedExportsBound = false;
  let dashboardBridgeDeferredLogged = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let bridgeRetryTimer = null;
  let bridgeRetryCount = 0;

  function scheduleBridgeRetry() {
    if (bridgeRetryTimer || bridgeRetryCount >= 40) return;
    bridgeRetryCount += 1;
    bridgeRetryTimer = setTimeout(() => {
      bridgeRetryTimer = null;
      initEventHandlers();
    }, 250);
  }

  function clearBridgeRetry() {
    if (!bridgeRetryTimer) return;
    clearTimeout(bridgeRetryTimer);
    bridgeRetryTimer = null;
  }

  function handleForcedChatSelection() {
    if (!chatSelector?.value) return;
    void handleChatSelectionChange({ target: chatSelector, force: true });
  }

  /**
   * @param {any} event
   */
  function handleNativeChatSelectionChange(event) {
    return handleChatSelectionChange(event);
  }

  /**
   * @param {any} event
   */
  function handleNativeRangeChange(event) {
    return handleRangeChange(event);
  }

  /**
   * @param {KeyboardEvent} event
   */
  function handleChatSelectorKeydown(event) {
    if (event.key !== "Enter" || !chatSelector?.value) return;
    event.preventDefault();
    handleForcedChatSelection();
  }

  async function handleCustomApplyClick() {
    const start = customStartInput?.value;
    const end = customEndInput?.value;
    if (!start || !end) {
      updateStatus("Please pick both a start and end date.", "warning");
      return;
    }
    await applyCustomRange(start, end);
  }

  /**
   * @param {HTMLElement | HTMLInputElement | HTMLSelectElement | null | undefined} controlEl
   */
  function hasLivePageControlRef(controlEl) {
    return Boolean(controlEl?.isConnected);
  }

  /**
   * @param {Element} button
   */
  function handleStatDownloadClick(button) {
    const type = /** @type {HTMLElement} */ (button).dataset.export;
    if (type) {
      exportMessageSubtype(type);
    }
  }

  /**
   * @param {HTMLElement | null | undefined} button
   * @param {(event?: any) => any} handler
   */
  function bindExportButton(button, handler) {
    if (!button) return;
    if (button.dataset.eventBindingsBound === "true") return;
    button.addEventListener("click", handler);
    button.dataset.eventBindingsBound = "true";
  }

  function initEventHandlers() {
    /**
     * @param {HTMLElement | null | undefined} buttonRef
     * @param {...string} ids
     */
    const resolveButton = (buttonRef, ...ids) => {
      if (buttonRef) return buttonRef;
      for (const id of ids) {
        const resolved = document.getElementById(id);
        if (resolved) return resolved;
      }
      return null;
    };
    const resolvedDownloadParticipantsButton = resolveButton(downloadParticipantsButton, "download-participants");
    const resolvedDownloadHourlyButton = resolveButton(downloadHourlyButton, "download-hourly");
    const resolvedDownloadDailyButton = resolveButton(downloadDailyButton, "download-daily");
    const resolvedDownloadWeeklyButton = resolveButton(downloadWeeklyButton, "download-weekly");
    const resolvedDownloadWeekdayButton = resolveButton(downloadWeekdayButton, "download-weekday");
    const resolvedDownloadTimeOfDayButton = resolveButton(downloadTimeOfDayButton, "download-timeofday");
    const resolvedDownloadMessageTypesButton = resolveButton(downloadMessageTypesButton, "download-message-types");
    const resolvedDownloadChatJsonButton = resolveButton(downloadChatJsonButton, "download-chat-json");
    const resolvedDownloadSentimentButton = resolveButton(downloadSentimentButton, "download-sentiment");
    const resolvedDownloadSearchButton = resolveButton(downloadSearchButton, "download-search-results", "download-search");
    const resolvedDownloadMarkdownButton = resolveButton(
      downloadMarkdownButton,
      "download-markdown-report",
      "download-markdown",
    );
    const resolvedDownloadSlidesButton = resolveButton(
      downloadSlidesButton,
      "download-slides-report",
      "download-slides",
    );
    const resolvedDownloadPdfButton = resolveButton(downloadPdfButton, "download-pdf");

    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
    const supportsShellActionDispatch =
      typeof shellBridge?.setShellActionHandlers === "function" &&
      typeof shellBridge?.dispatchShellAction === "function";
    if (!supportsShellActionDispatch) {
      scheduleBridgeRetry();
      return;
    }
    clearBridgeRetry();
    bridgeRetryCount = 0;
    const readPageControlState = () => shellBridge?.getPageControlState?.() ?? null;
    /** @param {Record<string, any>} nextState */
    const syncBridgePageControls = nextState => Boolean(shellBridge?.syncPageControls?.(nextState));
    shellBridge.setShellActionHandlers({
      "export.pdf": handleDownloadPdfReport,
      "export.markdown": handleDownloadMarkdownReport,
      "export.slides": handleDownloadSlidesReport,
      /** @param {Record<string, any> | null | undefined} payload */
      "page.chat.select": payload =>
        handleChatSelectionChange({ target: { value: payload?.value || "" } }),
      /** @param {Record<string, any> | null | undefined} payload */
      "page.chat.force-select": payload =>
        handleChatSelectionChange({ target: { value: payload?.value || "" }, force: true }),
      /** @param {Record<string, any> | null | undefined} payload */
      "page.range.select": payload => {
        const value = payload?.value || "";
        if (rangeSelect && rangeSelect.value !== value) {
          rangeSelect.value = value;
        }
        if (!rangeSelect) {
          syncBridgePageControls({ rangeValue: value });
        }
        return handleRangeChange({ target: { value } });
      },
      /** @param {Record<string, any> | null | undefined} payload */
      "page.range.apply-custom": async payload => {
        const pageControlState = readPageControlState();
        const start = payload?.start || customStartInput?.value || pageControlState?.customStart || "";
        const end = payload?.end || customEndInput?.value || pageControlState?.customEnd || "";
        if (!start || !end) {
          updateStatus("Please pick both a start and end date.", "warning");
          return;
        }
        await applyCustomRange(start, end);
      },
      /** @param {Record<string, any> | null | undefined} payload */
      "page.range.set-custom-start": payload => {
        const value = payload?.value || "";
        if (hasLivePageControlRef(customStartInput)) {
          customStartInput.value = value;
        } else {
          syncBridgePageControls({ customStart: value });
        }
      },
      /** @param {Record<string, any> | null | undefined} payload */
      "page.range.set-custom-end": payload => {
        const value = payload?.value || "";
        if (hasLivePageControlRef(customEndInput)) {
          customEndInput.value = value;
        } else {
          syncBridgePageControls({ customEnd: value });
        }
      },
    });

    const vueOwnsPageControlInteractions = Boolean(shellBridge?.ownsPageControlInteractions);
    if (!vueOwnsPageControlInteractions) {
      if (chatSelector && chatSelector.dataset.eventBindingsPageControlBound !== "true") {
        chatSelector.addEventListener("change", handleNativeChatSelectionChange);
        chatSelector.addEventListener("dblclick", handleForcedChatSelection);
        chatSelector.addEventListener("keydown", handleChatSelectorKeydown);
        chatSelector.dataset.eventBindingsPageControlBound = "true";
      }
      if (rangeSelect && rangeSelect.dataset.eventBindingsPageControlBound !== "true") {
        rangeSelect.addEventListener("change", handleNativeRangeChange);
        rangeSelect.dataset.eventBindingsPageControlBound = "true";
      }

      if (customApplyButton && customApplyButton.dataset.eventBindingsPageControlBound !== "true") {
        customApplyButton.addEventListener("click", handleCustomApplyClick);
        customApplyButton.dataset.eventBindingsPageControlBound = "true";
      }
    }

    bindExportButton(resolvedDownloadParticipantsButton, exportParticipants);
    bindExportButton(resolvedDownloadHourlyButton, exportHourly);
    bindExportButton(resolvedDownloadDailyButton, exportDaily);
    bindExportButton(resolvedDownloadWeeklyButton, exportWeekly);
    bindExportButton(resolvedDownloadWeekdayButton, exportWeekday);
    bindExportButton(resolvedDownloadTimeOfDayButton, exportTimeOfDay);
    bindExportButton(resolvedDownloadMessageTypesButton, exportMessageTypes);
    bindExportButton(resolvedDownloadChatJsonButton, exportChatJson);
    bindExportButton(resolvedDownloadSentimentButton, exportSentiment);
    bindExportButton(resolvedDownloadMarkdownButton, handleDownloadMarkdownReport);
    bindExportButton(resolvedDownloadSlidesButton, handleDownloadSlidesReport);
    bindExportButton(resolvedDownloadPdfButton, handleDownloadPdfReport);

    if (statDownloadButtons?.length) {
      statDownloadButtons.forEach(/** @param {Element} button */ function bindStatDownload(button) {
        if (button instanceof HTMLElement && button.dataset.eventBindingsBound === "true") return;
        button.addEventListener("click", () => handleStatDownloadClick(button));
        if (button instanceof HTMLElement) {
          button.dataset.eventBindingsBound = "true";
        }
      });
    }
    bindExportButton(resolvedDownloadSearchButton, exportSearchResults);

    if (!delegatedExportsBound) {
      delegatedExportsBound = true;
      /** @type {Record<string, (event?: any) => any>} */
      const delegatedExportHandlers = {
        "download-participants": exportParticipants,
        "download-hourly": exportHourly,
        "download-daily": exportDaily,
        "download-weekly": exportWeekly,
        "download-weekday": exportWeekday,
        "download-timeofday": exportTimeOfDay,
        "download-message-types": exportMessageTypes,
        "download-chat-json": exportChatJson,
        "download-sentiment": exportSentiment,
        "download-search-results": exportSearchResults,
        "download-search": exportSearchResults,
        "download-markdown-report": handleDownloadMarkdownReport,
        "download-slides-report": handleDownloadSlidesReport,
        "download-markdown": handleDownloadMarkdownReport,
        "download-slides": handleDownloadSlidesReport,
        "download-pdf": handleDownloadPdfReport,
      };
      document.addEventListener("click", createDelegatedExportFallbackHandler(delegatedExportHandlers));
    }

    mountDashboardPanelsIsland({ globalScope });
    const dashboardPanelsBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope });
    const vueOwnsParticipantInteractions =
      Boolean(dashboardPanelsBridge?.ownsParticipantInteractions)
      && typeof dashboardPanelsBridge?.setPanelActionHandlers === "function";
    const vueOwnsActivityFilterInteractions =
      Boolean(dashboardPanelsBridge?.ownsActivityFilterInteractions)
      && typeof dashboardPanelsBridge?.setPanelActionHandlers === "function";
    if (!vueOwnsParticipantInteractions || !vueOwnsActivityFilterInteractions) {
      if (!dashboardBridgeDeferredLogged) {
        dashboardBridgeDeferredLogged = true;
        console.info("Dashboard panels bridge pending; retrying event binding once stage mounts.");
      }
      scheduleBridgeRetry();
      return;
    }
    clearBridgeRetry();
    bridgeRetryCount = 0;
  }

  return {
    initEventHandlers,
  };
}
