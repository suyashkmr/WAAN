// @ts-check

import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, vueRuntime: any }} params
 */
export function createRelayStatusRenderer({
  elements,
  vueRuntime,
}) {
  /**
   * @param {HTMLElement | null | undefined} el
   * @param {boolean} shouldShow
   */
  function setElementVisibility(el, shouldShow) {
    if (!el) return;
    el.classList.toggle("hidden", !shouldShow);
    if (shouldShow) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  const {
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
  } = elements;

  function getVueRuntime() {
    const canRender = Boolean(vueRuntime && typeof vueRuntime.h === "function" && typeof vueRuntime.render === "function");
    if (!canRender) {
      throw new Error("createRelayStatusRenderer requires a Vue runtime with h/render");
    }
    return vueRuntime;
  }

  /**
   * @param {HTMLElement | null | undefined} el
   * @param {string} text
   */
  function renderText(el, text) {
    if (!el) return;
    const runtime = getVueRuntime();
    const { h, render } = runtime;
    clearContainerForVueRenderOnce(el);
    render(text ? h("span", null, text) : null, el);
  }

  return {
    /**
     * @param {{ statusText?: string, accountText?: string, helpText?: string, qrSrc?: string | null }} [params]
     */
    renderStatusSurface({
      statusText = "",
      accountText = "",
      helpText = "",
      qrSrc = null,
    } = {}) {
      renderText(relayStatusEl, statusText);
      renderText(relayAccountEl, accountText);
      renderText(relayHelpText, helpText);

      if (relayQrImage) {
        if (qrSrc) relayQrImage.src = qrSrc;
        else relayQrImage.removeAttribute("src");
      }
      setElementVisibility(relayQrContainer, Boolean(qrSrc));
    },
  };
}
