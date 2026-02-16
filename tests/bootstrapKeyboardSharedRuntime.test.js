import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBootstrapController } from "../js/appShell/bootstrap.js";
import { createKeyboardShortcutsController } from "../js/appShell/keyboardShortcuts.js";
import {
  createBusyRuntimeController,
  fetchJson,
  stripRelaySuffix,
  formatRelayAccount,
} from "../js/appShell/sharedRuntime.js";

function makeBootstrapDeps(overrides = {}) {
  return {
    initEventHandlers: vi.fn(),
    initRelayControls: vi.fn(),
    initThemeControls: vi.fn(),
    initCompactMode: vi.fn(),
    initAccessibilityControls: vi.fn(),
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
    relayServiceName: "ChatScope Relay",
    prefersReducedMotion: vi.fn(() => true),
    ...overrides,
  };
}

describe("bootstrap controller", () => {
  let timeoutSpy;

  beforeEach(() => {
    document.body.innerHTML = "";
    timeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(fn => {
      fn();
      return 0;
    });
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    vi.restoreAllMocks();
    delete window.electronAPI;
  });

  it("initializes startup flows and wires relay bridge", () => {
    const onboardingSkipButton = document.createElement("button");
    const onboardingNextButton = document.createElement("button");
    const card = document.createElement("section");
    card.className = "card";
    const content = document.createElement("div");
    content.id = "card-content";
    const toggle = document.createElement("button");
    toggle.className = "card-toggle";
    toggle.dataset.target = "card-content";
    toggle.setAttribute("aria-expanded", "true");
    card.append(toggle, content);
    document.body.append(card);

    let relayActionHandler = null;
    window.electronAPI = {
      onRelayAction: vi.fn(handler => {
        relayActionHandler = handler;
      }),
    };

    const deps = makeBootstrapDeps();
    const { initAppBootstrap } = createBootstrapController({
      elements: { onboardingSkipButton, onboardingNextButton },
      deps,
    });

    initAppBootstrap();

    expect(deps.initEventHandlers).toHaveBeenCalledTimes(1);
    expect(deps.initRelayControls).toHaveBeenCalledTimes(1);
    expect(deps.initThemeControls).toHaveBeenCalledTimes(1);
    expect(deps.initCompactMode).toHaveBeenCalledTimes(1);
    expect(deps.initAccessibilityControls).toHaveBeenCalledTimes(1);
    expect(deps.setDataAvailabilityState).toHaveBeenCalledWith(false);

    onboardingSkipButton.click();
    onboardingNextButton.click();
    expect(deps.onboardingController.skip).toHaveBeenCalledTimes(1);
    expect(deps.onboardingController.advance).toHaveBeenCalledTimes(1);
    expect(deps.onboardingController.start).toHaveBeenCalledTimes(1);

    expect(deps.buildSectionNav).toHaveBeenCalledTimes(1);
    expect(deps.setupSectionNavTracking).toHaveBeenCalledTimes(1);
    expect(deps.searchController.init).toHaveBeenCalledTimes(1);
    expect(deps.savedViewsController.init).toHaveBeenCalledTimes(1);
    expect(deps.savedViewsController.setDataAvailability).toHaveBeenCalledWith(true);
    expect(deps.refreshChatSelector).toHaveBeenCalledTimes(1);
    expect(deps.updateStatus).toHaveBeenCalledWith(
      "Start ChatScope Relay to mirror chat app chats here.",
      "info",
    );

    relayActionHandler("connect");
    relayActionHandler("disconnect");
    expect(deps.startRelaySession).toHaveBeenCalledTimes(1);
    expect(deps.stopRelaySession).toHaveBeenCalledTimes(1);

    toggle.click();
    expect(card.classList.contains("collapsed")).toBe(true);
  });
});

describe("keyboard shortcuts controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles ctrl/cmd shortcuts and escape behavior", () => {
    document.body.dataset.compact = "false";

    const deps = {
      syncRelayChats: vi.fn(),
      isLogDrawerOpen: vi.fn(() => false),
      closeLogDrawer: vi.fn(),
      openLogDrawer: vi.fn(),
      applyCompactMode: vi.fn(value => {
        document.body.dataset.compact = value ? "true" : "false";
      }),
      showToast: vi.fn(),
      onboardingController: {
        isOpen: vi.fn(() => true),
        skip: vi.fn(),
      },
    };

    const { initKeyboardShortcuts } = createKeyboardShortcutsController({ deps });
    initKeyboardShortcuts();

    const refreshEvent = new KeyboardEvent("keydown", { key: "r", ctrlKey: true, bubbles: true });
    document.dispatchEvent(refreshEvent);
    expect(deps.syncRelayChats).toHaveBeenCalledWith({ silent: false });

    const logEvent = new KeyboardEvent("keydown", { key: "l", metaKey: true, bubbles: true });
    document.dispatchEvent(logEvent);
    expect(deps.openLogDrawer).toHaveBeenCalledTimes(1);

    const compactEvent = new KeyboardEvent("keydown", { key: "m", ctrlKey: true, bubbles: true });
    document.dispatchEvent(compactEvent);
    expect(deps.applyCompactMode).toHaveBeenCalledWith(true);
    expect(deps.showToast).toHaveBeenCalledWith("Compact mode enabled.", "info", { duration: 2500 });

    deps.isLogDrawerOpen.mockReturnValue(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(deps.closeLogDrawer).toHaveBeenCalledTimes(1);

    deps.isLogDrawerOpen.mockReturnValue(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(deps.onboardingController.skip).toHaveBeenCalledTimes(1);
  });

  it("ignores ctrl/cmd shortcuts while typing", () => {
    const deps = {
      syncRelayChats: vi.fn(),
      isLogDrawerOpen: vi.fn(() => false),
      closeLogDrawer: vi.fn(),
      openLogDrawer: vi.fn(),
      applyCompactMode: vi.fn(),
      showToast: vi.fn(),
      onboardingController: {
        isOpen: vi.fn(() => false),
        skip: vi.fn(),
      },
    };

    const { initKeyboardShortcuts } = createKeyboardShortcutsController({ deps });
    initKeyboardShortcuts();

    const input = document.createElement("input");
    document.body.append(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "r", ctrlKey: true, bubbles: true }));

    expect(deps.syncRelayChats).not.toHaveBeenCalled();
  });
});

describe("shared runtime helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks nested busy states and hides only when all tasks finish", async () => {
    const globalProgressEl = document.createElement("div");
    const globalProgressLabel = document.createElement("span");
    globalProgressEl.hidden = true;

    const { withGlobalBusy } = createBusyRuntimeController({
      globalProgressEl,
      globalProgressLabel,
    });

    let releaseFirst;
    const firstTask = withGlobalBusy(
      () => new Promise(resolve => {
        releaseFirst = resolve;
      }),
      "Task A",
    );

    await Promise.resolve();
    expect(globalProgressEl.hidden).toBe(false);
    expect(globalProgressLabel.textContent).toBe("Task A");

    const secondTask = withGlobalBusy(async () => "done", "Task B");
    await secondTask;
    expect(globalProgressEl.hidden).toBe(false);

    releaseFirst();
    await firstTask;
    expect(globalProgressEl.hidden).toBe(true);
  });

  it("fetchJson returns json and surfaces errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ ok: true })),
    });

    await expect(fetchJson("/ok")).resolves.toEqual({ ok: true });

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn(async () => "service unavailable"),
    });
    await expect(fetchJson("/down")).rejects.toThrow("service unavailable");

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn(async () => ""),
    });
    await expect(fetchJson("/empty")).rejects.toThrow("Request failed (500)");
  });

  it("formats relay account display values", () => {
    expect(stripRelaySuffix("12345@c.us")).toBe("12345");
    expect(stripRelaySuffix("999@g.us")).toBe("999");
    expect(stripRelaySuffix("plain")).toBe("plain");

    expect(formatRelayAccount({ pushName: "Alice" })).toBe("Alice");
    expect(formatRelayAccount({ wid: "12345@c.us" })).toBe("12345");
    expect(formatRelayAccount({})).toBe("");
  });
});
