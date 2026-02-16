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
      heroStatusBadge: runtimeRefs.heroStatusBadge,
      heroStatusCopy: runtimeRefs.heroStatusCopy,
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
    },
  };
}

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
