import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ONBOARDING_STEPS } from "../js/appConstants.js";
import { createPdfPreviewController } from "../js/appShell/pdfPreview.js";
import { createStatusUiController } from "../js/appShell/statusUi.js";
import { createOnboardingController } from "../js/appShell/onboarding.js";
import { clearVueBridgeRuntime, installShellVueBridge } from "./vueBridgeTestUtils.js";

describe("pdf preview controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("silently no-ops when analytics are not loaded", async () => {
    const updateStatus = vi.fn();
    const controller = createPdfPreviewController({
      getDatasetAnalytics: () => null,
      getExportThemeConfig: () => ({ label: "Clean" }),
      generatePdfDocumentHtmlAsync: vi.fn(),
      updateStatus,
    });

    await controller.handleDownloadPdfReport();

    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("opens printable preview and reports success", async () => {
    const updateStatus = vi.fn();
    const emitExportSuccess = vi.fn();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    const printSpy = vi.fn();
    const focusSpy = vi.fn();
    const winEvents = new Map();

    vi.spyOn(document, "createElement").mockImplementation(tagName => {
      const element = originalCreateElement(tagName);
      if (String(tagName).toLowerCase() === "iframe") {
        Object.defineProperty(element, "src", {
          configurable: true,
          get() {
            return this._mockSrc || "";
          },
          set(value) {
            this._mockSrc = value;
          },
        });
        Object.defineProperty(element, "contentWindow", {
          configurable: true,
          value: {
            focus: focusSpy,
            print: printSpy,
            addEventListener: (name, cb) => winEvents.set(name, cb),
            removeEventListener: name => winEvents.delete(name),
          },
        });
      }
      return element;
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(node => {
      if (node.tagName === "IFRAME") {
        node.dispatchEvent(new Event("load"));
        return node;
      }
      return HTMLElement.prototype.appendChild.call(document.body, node);
    });

    const controller = createPdfPreviewController({
      getDatasetAnalytics: () => ({ total_messages: 10 }),
      getExportThemeConfig: () => ({ label: "Clean" }),
      generatePdfDocumentHtmlAsync: vi.fn(async () => ({ content: "<html></html>" })),
      updateStatus,
      emitExportSuccess,
    });

    await controller.handleDownloadPdfReport();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(updateStatus).toHaveBeenCalledWith(
      "Opened the Clean PDF preview — use your print dialog to save it.",
      "info",
    );
    expect(emitExportSuccess).toHaveBeenCalledWith("download-pdf");

    vi.advanceTimersByTime(200);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(printSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60000);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("reports errors when preview generation fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const updateStatus = vi.fn();
    const emitExportSuccess = vi.fn();
    const controller = createPdfPreviewController({
      getDatasetAnalytics: () => ({ total_messages: 2 }),
      getExportThemeConfig: () => ({ label: "Clean" }),
      generatePdfDocumentHtmlAsync: vi.fn(async () => {
        throw new Error("worker failed");
      }),
      updateStatus,
      emitExportSuccess,
    });

    await controller.handleDownloadPdfReport();

    expect(updateStatus).toHaveBeenCalledWith("Couldn't prepare the PDF preview.", "error");
    expect(emitExportSuccess).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("status ui controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    clearVueBridgeRuntime();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no-ops when shell bridge is unavailable", () => {
    const controller = createStatusUiController({ autoHideDelayMs: 100, exitDurationMs: 50 });

    expect(() => controller.showStatusMessage("Done", "success")).not.toThrow();
    expect(() => controller.beginStatusExit()).not.toThrow();
    expect(() => controller.finalizeStatusExit()).not.toThrow();
  });

  it("delegates toasts and status messages to shell bridge", () => {
    const showToast = vi.fn();
    const dismissToast = vi.fn();
    const showStatusMessage = vi.fn();
    const beginStatusExit = vi.fn();
    const finalizeStatusExit = vi.fn();
    installShellVueBridge({
      showToast,
      dismissToast,
      showStatusMessage,
      beginStatusExit,
      finalizeStatusExit,
    });
    const controller = createStatusUiController({ autoHideDelayMs: 100, exitDurationMs: 50, maxToasts: 2 });

    const toast = document.createElement("div");
    controller.showToast("one", "info", { duration: 1000 });
    controller.dismissToast(toast);
    controller.showStatusMessage("Done", "success");
    controller.beginStatusExit();
    controller.finalizeStatusExit();

    expect(showToast).toHaveBeenCalledWith("one", "info", { duration: 1000, maxToasts: 2 });
    expect(dismissToast).toHaveBeenCalledWith(toast);
    expect(showStatusMessage).toHaveBeenCalledWith("Done", "success", { autoHideDelayMs: 100, exitDurationMs: 50 });
    expect(beginStatusExit).toHaveBeenCalledWith(50);
    expect(finalizeStatusExit).toHaveBeenCalled();
  });
});

describe("onboarding controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps the QR reminder anchored to a visible setup surface", () => {
    expect(ONBOARDING_STEPS[1]).toMatchObject({
      copy: "Scan the QR code to link your phone.",
      target: "#relay-qr-container",
    });
  });

  it("starts onboarding and advances through steps", () => {
    const overlayEl = document.createElement("div");
    const copyEl = document.createElement("div");
    const stepLabelEl = document.createElement("div");
    const nextButtonEl = document.createElement("button");

    const sectionA = document.createElement("section");
    sectionA.className = "a";
    const sectionB = document.createElement("section");
    sectionB.className = "b";
    document.body.append(sectionA, sectionB);

    const scrollSpy = vi.spyOn(sectionA, "scrollIntoView").mockImplementation(() => {});

    const controller = createOnboardingController({
      overlayEl,
      copyEl,
      stepLabelEl,
      nextButtonEl,
      steps: [
        { copy: "First", target: ".a" },
        { copy: "Second", target: ".b" },
      ],
      storageKey: "test-onboarding",
    });

    controller.start();
    expect(controller.isOpen()).toBe(true);
    expect(copyEl.textContent).toBe("First");
    expect(stepLabelEl.textContent).toBe("Step 1 of 2");
    expect(nextButtonEl.textContent).toBe("Next tip");
    expect(sectionA.classList.contains("onboarding-highlight")).toBe(true);
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    controller.advance();
    expect(copyEl.textContent).toBe("Second");
    expect(nextButtonEl.textContent).toBe("Close");
    expect(sectionA.classList.contains("onboarding-highlight")).toBe(false);
    expect(sectionB.classList.contains("onboarding-highlight")).toBe(true);

    controller.advance();
    expect(controller.isOpen()).toBe(false);
    expect(localStorage.getItem("test-onboarding")).toBe("done");
    expect(document.body.classList.contains("onboarding-active")).toBe(false);
  });

  it("skip closes onboarding and respects dismissed storage state", () => {
    const overlayEl = document.createElement("div");
    const copyEl = document.createElement("div");

    const controller = createOnboardingController({
      overlayEl,
      copyEl,
      steps: [{ copy: "Only", target: "" }],
      storageKey: "test-onboarding",
    });

    controller.start();
    expect(controller.isOpen()).toBe(true);

    controller.skip();
    expect(controller.isOpen()).toBe(false);
    expect(localStorage.getItem("test-onboarding")).toBe("done");

    overlayEl.setAttribute("aria-hidden", "true");
    controller.start();
    expect(controller.isOpen()).toBe(false);
  });

  it("can reopen onboarding on demand after dismissal", () => {
    const overlayEl = document.createElement("div");
    const copyEl = document.createElement("div");

    const controller = createOnboardingController({
      overlayEl,
      copyEl,
      steps: [{ copy: "Only", target: "" }],
      storageKey: "test-onboarding",
    });

    controller.start();
    controller.skip();

    controller.start({ force: true });
    expect(controller.isOpen()).toBe(true);
    expect(copyEl.textContent).toBe("Only");
  });

  it("uses injected document and storage refs instead of ambient globals", () => {
    const overlayEl = document.createElement("div");
    const copyEl = document.createElement("div");
    const stepLabelEl = document.createElement("div");
    const nextButtonEl = document.createElement("button");
    const body = document.createElement("body");
    const section = document.createElement("section");
    section.className = "target";
    body.append(section);

    const storage = new Map();
    const storageRef = {
      getItem: vi.fn(key => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => storage.set(key, String(value))),
    };
    const documentRef = {
      body,
      querySelector: vi.fn(selector => (selector === ".target" ? section : null)),
    };
    const scrollSpy = vi.spyOn(section, "scrollIntoView").mockImplementation(() => {});

    const controller = createOnboardingController({
      overlayEl,
      copyEl,
      stepLabelEl,
      nextButtonEl,
      steps: [{ copy: "Injected", target: ".target" }],
      storageKey: "test-onboarding-injected",
      documentRef: /** @type {any} */ (documentRef),
      storageRef,
    });

    controller.start();
    expect(controller.isOpen()).toBe(true);
    expect(copyEl.textContent).toBe("Injected");
    expect(body.classList.contains("onboarding-active")).toBe(true);
    expect(documentRef.querySelector).toHaveBeenCalledWith(".target");
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    controller.advance();
    expect(body.classList.contains("onboarding-active")).toBe(false);
    expect(storageRef.setItem).toHaveBeenCalledWith("test-onboarding-injected", "done");
  });
});
