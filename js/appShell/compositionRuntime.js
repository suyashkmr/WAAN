// @ts-check

import { createDashboardRenderController } from "./dashboardRender.js";
import { createDatasetLifecycleController } from "./datasetLifecycle.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
export function createDashboardRuntime({ elements, deps }) {
  /** @type {any[]} */
  let participantView = [];
  const controller = createDashboardRenderController({
    elements,
    deps: {
      ...deps,
      setParticipantView: /** @param {any[]} next */ next => {
        participantView = next;
      },
    },
  });

  return {
    controller,
    getParticipantView: () => participantView,
  };
}

/**
 * @param {{ rangeSelect: any, deps: AnyRecord }} params
 */
export function createDatasetLifecycleRuntime({ rangeSelect, deps }) {
  const controller = createDatasetLifecycleController({
    elements: { rangeSelect },
    deps,
  });
  return {
    controller,
    applyEntriesToApp: controller.applyEntriesToApp,
  };
}
