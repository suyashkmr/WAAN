import { describe, expect, it } from "vitest";

import { syncPrimeDateBridge } from "../js/vue/primeDateBridge.js";
import { syncPrimeSelectBridge } from "../js/vue/primeSelectBridge.js";

describe("prime bridge fallback contract", () => {
  it("allows explicit native fallback mode when Vue/PrimeVue bridge prerequisites are missing", () => {
    const selectEl = document.createElement("select");
    const inputEl = document.createElement("input");
    inputEl.type = "date";

    expect(syncPrimeSelectBridge({
      selectEl,
      options: [{ value: "all", label: "All time" }],
      value: "all",
      globalScope: { __WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__: true },
    })).toBe(false);

    expect(syncPrimeDateBridge({
      inputEl,
      value: "2026-03-12",
      globalScope: { __WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__: true },
    })).toBe(false);
  });

  it("fails hard when native bridge fallback is explicitly disabled", () => {
    const selectEl = document.createElement("select");
    const inputEl = document.createElement("input");
    inputEl.type = "date";
    const globalScope = { __WAAN_DISABLE_NATIVE_BRIDGE_FALLBACKS__: true };

    expect(() =>
      syncPrimeSelectBridge({
        selectEl,
        options: [{ value: "all", label: "All time" }],
        value: "all",
        globalScope,
      }),
    ).toThrow(/PrimeVue Select\/Dropdown/);

    expect(() =>
      syncPrimeDateBridge({
        inputEl,
        value: "2026-03-12",
        globalScope,
      }),
    ).toThrow(/PrimeVue DatePicker\/Calendar/);
  });
});
