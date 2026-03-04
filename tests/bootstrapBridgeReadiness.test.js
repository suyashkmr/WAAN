import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function makeBootstrapDeps(overrides = {}) {
  return {
    initEventHandlers: vi.fn(),
    initRelayControls: vi.fn(),
    initThemeControls: vi.fn(),
    setThemePreference: vi.fn(),
    initCompactMode: vi.fn(),
    initAccessibilityControls: vi.fn(),
    toggleCompactMode: vi.fn(),
    cycleReduceMotionPreference: vi.fn(),
    toggleHighContrastPreference: vi.fn(),
    setDataAvailabilityState: vi.fn(),
    onboardingController: {
      start: vi.fn(),
      skip: vi.fn(),
      advance: vi.fn(),
    },
    startRelaySession: vi.fn(),
    stopRelaySession: vi.fn(),
    buildSectionNav: vi.fn(),
    setupSectionNavTracking: vi.fn(),
    searchController: { init: vi.fn() },
    savedViewsController: {
      init: vi.fn(),
      setDataAvailability: vi.fn(),
    },
    getDataAvailable: vi.fn(() => true),
    refreshChatSelector: vi.fn(),
    updateStatus: vi.fn(),
    relayServiceName: "WAAN Relay",
    prefersReducedMotion: vi.fn(() => true),
    ...overrides,
  };
}

describe("bootstrap bridge readiness sequencing", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails fast when search bridge contracts are missing", async () => {
    vi.doMock("../js/vue/bridgeRegistry.js", () => ({
      VUE_BRIDGE_NAMES: { shell: "shell", searchSaved: "searchSaved" },
      resolveVueBridge: vi.fn(() => null),
    }));

    const { createBootstrapController } = await import("../js/appShell/bootstrap.js");
    const controller = createBootstrapController({
      elements: { onboardingSkipButton: null, onboardingNextButton: null },
      deps: makeBootstrapDeps(),
    });

    expect(() => controller.initAppBootstrap()).toThrow("SearchSaved bridge is not ready with required contracts.");
  });

  it("fails fast when shell bridge dispatch contracts are missing", async () => {
    vi.doMock("../js/vue/bridgeRegistry.js", () => ({
      VUE_BRIDGE_NAMES: { shell: "shell", searchSaved: "searchSaved" },
      resolveVueBridge: vi.fn(name => {
        if (name === "searchSaved") {
          return {
            renderSearchPanelState: () => true,
            renderSearchResults: () => true,
            renderSearchInsights: () => true,
            setPanelActionHandlers: () => {},
          };
        }
        if (name === "shell") {
          return {
            setShellActionHandlers: () => {},
          };
        }
        return null;
      }),
    }));

    const { createBootstrapController } = await import("../js/appShell/bootstrap.js");
    const controller = createBootstrapController({
      elements: { onboardingSkipButton: null, onboardingNextButton: null },
      deps: makeBootstrapDeps(),
    });

    expect(() => controller.initAppBootstrap()).toThrow("Shell bridge is not ready with required dispatch contracts.");
  });
});
