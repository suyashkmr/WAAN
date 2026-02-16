import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createChatSelectionController } from "../js/appShell/chatSelection.js";
import { createExportPipeline } from "../js/appShell/exportPipeline.js";

function createChatSelection(options = {}) {
  const chatSelector = document.createElement("select");
  let activeChatId = options.activeChatId ?? "";
  const listChatDatasets = vi.fn(() => options.localChats ?? []);

  const controller = createChatSelectionController({
    chatSelector,
    brandName: "ChatScope",
    formatNumber: value => String(value),
    formatDisplayDate: value => String(value),
    listChatDatasets,
    getActiveChatId: () => activeChatId,
    setActiveChatId: value => {
      activeChatId = value;
    },
  });

  return {
    controller,
    chatSelector,
    listChatDatasets,
    getActiveChatId: () => activeChatId,
  };
}

describe("chat selection controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders disabled empty selector when no chats are available", async () => {
    const { controller, chatSelector } = createChatSelection();

    await controller.refreshChatSelector();

    expect(chatSelector.disabled).toBe(true);
    expect(chatSelector.options.length).toBe(1);
    expect(chatSelector.options[0].textContent).toBe("No chats loaded yet");
  });

  it("renders local and remote groups and preserves active value", async () => {
    const { controller, chatSelector, getActiveChatId } = createChatSelection({
      activeChatId: "remote:chat-2",
      localChats: [
        {
          id: "dataset-1",
          label: "Team",
          messageCount: 12,
          dateRange: { start: "2025-01-01", end: "2025-01-10" },
        },
      ],
    });

    controller.setRemoteChatList([
      { id: "chat-2", name: "General", messageCount: 8, lastMessageAt: "2025-01-11" },
    ]);

    await controller.refreshChatSelector();

    expect(chatSelector.disabled).toBe(false);
    expect(chatSelector.querySelectorAll("optgroup").length).toBe(2);
    expect(chatSelector.options[0].textContent).toContain("Team");
    expect(chatSelector.options[1].textContent).toContain("General");
    expect(chatSelector.value).toBe("remote:chat-2");
    expect(getActiveChatId()).toBe("remote:chat-2");
    expect(controller.getRemoteChatList().length).toBe(1);
    expect(controller.getRemoteChatsLastFetchedAt()).toBeGreaterThan(0);
    expect(controller.decodeChatSelectorValue("remote:abc:123")).toEqual({
      source: "remote",
      id: "abc:123",
    });
  });

  it("loads local dataset and forwards metadata to applyEntriesToApp", async () => {
    const { controller } = createChatSelection({
      activeChatId: "remote:chat-1",
      localChats: [{ id: "dataset-1", label: "Team" }],
    });
    const target = { value: "local:dataset-1", disabled: false };
    const applyEntriesToApp = vi.fn(async () => {});

    await controller.handleChatSelectionChange(
      { target },
      {
        getChatDatasetById: vi.fn(() => ({
          id: "dataset-1",
          label: "Team",
          entries: [{ sender: "Ana", message: "hello" }],
          analytics: { total_messages: 1 },
          meta: { participants: ["Ana"] },
          participantDirectory: { participants: ["Ana"] },
        })),
        applyEntriesToApp,
        loadRemoteChat: vi.fn(),
        updateStatus: vi.fn(),
      },
    );

    expect(applyEntriesToApp).toHaveBeenCalledWith(
      [{ sender: "Ana", message: "hello" }],
      "Team",
      expect.objectContaining({
        datasetId: "dataset-1",
        statusMessage: "Switched to Team.",
        selectionValue: "local:dataset-1",
        entriesNormalized: true,
      }),
    );
    expect(target.disabled).toBe(false);
  });

  it("loads remote chat and handles switch errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { controller } = createChatSelection({
      activeChatId: "local:dataset-1",
      localChats: [{ id: "dataset-1", label: "Team" }],
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

  it("reports missing local dataset and repopulates selector", async () => {
    const { controller, listChatDatasets } = createChatSelection({
      activeChatId: "remote:chat-9",
      localChats: [{ id: "dataset-1", label: "Team" }],
    });
    const updateStatus = vi.fn();
    const target = { value: "local:missing", disabled: false };

    await controller.handleChatSelectionChange(
      { target },
      {
        getChatDatasetById: vi.fn(() => null),
        applyEntriesToApp: vi.fn(),
        loadRemoteChat: vi.fn(),
        updateStatus,
      },
    );

    expect(updateStatus).toHaveBeenCalledWith("We couldn't load that chat.", "error");
    expect(listChatDatasets).toHaveBeenCalled();
    expect(target.disabled).toBe(false);
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
      brandName: "ChatScope",
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
          brandName: "ChatScope",
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
      brandName: "ChatScope",
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
      brandName: "ChatScope",
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
