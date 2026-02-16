import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPdfPreviewController } from "../js/appShell/pdfPreview.js";
import { createStatusUiController } from "../js/appShell/statusUi.js";
import { createOnboardingController } from "../js/appShell/onboarding.js";

describe("pdf preview controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("warns when analytics are not loaded", async () => {
    const updateStatus = vi.fn();
    const controller = createPdfPreviewController({
      getDatasetAnalytics: () => null,
      getExportThemeConfig: () => ({ label: "Clean" }),
      generatePdfDocumentHtmlAsync: vi.fn(),
      updateStatus,
    });

    await controller.handleDownloadPdfReport();

    expect(updateStatus).toHaveBeenCalledWith(
      "Load the chat summary before exporting a report.",
      "warning",
    );
  });

  it("opens printable preview and reports success", async () => {
    const updateStatus = vi.fn();
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
    });

    await controller.handleDownloadPdfReport();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(updateStatus).toHaveBeenCalledWith(
      "Opened the Clean PDF preview — use your print dialog to save it.",
      "info",
    );

    vi.advanceTimersByTime(200);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(printSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60000);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("reports errors when preview generation fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const updateStatus = vi.fn();
    const controller = createPdfPreviewController({
      getDatasetAnalytics: () => ({ total_messages: 2 }),
      getExportThemeConfig: () => ({ label: "Clean" }),
      generatePdfDocumentHtmlAsync: vi.fn(async () => {
        throw new Error("worker failed");
      }),
      updateStatus,
    });

    await controller.handleDownloadPdfReport();

    expect(updateStatus).toHaveBeenCalledWith("Couldn't prepare the PDF preview.", "error");
    errorSpy.mockRestore();
  });
});

describe("status ui controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
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

  it("shows and auto-dismisses status messages", () => {
    const statusEl = document.createElement("div");
    statusEl.className = "hidden";

    const controller = createStatusUiController({
      statusEl,
      toastContainer: null,
      autoHideDelayMs: 100,
      exitDurationMs: 50,
    });

    controller.showStatusMessage("Done", "success");

    expect(statusEl.textContent).toBe("Done");
    expect(statusEl.classList.contains("success")).toBe(true);
    expect(statusEl.classList.contains("is-active")).toBe(true);

    vi.advanceTimersByTime(110);
    expect(statusEl.classList.contains("is-exiting")).toBe(true);

    vi.advanceTimersByTime(60);
    expect(statusEl.classList.contains("hidden")).toBe(true);
    expect(statusEl.classList.contains("is-active")).toBe(false);
  });

  it("limits and dismisses toasts", () => {
    const toastContainer = document.createElement("div");
    document.body.appendChild(toastContainer);
    const controller = createStatusUiController({
      statusEl: null,
      toastContainer,
      maxToasts: 2,
    });

    controller.showToast("one", "info", { duration: 1000 });
    controller.showToast("two", "warning", { duration: 1000 });
    controller.showToast("three", "error", { duration: 1000 });

    expect(toastContainer.children.length).toBe(2);
    expect(toastContainer.textContent).not.toContain("one");
    expect(toastContainer.textContent).toContain("two");
    expect(toastContainer.textContent).toContain("three");

    const dismissButton = toastContainer.querySelector(".toast-close");
    dismissButton.click();
    vi.advanceTimersByTime(200);
    expect(toastContainer.children.length).toBe(1);
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
    expect(nextButtonEl.textContent).toBe("Next");
    expect(sectionA.classList.contains("onboarding-highlight")).toBe(true);
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    controller.advance();
    expect(copyEl.textContent).toBe("Second");
    expect(nextButtonEl.textContent).toBe("Done");
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
});
