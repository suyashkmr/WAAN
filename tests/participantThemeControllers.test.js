import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createThemeUiController } from "../js/appShell/themeUi.js";

describe("theme ui controller", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "";
    document.documentElement.dataset.colorScheme = "";
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("initializes from saved preference and returns export theme", () => {
    localStorage.setItem("waan-theme-preference", "dark");

    const light = { label: "Light", accent: "#fff" };
    const dark = { label: "Dark", accent: "#000" };

    const lightInput = document.createElement("input");
    lightInput.value = "light";
    const darkInput = document.createElement("input");
    darkInput.value = "dark";
    const systemInput = document.createElement("input");
    systemInput.value = "system";

    const controller = createThemeUiController({
      themeToggleInputs: [lightInput, darkInput, systemInput],
      mediaQuery: { matches: false, addEventListener: vi.fn() },
      exportThemeStyles: { light, dark },
    });

    controller.initThemeControls();

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.colorScheme).toBe("dark");
    expect(darkInput.checked).toBe(true);
    expect(controller.getExportThemeConfig()).toEqual({ id: "dark", ...dark });
  });

  it("reacts to control changes and system media query updates", () => {
    let mediaListener = null;
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn((_event, cb) => {
        mediaListener = cb;
      }),
    };

    const lightInput = document.createElement("input");
    lightInput.value = "light";
    const darkInput = document.createElement("input");
    darkInput.value = "dark";
    const systemInput = document.createElement("input");
    systemInput.value = "system";

    const controller = createThemeUiController({
      themeToggleInputs: [lightInput, darkInput, systemInput],
      mediaQuery,
      exportThemeStyles: {
        light: { label: "Light" },
        dark: { label: "Dark" },
      },
    });

    controller.initThemeControls();

    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.dataset.colorScheme).toBe("dark");

    lightInput.checked = true;
    lightInput.dispatchEvent(new Event("change"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.colorScheme).toBe("light");
    expect(localStorage.getItem("waan-theme-preference")).toBe("light");

    systemInput.checked = true;
    systemInput.dispatchEvent(new Event("change"));
    expect(document.documentElement.dataset.theme).toBe("system");

    mediaQuery.matches = false;
    mediaListener();
    expect(document.documentElement.dataset.colorScheme).toBe("light");
  });

  it("uses runtime system dark scheme for export when preference is system without injected media query", () => {
    const originalMatchMedia = window.matchMedia;
    try {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });

      const controller = createThemeUiController({
        themeToggleInputs: [],
        mediaQuery: null,
        exportThemeStyles: {
          light: { label: "Light" },
          dark: { label: "Dark" },
        },
      });

      controller.initThemeControls();

      expect(document.documentElement.dataset.theme).toBe("system");
      expect(document.documentElement.dataset.colorScheme).toBe("dark");
      expect(controller.getExportThemeConfig()).toEqual({ id: "dark", label: "Dark" });
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("uses injected document/window/storage refs instead of ambient globals", () => {
    const documentRef = document.implementation.createHTMLDocument("theme");
    const windowRef = {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    };
    const storageRef = {
      getItem: vi.fn(() => "dark"),
      setItem: vi.fn(),
    };
    const darkInput = documentRef.createElement("input");
    darkInput.type = "radio";
    darkInput.name = "theme-option";
    darkInput.value = "dark";
    documentRef.body.appendChild(darkInput);

    const controller = createThemeUiController({
      themeToggleInputs: [],
      mediaQuery: null,
      exportThemeStyles: {
        light: { label: "Light" },
        dark: { label: "Dark" },
      },
      documentRef,
      windowRef,
      storageRef: /** @type {any} */ (storageRef),
    });

    controller.initThemeControls();

    expect(storageRef.getItem).toHaveBeenCalledWith("waan-theme-preference");
    expect(storageRef.setItem).toHaveBeenCalledWith("waan-theme-preference", "dark");
    expect(documentRef.documentElement.dataset.theme).toBe("dark");
    expect(documentRef.documentElement.dataset.colorScheme).toBe("dark");
    expect(darkInput.checked).toBe(true);
  });

  it("keeps theme changes working after radio inputs are remounted", () => {
    const oldLightInput = document.createElement("input");
    oldLightInput.type = "radio";
    oldLightInput.name = "theme-option";
    oldLightInput.value = "light";
    const oldDarkInput = document.createElement("input");
    oldDarkInput.type = "radio";
    oldDarkInput.name = "theme-option";
    oldDarkInput.value = "dark";
    const oldSystemInput = document.createElement("input");
    oldSystemInput.type = "radio";
    oldSystemInput.name = "theme-option";
    oldSystemInput.value = "system";
    document.body.append(oldLightInput, oldDarkInput, oldSystemInput);

    const controller = createThemeUiController({
      themeToggleInputs: [oldLightInput, oldDarkInput, oldSystemInput],
      mediaQuery: { matches: false, addEventListener: vi.fn() },
      exportThemeStyles: {
        light: { label: "Light" },
        dark: { label: "Dark" },
      },
    });

    controller.initThemeControls({ bindInputListeners: true });
    expect(document.documentElement.dataset.theme).toBe("system");

    oldLightInput.remove();
    oldDarkInput.remove();
    oldSystemInput.remove();

    const newDarkInput = document.createElement("input");
    newDarkInput.type = "radio";
    newDarkInput.name = "theme-option";
    newDarkInput.value = "dark";
    document.body.append(newDarkInput);

    newDarkInput.checked = true;
    newDarkInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.colorScheme).toBe("dark");
    expect(localStorage.getItem("waan-theme-preference")).toBe("dark");
  });
});
