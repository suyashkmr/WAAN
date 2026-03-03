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
 * }} params
 */
export function createThemeUiController({
  themeToggleInputs = [],
  mediaQuery = null,
  exportThemeStyles = {},
  storageKey = "waan-theme-preference",
}) {
  /** @type {{ preference: string, mediaQuery: MediaQueryList | null }} */
  const themeState = {
    preference: "system",
    mediaQuery,
  };

  function detectSystemScheme() {
    if (themeState.mediaQuery && typeof themeState.mediaQuery.matches === "boolean") {
      return themeState.mediaQuery.matches ? "dark" : "light";
    }
    try {
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
    const root = document.documentElement;
    if (!root) return;
    root.dataset.theme = preference;
    globalThis.localStorage?.setItem(storageKey, preference);
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
    themeToggleInputs.forEach(input => {
      input.checked = input.value === normalized;
    });
    return normalized;
  }

  function initThemeControls({ bindInputListeners = true } = {}) {
    const saved = globalThis.localStorage?.getItem(storageKey);
    const initial = saved || "system";
    setThemePreference(initial);
    themeToggleInputs.forEach(input => {
      if (bindInputListeners) {
        input.addEventListener("change", () => {
          if (input.checked) {
            setThemePreference(input.value);
          }
        });
      }
    });
    if (themeState.mediaQuery) {
      themeState.mediaQuery.addEventListener("change", () => {
        if (themeState.preference === "system") {
          applyTheme("system");
        }
      });
    }
  }

  function getInterfaceColorScheme() {
    const root = document.documentElement;
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
