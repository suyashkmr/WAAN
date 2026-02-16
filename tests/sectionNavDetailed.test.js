import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSectionNavController } from "../js/appShell/sectionNav.js";

describe("sectionNav detailed", () => {
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

  it("activates links on click/focus and supports ArrowLeft wrap", () => {
    const container = document.createElement("div");
    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 100 });
    const activity = document.createElement("section");
    activity.id = "activity";
    activity.getBoundingClientRect = () => ({ top: 200 });
    document.body.append(container, summary, activity);

    class MockIntersectionObserver {
      constructor() {}
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
    links[1].dispatchEvent(new Event("focus"));
    expect(links[1].classList.contains("active")).toBe(true);

    links[0].click();
    expect(links[0].classList.contains("active")).toBe(true);

    const focusSpy = vi.spyOn(links[1], "focus").mockImplementation(() => {});
    links[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("selects highest intersection ratio among visible entries", () => {
    const container = document.createElement("div");
    const one = document.createElement("section");
    one.id = "one";
    one.getBoundingClientRect = () => ({ top: 50 });
    const two = document.createElement("section");
    two.id = "two";
    two.getBoundingClientRect = () => ({ top: 60 });
    const three = document.createElement("section");
    three.id = "three";
    three.getBoundingClientRect = () => ({ top: 70 });
    document.body.append(container, one, two, three);

    let callback;
    class MockIntersectionObserver {
      constructor(cb) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;

    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [
        { id: "one", label: "One" },
        { id: "two", label: "Two" },
        { id: "three", label: "Three" },
      ],
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    callback?.([
      { isIntersecting: true, intersectionRatio: 0.2, target: one },
      { isIntersecting: true, intersectionRatio: 0.8, target: two },
      { isIntersecting: false, intersectionRatio: 0.9, target: three },
    ]);

    const links = container.querySelectorAll("a");
    expect(links[1].classList.contains("active")).toBe(true);
  });

  it("prefers first non-negative top on initial activation and handles all-negative ordering", () => {
    const containerA = document.createElement("div");
    const neg = document.createElement("section");
    neg.id = "neg";
    neg.getBoundingClientRect = () => ({ top: -50 });
    const pos = document.createElement("section");
    pos.id = "pos";
    pos.getBoundingClientRect = () => ({ top: 20 });
    document.body.append(containerA, neg, pos);

    class MockIntersectionObserver {
      constructor() {}
      observe() {}
      disconnect() {}
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;

    const firstController = createSectionNavController({
      containerEl: containerA,
      navItemsConfig: [
        { id: "neg", label: "Neg" },
        { id: "pos", label: "Pos" },
      ],
    });

    firstController.buildSectionNav();
    firstController.setupSectionNavTracking();

    const firstLinks = containerA.querySelectorAll("a");
    expect(firstLinks[1].classList.contains("active")).toBe(true);

    const containerB = document.createElement("div");
    const a = document.createElement("section");
    a.id = "a";
    a.getBoundingClientRect = () => ({ top: -80 });
    const b = document.createElement("section");
    b.id = "b";
    b.getBoundingClientRect = () => ({ top: -30 });
    document.body.append(containerB, a, b);

    const secondController = createSectionNavController({
      containerEl: containerB,
      navItemsConfig: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });

    secondController.buildSectionNav();
    secondController.setupSectionNavTracking();

    const secondLinks = containerB.querySelectorAll("a");
    expect(secondLinks[0].classList.contains("active")).toBe(true);
  });
});
