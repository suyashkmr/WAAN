import {
  createRuntimeEventBindings,
  createRuntimeBootstrapDeps,
} from "./runtimeConfig.js";

export function createRuntimeBootstrapConfig({
  filterRefs,
  exportRefs,
  dashboardRefs,
  relayRefs,
  runtimeRefs,
  handlers,
  deps,
  relayServiceName,
  statusConfig,
  sectionNavConfig,
  compactConfig,
  accessibilityConfig,
  onboardingConfig,
  keyboardDeps,
}) {
  const runtimeEventBindings = createRuntimeEventBindings({
    filterRefs,
    exportRefs,
    dashboardRefs,
    handlers,
    deps,
  });

  const runtimeBootstrapDeps = createRuntimeBootstrapDeps({
    deps: {
      initRelayControls: handlers.initRelayControls,
      initThemeControls: handlers.initThemeControls,
      setDataAvailabilityState: handlers.setDataAvailabilityState,
      startRelaySession: handlers.startRelaySession,
      stopRelaySession: handlers.stopRelaySession,
      searchController: handlers.searchController,
      savedViewsController: handlers.savedViewsController,
      getDataAvailable: handlers.getDataAvailable,
      refreshChatSelector: handlers.refreshChatSelector,
      updateStatus: handlers.updateStatus,
    },
    relayServiceName,
  });

  return {
    statusConfig,
    sectionNavConfig,
    compactConfig,
    accessibilityConfig,
    onboardingConfig,
    keyboardDeps,
    eventBindings: runtimeEventBindings,
    bootstrapDeps: runtimeBootstrapDeps,
    relayRefs,
    runtimeRefs,
  };
}
