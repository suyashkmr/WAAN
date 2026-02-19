function getRelayConfig() {
  const DEFAULT_MESSAGE_LIMIT = Number(process.env.WAAN_CHAT_FETCH_LIMIT || 2500);

  const RELAY_HEADLESS =
    process.env.WAAN_RELAY_HEADLESS !== undefined
      ? process.env.WAAN_RELAY_HEADLESS === "true"
      : true;

  const RELAY_SYNC_MODE = (() => {
    const raw = (process.env.WAAN_RELAY_SYNC_MODE || "").trim().toLowerCase();
    if (raw === "auto" || raw === "primary" || raw === "fallback") {
      return raw;
    }
    // Keep primary-first behavior by default; fallback is opt-in or failover.
    return "auto";
  })();

  const PRIMARY_SYNC_RETRY_ATTEMPTS = (() => {
    const raw = Number(process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_ATTEMPTS);
    if (!Number.isFinite(raw)) return 2;
    const rounded = Math.trunc(raw);
    if (rounded < 1) return 1;
    if (rounded > 5) return 5;
    return rounded;
  })();

  const PRIMARY_SYNC_RETRY_DELAY_MS = (() => {
    const raw = Number(process.env.WAAN_RELAY_PRIMARY_SYNC_RETRY_DELAY_MS);
    if (!Number.isFinite(raw)) return 250;
    const rounded = Math.trunc(raw);
    if (rounded < 0) return 0;
    if (rounded > 5000) return 5000;
    return rounded;
  })();

  const STARTUP_PRIMARY_RESYNC_DELAY_MS = (() => {
    const raw = Number(process.env.WAAN_RELAY_STARTUP_PRIMARY_RESYNC_DELAY_MS);
    if (!Number.isFinite(raw)) return 15000;
    const rounded = Math.trunc(raw);
    if (rounded < 0) return 0;
    if (rounded > 120000) return 120000;
    return rounded;
  })();

  const RELAY_BROWSER_PATH = (() => {
    const raw = process.env.WAAN_RELAY_BROWSER_PATH;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  const RELAY_DISABLE_GPU = (() => {
    if (process.env.WAAN_RELAY_DISABLE_GPU === undefined) return true;
    return process.env.WAAN_RELAY_DISABLE_GPU === "true";
  })();

  return {
    DEFAULT_MESSAGE_LIMIT,
    RELAY_HEADLESS,
    RELAY_SYNC_MODE,
    PRIMARY_SYNC_RETRY_ATTEMPTS,
    PRIMARY_SYNC_RETRY_DELAY_MS,
    STARTUP_PRIMARY_RESYNC_DELAY_MS,
    RELAY_BROWSER_PATH,
    RELAY_DISABLE_GPU,
  };
}

module.exports = {
  getRelayConfig,
};
