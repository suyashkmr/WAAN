import {
  SECTION_NAV_ITEMS,
  SEARCH_RESULT_LIMIT,
  ONBOARDING_STEPS,
} from "./appConstants.js";
import * as appState from "./state.js";
import {
  API_BASE,
  BRAND_NAME,
  RELAY_SERVICE_NAME,
  STATUS_AUTO_HIDE_DELAY_MS,
  STATUS_EXIT_DURATION_MS,
  motionPreferenceQuery,
  initialReduceMotionPreferred,
} from "./config.js";
import { createDatasetEmptyStateManager } from "./appShell/datasetEmptyState.js";
import {
  createAppDomRefs,
  fetchJson,
  COMPACT_STORAGE_KEY,
  REDUCE_MOTION_STORAGE_KEY,
  HIGH_CONTRAST_STORAGE_KEY,
} from "./appShell/index.js";
import { bootstrapAppShellRuntime } from "./appShell/runtimeBootstrap.js";
import { createAppControllerWiring } from "./appShell/controllerWiring.js";
import { createAppCompositionAssembly } from "./appShell/compositionAssembly.js";
import { createAppDomRefGroups } from "./appShell/domRefGroups.js";
import { createRuntimeBootstrapConfig } from "./appShell/runtimeBootstrapConfig.js";
import { buildControllerWiringArgs, buildCompositionAssemblyArgs } from "./appShell/entryConfig.js";
import {
  createCompositionAssemblyWiring,
  createRuntimeHandlers,
  createRuntimeDeps,
  createDatasetEmptyButtons,
} from "./appShell/assemblyWiring.js";
import {
  createControllerWiringConfig,
  createCompositionAssemblyConfig,
} from "./appShell/compositionConfig.js";

const appDomRefs = createAppDomRefs({
  documentRef: document,
  windowRef: window,
  storageRef: globalThis.localStorage,
  vueRuntime: globalThis.Vue,
});
const {
  runtimeRefs,
  relayRefs,
  filterRefs,
  dashboardRefs,
  exportRefs,
  savedViewRefs,
  searchRefs,
} = createAppDomRefGroups(appDomRefs);

const {
  statusEl,
  toastContainer,
  compactToggleButton,
  reduceMotionToggle,
  highContrastToggle,
  onboardingOverlay,
  onboardingCopyEl,
  onboardingStepLabel,
  onboardingSkipButton,
  onboardingNextButton,
  sectionNavInner,
} = runtimeRefs;

const datasetEmptyStateManager = createDatasetEmptyStateManager({
  calloutEl: runtimeRefs.datasetEmptyCallout,
  headingEl: runtimeRefs.datasetEmptyHeading,
  copyEl: runtimeRefs.datasetEmptyCopy,
  buttons: createDatasetEmptyButtons(exportRefs),
});
const setDatasetEmptyMessage = datasetEmptyStateManager.setMessage;
const controllerWiring = createAppControllerWiring(
  buildControllerWiringArgs({
    ...createControllerWiringConfig({
      filterRefs,
      dashboardRefs,
      savedViewRefs,
      searchRefs,
      runtimeRefs,
      stateStore: appState,
      brandName: BRAND_NAME,
      searchResultLimit: SEARCH_RESULT_LIMIT,
      datasetEmptyStateManager,
      setDatasetEmptyMessage,
    }),
  }),
);

const compositionAssemblyWiring = createCompositionAssemblyWiring(controllerWiring);

const compositionAssembly = createAppCompositionAssembly(
  buildCompositionAssemblyArgs({
    ...createCompositionAssemblyConfig({
      filterRefs,
      runtimeRefs,
      relayRefs,
      stateStore: appState,
      setDatasetEmptyMessage,
      fetchJson,
      brandName: BRAND_NAME,
      apiBase: API_BASE,
      wiring: compositionAssemblyWiring,
      electronAPI: window.electronAPI,
    }),
  }),
);

const runtimeHandlers = createRuntimeHandlers({
  controllerWiring,
  compositionAssembly,
  stateStore: appState,
});
const runtimeDeps = createRuntimeDeps({
  controllerWiring,
  stateStore: appState,
});

bootstrapAppShellRuntime(
  createRuntimeBootstrapConfig({
    filterRefs,
    exportRefs,
    dashboardRefs,
    relayRefs,
    runtimeRefs,
    handlers: runtimeHandlers,
    deps: runtimeDeps,
    globalScope: globalThis,
    relayServiceName: RELAY_SERVICE_NAME,
    statusConfig: {
      setStatusCallback: appState.setStatusCallback,
      statusEl,
      toastContainer,
      autoHideDelayMs: STATUS_AUTO_HIDE_DELAY_MS,
      exitDurationMs: STATUS_EXIT_DURATION_MS,
    },
    sectionNavConfig: {
      containerEl: sectionNavInner,
      navItemsConfig: SECTION_NAV_ITEMS,
      documentRef: document,
      windowRef: window,
      vueRuntime: globalThis.Vue,
    },
    compactConfig: {
      toggle: compactToggleButton,
      storageKey: COMPACT_STORAGE_KEY,
    },
    accessibilityConfig: {
      reduceMotionToggle,
      highContrastToggle,
      motionPreferenceQuery,
      initialReduceMotionPreferred,
      reduceMotionStorageKey: REDUCE_MOTION_STORAGE_KEY,
      highContrastStorageKey: HIGH_CONTRAST_STORAGE_KEY,
    },
    onboardingConfig: {
      overlayEl: onboardingOverlay,
      copyEl: onboardingCopyEl,
      stepLabelEl: onboardingStepLabel,
      skipButtonEl: onboardingSkipButton,
      nextButtonEl: onboardingNextButton,
      steps: ONBOARDING_STEPS,
      documentRef: document,
      storageRef: globalThis.localStorage,
    },
    keyboardDeps: {
      syncRelayChats: compositionAssembly.syncRelayChats,
      isLogDrawerOpen: compositionAssembly.isLogDrawerOpen,
      closeLogDrawer: compositionAssembly.closeLogDrawer,
      openLogDrawer: compositionAssembly.openLogDrawer,
    },
  }),
);
