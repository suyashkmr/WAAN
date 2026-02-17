const PERF_WARN_THRESHOLD_MS = 250;

function isPerfLoggingEnabled() {
  if (typeof window === "undefined") return false;
  if (window.__WAAN_PERF__ === true) return true;
  try {
    return window.localStorage?.getItem("waan:perf") === "1";
  } catch {
    return false;
  }
}

export function logPerfDuration(label, durationMs, details = null) {
  const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  if (!isPerfLoggingEnabled() && safeDuration < PERF_WARN_THRESHOLD_MS) {
    return;
  }
  if (details) {
    console.info(`[perf] ${label}: ${safeDuration.toFixed(1)}ms`, details);
    return;
  }
  console.info(`[perf] ${label}: ${safeDuration.toFixed(1)}ms`);
}

export function measurePerfSync(label, task, details = null) {
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const result = task();
  const finishedAt = globalThis.performance?.now?.() ?? Date.now();
  logPerfDuration(label, finishedAt - startedAt, details);
  return result;
}

export async function measurePerfAsync(label, task, details = null) {
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const result = await task();
  const finishedAt = globalThis.performance?.now?.() ?? Date.now();
  logPerfDuration(label, finishedAt - startedAt, details);
  return result;
}
