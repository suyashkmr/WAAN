const runtimeConfig =
  typeof window !== "undefined" && window?.WAAN_CONFIG
    ? window.WAAN_CONFIG
    : {};

export const BRAND_NAME = "ChatScope";
export const RELAY_SERVICE_NAME = "ChatScope Relay";
export const RELAY_CLIENT_LABEL = "ChatScope Relay";
export const ISSUE_REPORT_BASE_URL = "https://github.com/suyashkmr/WAAN/issues/new";

export const API_BASE = runtimeConfig.apiBase || "http://127.0.0.1:3334/api";
export const RELAY_BASE = runtimeConfig.relayBase || "http://127.0.0.1:4546";

export const RELAY_POLL_INTERVAL_MS = 5000;
export const REMOTE_CHAT_REFRESH_INTERVAL_MS = 20000;
export const REMOTE_MESSAGE_LIMIT = Number(runtimeConfig.remoteMessageLimit) || 50000;

export const STATUS_AUTO_HIDE_DELAY_MS = 3500;
export const STATUS_EXIT_DURATION_MS = 220;

export const motionPreferenceQuery =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

export const initialReduceMotionPreferred = Boolean(motionPreferenceQuery?.matches);
