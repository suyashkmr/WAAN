import { describe, expect, it } from "vitest";
import { SECTION_NAV_ITEMS } from "../js/appConstants.js";

describe("section nav item order", () => {
  it("keeps deep-dive rail order aligned with the moved lower-half cards", () => {
    const ids = SECTION_NAV_ITEMS.map(item => item.id);

    expect(ids.indexOf("message-types")).toBeGreaterThan(ids.indexOf("deep-dive-stage"));
    expect(ids.indexOf("polls-card")).toBeGreaterThan(ids.indexOf("message-types"));
    expect(ids.indexOf("search-panel")).toBeGreaterThan(ids.indexOf("polls-card"));
    expect(ids.indexOf("saved-views-card")).toBeGreaterThan(ids.indexOf("search-panel"));
  });
});
