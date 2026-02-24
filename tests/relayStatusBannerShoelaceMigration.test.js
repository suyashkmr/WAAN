import { describe, it, expect, beforeEach } from "vitest";
import { migrateRelayStatusBannerToShoelace } from "../js/ui/primitives.js";

function seedBanner() {
  document.body.innerHTML = `
    <section class="relay-status-banner full-span" id="relay-status-banner" aria-live="polite" data-nav-target="relay-status">
      <div class="relay-banner-indicator" id="relay-status-dot" aria-hidden="true"></div>
      <div class="relay-banner-text">
        <p class="relay-banner-status" id="relay-status-message">Relay status unknown.</p>
        <p class="relay-banner-meta" id="relay-status-meta">Launch relay.</p>
      </div>
    </section>
  `;
}

describe("relay status banner shoelace migration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.removeItem("waan-ui-relay-legacy");
  });

  it("keeps legacy banner shell to preserve controller element references", () => {
    seedBanner();
    const migrated = migrateRelayStatusBannerToShoelace();
    expect(migrated).toBe(false);

    const banner = document.getElementById("relay-status-banner");
    expect(banner?.tagName.toLowerCase()).toBe("section");
    expect(document.getElementById("relay-status-dot")).toBeTruthy();
    expect(document.getElementById("relay-status-message")?.textContent).toContain("Relay status unknown");
    expect(document.getElementById("relay-status-meta")?.textContent).toContain("Launch relay");
  });

  it("keeps legacy banner when rollback key is enabled", () => {
    seedBanner();
    localStorage.setItem("waan-ui-relay-legacy", "true");
    const migrated = migrateRelayStatusBannerToShoelace();
    expect(migrated).toBe(false);

    const banner = document.getElementById("relay-status-banner");
    expect(banner?.tagName.toLowerCase()).toBe("section");
  });
});
