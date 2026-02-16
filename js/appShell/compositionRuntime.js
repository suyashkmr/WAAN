import { createDashboardRenderController } from "./dashboardRender.js";
import { createDatasetLifecycleController } from "./datasetLifecycle.js";

export function createDashboardRuntime({ elements, deps }) {
  let participantView = [];
  const controller = createDashboardRenderController({
    elements,
    deps: {
      ...deps,
      setParticipantView: next => {
        participantView = next;
      },
    },
  });

  return {
    controller,
    getParticipantView: () => participantView,
  };
}

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
