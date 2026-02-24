import { describe, it, expect, beforeEach } from "vitest";
import { migrateSearchFilterSavedExportControlsToShoelace } from "../js/ui/primitivesMigrations.js";

function seedControls() {
  document.body.innerHTML = `
    <button id="download-pdf" class="ghost-button">Save as PDF</button>
    <button id="run-search" type="submit" class="ghost-button">Search messages</button>
    <button id="reset-search" class="ghost-button">Clear filters</button>
    <button id="save-view" class="ghost-button">Save current view</button>
    <button id="compare-views" class="ghost-button">Compare views</button>
  `;
}

describe("search/filter/saved/export control shoelace migration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("migrates configured control buttons to sl-button proxies", () => {
    seedControls();
    const migrated = migrateSearchFilterSavedExportControlsToShoelace();
    expect(migrated).toBe(5);

    expect(document.getElementById("download-pdf-sl")?.tagName.toLowerCase()).toBe("sl-button");
    expect(document.getElementById("run-search-sl")?.tagName.toLowerCase()).toBe("sl-button");
    expect(document.getElementById("save-view-sl")?.tagName.toLowerCase()).toBe("sl-button");
    expect(document.getElementById("download-pdf")?.dataset.uiPrimitiveProxy).toBe("true");
  });

  it("forwards proxy clicks to existing legacy handlers", () => {
    seedControls();
    let clicks = 0;
    document.getElementById("run-search")?.addEventListener("click", () => {
      clicks += 1;
    });

    migrateSearchFilterSavedExportControlsToShoelace();
    document.getElementById("run-search-sl")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicks).toBe(1);
  });
});
