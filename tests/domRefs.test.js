import { describe, it, expect } from "vitest";
import { createAppDomRefs } from "../js/appShell/domRefs.js";

describe("app shell dom refs", () => {
  it("resolves refs from an injected document", () => {
    const sandbox = document.implementation.createHTMLDocument("waan-dom-refs");
    sandbox.body.innerHTML = `
      <main id="root"></main>
      <div id="data-status"></div>
      <div id="participants-note"></div>
      <table id="top-senders"><tbody></tbody></table>
      <button data-participants-preset="top"></button>
      <div id="message-types-note"></div>
      <div id="relay-sync-progress">
        <div data-step="chats"></div>
        <div data-step="messages"></div>
      </div>
      <div id="relay-sync-chats-meta"></div>
      <div id="relay-sync-messages-meta"></div>
      <div id="hero-milestones"><div class="hero-milestone"></div></div>
      <div data-setup-step="1"></div>
      <div id="polls-note"></div>
      <div class="section-nav-inner"></div>
      <input name="theme-option" value="system" />
    `;

    const windowRef = /** @type {Window} */ ({ matchMedia: () => null });
    const storageRef = /** @type {Storage} */ ({ getItem: () => null, setItem: () => {} });
    const vueRuntime = { h: () => null, render: () => null };

    const refs = createAppDomRefs({ documentRef: sandbox, windowRef, storageRef, vueRuntime });

    expect(refs.statusEl?.id).toBe("data-status");
    expect(refs.documentRef).toBe(sandbox);
    expect(refs.windowRef).toBe(windowRef);
    expect(refs.storageRef).toBe(storageRef);
    expect(refs.vueRuntime).toBe(vueRuntime);
    expect(refs.participantsBody?.tagName).toBe("TBODY");
    expect(refs.participantsNote?.id).toBe("participants-note");
    expect(refs.participantPresetButtons.length).toBe(1);
    expect(refs.messageTypeNoteEl?.id).toBe("message-types-note");
    expect(refs.relaySyncProgressEl?.id).toBe("relay-sync-progress");
    expect(refs.relaySyncChatsStep?.dataset.step).toBe("chats");
    expect(refs.relaySyncMessagesStep?.dataset.step).toBe("messages");
    expect(refs.relaySyncChatsMeta?.id).toBe("relay-sync-chats-meta");
    expect(refs.relaySyncMessagesMeta?.id).toBe("relay-sync-messages-meta");
    expect(refs.heroMilestoneSteps.length).toBe(1);
    expect(refs.firstRunSetupSteps.length).toBe(1);
    expect(refs.pollsNote?.id).toBe("polls-note");
    expect(refs.sectionNavInner?.className).toBe("section-nav-inner");
    expect(refs.dashboardRoot?.id).toBe("root");
    expect(refs.themeToggleInputs.length).toBe(1);
    expect(sandbox.documentElement.dataset.waanDomRefsCaptured).toBeUndefined();
  });

  it("marks dom refs as captured only when page controls exist", () => {
    const sandbox = document.implementation.createHTMLDocument("waan-dom-refs-page-controls");
    sandbox.body.innerHTML = `
      <main id="root"></main>
      <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      <select id="global-range"><option value="all">All time</option></select>
      <input id="custom-start" type="date" />
      <input id="custom-end" type="date" />
    `;

    createAppDomRefs({ documentRef: sandbox, windowRef: /** @type {Window} */ ({}) });

    expect(sandbox.documentElement.dataset.waanDomRefsCaptured).toBe("true");
  });

  it("does not mark dom refs as captured when only a partial page-control set exists", () => {
    const sandbox = document.implementation.createHTMLDocument("waan-dom-refs-partial-page-controls");
    sandbox.body.innerHTML = `
      <main id="root"></main>
      <select id="chat-selector"><option value="">No chats loaded yet</option></select>
      <select id="global-range"><option value="all">All time</option></select>
    `;

    createAppDomRefs({ documentRef: sandbox, windowRef: /** @type {Window} */ ({}) });

    expect(sandbox.documentElement.dataset.waanDomRefsCaptured).toBeUndefined();
  });
});
