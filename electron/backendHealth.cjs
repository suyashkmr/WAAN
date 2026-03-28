const http = require("http");
const https = require("https");
const DEFAULT_PROBE_TIMEOUT_MS = 2500;

function createProbeError(message, extras = {}) {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
}

function requestJson(url, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(createProbeError(`Request failed with status ${response.statusCode}`, {
            body,
            portOccupied: true,
            responded: true,
            statusCode: response.statusCode,
          }));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(createProbeError("Invalid JSON response", {
            body,
            cause: error,
            portOccupied: true,
            responded: true,
          }));
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(createProbeError("Request timed out", {
        portOccupied: true,
        timedOut: true,
      }));
    });
    req.on("error", reject);
  });
}

function requestText(url, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(createProbeError(`Request failed with status ${response.statusCode}`, {
            body,
            portOccupied: true,
            responded: true,
            statusCode: response.statusCode,
          }));
          return;
        }
        resolve(body);
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(createProbeError("Request timed out", {
        portOccupied: true,
        timedOut: true,
      }));
    });
    req.on("error", reject);
  });
}

async function withTimeoutRetry(task, retries = 1) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const isTimeout = /timed out/i.test(String(error?.message || ""));
      if (!isTimeout || attempt === retries) {
        throw error;
      }
    }
  }
  throw lastError;
}

function isReusableRelayStatus(payload) {
  return (
    typeof payload?.status === "string"
    && typeof payload?.version === "string"
    && typeof payload?.chatCount === "number"
    && typeof payload?.syncingChats === "boolean"
  );
}

function normalizeHtmlForSourceReuse(html) {
  return String(html || "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<script[^>]+src=["']\/@vite\/client["'][^>]*>\s*<\/script>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function detectExistingBackend({
  apiBase,
  relayBase,
  timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
  expectedVersion = null,
  expectedBuildFingerprint = null,
} = {}) {
  if (!apiBase || !relayBase) {
    return {
      ok: false,
      apiHealthy: false,
      relayHealthy: false,
    };
  }

  const [apiResult, relayResult] = await Promise.allSettled([
    withTimeoutRetry(() => requestJson(`${apiBase}/health`, timeoutMs), 1),
    withTimeoutRetry(() => requestJson(`${relayBase}/relay/status`, timeoutMs), 1),
  ]);

  const apiHealth = apiResult.status === "fulfilled" ? apiResult.value : undefined;
  const relayStatus = relayResult.status === "fulfilled" ? relayResult.value : undefined;
  const apiHealthy = Boolean(apiHealth?.ok);
  const relayHealthy = isReusableRelayStatus(relayStatus);
  const apiOccupied = apiResult.status === "fulfilled"
    || Boolean(apiResult.status === "rejected" && apiResult.reason?.portOccupied);
  const relayOccupied = relayResult.status === "fulfilled"
    || Boolean(relayResult.status === "rejected" && relayResult.reason?.portOccupied);
  const apiVersionMatched = apiHealthy
    ? (!expectedVersion || apiHealth?.version === expectedVersion)
    : false;
  const relayVersionMatched = relayHealthy
    ? (!expectedVersion || relayStatus?.version === expectedVersion)
    : true;
  const apiBuildFingerprintMatched = apiHealthy
    ? (!expectedBuildFingerprint || apiHealth?.buildFingerprint === expectedBuildFingerprint)
    : false;
  const relayBuildFingerprintMatched = relayHealthy
    ? (!expectedBuildFingerprint || relayStatus?.buildFingerprint === expectedBuildFingerprint)
    : true;
  const versionMatched = apiVersionMatched && relayVersionMatched;
  const buildFingerprintMatched = apiBuildFingerprintMatched && relayBuildFingerprintMatched;

  return {
    ok: apiHealthy && relayHealthy && versionMatched && buildFingerprintMatched,
    apiHealthy,
    apiOccupied,
    relayHealthy,
    relayOccupied,
    versionMatched,
    buildFingerprintMatched,
    apiVersionMatched,
    apiBuildFingerprintMatched,
    relayVersionMatched,
    relayBuildFingerprintMatched,
    apiHealth,
    relayStatus,
  };
}

async function detectExistingClient({
  clientUrl,
  timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
  allowSourceEntry = true,
  expectedModuleEntries = null,
  expectedModuleEntrySets = null,
  expectedBuiltDocument = null,
  expectedSourceDocument = null,
  requireAllExpectedModuleEntries = false,
} = {}) {
  if (!clientUrl) return { ok: false };
  try {
    const body = await withTimeoutRetry(() => requestText(clientUrl, timeoutMs), 1);
    const hasWaanTitle = /<title>\s*WAAN\b[\s\S]*?<\/title>/i.test(body);
    const hasAppMount = /<[^>]+\bid=["']app["'][^>]*>/i.test(body);
    const moduleEntryMatches = Array.from(
      body.matchAll(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/gi),
      match => match[1],
    );
    const hasBuiltModuleEntry = moduleEntryMatches.some(src => /^\/assets\/[^"']+\.js$/i.test(src));
    const hasSourceEntry = moduleEntryMatches.includes("/src/main.js");
    const expectedEntrySets = Array.isArray(expectedModuleEntrySets) && expectedModuleEntrySets.length > 0
      ? expectedModuleEntrySets.filter(set => Array.isArray(set) && set.length > 0)
      : (Array.isArray(expectedModuleEntries) && expectedModuleEntries.length > 0 ? [expectedModuleEntries] : []);
    const hasExpectedModuleEntries = expectedEntrySets.length > 0
      ? expectedEntrySets.some(expectedEntries =>
        (requireAllExpectedModuleEntries
          ? expectedEntries.every(src => moduleEntryMatches.includes(src))
          : moduleEntryMatches.some(src => expectedEntries.includes(src))))
      : hasBuiltModuleEntry;
    const builtDocumentMatched = expectedBuiltDocument
      ? normalizeHtmlForSourceReuse(body) === normalizeHtmlForSourceReuse(expectedBuiltDocument)
      : true;
    const sourceDocumentMatched = expectedSourceDocument
      ? normalizeHtmlForSourceReuse(body) === normalizeHtmlForSourceReuse(expectedSourceDocument)
      : true;
    const builtEntryCompatible = !hasBuiltModuleEntry || builtDocumentMatched;
    const canReuseSourceEntry = allowSourceEntry
      && hasSourceEntry
      && sourceDocumentMatched
      && (expectedEntrySets.length === 0 || hasExpectedModuleEntries);
    const sourceEntryCompatible = !hasSourceEntry || sourceDocumentMatched;
    const ok = hasWaanTitle
      && hasAppMount
      && builtEntryCompatible
      && sourceEntryCompatible
      && (hasExpectedModuleEntries || canReuseSourceEntry);
    return {
      ok,
      body,
      moduleEntryMatches,
      hasWaanTitle,
      hasAppMount,
      hasExpectedModuleEntries,
      builtDocumentMatched,
      hasSourceEntry,
      sourceDocumentMatched,
      recognizedWaan: hasWaanTitle && hasAppMount,
    };
  } catch (error) {
    return {
      ok: false,
      ...(Object.prototype.hasOwnProperty.call(error || {}, "body") ? { body: error.body } : {}),
      ...(error?.portOccupied ? { portOccupied: true } : {}),
      ...(error?.responded ? { responded: true } : {}),
      ...(error?.statusCode ? { statusCode: error.statusCode } : {}),
      ...(error?.timedOut ? { timedOut: true } : {}),
    };
  }
}

module.exports = {
  DEFAULT_PROBE_TIMEOUT_MS,
  detectExistingClient,
  detectExistingBackend,
  normalizeHtmlForSourceReuse,
};
