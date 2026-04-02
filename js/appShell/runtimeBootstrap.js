// @ts-check

import { createCompactModeManager, createAccessibilityController } from "./preferences.js";
import { createOnboardingController } from "./onboarding.js";
import { createStatusUiController } from "./statusUi.js";
import { createSectionNavController } from "./sectionNav.js";
import { createKeyboardShortcutsController } from "./keyboardShortcuts.js";
import { setupAppBootstrap } from "./bootstrapApp.js";
import { initWindowToasts } from "./constants.js";
import {
  ACTIVE_STAGE_CHANGED_EVENT,
  EXPORT_SUCCESS_EVENT,
  PRIMARY_EXPORT_BUTTON_IDS,
} from "../appConstants.js";
import { prefersReducedMotion } from "../ui/magnetic.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 * @typedef {{ elements: AnyRecord, handlers: AnyRecord, deps: AnyRecord }} RuntimeEventBindingsConfig
 */

/**
 * @param {{
 *   statusConfig: AnyRecord,
 *   sectionNavConfig: AnyRecord,
 *   compactConfig: AnyRecord,
 *   accessibilityConfig: AnyRecord,
 *   onboardingConfig: AnyRecord,
 *   keyboardDeps: AnyRecord,
 *   eventBindings: RuntimeEventBindingsConfig,
 *   bootstrapDeps: AnyRecord,
 * }} params
 */
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
  const glintAllowedButtonIds = new Set(PRIMARY_EXPORT_BUTTON_IDS);
  if (sectionNavConfig.windowRef && typeof sectionNavConfig.windowRef.addEventListener === "function") {
    const windowRef = sectionNavConfig.windowRef;
    if (!windowRef.__waanExportGlintBound) {
      windowRef.__waanExportGlintBound = true;
      windowRef.addEventListener(EXPORT_SUCCESS_EVENT, /** @param {CustomEvent<{ buttonId?: string }>} event */ event => {
        if (prefersReducedMotion(windowRef)) return;
        const buttonId = event?.detail?.buttonId;
        if (typeof buttonId !== "string" || !glintAllowedButtonIds.has(buttonId)) return;
        const button = sectionNavConfig.documentRef?.getElementById?.(buttonId);
        if (!(button instanceof HTMLElement)) return;
        button.classList.remove("wa-export-glint");
        void button.offsetWidth;
        button.classList.add("wa-export-glint");
        const clear = () => button.classList.remove("wa-export-glint");
        button.addEventListener("animationend", clear, { once: true });
        windowRef.setTimeout(clear, 1000);
      });
    }
  }

  /** @type {Record<string, Array<{ id: string, label: string }>> | null} */
  const navItemsByStage = sectionNavConfig.navItemsByStage ?? null;
  const defaultStage = sectionNavConfig.initialStage ?? "workspace";
  /**
   * @param {string} stage
   */
  const resolveNavItems = stage => {
    if (navItemsByStage && Array.isArray(navItemsByStage[stage])) {
      return navItemsByStage[stage];
    }
    return sectionNavConfig.navItemsConfig ?? [];
  };

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
    navItemsConfig: resolveNavItems(defaultStage),
    documentRef: sectionNavConfig.documentRef,
    windowRef: sectionNavConfig.windowRef,
    vueRuntime: sectionNavConfig.vueRuntime,
  });
  const { buildSectionNav, setupSectionNavTracking, rebuildSectionNav } = sectionNavController;

  if (sectionNavConfig.windowRef && typeof sectionNavConfig.windowRef.addEventListener === "function") {
    sectionNavConfig.windowRef.addEventListener(ACTIVE_STAGE_CHANGED_EVENT, /** @param {CustomEvent<{ stage?: string }>} event */ event => {
      const stage = event?.detail?.stage;
      if (typeof stage !== "string" || !stage) return;
      rebuildSectionNav(resolveNavItems(stage));
    });
  }

  const { apply: applyCompactMode, init: initCompactMode, toggleCompactMode } = createCompactModeManager(
    /** @type {any} */ ({
      toggle: compactConfig.toggle,
      storageKey: compactConfig.storageKey,
      showToast,
    }),
  );

  const accessibilityController = createAccessibilityController(
    /** @type {any} */ ({
      reduceMotionToggle: accessibilityConfig.reduceMotionToggle,
      highContrastToggle: accessibilityConfig.highContrastToggle,
      motionPreferenceQuery: accessibilityConfig.motionPreferenceQuery,
      initialReduceMotionPreferred: accessibilityConfig.initialReduceMotionPreferred,
      showToast,
      reduceMotionStorageKey: accessibilityConfig.reduceMotionStorageKey,
      highContrastStorageKey: accessibilityConfig.highContrastStorageKey,
    }),
  );
  const {
    initAccessibilityControls,
    cycleReduceMotionPreference,
    toggleHighContrastPreference,
  } = accessibilityController;

  const onboardingController = createOnboardingController({
    overlayEl: onboardingConfig.overlayEl,
    copyEl: onboardingConfig.copyEl,
    stepLabelEl: onboardingConfig.stepLabelEl,
    nextButtonEl: onboardingConfig.nextButtonEl,
    steps: onboardingConfig.steps,
    documentRef: onboardingConfig.documentRef,
    storageRef: onboardingConfig.storageRef,
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

  const bootstrapRuntime = setupAppBootstrap({
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
        toggleCompactMode,
        cycleReduceMotionPreference,
        toggleHighContrastPreference,
        onboardingController,
        buildSectionNav,
        setupSectionNavTracking,
        prefersReducedMotion: () => accessibilityController.prefersReducedMotion(),
      },
    },
  });

  if (sectionNavConfig.windowRef && typeof sectionNavConfig.windowRef.addEventListener === "function") {
    sectionNavConfig.windowRef.addEventListener(ACTIVE_STAGE_CHANGED_EVENT, () => {
      bootstrapRuntime?.initEventHandlers?.();
    });
  }
}
