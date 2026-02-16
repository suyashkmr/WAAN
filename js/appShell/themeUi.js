export function createThemeUiController({
  themeToggleInputs = [],
  mediaQuery = null,
  exportThemeStyles = {},
  storageKey = "waan-theme-preference",
}) {
  const themeState = {
    preference: "system",
    mediaQuery,
  };

  function applyTheme(preference) {
    const root = document.documentElement;
    if (!root) return;
    root.dataset.theme = preference;
    localStorage.setItem(storageKey, preference);
    if (preference === "system" && themeState.mediaQuery) {
      root.dataset.colorScheme = themeState.mediaQuery.matches ? "dark" : "light";
    } else if (preference === "dark") {
      root.dataset.colorScheme = "dark";
    } else {
      root.dataset.colorScheme = "light";
    }
  }

  function initThemeControls() {
    const saved = localStorage.getItem(storageKey);
    const initial = saved || "system";
    themeState.preference = initial;
    applyTheme(initial);
    themeToggleInputs.forEach(input => {
      input.checked = input.value === initial;
      input.addEventListener("change", () => {
        if (input.checked) {
          themeState.preference = input.value;
          applyTheme(input.value);
        }
      });
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
    const scheme = root?.dataset.colorScheme === "light" ? "light" : "dark";
    return scheme === "light" ? "light" : "dark";
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
    getExportThemeConfig,
  };
}
