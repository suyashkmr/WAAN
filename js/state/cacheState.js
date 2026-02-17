const analyticsCache = new Map();

export function getCachedAnalytics(key) {
  return analyticsCache.get(key) ?? null;
}

export function setCachedAnalytics(key, analytics) {
  if (!key) return;
  analyticsCache.set(key, analytics);
}

export function clearAnalyticsCache() {
  analyticsCache.clear();
}
