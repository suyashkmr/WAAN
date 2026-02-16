import { createExporters } from "../exporters.js";
import { createExportPipeline } from "./exportPipeline.js";
import { createPdfPreviewController } from "./pdfPreview.js";

export function createExportFilterSummary({
  normalizeRangeValue,
  getCurrentRange,
  describeRange,
  participantFilters,
}) {
  return function getExportFilterSummary() {
    const rangeValue = normalizeRangeValue(getCurrentRange());
    const rangeLabel = describeRange(rangeValue);
    const parts = [`Range: ${rangeLabel}`];
    parts.push(`Participants: ${participantFilters.sortMode === "quiet" ? "Quietest" : "Most active"}`);
    if (participantFilters.topCount > 0) {
      parts.push(`Limit: Top ${participantFilters.topCount}`);
    }
    parts.push(`Timeframe: ${participantFilters.timeframe === "week" ? "Last 7 days" : "All time"}`);
    return parts;
  };
}

export function createExportRuntime({
  brandName,
  getDatasetLabel,
  getDatasetAnalytics,
  getDatasetEntries,
  getCurrentRange,
  getParticipantView,
  getSearchState,
  updateStatus,
  formatNumber,
  formatFloat,
  formatTimestampDisplay,
  computeTimeOfDayDataset,
  formatHourLabel,
  describeRange,
  filterEntriesByRange,
  normalizeRangeValue,
  getExportThemeConfig,
  getDatasetFingerprint,
  getExportFilterSummary,
}) {
  const {
    generateMarkdownReportAsync,
    generateSlidesHtmlAsync,
    generatePdfDocumentHtmlAsync,
  } = createExportPipeline({
    getDatasetLabel,
    getExportFilterSummary,
    brandName,
  });

  const exporters = createExporters({
    getDatasetAnalytics,
    getDatasetEntries,
    getDatasetLabel,
    getCurrentRange,
    getParticipantView,
    getExportFilterSummary,
    getSearchState,
    updateStatus,
    formatNumber,
    formatFloat,
    formatTimestampDisplay,
    computeTimeOfDayDataset,
    formatHourLabel,
    describeRange,
    filterEntriesByRange,
    normalizeRangeValue,
    generateMarkdownReport: generateMarkdownReportAsync,
    generateSlidesHtml: generateSlidesHtmlAsync,
    getExportThemeConfig,
    getDatasetFingerprint,
  });

  const pdfPreviewController = createPdfPreviewController({
    getDatasetAnalytics,
    getExportThemeConfig,
    generatePdfDocumentHtmlAsync,
    updateStatus,
  });

  return {
    ...exporters,
    handleDownloadPdfReport: pdfPreviewController.handleDownloadPdfReport,
  };
}
