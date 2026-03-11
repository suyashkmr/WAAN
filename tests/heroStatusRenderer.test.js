import { describe, expect, it } from "vitest";
import { h, render } from "vue";

import { createHeroStatusRenderer } from "../js/vue/heroStatusRenderer.js";

describe("heroStatusRenderer", () => {
  it("renders hero text/state through Vue runtime when available", () => {
    const dashboardRoot = document.createElement("main");
    const heroStatusBadge = document.createElement("span");
    const heroStatusCopy = document.createElement("span");
    const heroStatusMetaCopy = document.createElement("span");
    const heroSyncDot = document.createElement("span");
    const readyStep = document.createElement("span");
    readyStep.dataset.step = "ready";

    const renderer = createHeroStatusRenderer({
      elements: {
        dashboardRoot,
        heroStatusBadge,
        heroStatusCopy,
        heroStatusMetaCopy,
        heroSyncDot,
        heroMilestoneSteps: [readyStep],
      },
      vueRuntime: { h, render },
    });

    renderer.setDashboardLoadingState(true);
    renderer.setDashboardSyncState(true);
    renderer.renderBadge({ text: "Relay connected", state: "ready", readyCelebrating: true });
    renderer.renderCopy("Insights are ready.");
    renderer.renderSyncMeta({ state: "ready", message: "Last updated 10:42" });
    renderer.renderMilestones({ connect: "complete", sync: "complete", ready: "complete", readyCelebrating: true });

    expect(dashboardRoot.classList.contains("is-loading")).toBe(true);
    expect(dashboardRoot.classList.contains("is-syncing")).toBe(true);
    expect(heroStatusBadge.textContent).toBe("Relay connected");
    expect(heroStatusBadge.dataset.state).toBe("ready");
    expect(heroStatusBadge.classList.contains("hero-status-badge-ready")).toBe(true);
    expect(heroStatusCopy.textContent).toBe("Insights are ready.");
    expect(heroStatusMetaCopy.textContent).toBe("Last updated 10:42");
    expect(heroSyncDot.dataset.state).toBe("ready");
    expect(readyStep.dataset.state).toBe("complete");
    expect(readyStep.classList.contains("is-ready-celebration")).toBe(true);
  });

  it("clears pre-rendered hero placeholder text on first Vue mount", () => {
    const heroStatusBadge = document.createElement("span");
    heroStatusBadge.textContent = "Not connected";
    const heroStatusCopy = document.createElement("span");
    heroStatusCopy.textContent = "Open Relay Controls, then press Connect to begin.";
    const heroStatusMetaCopy = document.createElement("span");
    heroStatusMetaCopy.textContent = "Awaiting relay.";
    const heroSyncDot = document.createElement("span");

    const renderer = createHeroStatusRenderer({
      elements: {
        heroStatusBadge,
        heroStatusCopy,
        heroStatusMetaCopy,
        heroSyncDot,
        heroMilestoneSteps: [],
      },
      vueRuntime: { h, render },
    });

    renderer.renderBadge({ text: "Connected • Alice", state: "ready" });
    renderer.renderCopy("42 chats indexed. Insights are ready.");
    renderer.renderSyncMeta({ state: "ready", message: "Last updated 12:18" });

    expect(heroStatusBadge.textContent).toBe("Connected • Alice");
    expect(heroStatusCopy.textContent).toBe("42 chats indexed. Insights are ready.");
    expect(heroStatusMetaCopy.textContent).toBe("Last updated 12:18");
  });

  it("requires a Vue runtime with h/render", () => {
    expect(() =>
      createHeroStatusRenderer({
        elements: {
          heroStatusBadge: document.createElement("span"),
          heroStatusCopy: document.createElement("span"),
          heroStatusMetaCopy: document.createElement("span"),
          heroSyncDot: document.createElement("span"),
          heroMilestoneSteps: [],
        },
        vueRuntime: null,
      }).renderBadge({ text: "Not connected", state: "offline" }),
    ).toThrow(/requires a Vue runtime/);
  });
});
