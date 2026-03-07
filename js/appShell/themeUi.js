// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   themeToggleInputs?: Array<HTMLInputElement>,
 *   mediaQuery?: MediaQueryList | null,
 *   exportThemeStyles?: AnyRecord,
 *   storageKey?: string,
 *   documentRef?: Document | null,
 *   windowRef?: Window | null,
 *   storageRef?: Storage | null,
 * }} params
 */
export function createThemeUiController({
  themeToggleInputs = [],
  mediaQuery = null,
  exportThemeStyles = {},
  storageKey = "waan-theme-preference",
  documentRef = typeof document !== "undefined" ? document : null,
  windowRef = typeof window !== "undefined" ? window : null,
  storageRef = globalThis.localStorage ?? null,
}) {
  /** @type {{ preference: string, mediaQuery: MediaQueryList | null }} */
  const themeState = {
    preference: "system",
    mediaQuery,
  };
  /** @type {((event: Event) => void) | null} */
  let delegatedThemeChangeHandler = null;
  /** @type {WeakSet<HTMLInputElement>} */
  const boundThemeInputs = new WeakSet();

  /**
   * @returns {Array<HTMLInputElement>}
   */
  function getThemeToggleInputs() {
    const staticInputs = themeToggleInputs.filter(Boolean);
    if (!documentRef) return staticInputs;
    const liveInputs = /** @type {Array<HTMLInputElement>} */ (
      Array.from(documentRef.querySelectorAll('input[name="theme-option"]'))
    );
    const merged = [...staticInputs];
    liveInputs.forEach(input => {
      if (!merged.includes(input)) merged.push(input);
    });
    return merged;
  }

  function detectSystemScheme() {
    if (themeState.mediaQuery && typeof themeState.mediaQuery.matches === "boolean") {
      return themeState.mediaQuery.matches ? "dark" : "light";
    }
    try {
      if (typeof windowRef?.matchMedia === "function") {
        return windowRef.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    } catch (error) {
      console.warn("Unable to resolve system color scheme.", error);
    }
    return "light";
  }

  /**
   * @param {string} preference
   */
  function resolveColorScheme(preference) {
    if (preference === "dark") return "dark";
    if (preference === "light") return "light";
    return detectSystemScheme();
  }

  /**
   * @param {string} preference
   */
  function applyTheme(preference) {
    const root = documentRef?.documentElement ?? null;
    if (!root) return;
    root.dataset.theme = preference;
    storageRef?.setItem(storageKey, preference);
    root.dataset.colorScheme = resolveColorScheme(preference);
  }

  /**
   * @param {string} preference
   */
  function setThemePreference(preference) {
    const normalized = preference === "dark" || preference === "light" || preference === "system"
      ? preference
      : "system";
    themeState.preference = normalized;
    applyTheme(normalized);
    getThemeToggleInputs().forEach(input => {
      input.checked = input.value === normalized;
    });
    return normalized;
  }

  function initThemeControls({ bindInputListeners = true } = {}) {
    const saved = storageRef?.getItem(storageKey);
    const initial = saved || "system";
    setThemePreference(initial);
    if (bindInputListeners && documentRef && delegatedThemeChangeHandler == null) {
      delegatedThemeChangeHandler = event => {
        const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
        if (!target || target.name !== "theme-option") return;
        if (!target.checked) return;
        setThemePreference(target.value);
      };
      documentRef.addEventListener("change", delegatedThemeChangeHandler);
    }
    if (bindInputListeners) {
      getThemeToggleInputs().forEach(input => {
        if (boundThemeInputs.has(input)) return;
        input.addEventListener("change", () => {
          if (input.checked) setThemePreference(input.value);
        });
        boundThemeInputs.add(input);
      });
    }
    if (themeState.mediaQuery) {
      themeState.mediaQuery.addEventListener("change", () => {
        if (themeState.preference === "system") {
          applyTheme("system");
        }
      });
    }
  }

  function getInterfaceColorScheme() {
    const root = documentRef?.documentElement ?? null;
    const preference = root?.dataset.theme || themeState.preference || "system";
    return resolveColorScheme(preference);
  }

  function getExportThemeConfig() {
    const scheme = getInterfaceColorScheme();
    const theme = exportThemeStyles[scheme] || exportThemeStyles.dark;
    return {
      id: scheme,
      ...theme,
    };
  }

  return {
    initThemeControls,
    setThemePreference,
    getExportThemeConfig,
  };
}
