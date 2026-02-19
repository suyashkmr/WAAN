import { measurePerfSync, measurePerfAsync } from "../perf.js";

export function createReportAndSearchExporters({
  getDatasetAnalytics,
  getSearchState,
  getExportThemeConfig,
  buildFilename,
  buildReportFilename,
  downloadTextFile,
  downloadCSV,
  formatTimestampDisplay,
  generateMarkdownReport,
  generateSlidesHtml,
  updateStatus,
}) {
  function exportSearchResults() {
    const state = getSearchState();
    const results = state?.results ?? [];
    if (!results.length) {
      updateStatus("Run a search before exporting.", "warning");
      return;
    }
    const rows = measurePerfSync("export.search_results.rows", () => results.map(result => [
      formatTimestampDisplay(result.timestamp),
      result.sender || "",
      (result.message || "").replace(/\r?\n/g, " "),
    ]), {
      rows: results.length,
    });
    downloadCSV(
      buildFilename("search"),
      ["Timestamp", "Participant", "Message"],
      rows,
    );
  }

  async function handleDownloadMarkdownReport() {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("Load the chat summary before exporting a report.", "warning");
      return;
    }
    const theme = getExportThemeConfig();
    try {
      const { content } = await measurePerfAsync(
        "export.report_markdown.generate",
        () => generateMarkdownReport(analytics, theme),
      );
      downloadTextFile(
        buildReportFilename("report", "md"),
        content,
        "text/markdown;charset=utf-8;",
      );
      updateStatus(`Saved the ${theme.label} text report.`, "success");
    } catch (error) {
      console.error(error);
      updateStatus("Couldn't build the text report.", "error");
    }
  }

  async function handleDownloadSlidesReport() {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("Load the chat summary before exporting a report.", "warning");
      return;
    }
    const theme = getExportThemeConfig();
    try {
      const { content } = await measurePerfAsync(
        "export.report_slides.generate",
        () => generateSlidesHtml(analytics, theme),
      );
      downloadTextFile(
        buildReportFilename("slides", "html"),
        content,
        "text/html;charset=utf-8;",
      );
      updateStatus(`Saved the ${theme.label} slide deck.`, "success");
    } catch (error) {
      console.error(error);
      updateStatus("Couldn't build the slide deck.", "error");
    }
  }

  return {
    exportSearchResults,
    handleDownloadMarkdownReport,
    handleDownloadSlidesReport,
  };
}
