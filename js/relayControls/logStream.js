// @ts-check

import {
  buildDiagnosticsFilename,
  buildDiagnosticsSnapshot,
  buildIssueReportBody,
  buildIssueReportUrl,
} from "./diagnosticsBundle.js";

const MAX_LOG_ENTRIES = 400;

/**
 * @param {Record<string, any>} params
 */
export function createRelayLogController({
  brandName,
  relayServiceName,
  relayBase,
  logDrawerToggleButton,
  logDrawerEl,
  logDrawerList,
  logDrawerConnectionLabel,
  issueBaseUrl,
  getRelayStatus,
  getDatasetLabel,
  getDataAvailable,
  getRemoteChatCount,
  fetchJson,
  updateStatus,
  vueRuntime = null,
  globalScope = globalThis,
}) {
  const relayLogState = {
    /** @type {string[]} */
    entries: [],
    /** @type {EventSource | null} */
    eventSource: null,
    /** @type {ReturnType<typeof setTimeout> | null} */
    reconnectTimer: null,
    drawerOpen: false,
    vueMounted: false,
    connectionLabel: "",
  };

  /**
   * @param {string} text
   */
  function setLogConnectionLabel(text) {
    relayLogState.connectionLabel = String(text || "");
    renderRelayLogConnectionLabel();
  }

  function getRelayLogVueRuntime() {
    const candidate = vueRuntime || /** @type {any} */ (globalScope)?.Vue || null;
    const canRenderWithVue = Boolean(
      candidate &&
      typeof candidate.h === "function" &&
      typeof candidate.render === "function" &&
      candidate.Fragment,
    );
    if (!canRenderWithVue) {
      throw new Error("Vue runtime is required for relay log rendering.");
    }
    return candidate;
  }

  function renderRelayLogConnectionLabel() {
    if (!logDrawerConnectionLabel) return;
    const candidate = vueRuntime || /** @type {any} */ (globalScope)?.Vue || null;
    const canRenderWithVue = Boolean(
      candidate &&
      typeof candidate.h === "function" &&
      typeof candidate.render === "function",
    );
    if (!canRenderWithVue) {
      logDrawerConnectionLabel.textContent = relayLogState.connectionLabel;
      return;
    }
    const { h, render } = /** @type {{ h: (...args: any[]) => any, render: (...args: any[]) => any }} */ (candidate);
    render(relayLogState.connectionLabel ? h("span", null, relayLogState.connectionLabel) : null, logDrawerConnectionLabel);
  }

  function renderRelayLogs() {
    if (!logDrawerList) return;
    const { h, render, Fragment } = getRelayLogVueRuntime();
    const runtimeScope = /** @type {any} */ (globalScope);
    const DataView = runtimeScope?.PrimeVue?.DataView || runtimeScope?.primevue?.DataView || null;
    const usePrimeDataView = Boolean(DataView && (typeof DataView === "function" || typeof DataView === "object"));
    if (!relayLogState.vueMounted) {
      logDrawerList.textContent = "";
      relayLogState.vueMounted = true;
    }
    if (!relayLogState.entries.length) {
      render(h("p", { class: "relay-log-empty" }, UI_COPY.relayLog.empty), logDrawerList);
      return;
    }
    const entries = relayLogState.entries.map((line, index) => ({
      key: `${index}-${line}`,
      line,
    }));
    render(usePrimeDataView
      ? h(DataView, {
        value: entries,
        layout: "list",
        unstyled: true,
        "data-ui-runtime": "primevue",
      }, {
        list: (/** @type {any} */ slotProps) => {
          const items = Array.isArray(slotProps?.items) ? slotProps.items : entries;
          return items.map((/** @type {any} */ item) => h("p", { class: "relay-log-entry", key: item.key }, item.line));
        },
      })
      : h(
        Fragment,
        null,
        relayLogState.entries.map((line, index) =>
          h("p", { class: "relay-log-entry", key: `${index}-${line}` }, line)),
      ), logDrawerList);
    if (relayLogState.drawerOpen) {
      logDrawerList.scrollTop = logDrawerList.scrollHeight;
    }
  }

  /**
   * @param {string} _entry
   */
  function appendRelayLog(/** @type {string} */ _entry) {
    if (!logDrawerList) return;
    void _entry;
    renderRelayLogs();
  }

  function openLogDrawer() {
    if (!logDrawerEl) return;
    logDrawerEl.setAttribute("aria-hidden", "false");
    relayLogState.drawerOpen = true;
    logDrawerToggleButton?.removeAttribute("data-has-unread");
    renderRelayLogConnectionLabel();
    renderRelayLogs();
  }

  function closeLogDrawer() {
    if (!logDrawerEl) return;
    logDrawerEl.setAttribute("aria-hidden", "true");
    relayLogState.drawerOpen = false;
  }

  function isLogDrawerOpen() {
    return relayLogState.drawerOpen;
  }

  /**
   * @param {MouseEvent} event
   */
  function handleLogDrawerDocumentClick(event) {
    if (!relayLogState.drawerOpen) return;
    const target = event.target;
    if (!logDrawerEl || logDrawerEl.contains(target)) return;
    if (logDrawerToggleButton && logDrawerToggleButton.contains(target)) return;
    closeLogDrawer();
  }

  /**
   * @param {KeyboardEvent} event
   */
  function handleLogDrawerKeydown(event) {
    if (event.key === "Escape" && relayLogState.drawerOpen) {
      closeLogDrawer();
    }
  }

  async function handleLogClear() {
    if (!relayBase) return;
    try {
      await fetchJson(`${relayBase}/relay/logs/clear`, { method: "POST" });
      relayLogState.entries = [];
      logDrawerToggleButton?.removeAttribute("data-has-unread");
      renderRelayLogs();
    } catch (error) {
      console.error("Failed to clear logs", error);
      updateStatus("Couldn't clear the relay logs.", "warning");
    }
  }

  /**
   * @param {string} filename
   * @param {string} content
   * @param {string} [mime]
   */
  function downloadTextFile(filename, content, mime = "application/json;charset=utf-8;") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    // Intentional non-render DOM utility for browser file-download initiation.
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportDiagnostics() {
    try {
      const payload = buildDiagnosticsSnapshot({
        brandName,
        relayServiceName,
        relayStatus: getRelayStatus?.() || null,
        relayLogs: relayLogState.entries.slice(),
        relayConnectionLabel: logDrawerConnectionLabel?.textContent || "",
        datasetLabel: getDatasetLabel?.() || null,
        hasData: getDataAvailable?.() || false,
        remoteChatCount: getRemoteChatCount?.(),
      });
      const filename = buildDiagnosticsFilename({ brandName, now: new Date() });
      downloadTextFile(filename, JSON.stringify(payload, null, 2));
      updateStatus("Downloaded diagnostics bundle.", "success");
    } catch (error) {
      console.error("Failed to export diagnostics bundle", error);
      updateStatus("Couldn't export diagnostics bundle.", "warning");
    }
  }

  function handleReportIssue() {
    try {
      const snapshot = buildDiagnosticsSnapshot({
        brandName,
        relayServiceName,
        relayStatus: getRelayStatus?.() || null,
        relayLogs: relayLogState.entries.slice(),
        relayConnectionLabel: logDrawerConnectionLabel?.textContent || "",
        datasetLabel: getDatasetLabel?.() || null,
        hasData: getDataAvailable?.() || false,
        remoteChatCount: getRemoteChatCount?.(),
      });
      const body = buildIssueReportBody({ snapshot, maxLogLines: 40 });
      const url = buildIssueReportUrl({
        issueBaseUrl,
        title: "[Bug] ",
        body,
      });
      if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      updateStatus("Opened prefilled issue report.", "info");
    } catch (error) {
      console.error("Failed to open issue report", error);
      updateStatus("Couldn't open prefilled issue report.", "warning");
    }
  }

  function initLogStream() {
    if (!relayBase || relayLogState.eventSource) return;
    if (typeof EventSource === "undefined") {
      setLogConnectionLabel("Live log stream not available in this environment.");
      return;
    }
    const source = new EventSource(`${relayBase}/relay/logs/stream`);
    relayLogState.eventSource = source;
    setLogConnectionLabel("Connecting…");
    source.onopen = () => {
      setLogConnectionLabel("Live log stream");
    };
    source.onmessage = (/** @type {MessageEvent} */ event) => {
      relayLogState.entries.push(event.data);
      if (relayLogState.entries.length > MAX_LOG_ENTRIES) {
        relayLogState.entries.splice(0, relayLogState.entries.length - MAX_LOG_ENTRIES);
      }
      appendRelayLog(event.data);
      if (!relayLogState.drawerOpen) {
        logDrawerToggleButton?.setAttribute("data-has-unread", "true");
      }
    };
    source.onerror = () => {
      setLogConnectionLabel("Log stream disconnected. Retrying…");
      source.close();
      relayLogState.eventSource = null;
      if (!relayLogState.reconnectTimer) {
        relayLogState.reconnectTimer = setTimeout(() => {
          relayLogState.reconnectTimer = null;
          initLogStream();
        }, 5000);
      }
    };
  }

  return {
    openLogDrawer,
    closeLogDrawer,
    isLogDrawerOpen,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
    handleLogClear,
    handleExportDiagnostics,
    handleReportIssue,
    initLogStream,
  };
}
import { UI_COPY } from "../uiCopy.js";
