// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
import { mountDashboardPanelsIsland } from "../vue/dashboardPanelsIsland.js";
import { syncPrimeDateBridgeValue } from "../vue/primeDateBridge.js";
import { syncPrimeSelectBridgeValue } from "../vue/primeSelectBridge.js";

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

  const {
    updateStatus,
    applyCustomRange,
  } = deps;

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
   * @param {Element} button
   */
  function handleStatDownloadClick(button) {
    const type = /** @type {HTMLElement} */ (button).dataset.export;
    if (type) {
      exportMessageSubtype(type);
    }
  }

  function initEventHandlers() {
    const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
    const supportsShellActionDispatch =
      typeof shellBridge?.setShellActionHandlers === "function" &&
      typeof shellBridge?.dispatchShellAction === "function";
    if (!supportsShellActionDispatch) {
      throw new Error("Shell bridge dispatch contracts are required for event bindings.");
    }
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
        syncPrimeSelectBridgeValue({
          selectEl: rangeSelect,
          value,
          disabled: rangeSelect?.disabled,
        });
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
        if (customStartInput) {
          customStartInput.value = value;
        } else {
          syncBridgePageControls({ customStart: value });
        }
        syncPrimeDateBridgeValue({
          inputEl: customStartInput,
          value,
          disabled: customStartInput?.disabled,
          min: customStartInput?.min,
          max: customStartInput?.max,
        });
      },
      /** @param {Record<string, any> | null | undefined} payload */
      "page.range.set-custom-end": payload => {
        const value = payload?.value || "";
        if (customEndInput) {
          customEndInput.value = value;
        } else {
          syncBridgePageControls({ customEnd: value });
        }
        syncPrimeDateBridgeValue({
          inputEl: customEndInput,
          value,
          disabled: customEndInput?.disabled,
          min: customEndInput?.min,
          max: customEndInput?.max,
        });
      },
    });

    const vueOwnsPageControlInteractions = Boolean(shellBridge?.ownsPageControlInteractions);
    if (!vueOwnsPageControlInteractions) {
      if (chatSelector) {
        chatSelector.addEventListener("change", handleNativeChatSelectionChange);
        chatSelector.addEventListener("dblclick", handleForcedChatSelection);
        chatSelector.addEventListener("keydown", handleChatSelectorKeydown);
        chatSelector.dataset.eventBindingsPageControlBound = "true";
      }
      if (rangeSelect) {
        rangeSelect.addEventListener("change", handleNativeRangeChange);
        rangeSelect.dataset.eventBindingsPageControlBound = "true";
      }

      if (customApplyButton) {
        customApplyButton.addEventListener("click", handleCustomApplyClick);
        customApplyButton.dataset.eventBindingsPageControlBound = "true";
      }
    }

    if (downloadParticipantsButton) {
      downloadParticipantsButton.addEventListener("click", exportParticipants);
    }
    if (downloadHourlyButton) {
      downloadHourlyButton.addEventListener("click", exportHourly);
    }
    if (downloadDailyButton) {
      downloadDailyButton.addEventListener("click", exportDaily);
    }
    if (downloadWeeklyButton) {
      downloadWeeklyButton.addEventListener("click", exportWeekly);
    }
    if (downloadWeekdayButton) {
      downloadWeekdayButton.addEventListener("click", exportWeekday);
    }
    if (downloadTimeOfDayButton) {
      downloadTimeOfDayButton.addEventListener("click", exportTimeOfDay);
    }
    if (downloadMessageTypesButton) {
      downloadMessageTypesButton.addEventListener("click", exportMessageTypes);
    }
    if (downloadChatJsonButton) {
      downloadChatJsonButton.addEventListener("click", exportChatJson);
    }
    if (downloadSentimentButton) {
      downloadSentimentButton.addEventListener("click", exportSentiment);
    }

    if (statDownloadButtons?.length) {
      statDownloadButtons.forEach(
        /** @param {Element} button */ function bindStatDownload(button) {
        button.addEventListener("click", () => handleStatDownloadClick(button));
      });
    }

    if (downloadSearchButton) {
      downloadSearchButton.addEventListener("click", exportSearchResults);
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
      throw new Error("Dashboard panels bridge interaction ownership is required.");
    }
  }

  return {
    initEventHandlers,
  };
}
