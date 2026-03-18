import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Fragment, h, render } from "vue";
import { createSectionNavController } from "../js/appShell/sectionNav.js";

describe("sectionNav detailed", () => {
  let originalIntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = "";
    originalIntersectionObserver = globalThis.IntersectionObserver;
    globalThis.Vue = { h, render, Fragment };
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    window.IntersectionObserver = originalIntersectionObserver;
    delete globalThis.Vue;
    vi.restoreAllMocks();
  });

  it("activates links on click, keeps focus passive, and supports ArrowLeft wrap", () => {
    const container = document.createElement("div");
    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 100 });
    const summaryScrollSpy = vi.spyOn(summary, "scrollIntoView").mockImplementation(() => {});
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
    const focusedScrollSpy = vi.spyOn(links[1], "scrollIntoView").mockImplementation(() => {});
    links[1].dispatchEvent(new Event("focus"));
    expect(links[1].classList.contains("active")).toBe(false);
    expect(focusedScrollSpy).not.toHaveBeenCalled();

    links[0].click();
    expect(links[0].classList.contains("active")).toBe(true);
    expect(summaryScrollSpy).toHaveBeenCalledTimes(1);

    const focusSpy = vi.spyOn(links[1], "focus").mockImplementation(() => {});
    links[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps a manually clicked nav item active until scroll tracking catches up", () => {
    const container = document.createElement("div");
    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 20, bottom: 220 });
    const activity = document.createElement("section");
    activity.id = "activity";
    activity.getBoundingClientRect = () => ({ top: 320, bottom: 620 });
    const activityScrollSpy = vi.spyOn(activity, "scrollIntoView").mockImplementation(() => {});
    document.body.append(container, summary, activity);

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
        { id: "summary", label: "Summary" },
        { id: "activity", label: "Activity" },
      ],
      windowRef: /** @type {any} */ ({
        innerHeight: 900,
        IntersectionObserver: MockIntersectionObserver,
        matchMedia: () => ({ matches: false }),
        addEventListener: () => {},
        removeEventListener: () => {},
        history: { replaceState: vi.fn() },
      }),
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    callback?.([{ isIntersecting: true, intersectionRatio: 0.9, target: summary }]);

    const links = container.querySelectorAll("a");
    expect(links[0].classList.contains("active")).toBe(true);

    links[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(activityScrollSpy).toHaveBeenCalledTimes(1);
    expect(links[1].classList.contains("active")).toBe(true);

    callback?.([{ isIntersecting: true, intersectionRatio: 0.9, target: summary }]);
    expect(links[1].classList.contains("active")).toBe(true);
    expect(links[0].classList.contains("active")).toBe(false);
  });

  it("preserves native modified click behavior", () => {
    const container = document.createElement("div");
    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 20, bottom: 220 });
    const summaryScrollSpy = vi.spyOn(summary, "scrollIntoView").mockImplementation(() => {});
    document.body.append(container, summary);

    class MockIntersectionObserver {
      constructor() {}
      observe() {}
      disconnect() {}
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;

    const historyReplaceState = vi.fn();
    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [{ id: "summary", label: "Summary" }],
      windowRef: /** @type {any} */ ({
        innerHeight: 900,
        IntersectionObserver: MockIntersectionObserver,
        matchMedia: () => ({ matches: false }),
        addEventListener: () => {},
        removeEventListener: () => {},
        history: { replaceState: historyReplaceState },
      }),
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    const [link] = container.querySelectorAll("a");
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(summaryScrollSpy).not.toHaveBeenCalled();
    expect(historyReplaceState).not.toHaveBeenCalled();
  });

  it("does not activate on touch pointerdown while the nav strip is being panned", () => {
    const container = document.createElement("div");
    const summary = document.createElement("section");
    summary.id = "summary";
    summary.getBoundingClientRect = () => ({ top: 20, bottom: 220 });
    const summaryScrollSpy = vi.spyOn(summary, "scrollIntoView").mockImplementation(() => {});
    document.body.append(container, summary);

    class MockIntersectionObserver {
      constructor() {}
      observe() {}
      disconnect() {}
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;

    const historyReplaceState = vi.fn();
    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [{ id: "summary", label: "Summary" }],
      windowRef: /** @type {any} */ ({
        innerHeight: 900,
        IntersectionObserver: MockIntersectionObserver,
        matchMedia: () => ({ matches: false }),
        addEventListener: () => {},
        removeEventListener: () => {},
        history: { replaceState: historyReplaceState },
      }),
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    const [link] = container.querySelectorAll("a");
    link.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerType: "touch",
    }));

    expect(summaryScrollSpy).not.toHaveBeenCalled();
    expect(historyReplaceState).not.toHaveBeenCalled();
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

  it("does not auto-scroll the nav strip during passive observer activation", () => {
    const container = document.createElement("div");
    const one = document.createElement("section");
    one.id = "one";
    one.getBoundingClientRect = () => ({ top: 40, bottom: 220 });
    const two = document.createElement("section");
    two.id = "two";
    two.getBoundingClientRect = () => ({ top: 260, bottom: 520 });
    document.body.append(container, one, two);

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
      ],
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    const links = container.querySelectorAll("a");
    const scrollSpy = vi.spyOn(links[0], "scrollIntoView").mockImplementation(() => {});

    callback?.([{ isIntersecting: true, intersectionRatio: 0.9, target: one }]);

    expect(links[0].classList.contains("active")).toBe(true);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("restores the root scroll behavior correctly across rapid nav clicks", () => {
    const container = document.createElement("div");
    const one = document.createElement("section");
    one.id = "one";
    one.getBoundingClientRect = () => ({ top: 20, bottom: 220 });
    const two = document.createElement("section");
    two.id = "two";
    two.getBoundingClientRect = () => ({ top: 320, bottom: 620 });
    document.body.append(container, one, two);

    class MockIntersectionObserver {
      constructor() {}
      observe() {}
      disconnect() {}
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;

    const queuedFrames = [];
    const windowRef = /** @type {any} */ ({
      innerHeight: 900,
      IntersectionObserver: MockIntersectionObserver,
      matchMedia: () => ({ matches: false }),
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame: callback => {
        queuedFrames.push(callback);
        return queuedFrames.length;
      },
      history: { replaceState: vi.fn() },
    });
    const controller = createSectionNavController({
      containerEl: container,
      navItemsConfig: [
        { id: "one", label: "One" },
        { id: "two", label: "Two" },
      ],
      windowRef,
    });

    document.documentElement.style.scrollBehavior = "";
    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    const links = container.querySelectorAll("a");
    links[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(document.documentElement.style.scrollBehavior).toBe("auto");

    links[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(document.documentElement.style.scrollBehavior).toBe("auto");

    const firstRestore = queuedFrames.shift();
    firstRestore?.();
    expect(document.documentElement.style.scrollBehavior).toBe("auto");

    const secondRestore = queuedFrames.shift();
    secondRestore?.();
    expect(document.documentElement.style.scrollBehavior).toBe("");
  });

  it("reveals the active tab once on initial passive sync for deep-linked sections", () => {
    const container = document.createElement("div");
    const one = document.createElement("section");
    one.id = "one";
    const two = document.createElement("section");
    two.id = "two";
    let oneRect = { top: 420, bottom: 720 };
    let twoRect = { top: 40, bottom: 260 };
    one.getBoundingClientRect = () => oneRect;
    two.getBoundingClientRect = () => twoRect;
    document.body.append(container, one, two);

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
      ],
    });

    controller.buildSectionNav();
    const links = container.querySelectorAll("a");
    const firstLinkScrollSpy = vi.spyOn(links[0], "scrollIntoView").mockImplementation(() => {});
    const secondLinkScrollSpy = vi.spyOn(links[1], "scrollIntoView").mockImplementation(() => {});
    controller.setupSectionNavTracking();

    callback?.([{ isIntersecting: true, intersectionRatio: 0.9, target: two }]);
    expect(links[1].classList.contains("active")).toBe(true);
    expect(secondLinkScrollSpy).toHaveBeenCalledTimes(1);

    oneRect = { top: 40, bottom: 260 };
    twoRect = { top: 420, bottom: 720 };
    callback?.([
      { isIntersecting: true, intersectionRatio: 0.9, target: one },
      { isIntersecting: false, intersectionRatio: 0, target: two },
    ]);
    expect(links[0].classList.contains("active")).toBe(true);
    expect(firstLinkScrollSpy).not.toHaveBeenCalled();
  });

  it("keeps the best visible section active across partial observer callbacks", () => {
    const container = document.createElement("div");
    const one = document.createElement("section");
    one.id = "one";
    one.getBoundingClientRect = () => ({ top: 20 });
    const two = document.createElement("section");
    two.id = "two";
    two.getBoundingClientRect = () => ({ top: 40 });
    document.body.append(container, one, two);

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
      ],
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    callback?.([
      { isIntersecting: true, intersectionRatio: 0.85, target: one },
      { isIntersecting: true, intersectionRatio: 0.2, target: two },
    ]);

    const links = container.querySelectorAll("a");
    expect(links[0].classList.contains("active")).toBe(true);

    // Observer callbacks can arrive with only one section update.
    callback?.([{ isIntersecting: true, intersectionRatio: 0.25, target: two }]);
    expect(links[0].classList.contains("active")).toBe(true);
  });

  it("does not promote non-visible passed sections when visible entries exist", () => {
    const container = document.createElement("div");
    const above = document.createElement("section");
    above.id = "above";
    above.getBoundingClientRect = () => ({ top: -40, bottom: 20 });
    const visible = document.createElement("section");
    visible.id = "visible";
    visible.getBoundingClientRect = () => ({ top: 260, bottom: 560 });
    document.body.append(container, above, visible);

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
        { id: "above", label: "Above" },
        { id: "visible", label: "Visible" },
      ],
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();
    callback?.([
      { isIntersecting: false, intersectionRatio: 0, target: above },
      { isIntersecting: true, intersectionRatio: 0.2, target: visible },
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
    expect(secondLinks[1].classList.contains("active")).toBe(true);
  });
});
