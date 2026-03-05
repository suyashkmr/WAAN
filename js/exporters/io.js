export function createExportFileHelpers({
  getDatasetLabel,
  getCurrentRange,
  describeRange,
  documentRef = typeof document !== "undefined" ? document : null,
  URLRef = typeof URL !== "undefined" ? URL : null,
  BlobImpl = typeof Blob !== "undefined" ? Blob : null,
}) {
  // Intentional non-render DOM utility:
  // export/download flows require a transient anchor click to trigger browser file saves.
  function buildFilename(suffix) {
    const label = (getDatasetLabel() || "relay-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const range = describeRange(getCurrentRange());
    return `${label}_${range.replace(/[^a-z0-9]+/gi, "-")}_${suffix}.csv`;
  }

  function buildReportFilename(suffix, extension) {
    const label = (getDatasetLabel() || "relay-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const range = describeRange(getCurrentRange());
    const sanitizedRange = range.replace(/[^a-z0-9]+/gi, "-");
    return `${label}_${sanitizedRange}_${suffix}.${extension}`;
  }

  function downloadTextFile(filename, content, mime) {
    if (!documentRef?.body || !URLRef || typeof URLRef.createObjectURL !== "function" || !BlobImpl) return false;
    const blob = new BlobImpl([content], { type: mime });
    const url = URLRef.createObjectURL(blob);
    const link = documentRef.createElement("a");
    link.href = url;
    link.download = filename;
    documentRef.body.appendChild(link);
    link.click();
    documentRef.body.removeChild(link);
    URLRef.revokeObjectURL(url);
    return true;
  }

  function downloadCSV(filename, headers, rows) {
    if (!rows.length) return false;
    const escape = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(escape).join(","),
      ...rows.map(row => row.map(escape).join(",")),
    ];
    return downloadTextFile(filename, csvLines.join("\r\n"), "text/csv;charset=utf-8;");
  }

  return {
    buildFilename,
    buildReportFilename,
    downloadTextFile,
    downloadCSV,
  };
}
