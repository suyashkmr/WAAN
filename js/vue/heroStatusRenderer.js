// @ts-check

import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, vueRuntime?: any, globalScope?: any }} params
 */
export function createHeroStatusRenderer({
  elements,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const {
    dashboardRoot,
    heroStatusBadge,
    heroStatusCopy,
    heroStatusMetaCopy,
    heroSyncDot,
    heroMilestoneSteps,
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
     * @param {boolean} isLoading
     */
    setDashboardLoadingState(isLoading) {
      dashboardRoot?.classList.toggle("is-loading", Boolean(isLoading));
    },

    /**
     * @param {boolean} isSyncing
     */
    setDashboardSyncState(isSyncing) {
      dashboardRoot?.classList.toggle("is-syncing", Boolean(isSyncing));
    },

    /**
     * @param {{ state?: string, message?: string }} [params]
     */
    renderSyncMeta({ state = "idle", message = "Awaiting relay." } = {}) {
      if (heroSyncDot) heroSyncDot.dataset.state = state;
      renderText(heroStatusMetaCopy, message);
    },

    /**
     * @param {{ text?: string, state?: string, readyCelebrating?: boolean }} [params]
     */
    renderBadge({ text = "", state = "offline", readyCelebrating = false } = {}) {
      if (heroStatusBadge) {
        heroStatusBadge.dataset.state = state;
        heroStatusBadge.classList.toggle("hero-status-badge-ready", Boolean(readyCelebrating));
      }
      renderText(heroStatusBadge, text);
    },

    /**
     * @param {string} text
     */
    renderCopy(text) {
      renderText(heroStatusCopy, text);
    },

    /**
     * @param {{ connect?: string, sync?: string, ready?: string, readyCelebrating?: boolean }} [params]
     */
    renderMilestones({ connect = "pending", sync = "pending", ready = "pending", readyCelebrating = false } = {}) {
      if (!heroMilestoneSteps?.length) return;
      heroMilestoneSteps.forEach(/** @param {HTMLElement} step */ step => {
        const id = step.dataset.step;
        if (id === "connect") step.dataset.state = connect;
        if (id === "sync") step.dataset.state = sync;
        if (id === "ready") {
          step.dataset.state = ready;
          step.classList.toggle("is-ready-celebration", Boolean(readyCelebrating));
        }
      });
    },
  };
}
