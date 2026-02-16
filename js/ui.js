const defaultDocument = typeof document !== "undefined" ? document : null;

export function createDomCache(root = defaultDocument) {
  const cache = new Map();
  const resolveRoot = () => root || defaultDocument;

  return {
    getById(id) {
      const doc = resolveRoot();
      if (!doc || !id) return null;
      if (!cache.has(id)) {
        cache.set(id, doc.getElementById ? doc.getElementById(id) : defaultDocument?.getElementById(id) || null);
      }
      return cache.get(id);
    },
    query(selector) {
      const doc = resolveRoot();
      if (!doc || !selector) return null;
      if (!cache.has(selector)) {
        cache.set(selector, doc.querySelector(selector));
      }
      return cache.get(selector);
    },
    queryAll(selector) {
      const doc = resolveRoot();
      if (!doc || !selector) return [];
      return doc.querySelectorAll(selector);
    },
    clear() {
      cache.clear();
    },
  };
}

export function createDeferredRenderScheduler({ getToken } = {}) {
  const deferTask =
    typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
      ? callback =>
          window.requestIdleCallback(
            deadline => {
              if (deadline.timeRemaining() > 8) {
                callback();
              } else {
                setTimeout(callback, 0);
              }
            },
            { timeout: 500 },
          )
      : callback => setTimeout(callback, 0);

  return (task, token) => {
    deferTask(() => {
      if (typeof token !== "undefined" && typeof getToken === "function" && token !== getToken()) return;
      task();
    });
  };
}

export function createDatasetEmptyStateManager({ calloutEl, headingEl, copyEl, buttons = [] } = {}) {
  const defaultHeading = headingEl?.textContent || "";
  const defaultCopy = copyEl?.textContent || "";
  let available = false;

  const setMessage = (headingText, copyText) => {
    if (headingEl && typeof headingText === "string") headingEl.textContent = headingText;
    if (copyEl && typeof copyText === "string") copyEl.textContent = copyText;
  };

  const setAvailability = hasData => {
    available = Boolean(hasData);
    buttons.forEach(button => {
      if (!button) return;
      button.disabled = !available;
      if (button.tagName === "BUTTON") {
        if (!available) button.setAttribute("title", "Load a chat to enable this action.");
        else button.removeAttribute("title");
      }
    });
    if (calloutEl) {
      calloutEl.classList.toggle("hidden", available);
    }
    if (!available) {
      setMessage(defaultHeading, defaultCopy);
    }
  };

  return {
    setMessage,
    setAvailability,
    isAvailable: () => available,
  };
}

export function createCompactModeManager({ toggle, storageKey = "waan-compact-mode", showToast } = {}) {
  const apply = enabled => {
    if (defaultDocument?.body) {
      defaultDocument.body.dataset.compact = enabled ? "true" : "false";
    }
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.textContent = enabled ? "Comfort mode" : "Compact mode";
    }
    try {
      localStorage.setItem(storageKey, enabled ? "true" : "false");
    } catch (error) {
      console.warn("Unable to persist compact mode preference.", error);
    }
  };

  const init = () => {
    let enabled = false;
    try {
      enabled = localStorage.getItem(storageKey) === "true";
    } catch (error) {
      console.warn("Unable to read compact mode preference.", error);
    }
    apply(enabled);
    toggle?.addEventListener("click", () => {
      const next = !(defaultDocument?.body?.dataset.compact === "true");
      apply(next);
      if (typeof showToast === "function") {
        showToast(next ? "Compact mode enabled." : "Comfort mode enabled.", "info", { duration: 3000 });
      }
    });
  };

  return { apply, init };
}

export function createAccessibilityController({
  reduceMotionToggle,
  highContrastToggle,
  motionPreferenceQuery,
  initialReduceMotionPreferred = false,
  showToast,
  reduceMotionStorageKey = "waan-reduce-motion",
  highContrastStorageKey = "waan-high-contrast",
} = {}) {
  let reduceMotionPreferred = initialReduceMotionPreferred;
  let reduceMotionPreference = null; // "reduce" | "standard" | null

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
    if (defaultDocument?.body) {
      if (shouldReduceMotion()) defaultDocument.body.dataset.reduceMotion = "true";
      else delete defaultDocument.body.dataset.reduceMotion;
    }
    updateMotionToggleUI();
  };

  const applyReduceMotionPreference = (mode, { persist = true } = {}) => {
    if (mode !== "reduce" && mode !== "standard") reduceMotionPreference = null;
    else reduceMotionPreference = mode;
    if (persist) {
      try {
        if (reduceMotionPreference) {
          localStorage.setItem(reduceMotionStorageKey, reduceMotionPreference);
        } else {
          localStorage.removeItem(reduceMotionStorageKey);
        }
      } catch (error) {
        console.warn("Unable to persist motion preference.", error);
      }
    }
    syncReduceMotionState();
  };

  const applyHighContrastPreference = (enabled, { persist = true } = {}) => {
    if (defaultDocument?.body) {
      if (enabled) defaultDocument.body.dataset.contrast = "high";
      else delete defaultDocument.body.dataset.contrast;
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
        localStorage.setItem(highContrastStorageKey, enabled ? "true" : "false");
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

  const init = () => {
    let savedMotion = null;
    try {
      savedMotion = localStorage.getItem(reduceMotionStorageKey);
    } catch (error) {
      console.warn("Unable to read motion preference.", error);
    }
    const initialMotion = savedMotion === "reduce" || savedMotion === "standard" ? savedMotion : null;
    applyReduceMotionPreference(initialMotion, { persist: false });
    reduceMotionToggle?.addEventListener("click", () => {
      let nextPreference;
      if (reduceMotionPreference === null) nextPreference = "reduce";
      else if (reduceMotionPreference === "reduce") nextPreference = "standard";
      else nextPreference = null;
      applyReduceMotionPreference(nextPreference);
      if (typeof showToast === "function") {
        const toastMessage =
          nextPreference === "reduce"
            ? "Animations simplified."
            : nextPreference === "standard"
              ? "Full motion restored."
              : "Following your system preference for motion.";
        showToast(toastMessage, "info", { duration: 2500 });
      }
    });

    let contrastSaved = false;
    try {
      contrastSaved = localStorage.getItem(highContrastStorageKey) === "true";
    } catch (error) {
      console.warn("Unable to read contrast preference.", error);
    }
    applyHighContrastPreference(contrastSaved, { persist: false });
    highContrastToggle?.addEventListener("click", () => {
      const next = !(defaultDocument?.body?.dataset.contrast === "high");
      applyHighContrastPreference(next);
      if (typeof showToast === "function") {
        showToast(next ? "High-contrast mode on." : "Standard contrast mode.", next ? "success" : "info", {
          duration: 2500,
        });
      }
    });
  };

  return {
    initAccessibilityControls: init,
    prefersReducedMotion,
    shouldReduceMotion,
    syncReduceMotionState,
    applyReduceMotionPreference,
    applyHighContrastPreference,
  };
}
