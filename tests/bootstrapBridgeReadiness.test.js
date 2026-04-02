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

  it("defers bootstrap when search bridge contracts are missing", async () => {
    vi.doMock("../js/vue/bridgeRegistry.js", () => ({
      VUE_BRIDGE_NAMES: { shell: "shell", searchSaved: "searchSaved" },
      resolveVueBridge: vi.fn(() => null),
    }));

    const setTimeoutRef = vi.fn(() => /** @type {any} */ (0));
    const deps = makeBootstrapDeps();
    const { createBootstrapController } = await import("../js/appShell/bootstrap.js");
    const controller = createBootstrapController({
      elements: { onboardingSkipButton: null, onboardingNextButton: null },
      deps,
      setTimeoutRef,
    });

    expect(() => controller.initAppBootstrap()).not.toThrow();
    expect(setTimeoutRef).toHaveBeenCalledTimes(1);
    expect(deps.initEventHandlers).not.toHaveBeenCalled();
    expect(deps.initRelayControls).not.toHaveBeenCalled();
  });

  it("defers bootstrap when shell bridge dispatch contracts are missing", async () => {
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

    const setTimeoutRef = vi.fn(() => /** @type {any} */ (0));
    const deps = makeBootstrapDeps();
    const { createBootstrapController } = await import("../js/appShell/bootstrap.js");
    const controller = createBootstrapController({
      elements: { onboardingSkipButton: null, onboardingNextButton: null },
      deps,
      setTimeoutRef,
    });

    expect(() => controller.initAppBootstrap()).not.toThrow();
    expect(setTimeoutRef).toHaveBeenCalledTimes(1);
    expect(deps.initEventHandlers).not.toHaveBeenCalled();
    expect(deps.initRelayControls).not.toHaveBeenCalled();
  });
});
