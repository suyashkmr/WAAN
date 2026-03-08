import { describe, expect, it } from "vitest";
import { h, render } from "vue";

import { createRelayStatusRenderer } from "../js/vue/relayStatusRenderer.js";

describe("relayStatusRenderer", () => {
  it("renders relay status surface through Vue when runtime is available", () => {
    const relayStatusEl = document.createElement("div");
    const relayAccountEl = document.createElement("div");
    const relayQrContainer = document.createElement("div");
    relayQrContainer.classList.add("hidden");
    const relayQrImage = document.createElement("img");
    const relayHelpText = document.createElement("div");

    const renderer = createRelayStatusRenderer({
      elements: {
        relayStatusEl,
        relayAccountEl,
        relayQrContainer,
        relayQrImage,
        relayHelpText,
      },
      vueRuntime: { h, render },
    });

    renderer.renderStatusSurface({
      statusText: "Relay connected.",
      accountText: "Logged in as Alice",
      helpText: "Pick a chat.",
      qrSrc: "data:image/png;base64,abc",
    });

    expect(relayStatusEl.textContent).toBe("Relay connected.");
    expect(relayAccountEl.textContent).toBe("Logged in as Alice");
    expect(relayHelpText.textContent).toBe("Pick a chat.");
    expect(relayQrImage.getAttribute("src")).toBe("data:image/png;base64,abc");
    expect(relayQrContainer.classList.contains("hidden")).toBe(false);
  });

  it("falls back to direct DOM writes when Vue is unavailable", () => {
    const relayStatusEl = document.createElement("div");
    const relayAccountEl = document.createElement("div");
    const relayQrContainer = document.createElement("div");
    const relayQrImage = document.createElement("img");
    relayQrImage.setAttribute("src", "data:image/png;base64,old");
    const relayHelpText = document.createElement("div");

    const renderer = createRelayStatusRenderer({
      elements: {
        relayStatusEl,
        relayAccountEl,
        relayQrContainer,
        relayQrImage,
        relayHelpText,
      },
      vueRuntime: null,
      globalScope: {},
    });

    renderer.renderStatusSurface({
      statusText: "Relay offline.",
      accountText: "",
      helpText: "Press Connect.",
      qrSrc: null,
    });

    expect(relayStatusEl.textContent).toBe("Relay offline.");
    expect(relayAccountEl.textContent).toBe("");
    expect(relayHelpText.textContent).toBe("Press Connect.");
    expect(relayQrImage.hasAttribute("src")).toBe(false);
    expect(relayQrContainer.classList.contains("hidden")).toBe(true);
  });

  it("clears pre-rendered relay placeholder text on first Vue mount", () => {
    const relayStatusEl = document.createElement("div");
    relayStatusEl.textContent = "Relay offline.";
    const relayAccountEl = document.createElement("div");
    relayAccountEl.textContent = "Logged in as nobody";
    const relayQrContainer = document.createElement("div");
    const relayQrImage = document.createElement("img");
    const relayHelpText = document.createElement("div");
    relayHelpText.textContent = "Need to start manually?";

    const renderer = createRelayStatusRenderer({
      elements: {
        relayStatusEl,
        relayAccountEl,
        relayQrContainer,
        relayQrImage,
        relayHelpText,
      },
      vueRuntime: { h, render },
    });

    renderer.renderStatusSurface({
      statusText: "Relay connected.",
      accountText: "Logged in as Alice",
      helpText: "Your mirrored WAAN chats appear under “Loaded chats”. Pick one to view insights.",
      qrSrc: null,
    });

    expect(relayStatusEl.textContent).toBe("Relay connected.");
    expect(relayAccountEl.textContent).toBe("Logged in as Alice");
    expect(relayHelpText.textContent).toBe("Your mirrored WAAN chats appear under “Loaded chats”. Pick one to view insights.");
  });
});
