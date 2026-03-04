// @ts-check

/**
 * @param {{
 *   getDatasetAnalytics: () => Record<string, any> | null,
 *   getExportThemeConfig: () => { label: string } & Record<string, any>,
 *   generatePdfDocumentHtmlAsync: (analytics: Record<string, any>, theme: Record<string, any>) => Promise<{ content: string }>,
 *   updateStatus: (message: string, tone: string) => void,
 * }} params
 */
export function createPdfPreviewController({
  getDatasetAnalytics,
  getExportThemeConfig,
  generatePdfDocumentHtmlAsync,
  updateStatus,
}) {
  /**
   * @param {string} html
   */
  function launchPrintableDocument(html) {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      // Intentional non-render DOM utility:
      // hidden iframe is used to launch browser print/save flow for generated HTML.
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      const cleanup = () => {
        URL.revokeObjectURL(url);
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
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
          }
          cleanup();
        };
        /** @type {number | null} */
        let cleanupTimer = window.setTimeout(() => {
          handleAfterPrint();
        }, 60000);
        win.addEventListener("afterprint", handleAfterPrint);
        setTimeout(() => {
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
      document.body.appendChild(iframe);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async function handleDownloadPdfReport() {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("Load the chat summary before exporting a report.", "warning");
      return;
    }
    const theme = getExportThemeConfig();
    try {
      const { content } = await generatePdfDocumentHtmlAsync(analytics, theme);
      const opened = launchPrintableDocument(content);
      if (opened) {
        updateStatus(`Opened the ${theme.label} PDF preview — use your print dialog to save it.`, "info");
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
