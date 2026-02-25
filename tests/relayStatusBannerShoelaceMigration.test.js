import { describe, it, expect, beforeEach } from "vitest";
import { migrateRelayStatusBannerToShoelace } from "../js/ui/primitivesMigrations.js";

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
  });

  it("migrates relay banner shell to sl-card while preserving ids/content", () => {
    seedBanner();
    const migrated = migrateRelayStatusBannerToShoelace();
    expect(migrated).toBe(true);

    const banner = document.getElementById("relay-status-banner");
    expect(banner?.tagName.toLowerCase()).toBe("sl-card");
    expect(banner?.classList.contains("relay-status-banner--shoelace")).toBe(true);
    expect(document.getElementById("relay-status-dot")).toBeTruthy();
    expect(document.getElementById("relay-status-dot")?.classList.contains("relay-banner-indicator")).toBe(true);
    expect(document.getElementById("relay-status-message")?.textContent).toContain("Relay status unknown");
    expect(document.getElementById("relay-status-meta")?.textContent).toContain("Launch relay");
  });

  it("is idempotent when banner was already migrated", () => {
    seedBanner();
    expect(migrateRelayStatusBannerToShoelace()).toBe(true);
    expect(migrateRelayStatusBannerToShoelace()).toBe(false);

    const banner = document.getElementById("relay-status-banner");
    expect(banner?.tagName.toLowerCase()).toBe("sl-card");
  });

  it("keeps status updates in sync when callers hold legacy banner reference", async () => {
    seedBanner();
    const legacyRef = document.getElementById("relay-status-banner");
    expect(migrateRelayStatusBannerToShoelace()).toBe(true);

    legacyRef.dataset.status = "running";
    await new Promise(resolve => setTimeout(resolve, 0));

    const visibleBanner = document.getElementById("relay-status-banner");
    expect(visibleBanner?.tagName.toLowerCase()).toBe("sl-card");
    expect(visibleBanner?.getAttribute("data-status")).toBe("running");
  });
});
