import {
  buildMarkdownReport,
  buildSlidesHtml,
  buildPdfDocumentHtml,
} from "./exportShared.js";

self.onmessage = event => {
  const { id, task, payload } = event.data || {};
  if (typeof id === "undefined") return;
  try {
    if (task === "markdown") {
      const content = buildMarkdownReport(payload);
      self.postMessage({ id, type: "result", content });
    } else if (task === "slides") {
      const content = buildSlidesHtml(payload);
      self.postMessage({ id, type: "result", content });
    } else if (task === "pdf") {
      const content = buildPdfDocumentHtml(payload);
      self.postMessage({ id, type: "result", content });
    } else {
      throw new Error(`Unknown export task: ${task}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, type: "error", error: message });
  }
};
