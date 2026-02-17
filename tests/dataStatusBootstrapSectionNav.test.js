import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDataStatusController } from "../js/appShell/dataStatus.js";
import { createBootstrapController } from "../js/appShell/bootstrap.js";
import { createSectionNavController } from "../js/appShell/sectionNav.js";

describe("dataStatus controller details", () => {
  it("handles availability and all hero relay status states", () => {
    const dashboardRoot = document.createElement("main");
    const heroStatusBadge = document.createElement("span");
    const heroStatusCopy = document.createElement("span");
    const heroStatusMetaCopy = document.createElement("span");
    const heroSyncDot = document.createElement("span");
    const notifyRelayReady = vi.fn();

    const deps = {
      setDatasetEmptyMessage: vi.fn(),
      savedViewsController: {
        setDataAvailability: vi.fn(),
        refreshUI: vi.fn(),
      },
      formatRelayAccount: vi.fn(() => "Alice"),
      formatNumber: vi.fn(value => String(value)),
      notifyRelayReady,
    };

    const controller = createDataStatusController({
      elements: {
        dashboardRoot,
        heroStatusBadge,
        heroStatusCopy,
        heroStatusMetaCopy,
        heroSyncDot,
        datasetEmptyStateManager: { setAvailability: vi.fn() },
      },
      deps,
    });

    controller.setDataAvailabilityState(true);
    expect(deps.setDatasetEmptyMessage).not.toHaveBeenCalled();

    controller.setDataAvailabilityState(false);
    expect(deps.setDatasetEmptyMessage).toHaveBeenCalledTimes(1);

    controller.updateHeroRelayStatus(null);
    expect(heroStatusBadge.textContent).toBe("Not connected");

    controller.updateHeroRelayStatus({ status: "waiting_qr", lastQr: false });
    expect(heroStatusBadge.textContent).toBe("Scan the QR code");
    expect(heroStatusCopy.textContent).toContain("Press Connect");
    expect(heroStatusMetaCopy.textContent).toContain("Waiting for phone link");

    controller.updateHeroRelayStatus({ status: "waiting_qr", lastQr: true });
    expect(heroStatusCopy.textContent).toContain("Linked Devices");

    controller.updateHeroRelayStatus({ status: "starting" });
    expect(heroStatusBadge.textContent).toBe("Starting relay");

    controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 0 });
    expect(heroStatusBadge.textContent).toBe("Relay connected");
    expect(heroStatusCopy.textContent).toBe("Connected. Syncing chats…");
    expect(heroSyncDot.dataset.state).toBe("syncing");
    expect(dashboardRoot.classList.contains("is-syncing")).toBe(true);
    expect(notifyRelayReady).toHaveBeenCalledTimes(0);

    controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 3, syncingChats: false });
    expect(heroStatusCopy.textContent).toContain("Insights are ready");
    expect(heroSyncDot.dataset.state).toBe("ready");
    expect(dashboardRoot.classList.contains("is-syncing")).toBe(false);
    expect(notifyRelayReady).toHaveBeenCalledTimes(1);
    expect(heroStatusBadge.classList.contains("hero-status-badge-ready")).toBe(true);

    controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 4, syncingChats: true });
    expect(heroSyncDot.dataset.state).toBe("syncing");
    expect(heroStatusBadge.classList.contains("hero-status-badge-ready")).toBe(false);

    controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 4, syncingChats: false });
    expect(notifyRelayReady).toHaveBeenCalledTimes(1);

    controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 0, syncingChats: true });
    controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 5, syncingChats: false });
    expect(notifyRelayReady).toHaveBeenCalledTimes(2);

    controller.setDashboardLoadingState(true);
    expect(dashboardRoot.classList.contains("is-loading")).toBe(true);
  });

  it("ignores hero updates when hero elements are missing", () => {
    const controller = createDataStatusController({
      elements: {
        dashboardRoot: null,
        heroStatusBadge: null,
        heroStatusCopy: null,
        heroStatusMetaCopy: null,
        heroSyncDot: null,
        datasetEmptyStateManager: { setAvailability: vi.fn() },
      },
      deps: {
        setDatasetEmptyMessage: vi.fn(),
        savedViewsController: {
          setDataAvailability: vi.fn(),
          refreshUI: vi.fn(),
        },
        formatRelayAccount: vi.fn(),
        formatNumber: vi.fn(),
      },
    });

    expect(() => controller.updateHeroRelayStatus({ status: "running" })).not.toThrow();
    expect(() => controller.setDashboardLoadingState(true)).not.toThrow();
  });

  it("does not re-notify while remaining in ready state after celebration timeout", () => {
    vi.useFakeTimers();
    try {
      const dashboardRoot = document.createElement("main");
      const heroStatusBadge = document.createElement("span");
      const heroStatusCopy = document.createElement("span");
      const heroStatusMetaCopy = document.createElement("span");
      const heroSyncDot = document.createElement("span");
      const readyStep = document.createElement("span");
      readyStep.dataset.step = "ready";
      const notifyRelayReady = vi.fn();

      const controller = createDataStatusController({
        elements: {
          dashboardRoot,
          heroStatusBadge,
          heroStatusCopy,
          heroStatusMetaCopy,
          heroSyncDot,
          heroMilestoneSteps: [readyStep],
          datasetEmptyStateManager: { setAvailability: vi.fn() },
        },
        deps: {
          setDatasetEmptyMessage: vi.fn(),
          savedViewsController: {
            setDataAvailability: vi.fn(),
            refreshUI: vi.fn(),
          },
          formatRelayAccount: vi.fn(() => "Alice"),
          formatNumber: vi.fn(value => String(value)),
          notifyRelayReady,
        },
      });

      controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 5, syncingChats: false });
      expect(notifyRelayReady).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1300);
      controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 5, syncingChats: false });
      expect(notifyRelayReady).toHaveBeenCalledTimes(1);

      controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 0, syncingChats: true });
      controller.updateHeroRelayStatus({ status: "running", account: null, chatCount: 6, syncingChats: false });
      expect(notifyRelayReady).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("bootstrap controller transitions", () => {
  let timeoutSpy;

  beforeEach(() => {
    document.body.innerHTML = "";
    timeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(fn => {
      fn();
      return 0;
    });
    vi.stubGlobal("requestAnimationFrame", cb => {
      cb();
      return 0;
    });
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete window.electronAPI;
  });

  it("animates expand/collapse when reduced motion is disabled", () => {
    const content = document.createElement("div");
    content.id = "panel";
    Object.defineProperty(content, "scrollHeight", { configurable: true, value: 120 });

    const toggle = document.createElement("button");
    toggle.className = "card-toggle";
    toggle.dataset.target = "panel";
    toggle.setAttribute("aria-expanded", "false");

    const card = document.createElement("section");
    card.className = "card collapsed";
    card.append(toggle, content);
    document.body.append(card);

    const deps = {
      initEventHandlers: vi.fn(),
      initRelayControls: vi.fn(),
      initThemeControls: vi.fn(),
      initCompactMode: vi.fn(),
      initAccessibilityControls: vi.fn(),
      setDataAvailabilityState: vi.fn(),
      onboardingController: { start: vi.fn(), skip: vi.fn(), advance: vi.fn() },
      startRelaySession: vi.fn(),
      stopRelaySession: vi.fn(),
      buildSectionNav: vi.fn(),
      setupSectionNavTracking: vi.fn(),
      searchController: { init: vi.fn() },
      savedViewsController: { init: vi.fn(), setDataAvailability: vi.fn() },
      getDataAvailable: vi.fn(() => false),
      refreshChatSelector: vi.fn(),
      updateStatus: vi.fn(),
      relayServiceName: "Relay",
      prefersReducedMotion: vi.fn(() => false),
    };

    const controller = createBootstrapController({
      elements: {
        onboardingSkipButton: null,
        onboardingNextButton: null,
      },
      deps,
    });

    controller.initAppBootstrap();

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(card.classList.contains("collapsed")).toBe(false);
    content.dispatchEvent(new Event("transitionend"));
    expect(content.style.maxHeight).toBe("");

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(card.classList.contains("collapsed")).toBe(true);
    content.dispatchEvent(new Event("transitionend"));
    expect(content.style.display).toBe("none");
  });
});

describe("sectionNav controller edge behavior", () => {
  let originalIntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = "";
    originalIntersectionObserver = globalThis.IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    window.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
  });

  it("no-ops tracking when observer is unavailable", () => {
    const container = document.createElement("div");
    const section = document.createElement("section");
    section.id = "summary";
    document.body.append(container, section);

    delete globalThis.IntersectionObserver;
    delete window.IntersectionObserver;

    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [{ id: "summary", label: "Summary" }],
    });

    controller.buildSectionNav();
    expect(() => controller.setupSectionNavTracking()).not.toThrow();
    expect(container.querySelectorAll("a").length).toBe(1);
  });

  it("uses nearest section fallback and disconnects previous observer", () => {
    const container = document.createElement("div");
    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 25 });
    const activity = document.createElement("section");
    activity.id = "activity";
    activity.getBoundingClientRect = () => ({ top: 90 });
    document.body.append(container, summary, activity);

    let callback;
    const disconnectA = vi.fn();
    const disconnectB = vi.fn();
    let observerCount = 0;
    class MockIntersectionObserver {
      constructor(cb) {
        callback = cb;
        observerCount += 1;
      }
      observe() {}
      disconnect() {
        if (observerCount === 1) disconnectA();
        else disconnectB();
      }
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;

    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [
        { id: "summary", label: "Summary" },
        { id: "activity", label: "Activity" },
      ],
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();
    controller.setupSectionNavTracking();

    callback?.([
      { isIntersecting: false, intersectionRatio: 0, target: summary },
      { isIntersecting: false, intersectionRatio: 0, target: activity },
    ]);

    const links = container.querySelectorAll("a");
    expect(links[0].classList.contains("active")).toBe(true);
    expect(disconnectA).toHaveBeenCalledTimes(1);
    expect(disconnectB).toHaveBeenCalledTimes(0);
  });
});
