import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";
import App from "../src/App.vue";
import { useWorkspaceStore, useWorkspaceStoreActions } from "../src/store/useWorkspaceStore.js";

describe("App hash stage routing", () => {
  const store = useWorkspaceStore();
  const storeActions = useWorkspaceStoreActions();

  beforeEach(() => {
    storeActions.resetWorkspaceState();
    document.body.innerHTML = "";
    window.location.hash = "";
  });

  afterEach(() => {
    window.location.hash = "";
    document.body.innerHTML = "";
  });

  it("selects findings stage from findings anchor hash at mount", async () => {
    window.location.hash = "#participants";
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp(App);
    app.mount(mountEl);

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.ui.activeStage).toBe("findings");
    app.unmount();
    mountEl.remove();
  });

  it("selects support stage from macOS help anchor hash at mount", async () => {
    window.location.hash = "#faq-macos-gatekeeper";
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp(App);
    app.mount(mountEl);

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.ui.activeStage).toBe("support");
    app.unmount();
    mountEl.remove();
  });

  it("selects deepdive stage from deep-dive section hash at mount", async () => {
    window.location.hash = "#weekly-trend";
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp(App);
    app.mount(mountEl);

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.ui.activeStage).toBe("deepdive");
    app.unmount();
    mountEl.remove();
  });

  it("scrolls to deep-link target after activating hidden stage", async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
    window.location.hash = "#participants";
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp(App);
    app.mount(mountEl);

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 120));

    expect(store.ui.activeStage).toBe("findings");
    expect(scrollSpy).toHaveBeenCalled();
    app.unmount();
    mountEl.remove();
    scrollSpy.mockRestore();
  });

  it("persists stage selection to hash when stage selector is clicked", async () => {
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp(App);
    app.mount(mountEl);

    await nextTick();
    const findingsButton = mountEl.querySelector('.stage-selector-button[data-stage-id="findings"]');
    expect(findingsButton).toBeTruthy();
    findingsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(store.ui.activeStage).toBe("findings");
    expect(window.location.hash).toBe("#guided-findings-stage");

    app.unmount();
    mountEl.remove();
  });

  it("keeps inactive stages hidden while preserving mounted stage DOM", async () => {
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp(App);
    app.mount(mountEl);

    await nextTick();
    expect(document.getElementById("workspace-stage")).toBeTruthy();
    expect(document.getElementById("guided-findings-stage")).toBeTruthy();
    expect(document.getElementById("deep-dive-stage")).toBeTruthy();
    expect(document.getElementById("faq-card")).toBeTruthy();
    expect(document.getElementById("guided-findings-stage")?.hasAttribute("hidden")).toBe(true);
    expect(document.getElementById("deep-dive-stage")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector('[data-stage="support"]')?.hasAttribute("hidden")).toBe(true);

    storeActions.setActiveStage("findings");
    await nextTick();
    expect(document.querySelector('[data-stage="workspace"]')?.hasAttribute("hidden")).toBe(true);
    expect(document.getElementById("guided-findings-stage")?.hasAttribute("hidden")).toBe(false);

    storeActions.setActiveStage("support");
    await nextTick();
    expect(document.getElementById("guided-findings-stage")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector('[data-stage="support"]')?.hasAttribute("hidden")).toBe(false);

    app.unmount();
    mountEl.remove();
  });
});
