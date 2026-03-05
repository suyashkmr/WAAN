const defaultDocument = typeof document !== "undefined" ? document : null;

function resolveDefaultStorage() {
  try {
    if (typeof globalThis.localStorage === "undefined") return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createCompactModeManager({
  toggle,
  storageKey = "waan-compact-mode",
  showToast,
  documentRef = defaultDocument,
  storageRef = null,
} = {}) {
  const resolvedStorage = storageRef ?? resolveDefaultStorage();
  const apply = enabled => {
    if (documentRef?.body) {
      documentRef.body.dataset.compact = enabled ? "true" : "false";
    }
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.textContent = enabled ? "Comfort mode" : "Compact mode";
    }
    try {
      resolvedStorage?.setItem(storageKey, enabled ? "true" : "false");
    } catch (error) {
      console.warn("Unable to persist compact mode preference.", error);
    }
  };

  const toggleCompactMode = ({ showUserToast = true } = {}) => {
    const next = !(documentRef?.body?.dataset.compact === "true");
    apply(next);
    if (showUserToast && typeof showToast === "function") {
      showToast(next ? "Compact mode enabled." : "Comfort mode enabled.", "info", { duration: 3000 });
    }
    return next;
  };

  const init = ({ bindToggleListener = true } = {}) => {
    let enabled = false;
    try {
      enabled = resolvedStorage?.getItem(storageKey) === "true";
    } catch (error) {
      console.warn("Unable to read compact mode preference.", error);
    }
    apply(enabled);
    if (bindToggleListener) {
      toggle?.addEventListener("click", () => {
        toggleCompactMode();
      });
    }
  };

  return { apply, init, toggleCompactMode };
}

export function createAccessibilityController({
  reduceMotionToggle,
  highContrastToggle,
  motionPreferenceQuery,
  initialReduceMotionPreferred = false,
  showToast,
  reduceMotionStorageKey = "waan-reduce-motion",
  highContrastStorageKey = "waan-high-contrast",
  documentRef = defaultDocument,
  storageRef = null,
} = {}) {
  const resolvedStorage = storageRef ?? resolveDefaultStorage();
  let reduceMotionPreferred = initialReduceMotionPreferred;
  let reduceMotionPreference = null;

  const shouldReduceMotion = () => {
    if (reduceMotionPreference === "reduce") return true;
    if (reduceMotionPreference === "standard") return false;
    return reduceMotionPreferred;
  };

  const prefersReducedMotion = () => shouldReduceMotion();

  const updateMotionToggleUI = () => {
    if (!reduceMotionToggle) return;
    const systemPrefersReduced = reduceMotionPreferred;
    let text = "Motion: Standard";
    let title = "Animations and depth effects are enabled.";
    let ariaPressed = "mixed";
    if (reduceMotionPreference === "reduce") {
      text = "Motion: Reduced";
      title = "Animations and blurs are minimized for accessibility.";
      ariaPressed = "true";
    } else if (reduceMotionPreference === "standard") {
      text = "Motion: Standard";
      title = "Animations and depth effects are enabled.";
      ariaPressed = "false";
    } else {
      text = systemPrefersReduced ? "Motion: System (reduced)" : "Motion: System";
      title = systemPrefersReduced ? "Following your OS preference to limit animations." : "Following your OS preference.";
      ariaPressed = "mixed";
    }
    reduceMotionToggle.setAttribute("aria-pressed", ariaPressed);
    reduceMotionToggle.textContent = text;
    reduceMotionToggle.title = title;
  };

  const syncReduceMotionState = () => {
    if (documentRef?.body) {
      if (shouldReduceMotion()) documentRef.body.dataset.reduceMotion = "true";
      else delete documentRef.body.dataset.reduceMotion;
    }
    updateMotionToggleUI();
  };

  const applyReduceMotionPreference = (mode, { persist = true } = {}) => {
    if (mode !== "reduce" && mode !== "standard") reduceMotionPreference = null;
    else reduceMotionPreference = mode;
    if (persist) {
      try {
        if (reduceMotionPreference) {
          resolvedStorage?.setItem(reduceMotionStorageKey, reduceMotionPreference);
        } else {
          resolvedStorage?.removeItem(reduceMotionStorageKey);
        }
      } catch (error) {
        console.warn("Unable to persist motion preference.", error);
      }
    }
    syncReduceMotionState();
  };

  const applyHighContrastPreference = (enabled, { persist = true } = {}) => {
    if (documentRef?.body) {
      if (enabled) documentRef.body.dataset.contrast = "high";
      else delete documentRef.body.dataset.contrast;
    }
    if (highContrastToggle) {
      highContrastToggle.setAttribute("aria-pressed", String(enabled));
      highContrastToggle.textContent = enabled ? "Contrast: Boosted" : "Contrast: Standard";
      highContrastToggle.title = enabled
        ? "Colors switch to a higher-contrast palette for easier reading."
        : "Standard contrast restored.";
    }
    if (persist) {
      try {
        resolvedStorage?.setItem(highContrastStorageKey, enabled ? "true" : "false");
      } catch (error) {
        console.warn("Unable to persist contrast preference.", error);
      }
    }
  };

  if (motionPreferenceQuery) {
    const motionListener = event => {
      reduceMotionPreferred = event.matches;
      if (reduceMotionPreference === null) {
        syncReduceMotionState();
      } else {
        updateMotionToggleUI();
      }
    };
    if (typeof motionPreferenceQuery.addEventListener === "function") {
      motionPreferenceQuery.addEventListener("change", motionListener);
    } else if (typeof motionPreferenceQuery.addListener === "function") {
      motionPreferenceQuery.addListener(motionListener);
    }
  }

  const cycleReduceMotionPreference = ({ showUserToast = true } = {}) => {
    let nextPreference;
    if (reduceMotionPreference === null) nextPreference = "reduce";
    else if (reduceMotionPreference === "reduce") nextPreference = "standard";
    else nextPreference = null;
    applyReduceMotionPreference(nextPreference);
    if (showUserToast && typeof showToast === "function") {
      const toastMessage =
        nextPreference === "reduce"
          ? "Animations simplified."
          : nextPreference === "standard"
            ? "Full motion restored."
            : "Following your system preference for motion.";
      showToast(toastMessage, "info", { duration: 2500 });
    }
    return nextPreference;
  };

  const toggleHighContrastPreference = ({ showUserToast = true } = {}) => {
    const next = !(documentRef?.body?.dataset.contrast === "high");
    applyHighContrastPreference(next);
    if (showUserToast && typeof showToast === "function") {
      showToast(next ? "High-contrast mode on." : "Standard contrast mode.", next ? "success" : "info", {
        duration: 2500,
      });
    }
    return next;
  };

  const init = ({ bindToggleListeners = true } = {}) => {
    let savedMotion = null;
    try {
      savedMotion = resolvedStorage?.getItem(reduceMotionStorageKey);
    } catch (error) {
      console.warn("Unable to read motion preference.", error);
    }
    const initialMotion = savedMotion === "reduce" || savedMotion === "standard" ? savedMotion : null;
    applyReduceMotionPreference(initialMotion, { persist: false });
    if (bindToggleListeners) {
      reduceMotionToggle?.addEventListener("click", () => {
        cycleReduceMotionPreference();
      });
    }

    let contrastSaved = false;
    try {
      contrastSaved = resolvedStorage?.getItem(highContrastStorageKey) === "true";
    } catch (error) {
      console.warn("Unable to read contrast preference.", error);
    }
    applyHighContrastPreference(contrastSaved, { persist: false });
    if (bindToggleListeners) {
      highContrastToggle?.addEventListener("click", () => {
        toggleHighContrastPreference();
      });
    }
  };

  return {
    initAccessibilityControls: init,
    prefersReducedMotion,
    shouldReduceMotion,
    syncReduceMotionState,
    applyReduceMotionPreference,
    applyHighContrastPreference,
    cycleReduceMotionPreference,
    toggleHighContrastPreference,
  };
}
