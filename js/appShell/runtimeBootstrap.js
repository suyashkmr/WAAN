import { createCompactModeManager, createAccessibilityController } from "../ui.js";
import { createOnboardingController } from "./onboarding.js";
import { createStatusUiController } from "./statusUi.js";
import { createSectionNavController } from "./sectionNav.js";
import { createKeyboardShortcutsController } from "./keyboardShortcuts.js";
import { setupAppBootstrap } from "./bootstrapApp.js";
import { initWindowToasts } from "./constants.js";

export function bootstrapAppShellRuntime({
  statusConfig,
  sectionNavConfig,
  compactConfig,
  accessibilityConfig,
  onboardingConfig,
  keyboardDeps,
  eventBindings,
  bootstrapDeps,
}) {
  initWindowToasts();
  const statusUiController = createStatusUiController({
    statusEl: statusConfig.statusEl,
    toastContainer: statusConfig.toastContainer,
    autoHideDelayMs: statusConfig.autoHideDelayMs,
    exitDurationMs: statusConfig.exitDurationMs,
  });
  const { showToast, showStatusMessage } = statusUiController;

  const sectionNavController = createSectionNavController({
    containerEl: sectionNavConfig.containerEl,
    navItemsConfig: sectionNavConfig.navItemsConfig,
  });
  const { buildSectionNav, setupSectionNavTracking } = sectionNavController;

  const { apply: applyCompactMode, init: initCompactMode } = createCompactModeManager({
    toggle: compactConfig.toggle,
    storageKey: compactConfig.storageKey,
    showToast,
  });

  const accessibilityController = createAccessibilityController({
    reduceMotionToggle: accessibilityConfig.reduceMotionToggle,
    highContrastToggle: accessibilityConfig.highContrastToggle,
    motionPreferenceQuery: accessibilityConfig.motionPreferenceQuery,
    initialReduceMotionPreferred: accessibilityConfig.initialReduceMotionPreferred,
    showToast,
    reduceMotionStorageKey: accessibilityConfig.reduceMotionStorageKey,
    highContrastStorageKey: accessibilityConfig.highContrastStorageKey,
  });
  const { initAccessibilityControls } = accessibilityController;

  const onboardingController = createOnboardingController({
    overlayEl: onboardingConfig.overlayEl,
    copyEl: onboardingConfig.copyEl,
    stepLabelEl: onboardingConfig.stepLabelEl,
    nextButtonEl: onboardingConfig.nextButtonEl,
    steps: onboardingConfig.steps,
  });

  const keyboardShortcutsController = createKeyboardShortcutsController({
    deps: {
      ...keyboardDeps,
      applyCompactMode,
      showToast,
      onboardingController,
    },
  });
  const { initKeyboardShortcuts } = keyboardShortcutsController;

  setupAppBootstrap({
    status: {
      setStatusCallback: statusConfig.setStatusCallback,
      statusEl: statusConfig.statusEl,
      showStatusMessage,
      showToast,
    },
    keyboardShortcuts: {
      initKeyboardShortcuts,
    },
    eventBindings,
    bootstrap: {
      elements: {
        onboardingSkipButton: onboardingConfig.skipButtonEl,
        onboardingNextButton: onboardingConfig.nextButtonEl,
      },
      deps: {
        ...bootstrapDeps,
        initCompactMode,
        initAccessibilityControls,
        onboardingController,
        buildSectionNav,
        setupSectionNavTracking,
        prefersReducedMotion: () => accessibilityController.prefersReducedMotion(),
      },
    },
  });
}
