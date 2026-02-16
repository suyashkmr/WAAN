import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const participantMocks = vi.hoisted(() => ({
  applyParticipantTopChange: vi.fn(),
  applyParticipantSortChange: vi.fn(),
  applyParticipantTimeframeChange: vi.fn(),
  applyParticipantPreset: vi.fn(),
  toggleParticipantRow: vi.fn(),
}));

vi.mock("../js/appShell/dashboardRender.js", () => ({
  applyParticipantTopChange: participantMocks.applyParticipantTopChange,
  applyParticipantSortChange: participantMocks.applyParticipantSortChange,
  applyParticipantTimeframeChange: participantMocks.applyParticipantTimeframeChange,
  applyParticipantPreset: participantMocks.applyParticipantPreset,
  toggleParticipantRow: participantMocks.toggleParticipantRow,
}));

import { createParticipantInteractionsController } from "../js/appShell/participantInteractions.js";
import { createThemeUiController } from "../js/appShell/themeUi.js";

describe("participant interactions controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies top/sort/timeframe changes and rerenders when analytics exists", () => {
    const participantsTopSelect = document.createElement("select");
    const topOption = document.createElement("option");
    topOption.value = "25";
    participantsTopSelect.appendChild(topOption);
    participantsTopSelect.value = "25";
    const participantsSortSelect = document.createElement("select");
    const sortOption = document.createElement("option");
    sortOption.value = "alphabetical";
    participantsSortSelect.appendChild(sortOption);
    participantsSortSelect.value = "alphabetical";
    const participantsTimeframeSelect = document.createElement("select");
    const timeframeOption = document.createElement("option");
    timeframeOption.value = "custom";
    participantsTimeframeSelect.appendChild(timeframeOption);
    participantsTimeframeSelect.value = "custom";

    const participantFilters = {};
    const renderParticipants = vi.fn();

    const controller = createParticipantInteractionsController({
      elements: {
        participantsTopSelect,
        participantsSortSelect,
        participantsTimeframeSelect,
        participantsBody: document.createElement("tbody"),
      },
      deps: {
        participantFilters,
        getDatasetAnalytics: () => ({ total_messages: 2 }),
        renderParticipants,
      },
    });

    controller.handleParticipantsTopChange();
    controller.handleParticipantsSortChange();
    controller.handleParticipantsTimeframeChange();

    expect(participantMocks.applyParticipantTopChange).toHaveBeenCalledWith(participantFilters, "25");
    expect(participantMocks.applyParticipantSortChange).toHaveBeenCalledWith(participantFilters, "alphabetical");
    expect(participantMocks.applyParticipantTimeframeChange).toHaveBeenCalledWith(participantFilters, "custom");
    expect(renderParticipants).toHaveBeenCalledTimes(3);
  });

  it("applies preset and row toggle while skipping rerender with no analytics", () => {
    const participantsTopSelect = document.createElement("select");
    const participantsSortSelect = document.createElement("select");
    const participantsTimeframeSelect = document.createElement("select");
    const participantsBody = document.createElement("tbody");

    const participantFilters = {};
    const renderParticipants = vi.fn();

    const controller = createParticipantInteractionsController({
      elements: {
        participantsTopSelect,
        participantsSortSelect,
        participantsTimeframeSelect,
        participantsBody,
      },
      deps: {
        participantFilters,
        getDatasetAnalytics: () => null,
        renderParticipants,
      },
    });

    controller.handleParticipantPresetClick({
      currentTarget: { dataset: { participantsPreset: "leaders" } },
    });

    const toggleEvent = { target: document.createElement("button") };
    controller.handleParticipantRowToggle(toggleEvent);

    expect(participantMocks.applyParticipantPreset).toHaveBeenCalledWith(participantFilters, "leaders", {
      participantsTopSelect,
      participantsSortSelect,
      participantsTimeframeSelect,
    });
    expect(participantMocks.toggleParticipantRow).toHaveBeenCalledWith(toggleEvent, participantsBody);
    expect(renderParticipants).not.toHaveBeenCalled();
  });
});

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
});
