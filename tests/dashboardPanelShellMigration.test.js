import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const migratedPanelIds = [
  "polls-card",
  "saved-views-card",
  "search-panel",
  "faq-card",
];

describe("dashboard panel shell migration", () => {
  it("uses sl-card shells for migrated utility panels", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");

    migratedPanelIds.forEach(id => {
      const pattern = new RegExp(`<sl-card[^>]*id="${id}"`, "i");
      expect(pattern.test(html)).toBe(true);
    });
  });
});
