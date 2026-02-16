import { describe, it, expect, vi } from "vitest";

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
  it("imports and bootstraps without startup errors", async () => {
    seedMinimumDom();
    const chatSelector = document.getElementById("chat-selector");
    expect(chatSelector).toBeTruthy();

    vi.resetModules();

    await expect(import("../js/appShell.js")).resolves.toBeTruthy();

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await Promise.resolve();

    expect(chatSelector.disabled).toBe(true);
    expect(chatSelector.options.length).toBe(1);
    expect(chatSelector.options[0].textContent).toBe("No chats loaded yet");
  });
});
