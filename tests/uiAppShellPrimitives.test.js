import { describe, it, expect, beforeEach } from "vitest";
import {
  decorateToolbarRow,
  initAppShellPrimitives,
} from "../js/ui/appShellRuntimeDecorators.js";

describe("app shell primitives", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("decorates existing app shell surfaces", () => {
    document.body.innerHTML = `
      <header id="hero-panel" class="hero-shell"></header>
      <span id="hero-status-badge"></span>
      <p class="section-kicker">Overview</p>
      <nav class="section-nav"><p class="section-nav-kicker">Jump to</p><div class="section-nav-inner"></div></nav>
      <section class="card"><div class="card-header"><div class="card-title-group"></div><div class="card-header-actions"></div></div></section>
    `;
    const sectionNavInner = document.querySelector(".section-nav-inner");
    decorateToolbarRow(sectionNavInner, { role: "tablist" });
    initAppShellPrimitives({ documentRef: document });

    expect(document.getElementById("hero-panel")?.classList.contains("app-panel-shell")).toBe(false);
    expect(document.getElementById("hero-status-badge")?.classList.contains("app-status-badge")).toBe(true);
    expect(document.querySelector(".card")?.classList.contains("app-panel-shell")).toBe(true);
    expect(document.querySelector(".card-header")?.classList.contains("app-panel-header")).toBe(true);
    expect(document.querySelector(".card-header-actions")?.classList.contains("app-toolbar-row")).toBe(true);
    expect(document.querySelector(".card-header-actions")?.classList.contains("app-panel-actions")).toBe(true);
    expect(document.querySelector(".section-kicker")?.classList.contains("app-section-intro")).toBe(false);
    expect(document.querySelector(".section-nav-kicker")?.classList.contains("app-section-intro")).toBe(false);
    expect(sectionNavInner?.classList.contains("app-toolbar-row")).toBe(true);
    expect(sectionNavInner?.getAttribute("role")).toBe("tablist");
  });
});
