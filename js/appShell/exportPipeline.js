export function createExportPipeline({
  getDatasetLabel,
  getExportFilterSummary,
  brandName,
}) {
  let exportWorkerInstance = null;
  let exportWorkerRequestId = 0;
  const exportWorkerRequests = new Map();

  function ensureExportWorker() {
    if (exportWorkerInstance) return exportWorkerInstance;
    exportWorkerInstance = new Worker(new URL("../exportWorker.js", import.meta.url), {
      type: "module",
    });
    exportWorkerInstance.onmessage = event => {
      const { id, type, content, error } = event.data || {};
      if (typeof id === "undefined") return;
      const request = exportWorkerRequests.get(id);
      if (!request) return;
      exportWorkerRequests.delete(id);
      if (type === "result") {
        request.resolve({ content });
      } else {
        request.reject(new Error(error || "Export worker failed."));
      }
    };
    exportWorkerInstance.onerror = event => {
      console.error("Export worker error", event);
      exportWorkerRequests.forEach(({ reject }) => reject(new Error("Export worker encountered an error.")));
      exportWorkerRequests.clear();
      exportWorkerInstance?.terminate();
      exportWorkerInstance = null;
    };
    return exportWorkerInstance;
  }

  function requestExportTask(task, payload) {
    const worker = ensureExportWorker();
    const id = ++exportWorkerRequestId;
    return new Promise((resolve, reject) => {
      exportWorkerRequests.set(id, { resolve, reject });
      worker.postMessage({ id, task, payload });
    });
  }

  function generateMarkdownReportAsync(analytics, theme) {
    return requestExportTask("markdown", {
      analytics,
      theme,
      datasetLabel: getDatasetLabel(),
      filterDetails: getExportFilterSummary(),
      brandName,
    });
  }

  function generateSlidesHtmlAsync(analytics, theme) {
    return requestExportTask("slides", {
      analytics,
      theme,
      datasetLabel: getDatasetLabel(),
      filterDetails: getExportFilterSummary(),
      brandName,
    });
  }

  function generatePdfDocumentHtmlAsync(analytics, theme) {
    return requestExportTask("pdf", {
      analytics,
      theme,
      datasetLabel: getDatasetLabel(),
      filterDetails: getExportFilterSummary(),
      brandName,
    });
  }

  return {
    generateMarkdownReportAsync,
    generateSlidesHtmlAsync,
    generatePdfDocumentHtmlAsync,
  };
}
