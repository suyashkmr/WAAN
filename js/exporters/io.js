export function createExportFileHelpers({
  getDatasetLabel,
  getCurrentRange,
  describeRange,
}) {
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
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadCSV(filename, headers, rows) {
    if (!rows.length) return;
    const escape = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(escape).join(","),
      ...rows.map(row => row.map(escape).join(",")),
    ];
    downloadTextFile(filename, csvLines.join("\r\n"), "text/csv;charset=utf-8;");
  }

  return {
    buildFilename,
    buildReportFilename,
    downloadTextFile,
    downloadCSV,
  };
}
