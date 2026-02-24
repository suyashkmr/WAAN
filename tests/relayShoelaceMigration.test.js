import { describe, it, expect, beforeEach } from "vitest";
import { migrateRelayControlsToShoelace } from "../js/ui/primitives.js";

function buildRelayButtons() {
  document.body.innerHTML = `
    <button id="relay-start" class="ghost-button">Connect Relay</button>
    <button id="relay-stop" class="ghost-button" disabled>Pause Relay</button>
    <button id="relay-logout" class="ghost-button danger">Log Out</button>
    <button id="relay-reload-all" class="ghost-button small">Reload</button>
    <button id="relay-clear-storage" class="ghost-button small danger">Clear</button>
    <button id="first-run-open-relay" class="ghost-button tiny">Open Relay Controls</button>
    <button id="first-run-primary-action" class="ghost-button tiny primary">Connect Relay</button>
  `;
}

describe("relay shoelace migration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.removeItem("waan-ui-relay-legacy");
  });

  it("migrates relay action buttons to sl-button", () => {
    buildRelayButtons();
    const migrated = migrateRelayControlsToShoelace();

    expect(migrated).toBe(7);
    expect(document.querySelectorAll("sl-button")).toHaveLength(7);
    expect(document.getElementById("relay-stop-sl")?.hasAttribute("disabled")).toBe(true);
    expect(document.getElementById("relay-logout-sl")?.getAttribute("variant")).toBe("danger");
    expect(document.getElementById("first-run-primary-action-sl")?.getAttribute("variant")).toBe("primary");
    expect(document.getElementById("relay-start")?.dataset.uiPrimitiveProxy).toBe("true");
  });

  it("keeps legacy buttons when rollback key is enabled", () => {
    buildRelayButtons();
    localStorage.setItem("waan-ui-relay-legacy", "true");

    const migrated = migrateRelayControlsToShoelace();

    expect(migrated).toBe(0);
    expect(document.querySelectorAll("sl-button")).toHaveLength(0);
    expect(document.querySelectorAll("button")).toHaveLength(7);
  });

  it("preserves existing click handlers via proxy forwarding", () => {
    buildRelayButtons();
    const legacyStart = document.getElementById("relay-start");
    let clicks = 0;
    legacyStart?.addEventListener("click", () => {
      clicks += 1;
    });

    migrateRelayControlsToShoelace();
    const proxy = document.getElementById("relay-start-sl");
    proxy?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(clicks).toBe(1);
  });

  it("mirrors dynamic tooltip/accessibility attributes to proxy button", async () => {
    buildRelayButtons();
    const legacyStart = document.getElementById("relay-start");
    legacyStart?.setAttribute("title", "Connect now");
    legacyStart?.setAttribute("aria-label", "Connect relay");
    legacyStart?.setAttribute("aria-pressed", "false");

    migrateRelayControlsToShoelace();
    const proxy = document.getElementById("relay-start-sl");
    expect(proxy?.getAttribute("title")).toBe("Connect now");
    expect(proxy?.getAttribute("aria-label")).toBe("Connect relay");
    expect(proxy?.getAttribute("aria-pressed")).toBe("false");

    legacyStart?.setAttribute("title", "Disconnect now");
    legacyStart?.setAttribute("aria-pressed", "true");
    legacyStart?.removeAttribute("aria-label");
    await Promise.resolve();

    expect(proxy?.getAttribute("title")).toBe("Disconnect now");
    expect(proxy?.getAttribute("aria-pressed")).toBe("true");
    expect(proxy?.hasAttribute("aria-label")).toBe(false);
  });
});
