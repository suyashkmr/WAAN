// @ts-check

import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";

/**
 * @param {{ elements: Record<string, any>, vueRuntime?: any, globalScope?: any }} params
 */
export function createRelayStatusViewRenderer({
  elements,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const {
    relayBannerMessage,
    relayBannerMeta,
    relayOnboardingStepDetails = null,
  } = elements;

  function getVueRuntime() {
    const candidate = vueRuntime ?? /** @type {any} */ (globalScope)?.Vue ?? null;
    return candidate && typeof candidate.h === "function" && typeof candidate.render === "function" ? candidate : null;
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
     * @param {{ message?: string, meta?: string }} payload
     */
    renderBanner({ message = "", meta = "" } = {}) {
      renderText(relayBannerMessage, message);
      renderText(relayBannerMeta, meta);
    },

    /**
     * @param {string} stepId
     * @param {string} text
     * @param {HTMLElement | null | undefined} fallbackEl
     */
    renderOnboardingDetail(stepId, text, fallbackEl = null) {
      const explicitEl = relayOnboardingStepDetails?.[stepId] ?? null;
      renderText(explicitEl || fallbackEl, text);
    },
  };
}
