import {
  buildDiagnosticsFilename,
  buildDiagnosticsSnapshot,
  buildIssueReportBody,
  buildIssueReportUrl,
} from "./diagnosticsBundle.js";

const MAX_LOG_ENTRIES = 400;

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
}) {
  const relayLogState = {
    entries: [],
    eventSource: null,
    reconnectTimer: null,
    drawerOpen: false,
  };

  function setLogConnectionLabel(text) {
    if (logDrawerConnectionLabel) {
      logDrawerConnectionLabel.textContent = text;
    }
  }

  function renderRelayLogs() {
    if (!logDrawerList) return;
    if (!relayLogState.entries.length) {
      logDrawerList.innerHTML = '<p class="relay-log-empty">No relay logs yet.</p>';
      return;
    }
    const fragment = document.createDocumentFragment();
    relayLogState.entries.forEach(line => {
      const li = document.createElement("p");
      li.classList.add("relay-log-entry");
      li.textContent = line;
      fragment.appendChild(li);
    });
    logDrawerList.innerHTML = "";
    logDrawerList.appendChild(fragment);
    if (relayLogState.drawerOpen) {
      logDrawerList.scrollTop = logDrawerList.scrollHeight;
    }
  }

  function appendRelayLog(entry) {
    if (!logDrawerList) return;
    if (logDrawerList.firstChild?.classList?.contains?.("relay-log-empty")) {
      logDrawerList.innerHTML = "";
    }
    const p = document.createElement("p");
    p.classList.add("relay-log-entry");
    p.textContent = entry;
    logDrawerList.appendChild(p);
    while (logDrawerList.children.length > MAX_LOG_ENTRIES) {
      logDrawerList.removeChild(logDrawerList.firstChild);
    }
    if (relayLogState.drawerOpen) {
      logDrawerList.scrollTop = logDrawerList.scrollHeight;
    }
  }

  function openLogDrawer() {
    if (!logDrawerEl) return;
    logDrawerEl.setAttribute("aria-hidden", "false");
    relayLogState.drawerOpen = true;
    logDrawerToggleButton?.removeAttribute("data-has-unread");
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

  function handleLogDrawerDocumentClick(event) {
    if (!relayLogState.drawerOpen) return;
    const target = event.target;
    if (!logDrawerEl || logDrawerEl.contains(target)) return;
    if (logDrawerToggleButton && logDrawerToggleButton.contains(target)) return;
    closeLogDrawer();
  }

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

  function downloadTextFile(filename, content, mime = "application/json;charset=utf-8;") {
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
    source.onmessage = event => {
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
