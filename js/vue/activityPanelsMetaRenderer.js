// @ts-check

import { clearContainerForVueRenderOnce } from "./renderMountUtils.js";

/**
 * @param {{ elements: Record<string, any>, vueRuntime: any }} params
 */
export function createActivityPanelsMetaRenderer({
  elements,
  vueRuntime,
}) {
  const {
    hourlyTopHourEl,
    hourlyBrushStartLabel,
    hourlyBrushEndLabel,
    weekdayHourStartLabel,
    weekdayHourEndLabel,
    timeOfDayHourStartLabel,
    timeOfDayHourEndLabel,
  } = elements;

  function getVueRuntime() {
    const canRender = Boolean(vueRuntime && typeof vueRuntime.h === "function" && typeof vueRuntime.render === "function");
    if (!canRender) {
      throw new Error("createActivityPanelsMetaRenderer requires a Vue runtime with h/render");
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

  /**
   * @param {HTMLElement | null | undefined} startEl
   * @param {HTMLElement | null | undefined} endEl
   * @param {{ start?: string, end?: string }} labels
   */
  function renderLabelPair(startEl, endEl, { start = "", end = "" } = {}) {
    renderText(startEl, start);
    renderText(endEl, end);
  }

  return {
    /** @param {string} text */
    renderHourlyTopHour(text) {
      renderText(hourlyTopHourEl, text);
    },
    /** @param {{ start?: string, end?: string }} labels */
    renderHourlyBrushLabels(labels) {
      renderLabelPair(hourlyBrushStartLabel, hourlyBrushEndLabel, labels);
    },
    /** @param {{ start?: string, end?: string }} labels */
    renderWeekdayBrushLabels(labels) {
      renderLabelPair(weekdayHourStartLabel, weekdayHourEndLabel, labels);
    },
    /** @param {{ start?: string, end?: string }} labels */
    renderTimeOfDayBrushLabels(labels) {
      renderLabelPair(timeOfDayHourStartLabel, timeOfDayHourEndLabel, labels);
    },
  };
}
