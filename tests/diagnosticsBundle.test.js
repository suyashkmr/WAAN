import { describe, it, expect } from "vitest";
import {
  buildDiagnosticsSnapshot,
  buildIssueReportBody,
  buildIssueReportUrl,
} from "../js/relayControls/diagnosticsBundle.js";

describe("diagnosticsBundle", () => {
  it("builds issue report url with encoded body", () => {
    const snapshot = buildDiagnosticsSnapshot({
      brandName: "WAAN",
      relayServiceName: "WAAN Relay",
      relayStatus: { status: "running" },
      relayLogs: ["line-1", "line-2"],
      relayConnectionLabel: "Live",
      datasetLabel: "Demo",
      hasData: true,
      remoteChatCount: 12,
    });
    const body = buildIssueReportBody({ snapshot, maxLogLines: 1 });
    const url = buildIssueReportUrl({
      issueBaseUrl: "https://github.com/suyashkmr/WAAN/issues/new",
      title: "[Bug] ",
      body,
    });

    expect(url).toContain("issues/new");
    expect(url).toContain("title=%5BBug%5D+");
    expect(url).toContain("Recent+Relay+Logs");
    expect(url).toContain("line-2");
    expect(url).not.toContain("line-1");
  });
});
