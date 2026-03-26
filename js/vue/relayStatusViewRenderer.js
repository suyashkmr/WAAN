// @ts-check

import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";

/**
 * @param {{ elements: Record<string, any>, vueRuntime: any }} params
 */
export function createRelayStatusViewRenderer({
  elements,
  vueRuntime,
}) {
  const {
    relayBannerMessage,
    relayBannerMeta,
  } = elements;

  function getVueRuntime() {
    const canRender = Boolean(vueRuntime && typeof vueRuntime.h === "function" && typeof vueRuntime.render === "function");
    if (!canRender) {
      throw new Error("createRelayStatusViewRenderer requires a Vue runtime with h/render");
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
     * @param {{ message?: string, meta?: string }} payload
     */
    renderBanner({ message = "", meta = "" } = {}) {
      renderText(relayBannerMessage, message);
      renderText(relayBannerMeta, meta);
    },
  };
}
