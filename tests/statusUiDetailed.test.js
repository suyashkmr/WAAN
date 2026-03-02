import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusUiController } from "../js/appShell/statusUi.js";

describe("statusUi detailed", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__WAAN_VUE_SHELL_BRIDGE__;
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", cb => {
      cb();
      return 0;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops safely when elements are missing or detached", () => {
    const controller = createStatusUiController({ statusEl: null, toastContainer: null });

    expect(() => controller.showToast("x")).not.toThrow();
    expect(() => controller.showStatusMessage("x", "info")).not.toThrow();
    expect(() => controller.beginStatusExit()).not.toThrow();
    expect(() => controller.finalizeStatusExit()).not.toThrow();

    const detachedToast = document.createElement("div");
    expect(() => controller.dismissToast(detachedToast)).not.toThrow();
  });

  it("clears prior hide/exit timers when a new status message arrives", () => {
    const statusEl = document.createElement("div");
    statusEl.className = "hidden";
    document.body.appendChild(statusEl);

    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const controller = createStatusUiController({
      statusEl,
      toastContainer: null,
      autoHideDelayMs: 1000,
      exitDurationMs: 500,
    });

    controller.showStatusMessage("first", "warning");
    controller.beginStatusExit();

    controller.showStatusMessage("second", "error");

    expect(statusEl.textContent).toBe("second");
    expect(statusEl.classList.contains("error")).toBe(true);
    expect(statusEl.classList.contains("warning")).toBe(false);
    expect(clearSpy).toHaveBeenCalled();
  });

  it("beginStatusExit replaces previous exit timer and finalize strips tone classes", () => {
    const statusEl = document.createElement("div");
    statusEl.className = "is-active success warning error";

    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const controller = createStatusUiController({
      statusEl,
      toastContainer: null,
      autoHideDelayMs: 500,
      exitDurationMs: 300,
    });

    controller.beginStatusExit();
    controller.beginStatusExit();

    expect(statusEl.classList.contains("is-exiting")).toBe(true);
    expect(clearSpy).toHaveBeenCalled();

    controller.finalizeStatusExit();
    expect(statusEl.classList.contains("hidden")).toBe(true);
    expect(statusEl.classList.contains("is-active")).toBe(false);
    expect(statusEl.classList.contains("success")).toBe(false);
    expect(statusEl.classList.contains("warning")).toBe(false);
    expect(statusEl.classList.contains("error")).toBe(false);
  });

  it("auto-dismiss path removes toast via duration timeout", () => {
    const toastContainer = document.createElement("div");
    document.body.appendChild(toastContainer);

    const controller = createStatusUiController({
      statusEl: null,
      toastContainer,
      maxToasts: 4,
    });

    controller.showToast("auto", "info", { duration: 50 });
    expect(toastContainer.children.length).toBe(1);

    vi.advanceTimersByTime(250);
    expect(toastContainer.children.length).toBe(0);
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

    const controller = createStatusUiController({
      statusEl: null,
      toastContainer: null,
      autoHideDelayMs: 111,
      exitDurationMs: 222,
      maxToasts: 3,
    });

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
