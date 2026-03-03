import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusUiController } from "../js/appShell/statusUi.js";

describe("statusUi detailed", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__WAAN_VUE_SHELL_BRIDGE__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no-ops safely when bridge is unavailable", () => {
    const controller = createStatusUiController({});

    expect(() => controller.showToast("x")).not.toThrow();
    expect(() => controller.showStatusMessage("x", "info")).not.toThrow();
    expect(() => controller.beginStatusExit()).not.toThrow();
    expect(() => controller.finalizeStatusExit()).not.toThrow();

    const detachedToast = document.createElement("div");
    expect(() => controller.dismissToast(detachedToast)).not.toThrow();
  });

  it("delegates toast/status calls to Vue shell bridge when present", () => {
    const showToast = vi.fn();
    const dismissToast = vi.fn();
    const showStatusMessage = vi.fn();
    const beginStatusExit = vi.fn();
    const finalizeStatusExit = vi.fn();
    globalThis.__WAAN_VUE_SHELL_BRIDGE__ = {
      showToast,
      dismissToast,
      showStatusMessage,
      beginStatusExit,
      finalizeStatusExit,
    };

    const controller = createStatusUiController({ autoHideDelayMs: 111, exitDurationMs: 222, maxToasts: 3 });

    const toastEl = document.createElement("div");
    controller.showToast("bridge-toast", "success", { duration: 321 });
    controller.dismissToast(toastEl);
    controller.showStatusMessage("bridge-status", "warning");
    controller.beginStatusExit();
    controller.finalizeStatusExit();

    expect(showToast).toHaveBeenCalledWith("bridge-toast", "success", { duration: 321, maxToasts: 3 });
    expect(dismissToast).toHaveBeenCalledWith(toastEl);
    expect(showStatusMessage).toHaveBeenCalledWith("bridge-status", "warning", {
      autoHideDelayMs: 111,
      exitDurationMs: 222,
    });
    expect(beginStatusExit).toHaveBeenCalledWith(222);
    expect(finalizeStatusExit).toHaveBeenCalled();
  });
});
