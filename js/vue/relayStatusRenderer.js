// @ts-check

import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, vueRuntime?: any, globalScope?: any }} params
 */
export function createRelayStatusRenderer({
  elements,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const {
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
  } = elements;

  function getVueRuntime() {
    const candidate = vueRuntime ?? /** @type {any} */ (globalScope)?.Vue ?? null;
    const canRender = Boolean(candidate && typeof candidate.h === "function" && typeof candidate.render === "function");
    return canRender ? candidate : null;
  }

  /**
   * @param {HTMLElement | null | undefined} el
   * @param {string} text
   */
  function renderText(el, text) {
    if (!el) return;
    const runtime = getVueRuntime();
    if (!runtime) {
      el.textContent = text;
      return;
    }
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
      if (relayQrContainer) {
        relayQrContainer.classList.toggle("hidden", !qrSrc);
      }
    },
  };
}
