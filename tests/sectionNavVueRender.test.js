import { afterEach, describe, expect, it } from "vitest";
import { Fragment, h, render } from "vue";

import { createSectionNavController } from "../js/appShell/sectionNav.js";

describe("sectionNav Vue rendering", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders nav links through Vue runtime", () => {
    globalThis.Vue = { h, render, Fragment };

    document.body.innerHTML = `
      <section id="summary"></section>
      <section id="relay"></section>
      <div class="section-nav-inner"></div>
    `;

    const containerEl = document.querySelector(".section-nav-inner");
    const controller = createSectionNavController({
      containerEl,
      navItemsConfig: [
        { id: "summary", label: "Summary" },
        { id: "relay", label: "Relay" },
      ],
    });

    controller.buildSectionNav();

    const links = Array.from(containerEl.querySelectorAll("a[data-section-id]"));
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("#summary");
    expect(links[1].textContent).toBe("Relay");
  });

  it("fails fast without Vue runtime outside Vitest fallback mode", () => {
    delete process.env.VITEST;

    document.body.innerHTML = '<section id="summary"></section><div class="section-nav-inner"></div>';
    const containerEl = document.querySelector(".section-nav-inner");
    const controller = createSectionNavController({
      containerEl,
      navItemsConfig: [{ id: "summary", label: "Summary" }],
    });

    expect(() => controller.buildSectionNav()).toThrow(
      "Vue runtime is required for section navigation rendering.",
    );
  });

  it("renders and tracks via injected runtime refs without relying on globals", () => {
    delete globalThis.Vue;
    document.body.innerHTML = `
      <section id="summary"></section>
      <section id="relay"></section>
      <div class="section-nav-inner"></div>
    `;

    let observerCallback;
    class MockIntersectionObserver {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
    }

    const containerEl = /** @type {HTMLElement} */ (document.querySelector(".section-nav-inner"));
    const controller = createSectionNavController({
      containerEl,
      navItemsConfig: [
        { id: "summary", label: "Summary" },
        { id: "relay", label: "Relay" },
      ],
      documentRef: document,
      windowRef: /** @type {any} */ ({
        innerHeight: 900,
        IntersectionObserver: MockIntersectionObserver,
        matchMedia: () => ({ matches: false }),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      vueRuntime: { h, render, Fragment },
    });

    controller.buildSectionNav();
    controller.setupSectionNavTracking();

    const links = Array.from(containerEl.querySelectorAll("a[data-section-id]"));
    expect(links).toHaveLength(2);

    observerCallback?.([
      { isIntersecting: true, intersectionRatio: 0.9, target: document.getElementById("relay") },
    ]);
    expect(links[1].classList.contains("active")).toBe(true);
  });
});
