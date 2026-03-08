import { afterEach, describe, it, expect, vi } from "vitest";
import { Fragment, h, render } from "vue";
import { VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";

function seedMinimumDom() {
  document.body.innerHTML = `
    <main></main>
    <table id="top-senders"><tbody></tbody></table>
    <select id="chat-selector"></select>
    <select id="global-range"></select>
    <div class="section-nav-inner"></div>
  `;
}

describe("appShell boot", () => {
  afterEach(() => {
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
          setPanelActionHandlers: vi.fn(() => true),
        },
      },
    };
    const chatSelector = document.getElementById("chat-selector");
    expect(chatSelector).toBeTruthy();

    vi.resetModules();

    await expect(import("../js/appShell.js")).resolves.toBeTruthy();

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await Promise.resolve();

    expect(chatSelector.disabled).toBe(true);
    expect(chatSelector.options.length).toBe(1);
    expect(chatSelector.options[0].textContent).toBe("No chats loaded yet");
  }, 15_000);
});
