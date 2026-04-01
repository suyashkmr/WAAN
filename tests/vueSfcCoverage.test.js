import { describe, expect, it } from "vitest";

describe("vue sfc coverage harness", () => {
  it("loads every SFC module under src", async () => {
    const modules = import.meta.glob("../src/**/*.vue", { eager: true });
    const entries = Object.entries(modules);
    expect(entries.length).toBeGreaterThan(0);

    for (const [, mod] of entries) {
      expect(mod).toBeTruthy();
      expect(mod.default).toBeTruthy();
    }
  });
});
