import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";

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
      const mountPointPattern = new RegExp(
        `<section[^>]*id="${id}"[^>]*data-vue-shell-mount="card-shell"`,
        "i",
      );
      expect(mountPointPattern.test(html)).toBe(true);
    });
  });

  it("preserves panel IDs and nav anchors for migrated Vue shell mount points", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    const windowRef = new Window();
    const doc = windowRef.document;
    doc.write(html);

    migratedPanelIds.forEach(id => {
      const section = doc.getElementById(id);
      expect(section).toBeTruthy();
      expect(section?.tagName.toLowerCase()).toBe("section");
      expect(section?.getAttribute("data-vue-shell-mount")).toBe("card-shell");
      expect(section?.getAttribute("data-nav-target")).toBeTruthy();
    });
  });
});
