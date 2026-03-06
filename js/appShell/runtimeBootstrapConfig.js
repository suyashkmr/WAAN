// @ts-check

import {
  createRuntimeEventBindings,
  createRuntimeBootstrapDeps,
} from "./runtimeConfig.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   filterRefs: AnyRecord,
 *   exportRefs: AnyRecord,
 *   dashboardRefs: AnyRecord,
 *   relayRefs: AnyRecord,
 *   runtimeRefs: AnyRecord,
 *   handlers: AnyRecord,
 *   deps: AnyRecord,
 *   globalScope?: any,
 *   relayServiceName: string,
 *   statusConfig: AnyRecord,
 *   sectionNavConfig: AnyRecord,
 *   compactConfig: AnyRecord,
 *   accessibilityConfig: AnyRecord,
 *   onboardingConfig: AnyRecord,
 *   keyboardDeps: AnyRecord,
 * }} params
 */
export function createRuntimeBootstrapConfig({
  filterRefs,
  exportRefs,
  dashboardRefs,
  relayRefs,
  runtimeRefs,
  handlers,
  deps,
  globalScope = globalThis,
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
    globalScope,
  });

  const runtimeBootstrapDeps = createRuntimeBootstrapDeps({
    deps: {
      initRelayControls: handlers.initRelayControls,
      initThemeControls: handlers.initThemeControls,
      setThemePreference: handlers.setThemePreference,
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
