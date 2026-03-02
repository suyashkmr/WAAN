import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const migratedPanelIds = [
  "insight-highlights",
  "participants",
  "hourly-activity",
  "daily-activity",
  "weekly-trend",
  "weekday-trend",
  "timeofday-trend",
  "sentiment-overview",
  "message-types",
  "polls-card",
  "saved-views-card",
  "search-panel",
  "faq-card",
];

describe("dashboard panel shell migration", () => {
  it("uses section shells for migrated utility panels", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");

    migratedPanelIds.forEach(id => {
      const pattern = new RegExp(`<section[^>]*id="${id}"`, "i");
      expect(pattern.test(html)).toBe(true);
    });
  });
});
