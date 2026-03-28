const path = require("path");
const { postRelayStart, shouldAutostartExistingRelay } = require("./reuseLogic.cjs");

function resolveReachableClientHost(host) {
  if (host === "0.0.0.0") {
    return "127.0.0.1";
  }
  if (host === "::" || host === "[::]") {
    return "::1";
  }
  return host;
}

function formatHostForUrl(host) {
  if (!host) {
    return host;
  }
  if (host.startsWith("[") && host.endsWith("]")) {
    return host;
  }
  return host.includes(":") ? `[${host}]` : host;
}

function getServerBuildFingerprint({ serverRoot, computeBuildFingerprint } = {}) {
  if (!serverRoot) {
    return null;
  }
  try {
    const { computeServerBuildFingerprint } = computeBuildFingerprint
      ? { computeServerBuildFingerprint: computeBuildFingerprint }
      : require(path.join(serverRoot, "src", "buildFingerprint.js"));
    return computeServerBuildFingerprint({ serverRoot });
  } catch {
    return null;
  }
}

function assertReusableExistingClient({ existingClient, clientUrl } = {}) {
  if (existingClient?.ok) {
    return;
  }
  if (existingClient?.recognizedWaan) {
    throw new Error(
      `Another WAAN dashboard is already running at ${clientUrl}, but it does not match this build. Stop the older WAAN dashboard and try again.`,
    );
  }
  if (
    existingClient?.portOccupied
    || Object.prototype.hasOwnProperty.call(existingClient || {}, "body")
  ) {
    throw new Error(
      `Another service is already responding at ${clientUrl}. Free that port or change WAAN_CLIENT_PORT before starting WAAN.`,
    );
  }
}

function assertReusableExistingBackend({ existingBackend, apiBase, relayBase } = {}) {
  if (existingBackend?.ok) {
    return;
  }
  if (existingBackend?.apiHealthy && existingBackend?.relayHealthy) {
    throw new Error(
      `Another WAAN backend is already running on ${apiBase} / ${relayBase}, but it does not match this build. Stop the older WAAN backend and try again.`,
    );
  }
  if (existingBackend?.apiOccupied || existingBackend?.relayOccupied) {
    throw new Error(
      `Another service is already using ${apiBase} / ${relayBase}. Free those ports or stop the older WAAN backend before starting this build.`,
    );
  }
}

async function autostartReusedRelayIfNeeded({
  relayBase,
  relayStatus,
  autostart,
  postRelayStartImpl = postRelayStart,
  onWarn = () => {},
} = {}) {
  if (!shouldAutostartExistingRelay({ relayStatus, autostart })) {
    return relayStatus;
  }
  try {
    return await postRelayStartImpl(relayBase);
  } catch (error) {
    onWarn(error);
    return relayStatus;
  }
}

module.exports = {
  assertReusableExistingBackend,
  assertReusableExistingClient,
  autostartReusedRelayIfNeeded,
  formatHostForUrl,
  getServerBuildFingerprint,
  resolveReachableClientHost,
};
