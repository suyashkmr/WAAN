// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   filterRefs: AnyRecord,
 *   dashboardRefs: AnyRecord,
 *   savedViewRefs: AnyRecord,
 *   searchRefs: AnyRecord,
 *   runtimeRefs: AnyRecord,
 *   state: AnyRecord,
 *   utils: AnyRecord,
 *   brandName: string,
 *   searchResultLimit: number,
 *   datasetEmptyStateManager: AnyRecord,
 *   setDatasetEmptyMessage: (...args: any[]) => void,
 * }} params
 */
export function buildControllerWiringArgs({
  filterRefs,
  dashboardRefs,
  savedViewRefs,
  searchRefs,
  runtimeRefs,
  state,
  utils,
  brandName,
  searchResultLimit,
  datasetEmptyStateManager,
  setDatasetEmptyMessage,
}) {
  return {
    dom: {
      ...filterRefs,
      ...dashboardRefs,
      ...savedViewRefs,
      ...searchRefs,
      vueRuntime: runtimeRefs.vueRuntime,
      heroStatusBadge: runtimeRefs.heroStatusBadge,
      heroStatusCopy: runtimeRefs.heroStatusCopy,
      heroStatusMetaCopy: runtimeRefs.heroStatusMetaCopy,
      heroSyncDot: runtimeRefs.heroSyncDot,
      heroMilestoneSteps: runtimeRefs.heroMilestoneSteps,
      themeToggleInputs: runtimeRefs.themeToggleInputs,
    },
    state,
    utils,
    constants: {
      brandName,
      searchResultLimit,
    },
    callbacks: {
      syncHeroPillsWithRange: () => {},
    },
    dataStatus: {
      datasetEmptyStateManager,
      setDatasetEmptyMessage,
      updateStatus: state.updateStatus,
    },
  };
}

/**
 * @param {{
 *   filterRefs: AnyRecord,
 *   runtimeRefs: AnyRecord,
 *   relayRefs: AnyRecord,
 *   state: AnyRecord,
 *   utils: AnyRecord,
 *   analytics: AnyRecord,
 *   brandName: string,
 *   apiBase: string,
 *   wiring: AnyRecord,
 *   electronAPI: AnyRecord,
 * }} params
 */
export function buildCompositionAssemblyArgs({
  filterRefs,
  runtimeRefs,
  relayRefs,
  state,
  utils,
  analytics,
  brandName,
  apiBase,
  wiring,
  electronAPI,
}) {
  return {
    dom: {
      rangeSelect: filterRefs.rangeSelect,
      globalProgressEl: runtimeRefs.globalProgressEl,
      globalProgressLabel: runtimeRefs.globalProgressLabel,
      ...relayRefs,
    },
    state,
    utils,
    analytics,
    constants: {
      brandName,
      apiBase,
    },
    wiring,
    electronAPI,
  };
}
