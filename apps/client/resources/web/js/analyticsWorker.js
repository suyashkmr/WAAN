import { computeAnalytics } from "./analytics.js";

self.onmessage = event => {
  const { id, entries } = event.data || {};
  if (typeof id === "undefined") return;
  try {
    const analytics = computeAnalytics(Array.isArray(entries) ? entries : []);
    self.postMessage({ id, analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, error: message });
  }
};

