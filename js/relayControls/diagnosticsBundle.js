function sanitizeFilePart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildDiagnosticsFilename({
  brandName = "waan",
  now = new Date(),
} = {}) {
  const stamp = now
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "Z");
  const label = sanitizeFilePart(brandName) || "waan";
  return `${label}_diagnostics_${stamp}.json`;
}

export function buildDiagnosticsSnapshot({
  brandName,
  relayServiceName,
  relayStatus,
  relayLogs,
  relayConnectionLabel,
  datasetLabel,
  hasData,
  remoteChatCount,
}) {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const win = typeof window !== "undefined" ? window : {};
  const tz = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "unknown";

  return {
    generatedAt: new Date().toISOString(),
    product: {
      brandName: brandName || "WAAN",
      relayServiceName: relayServiceName || "Relay",
      appVersion: win?.WAAN_CONFIG?.version || null,
    },
    relay: {
      status: relayStatus || null,
      logConnection: relayConnectionLabel || "",
      logLineCount: Array.isArray(relayLogs) ? relayLogs.length : 0,
      logs: Array.isArray(relayLogs) ? relayLogs : [],
      remoteChatCount: Number.isFinite(remoteChatCount) ? remoteChatCount : null,
    },
    dataset: {
      label: datasetLabel || null,
      hasData: Boolean(hasData),
    },
    runtime: {
      href: win?.location?.href || null,
      userAgent: nav?.userAgent || null,
      language: nav?.language || null,
      platform: nav?.platform || null,
      timezone: tz,
      viewport: {
        width: Number(win?.innerWidth) || null,
        height: Number(win?.innerHeight) || null,
        devicePixelRatio: Number(win?.devicePixelRatio) || null,
      },
    },
  };
}

function takeTail(lines = [], max = 40) {
  if (!Array.isArray(lines)) return [];
  if (max <= 0) return [];
  if (lines.length <= max) return lines.slice();
  return lines.slice(lines.length - max);
}

export function buildIssueReportBody({
  snapshot,
  maxLogLines = 40,
} = {}) {
  const safe = snapshot || {};
  const relay = safe.relay || {};
  const runtime = safe.runtime || {};
  const dataset = safe.dataset || {};
  const product = safe.product || {};
  const logTail = takeTail(relay.logs, maxLogLines);

  return [
    "## What happened?",
    "<!-- Describe the issue and expected behavior -->",
    "",
    "## Diagnostics Snapshot",
    "",
    "```json",
    JSON.stringify(
      {
        generatedAt: safe.generatedAt || null,
        product,
        relay: {
          status: relay.status || null,
          logConnection: relay.logConnection || "",
          remoteChatCount: relay.remoteChatCount ?? null,
          logLineCount: relay.logLineCount ?? 0,
        },
        dataset,
        runtime,
      },
      null,
      2
    ),
    "```",
    "",
    "## Recent Relay Logs",
    "",
    "```text",
    logTail.join("\n") || "(no logs captured)",
    "```",
    "",
    "_Tip: attach the full diagnostics JSON from `Export Diagnostics` if needed._",
  ].join("\n");
}

export function buildIssueReportUrl({
  issueBaseUrl,
  title,
  body,
} = {}) {
  const base = issueBaseUrl || "https://github.com/suyashkmr/WAAN/issues/new";
  const url = new URL(base);
  if (title) url.searchParams.set("title", title);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}
