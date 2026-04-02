// @ts-check

/**
 * @param {{
 *   getDatasetAnalytics: () => Record<string, any> | null,
 *   getExportThemeConfig: () => { label: string } & Record<string, any>,
 *   generatePdfDocumentHtmlAsync: (analytics: Record<string, any>, theme: Record<string, any>) => Promise<{ content: string }>,
 *   updateStatus: (message: string, tone: string) => void,
 *   emitExportSuccess?: (buttonId: string) => void,
 *   documentRef?: Document | null,
 *   URLRef?: typeof URL | null,
 *   BlobImpl?: typeof Blob | null,
 *   setTimeoutRef?: typeof setTimeout,
 *   clearTimeoutRef?: typeof clearTimeout,
 *   windowRef?: Window | null,
 * }} params
 */
export function createPdfPreviewController({
  getDatasetAnalytics,
  getExportThemeConfig,
  generatePdfDocumentHtmlAsync,
  updateStatus,
  emitExportSuccess = () => {},
  documentRef = typeof document !== "undefined" ? document : null,
  URLRef = typeof URL !== "undefined" ? URL : null,
  BlobImpl = typeof Blob !== "undefined" ? Blob : null,
  setTimeoutRef = globalThis.setTimeout.bind(globalThis),
  clearTimeoutRef = globalThis.clearTimeout.bind(globalThis),
  windowRef = typeof window !== "undefined" ? window : null,
}) {
  /**
   * @param {string} html
   */
  function launchPrintableDocument(html) {
    try {
      if (!documentRef?.body || !URLRef || !BlobImpl) return false;
      const blob = new BlobImpl([html], { type: "text/html" });
      const url = URLRef.createObjectURL(blob);
      // Intentional non-render DOM utility:
      // hidden iframe is used to launch browser print/save flow for generated HTML.
      const iframe = documentRef.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      const cleanup = () => {
        URLRef.revokeObjectURL(url);
        iframe.remove();
      };
      iframe.addEventListener("load", () => {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          return;
        }
        const handleAfterPrint = () => {
          win.removeEventListener("afterprint", handleAfterPrint);
          if (cleanupTimer) {
            clearTimeoutRef(cleanupTimer);
            cleanupTimer = null;
          }
          cleanup();
        };
        /** @type {number | ReturnType<typeof setTimeout> | null} */
        let cleanupTimer = windowRef?.setTimeout
          ? windowRef.setTimeout(() => {
              handleAfterPrint();
            }, 60000)
          : setTimeoutRef(() => {
              handleAfterPrint();
            }, 60000);
        win.addEventListener("afterprint", handleAfterPrint);
        setTimeoutRef(() => {
          try {
            win.focus();
            win.print();
          } catch (error) {
            console.error(error);
            cleanup();
          }
        }, 150);
      });
      iframe.addEventListener("error", cleanup);
      iframe.src = url;
      documentRef.body.appendChild(iframe);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async function handleDownloadPdfReport() {
    const analytics = getDatasetAnalytics();
    if (!analytics) return;
    const theme = getExportThemeConfig();
    try {
      const { content } = await generatePdfDocumentHtmlAsync(analytics, theme);
      const opened = launchPrintableDocument(content);
      if (opened) {
        updateStatus(`Opened the ${theme.label} PDF preview — use your print dialog to save it.`, "info");
        emitExportSuccess("download-pdf");
      } else {
        updateStatus("Couldn't prepare the PDF preview.", "error");
      }
    } catch (error) {
      console.error(error);
      updateStatus("Couldn't prepare the PDF preview.", "error");
    }
  }

  return {
    handleDownloadPdfReport,
    launchPrintableDocument,
  };
}
