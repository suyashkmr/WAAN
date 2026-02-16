import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSectionNavController } from "../js/appShell/sectionNav.js";

describe("sectionNav controller", () => {
  let originalIntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = "";
    originalIntersectionObserver = globalThis.IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
  });

  it("builds links only for sections present in DOM", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const summary = document.createElement("section");
    summary.id = "summary";
    document.body.appendChild(summary);

    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [
        { id: "summary", label: "Summary" },
        { id: "missing", label: "Missing" },
      ],
    });

    controller.buildSectionNav();

    const links = container.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("#summary");
    expect(links[0].textContent).toBe("Summary");
  });

  it("tracks active section via observer and supports arrow key nav", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 100 });
    document.body.appendChild(summary);

    const activity = document.createElement("section");
    activity.id = "activity";
    activity.getBoundingClientRect = () => ({ top: 200 });
    document.body.appendChild(activity);

    let observerCallback = null;
    class MockIntersectionObserver {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
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

    const links = container.querySelectorAll("a");
    expect(links.length).toBe(2);

    observerCallback?.([
      { isIntersecting: true, intersectionRatio: 0.9, target: activity },
      { isIntersecting: false, intersectionRatio: 0.1, target: summary },
    ]);

    expect(links[1].classList.contains("active")).toBe(true);
    expect(links[0].classList.contains("active")).toBe(false);

    const focusSpy = vi.spyOn(links[1], "focus").mockImplementation(() => {});
    links[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});
