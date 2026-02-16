export function createAnalyticsPipeline() {
  let analyticsWorkerInstance = null;
  let analyticsWorkerRequestId = 0;
  const analyticsWorkerRequests = new Map();

  function ensureAnalyticsWorker() {
    if (analyticsWorkerInstance) return analyticsWorkerInstance;
    analyticsWorkerInstance = new Worker(new URL("../analyticsWorker.js", import.meta.url), {
      type: "module",
    });
    analyticsWorkerInstance.onmessage = event => {
      const { id, analytics, error } = event.data || {};
      const callbacks = analyticsWorkerRequests.get(id);
      if (!callbacks) return;
      analyticsWorkerRequests.delete(id);
      if (error) {
        callbacks.reject(new Error(error));
      } else {
        callbacks.resolve(analytics);
      }
    };
    analyticsWorkerInstance.onerror = event => {
      console.error("Analytics worker error", event);
      analyticsWorkerRequests.forEach(({ reject }) => {
        reject(new Error("Analytics worker encountered an error."));
      });
      analyticsWorkerRequests.clear();
    };
    return analyticsWorkerInstance;
  }

  function computeAnalyticsWithWorker(entries) {
    const worker = ensureAnalyticsWorker();
    const id = ++analyticsWorkerRequestId;
    return new Promise((resolve, reject) => {
      analyticsWorkerRequests.set(id, { resolve, reject });
      try {
        worker.postMessage({ id, entries });
      } catch (error) {
        analyticsWorkerRequests.delete(id);
        reject(error);
      }
    });
  }

  return {
    computeAnalyticsWithWorker,
  };
}
