import { describe, it, expect } from "vitest";
import {
  WAAN_UI_RUNTIME_KEY,
  getUiRuntimeState,
  initUiRuntime,
} from "../js/ui/primitivesRuntime.js";

describe("ui primitives runtime", () => {
  it("captures Vue/PrimeVue runtime availability", () => {
    const mockWindow = {
      Vue: {},
      PrimeVue: {
        Config: {},
        Card: {},
      },
    };
    const state = getUiRuntimeState({ windowRef: mockWindow });
    expect(state.vue.available).toBe(true);
    expect(state.primevue.available).toBe(true);
    expect(state.primevue.configAvailable).toBe(true);
    expect(state.primevue.cardAvailable).toBe(true);
  });

  it("initializes runtime state and mirrors flags on the document root", () => {
    const doc = document.implementation.createHTMLDocument("runtime");
    const observerStub = class {
      observe() {}
      disconnect() {}
    };
    const mockWindow = {
      MutationObserver: observerStub,
      Vue: { h: () => ({}) },
      primevue: { Config: {} },
    };

    const { runtime, cleanup, vuePrimitiveComposables } = initUiRuntime({
      windowRef: mockWindow,
      documentRef: doc,
    });

    expect(mockWindow[WAAN_UI_RUNTIME_KEY]).toEqual(runtime);
    expect(doc.documentElement.dataset.vueRuntime).toBe("ready");
    expect(doc.documentElement.dataset.primevueRuntime).toBe("ready");
    expect(vuePrimitiveComposables).toBeTruthy();
    expect(typeof cleanup).toBe("function");
  });
});
