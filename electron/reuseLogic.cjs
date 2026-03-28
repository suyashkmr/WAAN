const DEFAULT_RELAY_START_TIMEOUT_MS = 5000;

function shouldAutostartExistingRelay({ relayStatus, autostart } = {}) {
  return Boolean(autostart) && relayStatus?.status === "stopped";
}

async function postRelayStart(
  relayBase,
  { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_RELAY_START_TIMEOUT_MS } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch implementation is required to auto-start relay");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Relay auto-start timed out")), timeoutMs);
  try {
    const response = await fetchImpl(`${relayBase}/relay/start`, {
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Unable to auto-start relay (status ${response.status})`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  DEFAULT_RELAY_START_TIMEOUT_MS,
  postRelayStart,
  shouldAutostartExistingRelay,
};
