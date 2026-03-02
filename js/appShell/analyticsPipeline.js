// @ts-check

/**
 * @typedef {{ resolve: (value: any) => void, reject: (reason?: any) => void }} WorkerRequestCallbacks
 */

export function createAnalyticsPipeline() {
  /** @type {Worker | null} */
  let analyticsWorkerInstance = null;
  let analyticsWorkerRequestId = 0;
  /** @type {Map<number, WorkerRequestCallbacks>} */
  const analyticsWorkerRequests = new Map();

  function ensureAnalyticsWorker() {
    if (analyticsWorkerInstance) return analyticsWorkerInstance;
    analyticsWorkerInstance = new Worker(new URL("../analyticsWorker.js", import.meta.url), {
      type: "module",
    });
    analyticsWorkerInstance.onmessage = (/** @type {MessageEvent} */ event) => {
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

  /**
   * @param {any[]} entries
   */
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
