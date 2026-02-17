export function createSearchWorkerClient() {
  let searchWorkerInstance = null;
  let searchWorkerRequestId = 0;
  const searchWorkerRequests = new Map();

  function ensureSearchWorker() {
    if (searchWorkerInstance) return searchWorkerInstance;
    searchWorkerInstance = new Worker(new URL("../searchWorker.js", import.meta.url), {
      type: "module",
    });
    searchWorkerInstance.onmessage = event => {
      const { id, type, ...rest } = event.data || {};
      if (typeof id === "undefined") return;
      const request = searchWorkerRequests.get(id);
      if (!request) return;
      if (type === "progress") {
        request.onProgress?.(rest);
        return;
      }
      searchWorkerRequests.delete(id);
      if (type === "result") {
        request.resolve(rest);
      } else if (type === "cancelled") {
        request.resolve({ cancelled: true });
      } else if (type === "error") {
        request.reject(new Error(rest.error || "Search failed."));
      } else {
        request.reject(new Error("Search worker returned an unknown response."));
      }
    };
    searchWorkerInstance.onerror = event => {
      console.error("Search worker error", event);
      searchWorkerRequests.forEach(({ reject }) => {
        reject(new Error("Search worker encountered an error."));
      });
      searchWorkerRequests.clear();
      searchWorkerInstance?.terminate();
      searchWorkerInstance = null;
    };
    return searchWorkerInstance;
  }

  function runSearchRequest({
    payload,
    onProgress,
  }) {
    const worker = ensureSearchWorker();
    const requestId = ++searchWorkerRequestId;

    const promise = new Promise((resolve, reject) => {
      searchWorkerRequests.set(requestId, {
        resolve,
        reject,
        onProgress,
      });
      worker.postMessage({
        id: requestId,
        type: "search",
        payload,
      });
    });

    return { requestId, promise };
  }

  function cancelSearchRequest(requestId) {
    if (!requestId || !searchWorkerInstance) return;
    searchWorkerInstance.postMessage({ id: requestId, type: "cancel" });
  }

  return {
    runSearchRequest,
    cancelSearchRequest,
  };
}
