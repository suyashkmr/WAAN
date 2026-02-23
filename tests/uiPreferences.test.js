import { describe, it, expect, vi } from "vitest";
import { createCompactModeManager } from "../js/ui/preferences.js";

describe("ui preferences module", () => {
  it("can be imported when localStorage access throws", async () => {
    vi.resetModules();
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    try {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        get() {
          throw new Error("storage blocked");
        },
      });

      await expect(import("../js/ui/preferences.js")).resolves.toBeTruthy();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, "localStorage", originalDescriptor);
      } else {
        delete globalThis.localStorage;
      }
    }
  });

  it("applies compact mode using injected document and storage refs", () => {
    const toggle = document.createElement("button");
    const storage = {
      getItem: vi.fn(() => "true"),
      setItem: vi.fn(),
    };
    const showToast = vi.fn();
    const manager = createCompactModeManager({
      toggle,
      showToast,
      documentRef: document,
      storageRef: storage,
      storageKey: "compact-test",
    });

    manager.init();
    expect(document.body.dataset.compact).toBe("true");
    expect(toggle.textContent).toBe("Comfort mode");

    toggle.click();
    expect(storage.setItem).toHaveBeenCalledWith("compact-test", "false");
    expect(showToast).toHaveBeenCalledWith("Comfort mode enabled.", "info", { duration: 3000 });
  });
});
