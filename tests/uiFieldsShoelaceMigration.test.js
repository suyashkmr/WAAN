import { describe, it, expect, beforeEach } from "vitest";
import { migrateSearchSavedViewFieldsToShoelace } from "../js/ui/primitivesFieldMigrations.js";

function seedFields() {
  document.body.innerHTML = `
    <label for="search-keyword">Keywords</label>
    <input id="search-keyword" type="text" value="launch" />
    <label for="search-start">Start date</label>
    <input id="search-start" type="date" value="2026-02-01" />
    <label for="search-end">End date</label>
    <input id="search-end" type="date" value="2026-02-24" />
    <label for="saved-view-name">Saved view name</label>
    <input id="saved-view-name" type="text" value="Morning view" />
    <label for="search-participant">Participant</label>
    <select id="search-participant">
      <option value="">All participants</option>
      <option value="alice">Alice</option>
    </select>
    <label for="saved-view-list">Saved views</label>
    <select id="saved-view-list">
      <option value="v1">View 1</option>
    </select>
    <select id="compare-view-a">
      <option value="v1">View 1</option>
    </select>
    <select id="compare-view-b">
      <option value="v2">View 2</option>
    </select>
  `;
}

describe("search/saved-view field shoelace migration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("migrates configured input/select fields to shoelace proxies", () => {
    seedFields();
    const migrated = migrateSearchSavedViewFieldsToShoelace();
    expect(migrated).toBe(8);

    expect(document.getElementById("search-keyword-sl")?.tagName.toLowerCase()).toBe("sl-input");
    expect(document.getElementById("search-participant-sl")?.tagName.toLowerCase()).toBe("sl-select");
    expect(document.getElementById("search-keyword-sl")?.classList.contains("ui-field-proxy")).toBe(true);
    expect(document.getElementById("search-participant-sl")?.classList.contains("ui-field-proxy")).toBe(true);
    expect(document.getElementById("saved-view-name")?.dataset.uiPrimitiveProxy).toBe("true");
  });

  it("rebinds label for attributes to visible shoelace proxies", () => {
    seedFields();
    migrateSearchSavedViewFieldsToShoelace();

    expect(document.querySelector('label[for="search-keyword-sl"]')).toBeTruthy();
    expect(document.querySelector('label[for="search-start-sl"]')).toBeTruthy();
    expect(document.querySelector('label[for="search-end-sl"]')).toBeTruthy();
    expect(document.querySelector('label[for="saved-view-name-sl"]')).toBeTruthy();
    expect(document.querySelector('label[for="search-participant-sl"]')).toBeTruthy();
    expect(document.querySelector('label[for="saved-view-list-sl"]')).toBeTruthy();
  });

  it("forwards field value changes from proxy to legacy controls", () => {
    seedFields();
    migrateSearchSavedViewFieldsToShoelace();

    const keywordProxy = document.getElementById("search-keyword-sl");
    keywordProxy.value = "retro plan";
    keywordProxy.dispatchEvent(new Event("sl-change"));
    expect(document.getElementById("search-keyword")?.value).toBe("retro plan");

    const participantProxy = document.getElementById("search-participant-sl");
    participantProxy.value = "alice";
    participantProxy.dispatchEvent(new Event("sl-change"));
    expect(document.getElementById("search-participant")?.value).toBe("alice");
  });

  it("syncs dynamic legacy select option updates to proxy", async () => {
    seedFields();
    migrateSearchSavedViewFieldsToShoelace();

    const legacySelect = document.getElementById("search-participant");
    const newOption = document.createElement("option");
    newOption.value = "bob";
    newOption.textContent = "Bob";
    legacySelect.appendChild(newOption);

    await new Promise(resolve => setTimeout(resolve, 0));
    const proxySelect = document.getElementById("search-participant-sl");
    expect(proxySelect.querySelectorAll("sl-option")).toHaveLength(3);
  });

  it("mirrors programmatic legacy input/select value updates to proxies", async () => {
    seedFields();
    migrateSearchSavedViewFieldsToShoelace();

    const legacyKeyword = document.getElementById("search-keyword");
    legacyKeyword.value = "state from app";

    const legacySavedView = document.getElementById("saved-view-list");
    const newOption = document.createElement("option");
    newOption.value = "v2";
    newOption.textContent = "View 2";
    legacySavedView.appendChild(newOption);
    legacySavedView.value = "v2";

    await new Promise(resolve => setTimeout(resolve, 0));

    const keywordProxy = document.getElementById("search-keyword-sl");
    const savedViewProxy = document.getElementById("saved-view-list-sl");
    expect(keywordProxy?.value).toBe("state from app");
    expect(savedViewProxy?.value).toBe("v2");
  });

  it("mirrors dynamic date bounds to sl-input proxies", async () => {
    seedFields();
    migrateSearchSavedViewFieldsToShoelace();

    const legacyStart = document.getElementById("search-start");
    const legacyEnd = document.getElementById("search-end");
    legacyStart.min = "2026-02-10";
    legacyStart.max = "2026-02-20";
    legacyEnd.min = "2026-02-11";
    legacyEnd.max = "2026-02-21";

    await new Promise(resolve => setTimeout(resolve, 0));

    const startProxy = document.getElementById("search-start-sl");
    const endProxy = document.getElementById("search-end-sl");
    expect(startProxy?.min).toBe("2026-02-10");
    expect(startProxy?.max).toBe("2026-02-20");
    expect(endProxy?.min).toBe("2026-02-11");
    expect(endProxy?.max).toBe("2026-02-21");
  });
});
