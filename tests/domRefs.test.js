import { describe, it, expect } from "vitest";
import { createAppDomRefs } from "../js/appShell/domRefs.js";

describe("app shell dom refs", () => {
  it("resolves refs from an injected document", () => {
    const sandbox = document.implementation.createHTMLDocument("waan-dom-refs");
    sandbox.body.innerHTML = `
      <main id="root"></main>
      <div id="data-status"></div>
      <table id="top-senders"><tbody></tbody></table>
      <button data-participants-preset="top"></button>
      <div id="hero-milestones"><div class="hero-milestone"></div></div>
      <div data-setup-step="1"></div>
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
    expect(refs.participantPresetButtons.length).toBe(1);
    expect(refs.heroMilestoneSteps.length).toBe(1);
    expect(refs.firstRunSetupSteps.length).toBe(1);
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
});
