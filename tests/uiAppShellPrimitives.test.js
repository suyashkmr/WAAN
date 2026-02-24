import { describe, it, expect, beforeEach } from "vitest";
import {
  createPanelShell,
  createPanelHeader,
  createSectionIntro,
  createStatusBadge,
  createToolbarRow,
  createEmptyState,
  decorateToolbarRow,
  initAppShellPrimitives,
} from "../js/ui/appShellPrimitives.js";

describe("app shell primitives", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates reusable primitive elements", () => {
    const shell = createPanelShell({ documentRef: document, id: "panel-a", accent: "relay" });
    const header = createPanelHeader({ documentRef: document, title: "Relay" });
    const intro = createSectionIntro({ documentRef: document, kicker: "Jump to", title: "Overview" });
    const badge = createStatusBadge({ documentRef: document, text: "Ready", state: "ready" });
    const row = createToolbarRow({ documentRef: document, role: "toolbar" });
    const empty = createEmptyState({
      documentRef: document,
      tone: "error",
      title: "Failed",
      message: "Retry",
    });

    expect(shell?.id).toBe("panel-a");
    expect(shell?.dataset.accent).toBe("relay");
    expect(shell?.classList.contains("app-panel-shell")).toBe(true);
    expect(header?.querySelector("h2")?.textContent).toBe("Relay");
    expect(intro?.classList.contains("app-section-intro")).toBe(true);
    expect(badge?.dataset.state).toBe("ready");
    expect(row?.getAttribute("role")).toBe("toolbar");
    expect(empty?.getAttribute("role")).toBe("alert");
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
