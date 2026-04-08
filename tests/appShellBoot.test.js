import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Fragment, h, render } from "vue";
import { VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";

function seedMinimumDom() {
  document.body.innerHTML = `
    <main></main>
    <table id="top-senders"><tbody></tbody></table>
    <div class="page-controls"><div class="control-row primary-controls" data-vue-page-controls-root="true"></div></div>
    <div class="section-nav-inner"></div>
  `;
}

describe("appShell boot", () => {
  beforeEach(() => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "complete",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete globalThis.Vue;
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
  });

  it("imports and bootstraps without startup errors", async () => {
    seedMinimumDom();
    globalThis.Vue = { h, render, Fragment };
    globalThis[VUE_RUNTIME_REGISTRY_KEY] = {
      bridges: {
        [VUE_BRIDGE_NAMES.shell]: {
          setShellActionHandlers: vi.fn(),
          dispatchShellAction: vi.fn(),
          setRelayActionHandlers: vi.fn(),
          dispatchRelayAction: vi.fn(),
        },
        [VUE_BRIDGE_NAMES.searchSaved]: {
          renderSearchPanelState: vi.fn(),
          renderSearchResults: vi.fn(),
          renderSearchInsights: vi.fn(),
          setPanelActionHandlers: vi.fn(),
        },
        [VUE_BRIDGE_NAMES.dashboardPanels]: {
          ownsParticipantInteractions: true,
          ownsActivityFilterInteractions: true,
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };
    vi.resetModules();

    await expect(import("../js/appShell.js")).resolves.toBeTruthy();
    await Promise.resolve();

    expect(document.getElementById("chat-selector")).toBeNull();
    expect(document.documentElement.dataset.waanDomRefsCaptured).toBeUndefined();
    expect(globalThis[VUE_RUNTIME_REGISTRY_KEY].bridges[VUE_BRIDGE_NAMES.shell].setShellActionHandlers).toHaveBeenCalled();
  }, 45_000);
});
