import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { h, render } from "vue";
import { createChatSelectionController } from "../js/appShell/chatSelection.js";
import { createExportPipeline } from "../js/appShell/exportPipeline.js";

function createChatSelection(options = {}) {
  const chatSelector = document.createElement("select");
  let activeChatId = options.activeChatId ?? "";

  const controller = createChatSelectionController({
    chatSelector,
    brandName: "WAAN",
    formatNumber: value => String(value),
    formatDisplayDate: value => String(value),
    getActiveChatId: () => activeChatId,
    setActiveChatId: value => {
      activeChatId = value;
    },
  });

  return {
    controller,
    chatSelector,
    getActiveChatId: () => activeChatId,
  };
}

describe("chat selection controller", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.Vue;
    vi.restoreAllMocks();
  });

  it("renders disabled empty selector when no chats are available", async () => {
    const { controller, chatSelector } = createChatSelection();

    await controller.refreshChatSelector();

    expect(chatSelector.disabled).toBe(true);
    expect(chatSelector.options.length).toBe(1);
    expect(chatSelector.options[0].textContent).toBe("No chats loaded yet");
  });

  it("renders remote group and preserves active value", async () => {
    const { controller, chatSelector, getActiveChatId } = createChatSelection({
      activeChatId: "remote:chat-2",
    });

    controller.setRemoteChatList([
      { id: "chat-2", name: "General", messageCount: 8, lastMessageAt: "2025-01-11" },
    ]);

    await controller.refreshChatSelector();

    expect(chatSelector.disabled).toBe(false);
    expect(chatSelector.querySelectorAll("optgroup").length).toBe(1);
    expect(chatSelector.options[0].textContent).toContain("General");
    expect(chatSelector.value).toBe("remote:chat-2");
    expect(getActiveChatId()).toBe("remote:chat-2");
    expect(controller.getRemoteChatList().length).toBe(1);
    expect(controller.getRemoteChatsLastFetchedAt()).toBeGreaterThan(0);
    expect(controller.decodeChatSelectorValue("remote:abc:123")).toEqual({
      source: "remote",
      id: "abc:123",
    });
  });

  it("reloads active remote chat when forced", async () => {
    const { controller } = createChatSelection({
      activeChatId: "remote:chat-9",
    });
    const loadRemoteChat = vi.fn(async () => {});
    const target = { value: "remote:chat-9", disabled: false };

    await controller.handleChatSelectionChange(
      { target, force: true },
      {
        getChatDatasetById: vi.fn(),
        applyEntriesToApp: vi.fn(),
        loadRemoteChat,
        updateStatus: vi.fn(),
      },
    );

    expect(loadRemoteChat).toHaveBeenCalledWith("chat-9", { reloaded: true });
    expect(target.disabled).toBe(false);
  });

  it("loads remote chat and handles switch errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { controller } = createChatSelection({
      activeChatId: "remote:chat-1",
    });
    const updateStatus = vi.fn();
    const loadRemoteChat = vi.fn(async () => {
      throw new Error("network");
    });
    const target = { value: "remote:chat-9", disabled: false };

    await controller.handleChatSelectionChange(
      { target },
      {
        getChatDatasetById: vi.fn(),
        applyEntriesToApp: vi.fn(),
        loadRemoteChat,
        updateStatus,
      },
    );

    expect(loadRemoteChat).toHaveBeenCalledWith("chat-9");
    expect(updateStatus).toHaveBeenCalledWith("We couldn't switch chats.", "error");
    expect(target.disabled).toBe(false);
    errorSpy.mockRestore();
  });

  it("warns when a legacy non-remote selector value is used", async () => {
    const { controller } = createChatSelection({
      activeChatId: "remote:chat-9",
    });
    controller.setRemoteChatList([{ id: "chat-9", name: "Team" }]);
    await controller.refreshChatSelector();
    const updateStatus = vi.fn();
    const target = { value: "local:missing", disabled: false };

    await controller.handleChatSelectionChange(
      { target },
      {
        loadRemoteChat: vi.fn(),
        updateStatus,
      },
    );

    expect(updateStatus).toHaveBeenCalledWith(
      "Local chat datasets are no longer available in this build.",
      "warning",
    );
    expect(target.disabled).toBe(false);
  });

  it("renders selector options through Vue runtime", async () => {
    globalThis.Vue = { h, render };
    const { controller, chatSelector } = createChatSelection();
    chatSelector.innerHTML = '<option value="">No chats loaded yet</option>';
    controller.setRemoteChatList([{ id: "chat-22", name: "Launch Team", messageCount: 4 }]);

    await controller.refreshChatSelector();

    expect(chatSelector.querySelectorAll("optgroup").length).toBe(1);
    expect(chatSelector.options.length).toBe(1);
    expect(chatSelector.options[0].value).toBe("remote:chat-22");
    expect(chatSelector.textContent).toContain("Launch Team");
  });

  it("fails fast without Vue runtime outside Vitest fallback mode", async () => {
    delete process.env.VITEST;
    const { controller } = createChatSelection();
    await expect(controller.refreshChatSelector()).rejects.toThrow(
      "Vue runtime is required for chat selector rendering.",
    );
  });
});

describe("export pipeline", () => {
  let OriginalWorker;
  let workers;

  beforeEach(() => {
    workers = [];
    OriginalWorker = globalThis.Worker;

    globalThis.Worker = class MockWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
        this.messages = [];
        workers.push(this);
      }

      postMessage(message) {
        this.messages.push(message);
      }

      terminate() {}
    };
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
    vi.restoreAllMocks();
  });

  it("dispatches markdown task and resolves worker response", async () => {
    const pipeline = createExportPipeline({
      getDatasetLabel: () => "Demo chat",
      getExportFilterSummary: () => ["range: custom"],
      brandName: "WAAN",
    });

    const request = pipeline.generateMarkdownReportAsync({ total_messages: 1 }, { name: "clean" });
    expect(workers.length).toBe(1);
    expect(workers[0].messages.length).toBe(1);
    expect(workers[0].messages[0]).toEqual(
      expect.objectContaining({
        task: "markdown",
        payload: expect.objectContaining({
          datasetLabel: "Demo chat",
          filterDetails: ["range: custom"],
          brandName: "WAAN",
        }),
      }),
    );

    const { id } = workers[0].messages[0];
    workers[0].onmessage({ data: { id, type: "result", content: "# Report" } });

    await expect(request).resolves.toEqual({ content: "# Report" });
  });

  it("reuses a single worker and handles task-level errors", async () => {
    const pipeline = createExportPipeline({
      getDatasetLabel: () => "Demo chat",
      getExportFilterSummary: () => [],
      brandName: "WAAN",
    });

    const slides = pipeline.generateSlidesHtmlAsync({}, {});
    const pdf = pipeline.generatePdfDocumentHtmlAsync({}, {});

    expect(workers.length).toBe(1);
    const [slidesMessage, pdfMessage] = workers[0].messages;
    expect(slidesMessage.task).toBe("slides");
    expect(pdfMessage.task).toBe("pdf");

    workers[0].onmessage({
      data: { id: slidesMessage.id, type: "error", error: "slides failed" },
    });
    workers[0].onmessage({
      data: { id: pdfMessage.id, type: "result", content: "<html></html>" },
    });

    await expect(slides).rejects.toThrow("slides failed");
    await expect(pdf).resolves.toEqual({ content: "<html></html>" });
  });

  it("rejects all pending requests on worker crash and recreates worker", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const pipeline = createExportPipeline({
      getDatasetLabel: () => "Demo chat",
      getExportFilterSummary: () => [],
      brandName: "WAAN",
    });

    const first = pipeline.generateSlidesHtmlAsync({}, {});
    const second = pipeline.generatePdfDocumentHtmlAsync({}, {});
    expect(workers.length).toBe(1);

    workers[0].onerror({ message: "boom" });

    await expect(first).rejects.toThrow("Export worker encountered an error.");
    await expect(second).rejects.toThrow("Export worker encountered an error.");

    const third = pipeline.generateMarkdownReportAsync({}, {});
    expect(workers.length).toBe(2);
    const { id } = workers[1].messages[0];
    workers[1].onmessage({ data: { id, type: "result", content: "ok" } });
    await expect(third).resolves.toEqual({ content: "ok" });

    errorSpy.mockRestore();
  });
});
